const jwt = require('jsonwebtoken');

// Like auth.js, but never blocks the request - sets req.user when a
// valid token is present, leaves it undefined otherwise. For public
// endpoints (agency profile) that render differently for a logged-in
// visitor (e.g. "isFollowing") without requiring login to view at all.
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // Invalid/expired token on a public route - proceed as anonymous
    // rather than rejecting, same as if no token had been sent at all.
  }
  next();
}

module.exports = optionalAuth;
