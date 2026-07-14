const authService = require('./auth.service');

function toPublicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

async function signup(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    const user = await authService.signup({ name, email, password, role });
    const token = authService.signToken(user);
    res.status(201).json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await authService.login({ email, password });
    const token = authService.signToken(user);
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login };
