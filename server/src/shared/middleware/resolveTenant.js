const Agency = require('../../features/agency/agency.model');

// Once a Free Trial's trialEndsAt passes, every tenant-scoped route
// blocks except these two - an agency_admin still needs to reach
// billing (to actually pay and escape the block) and auth (to log in
// and see that prompt in the first place; auth.routes.js's own
// /login runs resolveTenant() too).
const TRIAL_EXPIRY_EXEMPT_PREFIXES = ['/api/billing', '/api/auth'];

function extractSubdomain(hostname, rootDomain) {
  if (!hostname || !rootDomain) return null;
  if (hostname === rootDomain || hostname === `www.${rootDomain}`) return null;
  if (!hostname.endsWith(`.${rootDomain}`)) return null;
  return hostname.slice(0, hostname.length - rootDomain.length - 1);
}

async function resolveFromRequest(req, { allowDefaultFallback = true } = {}) {
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
    // An explicit ?workspace= was given but matches no agency - a typo or
    // stale link, not "no workspace context". Falling through to the
    // default-agency bridge below would silently place the caller in the
    // WRONG tenant with no indication at all (FIND-05: a signup with a
    // typo'd workspace slug used to silently create the account under the
    // default agency instead of rejecting it). Return null unconditionally
    // here so the caller's `required` handling produces a clear rejection
    // instead - "workspace omitted" (this block never entered) is
    // completely unaffected.
    return null;
  }

  // TEMPORARY bridge: this app's frontend doesn't send any workspace
  // context yet (no subdomain DNS, no workspace picker UI - that's
  // Feature 7). Falling back to a configured default agency keeps every
  // existing flow working unchanged during the transition. Remove once
  // the frontend is workspace-aware; at that point an unresolvable
  // tenant should 404, not silently default.
  //
  // allowDefaultFallback=false opts a caller out of this bridge entirely
  // (see auth.routes.js's /login) - for a route that's about to look up
  // an EXISTING account by identity, silently guessing this agency is
  // actively harmful (searches the wrong agency's users, see BUG-001),
  // unlike anonymous browsing routes where "assume the default agency"
  // is a reasonable, harmless guess.
  if (allowDefaultFallback) {
    const defaultSlug = process.env.DEFAULT_AGENCY_SLUG;
    if (defaultSlug) {
      return Agency.findOne({ slug: defaultSlug });
    }
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
  const { required = true, allowDefaultFallback = true, enforceSuspension = true } = options;

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
        req.tenant = await resolveFromRequest(req, { allowDefaultFallback });
      }

      if (!req.tenant) {
        if (!required) return next();
        const err = new Error('Unable to resolve a workspace for this request');
        err.status = 404;
        throw err;
      }

      // enforceSuspension=false lets a caller resolve req.tenant without
      // this immediate throw - used only by /login (see auth.routes.js),
      // where resolving a suspended agency purely from ?workspace=<slug>
      // needs no credentials at all. Blocking here unconditionally let an
      // unauthenticated caller probe whether an arbitrary workspace slug is
      // suspended without ever supplying a valid password (FIND-01).
      // auth.service.js's login() already checks agency status - correctly
      // - only after bcrypt.compare succeeds; this just lets that existing
      // check be the one that actually runs for this route. Every other
      // route keeps the default (true): those callers are already
      // authenticated via a verified JWT, so there's no credential-probing
      // concern, and suspended-blocking there is unchanged.
      if (enforceSuspension && req.tenant.status === 'suspended') {
        const err = new Error('This workspace has been suspended');
        err.status = 403;
        throw err;
      }

      // trialEndsAt is only ever set by a real Free Trial registration
      // (agencyRegistration.service.js) - every other agency (including
      // ones mid-checkout on a paid plan, still subscriptionStatus
      // 'trialing' until their webhook fires) has it null, so this is a
      // no-op for them regardless of status. 402 (Payment Required) is
      // the correct HTTP semantic here, not 403 - this is specifically
      // "pay to continue," not a permissions problem.
      const trialExpired = req.tenant.subscriptionStatus === 'trialing' && req.tenant.trialEndsAt && req.tenant.trialEndsAt < new Date();
      if (trialExpired && !TRIAL_EXPIRY_EXEMPT_PREFIXES.some((prefix) => req.originalUrl.startsWith(prefix))) {
        const err = new Error('Your free trial has ended. Please upgrade your subscription to continue using DreamHomes.');
        err.status = 402;
        throw err;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = resolveTenant;
