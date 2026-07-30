const agencyService = require('./agency.service');
const authService = require('../auth/auth.service');

async function getPerformance(req, res, next) {
  try {
    const result = await agencyService.getPerformance(req.tenant._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getBranding(req, res, next) {
  try {
    const result = await agencyService.getBranding(req.tenant._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function updateBranding(req, res, next) {
  try {
    const result = await agencyService.updateBranding(req.tenant._id, req.user, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    const result = await agencyService.getProfile(req.tenant._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const result = await agencyService.updateProfile(req.tenant._id, req.user, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function inviteUser(req, res, next) {
  try {
    const result = await agencyService.inviteUser(req.tenant._id, req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function listInvites(req, res, next) {
  try {
    const invites = await agencyService.listInvites(req.tenant._id);
    res.json(invites);
  } catch (err) {
    next(err);
  }
}

async function revokeInvite(req, res, next) {
  try {
    await agencyService.revokeInvite(req.tenant._id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// Public: the invitee has no session yet, only the token from the email
// link. Issues a real login session on success, same shape as signup.
async function acceptInvite(req, res, next) {
  try {
    const user = await agencyService.acceptInvite(req.body);
    const accessToken = authService.signAccessToken(user);
    const refreshToken = await authService.issueRefreshToken(user._id, user.agencyId);
    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, agencyId: user.agencyId },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPerformance, getBranding, getProfile, updateBranding, updateProfile, inviteUser, listInvites, revokeInvite, acceptInvite };
