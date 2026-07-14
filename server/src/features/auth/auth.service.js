const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./auth.model');

const SALT_ROUNDS = 10;

async function signup({ name, email, password, role }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const err = new Error('An account with this email already exists');
    err.status = 409;
    throw err;
  }

  const allowedRole = ['agent', 'customer'].includes(role) ? role : 'customer';
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash, role: allowedRole });

  return user;
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  return user;
}

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = { signup, login, signToken };
