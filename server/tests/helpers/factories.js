const request = require('supertest');
const bcrypt = require('bcryptjs');
const Agency = require('../../src/features/agency/agency.model');
const User = require('../../src/features/auth/auth.model');
const authService = require('../../src/features/auth/auth.service');

let counter = 0;
function unique(prefix) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

async function createAgency(overrides = {}) {
  return Agency.create({
    companyName: overrides.companyName || `Test Agency ${unique('a')}`,
    slug: overrides.slug || unique('agency'),
    contactEmail: overrides.contactEmail || `contact-${unique('a')}@example.com`,
    subscriptionPlan: overrides.subscriptionPlan || 'starter',
    subscriptionStatus: overrides.subscriptionStatus || 'trialing',
    status: overrides.status || 'active',
  });
}

// 'customer' goes through the real signup endpoint (not a direct model
// insert) so every test that needs "a logged-in customer" also
// re-exercises real signup/token-issuance behavior as a side effect.
//
// Any other role (e.g. 'agent') has no public self-signup route anymore
// (see auth.schema.js/auth.service.js - public signup can only ever
// create a 'customer') - a real agent only ever comes from
// agency.service.js's createActiveMembership (invite-accept or
// application-approval). So this factory creates that User directly and
// mints real tokens the same way logging in as that user would, mirroring
// createRoleUser below, but keeping the exact same call signature/return
// shape every existing caller already relies on.
async function signupUser(app, agencySlug, overrides = {}) {
  const role = overrides.role || 'customer';

  if (role !== 'customer') {
    const agency = await Agency.findOne({ slug: agencySlug });
    const { user, accessToken } = await createRoleUser(agency._id, role, overrides);
    const refreshToken = await authService.issueRefreshToken(user._id, user.agencyId);
    return {
      accessToken,
      refreshToken,
      // Stringified to match what real HTTP responses look like on the
      // wire (JSON.stringify implicitly calls ObjectId#toJSON) - callers
      // compare these against other stringified ids with .toBe().
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        agencyId: user.agencyId ? user.agencyId.toString() : null,
        phone: user.phone,
        whatsapp: user.whatsapp,
        avatar: user.avatar,
      },
    };
  }

  const res = await request(app)
    .post(`/api/auth/signup?workspace=${agencySlug}`)
    .send({
      name: overrides.name || 'Test User',
      email: overrides.email || `${unique('user')}@example.com`,
      password: overrides.password || 'Password123!',
    });

  if (res.status !== 201) {
    throw new Error(`signupUser factory failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

async function createSuperAdmin(overrides = {}) {
  const password = overrides.password || 'Password123!';
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: overrides.name || 'Platform Admin',
    email: overrides.email || `${unique('super')}@example.com`,
    passwordHash,
    role: 'super_admin',
    agencyId: null,
  });
  return { user, password };
}

// The public signup endpoint only ever issues 'customer'
// (auth.service.js's signup() hardcodes that role) - 'agent' and
// 'agency_admin' have no public self-signup route in this codebase, so
// tests that need one create the User directly and mint a real token via
// the same authService.signAccessToken() the real login flow uses,
// rather than hand-rolling a JWT. agencyId null gives a super_admin-shaped
// token. (signupUser above delegates here for exactly this reason when
// asked for a non-customer role.)
async function createRoleUser(agencyId, role, overrides = {}) {
  const passwordHash = await bcrypt.hash(overrides.password || 'Password123!', 10);
  const user = await User.create({
    name: overrides.name || 'Test User',
    email: overrides.email || `${unique(role)}@example.com`,
    passwordHash,
    role,
    agencyId,
  });
  const accessToken = authService.signAccessToken(user);
  return { user, accessToken };
}

module.exports = { unique, createAgency, signupUser, createSuperAdmin, createRoleUser };
