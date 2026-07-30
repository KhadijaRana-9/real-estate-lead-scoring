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
async function signup({ name, email, password, role, agencyId }) {
  const existing = await User.findOne({ agencyId, email: email.toLowerCase() });
  if (existing) {
    const err = new Error('An account with this email already exists');
    err.status = 409;
    throw err;
  }

  const allowedRole = ['agent', 'customer'].includes(role) ? role : 'customer';
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash, role: allowedRole, agencyId });

  return user;
}

async function login({ email, password, agencyId }) {
  const user = await User.findOne({ agencyId, email: email.toLowerCase() });
  if (!user) {
    throw unauthorized('Invalid email or password');
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw unauthorized('Invalid email or password');
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
