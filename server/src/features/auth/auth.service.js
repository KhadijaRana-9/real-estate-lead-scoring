const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('./auth.model');
const RefreshToken = require('./refreshToken.model');
const Agency = require('../agency/agency.model');

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_BYTES = 64;

function getRefreshTokenTtlMs() {
  const days = Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS) || 30;
  return days * 24 * 60 * 60 * 1000;
}

function unauthorized(message) {
  const err = new Error(message);
  err.status = 401;
  return err;
}

// agencyId is the resolved tenant (req.tenant._id from resolveTenant
// middleware), never a client-supplied value - signup/login are always
// scoped to whichever agency the request was resolved against.
//
// role is always 'customer' here, regardless of what's requested - the
// only account type public self-signup may ever create. An 'agent'
// membership must come from agency.service.js's createActiveMembership
// (invite-accept or application-approval), which authoritatively checks
// the plan's agent-seat limit first. auth.schema.js already rejects any
// role other than 'customer' at the HTTP boundary; this is the
// service-layer half of that same defense-in-depth pair.
async function signup({ name, email, password, agencyId }) {
  const existing = await User.findOne({ agencyId, email: email.toLowerCase() });
  if (existing) {
    const err = new Error('An account with this email already exists');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash, role: 'customer', agencyId });

  return user;
}

const AGENCY_LOGIN_BLOCK_MESSAGES = {
  pending: 'Your agency registration is still pending admin approval. Please check back soon.',
  rejected: 'Your agency registration was not approved. Contact support for details.',
  suspended: 'This workspace has been suspended.',
};

async function login({ email, password, agencyId }) {
  const normalizedEmail = email.toLowerCase();
  let user;

  if (agencyId) {
    user = await User.findOne({ agencyId, email: normalizedEmail });
  } else {
    // No explicit workspace was resolved for this request (see
    // auth.routes.js's /login route, which deliberately does not fall
    // back to DEFAULT_AGENCY_SLUG - see resolveTenant.js). Guessing a
    // tenant here would search the wrong agency's users entirely (this
    // was BUG-001: a correct password reported as "Invalid email or
    // password" whenever the login page was reached without ?workspace=,
    // e.g. via the Navbar/Footer links). The account itself is the real
    // source of truth for which agency this is, so resolve by identity
    // instead. Email is unique per-agency, not globally (see
    // auth.model.js's compound index), so this occasionally matches more
    // than one real account across different agencies.
    const candidates = await User.find({ email: normalizedEmail }).limit(2);
    if (candidates.length > 1) {
      const err = new Error("This email is used in more than one agency workspace. Please log in from your agency's own workspace link.");
      err.status = 409;
      throw err;
    }
    user = candidates[0] || null;
  }

  if (!user) {
    throw unauthorized('Invalid email or password');
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw unauthorized('Invalid email or password');
  }

  // Checked after password match (not before) so a wrong-password
  // attempt on a pending/suspended agency still reads as "invalid email
  // or password" rather than leaking the agency's approval state to an
  // unauthenticated guesser. Only 'active' may proceed - this is the
  // real gate self-registered agencies (agencyRegistration feature) sit
  // behind until a super_admin approves them; previously nothing here
  // checked agency status at all (only rotateRefreshToken did, so a
  // suspended agency's user could still complete a fresh login and just
  // fail on their next token refresh - closed here too for consistency).
  //
  // Uses user.agencyId (the matched account's real agency) rather than
  // the agencyId parameter, which can be null on the identity-lookup
  // path above.
  const agency = await Agency.findById(user.agencyId).select('status');
  if (agency && agency.status !== 'active') {
    throw unauthorized(AGENCY_LOGIN_BLOCK_MESSAGES[agency.status] || 'This workspace is not currently active.');
  }

  return user;
}

// super_admin has no agencyId, so it can't go through the tenant-scoped
// login() above (which queries by {agencyId, email}) - this is the
// separate, deliberately-not-tenant-resolved entry point for it.
async function platformLogin({ email, password }) {
  const user = await User.findOne({ role: 'super_admin', email: email.toLowerCase() });
  if (!user) {
    throw unauthorized('Invalid email or password');
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw unauthorized('Invalid email or password');
  }

  return user;
}

function signAccessToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      agencyId: user.agencyId ? user.agencyId.toString() : null,
      name: user.name,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueRefreshToken(userId, agencyId) {
  const token = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
  await RefreshToken.create({
    user: userId,
    agencyId: agencyId || null,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + getRefreshTokenTtlMs()),
  });
  return token;
}

// Rotation with reuse detection: every refresh consumes the presented
// token and issues a new one. If a token is presented twice, the second
// use is either a client bug (retried after a lost response) or a stolen
// token - either way, the safe response is to revoke the entire token
// family for that user and force a fresh login.
async function rotateRefreshToken(presentedToken) {
  const presentedHash = hashRefreshToken(presentedToken);
  const record = await RefreshToken.findOne({ tokenHash: presentedHash });

  if (!record) {
    throw unauthorized('Invalid refresh token');
  }

  if (record.revokedAt) {
    await RefreshToken.updateMany(
      { user: record.user, revokedAt: null },
      { revokedAt: new Date() }
    );
    throw unauthorized('Refresh token has already been used. Please log in again.');
  }

  if (record.expiresAt < new Date()) {
    throw unauthorized('Refresh token has expired. Please log in again.');
  }

  const user = await User.findById(record.user);
  if (!user) {
    throw unauthorized('Invalid refresh token');
  }

  // A suspended agency must not be able to mint fresh sessions, even for
  // a refresh token that was valid when it was issued.
  if (record.agencyId) {
    const agency = await Agency.findById(record.agencyId);
    if (!agency || agency.status === 'suspended') {
      throw unauthorized('This workspace has been suspended');
    }
  }

  const newToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
  const newHash = hashRefreshToken(newToken);

  record.revokedAt = new Date();
  record.replacedByTokenHash = newHash;
  await record.save();

  await RefreshToken.create({
    user: user._id,
    agencyId: user.agencyId || null,
    tokenHash: newHash,
    expiresAt: new Date(Date.now() + getRefreshTokenTtlMs()),
  });

  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: newToken,
  };
}

async function revokeRefreshToken(presentedToken) {
  const tokenHash = hashRefreshToken(presentedToken);
  await RefreshToken.updateOne({ tokenHash, revokedAt: null }, { revokedAt: new Date() });
}

// Never returns tokenHash - only enough for the user to recognize and
// revoke a session (when it was issued/expires), never the credential
// itself.
async function listActiveSessions(userId) {
  return RefreshToken.find({ user: userId, revokedAt: null, expiresAt: { $gt: new Date() } })
    .select('createdAt expiresAt')
    .sort({ createdAt: -1 });
}

async function revokeSessionById(userId, sessionId) {
  const result = await RefreshToken.updateOne(
    { _id: sessionId, user: userId, revokedAt: null },
    { revokedAt: new Date() }
  );
  if (result.matchedCount === 0) {
    const err = new Error('Session not found');
    err.status = 404;
    throw err;
  }
}

async function getProfile(userId) {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) throw unauthorized('User not found');
  return user;
}

async function updateProfile(userId, data) {
  const user = await User.findById(userId);
  if (!user) throw unauthorized('User not found');

  if (data.phone !== undefined) user.phone = data.phone;
  if (data.whatsapp !== undefined) user.whatsapp = data.whatsapp;
  if (data.avatar !== undefined) user.avatar = data.avatar;
  await user.save();
  return user;
}

module.exports = {
  signup,
  login,
  platformLogin,
  getProfile,
  updateProfile,
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  listActiveSessions,
  revokeSessionById,
};
