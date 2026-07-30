const authService = require('./auth.service');

function toPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    agencyId: user.agencyId,
    phone: user.phone,
    whatsapp: user.whatsapp,
    avatar: user.avatar,
  };
}

async function signup(req, res, next) {
  try {
    const user = await authService.signup({ ...req.body, agencyId: req.tenant._id });
    const accessToken = authService.signAccessToken(user);
    const refreshToken = await authService.issueRefreshToken(user._id, user.agencyId);
    res.status(201).json({ accessToken, refreshToken, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const user = await authService.login({ ...req.body, agencyId: req.tenant._id });
    const accessToken = authService.signAccessToken(user);
    const refreshToken = await authService.issueRefreshToken(user._id, user.agencyId);
    res.json({ accessToken, refreshToken, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function platformLogin(req, res, next) {
  try {
    const user = await authService.platformLogin(req.body);
    const accessToken = authService.signAccessToken(user);
    const refreshToken = await authService.issueRefreshToken(user._id, user.agencyId);
    res.json({ accessToken, refreshToken, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const result = await authService.rotateRefreshToken(refreshToken);
    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: toPublicUser(result.user),
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.revokeRefreshToken(refreshToken);
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function sessions(req, res, next) {
  try {
    const result = await authService.listActiveSessions(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function revokeSession(req, res, next) {
  try {
    await authService.revokeSessionById(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    res.json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, platformLogin, refresh, logout, sessions, revokeSession, me, updateMe };
