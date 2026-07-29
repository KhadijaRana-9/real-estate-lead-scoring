const Agency = require('../../features/agency/agency.model');

function extractSubdomain(hostname, rootDomain) {
  if (!hostname || !rootDomain) return null;
  if (hostname === rootDomain || hostname === `www.${rootDomain}`) return null;
  if (!hostname.endsWith(`.${rootDomain}`)) return null;
  return hostname.slice(0, hostname.length - rootDomain.length - 1);
}

async function resolveFromRequest(req) {
  const hostname = req.hostname;
  const rootDomain = process.env.PLATFORM_ROOT_DOMAIN;

  if (hostname) {
    const byCustomDomain = await Agency.findOne({ customDomain: hostname });
    if (byCustomDomain) return byCustomDomain;
  }

  const subdomain = extractSubdomain(hostname, rootDomain);
  if (subdomain) {
    const bySubdomain = await Agency.findOne({ slug: subdomain });
    if (bySubdomain) return bySubdomain;
  }

  if (req.query.workspace) {
    const byWorkspace = await Agency.findOne({ slug: String(req.query.workspace).toLowerCase() });
    if (byWorkspace) return byWorkspace;
  }

  // TEMPORARY bridge: this app's frontend doesn't send any workspace
  // context yet (no subdomain DNS, no workspace picker UI - that's
  // Feature 7). Falling back to a configured default agency keeps every
  // existing flow working unchanged during the transition. Remove once
  // the frontend is workspace-aware; at that point an unresolvable
  // tenant should 404, not silently default.
  const defaultSlug = process.env.DEFAULT_AGENCY_SLUG;
  if (defaultSlug) {
    return Agency.findOne({ slug: defaultSlug });
  }

  return null;
}

// Resolves req.tenant so every downstream handler works against one
// agency without re-deriving that itself. Resolution order:
//   1. req.user.agencyId - set by the `auth` middleware from a verified,
//      signed JWT. This is the trusted path for authenticated requests;
//      an authenticated user's tenant is never re-derived from the host,
//      so a request can't move itself to another tenant by changing its
//      Host header or a query param.
//   2. Custom domain match on the Host header.
//   3. Subdomain match against PLATFORM_ROOT_DOMAIN.
//   4. ?workspace=<slug> - the fallback this app's current single-domain
//      deployment actually uses (no subdomain DNS is provisioned yet).
//   5. A configured default agency, as a transitional bridge - see
//      resolveFromRequest.
function resolveTenant(options = {}) {
  const { required = true } = options;

  return async (req, res, next) => {
    try {
      if (req.user?.agencyId) {
        req.tenant = await Agency.findById(req.user.agencyId);
      } else if (req.user?.role === 'super_admin') {
        // An authenticated super_admin has no agency by design - must
        // never fall through to host/workspace/default resolution
        // (which exists for anonymous/tenant requests), or a platform
        // route would silently get scoped to whichever agency happens
        // to match the request's Host/workspace/default.
        req.tenant = null;
      } else {
        req.tenant = await resolveFromRequest(req);
      }

      if (!req.tenant) {
        if (!required) return next();
        const err = new Error('Unable to resolve a workspace for this request');
        err.status = 404;
        throw err;
      }

      if (req.tenant.status === 'suspended') {
        const err = new Error('This workspace has been suspended');
        err.status = 403;
        throw err;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = resolveTenant;
