const request = require('supertest');
const bcrypt = require('bcryptjs');
const Agency = require('../../src/features/agency/agency.model');
const User = require('../../src/features/auth/auth.model');

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

// Goes through the real signup endpoint (not a direct model insert) so
// every test that needs "a logged-in agent" also re-exercises real
// signup/token-issuance behavior as a side effect.
async function signupUser(app, agencySlug, overrides = {}) {
  const res = await request(app)
    .post(`/api/auth/signup?workspace=${agencySlug}`)
    .send({
      name: overrides.name || 'Test User',
      email: overrides.email || `${unique('user')}@example.com`,
      password: overrides.password || 'Password123!',
      role: overrides.role || 'agent',
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

module.exports = { unique, createAgency, signupUser, createSuperAdmin };
