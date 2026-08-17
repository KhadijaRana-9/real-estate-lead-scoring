function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Express requires exactly 4 params for this to be dispatched as
// error-handling middleware, even though `next` is unused in the body.
function errorHandler(err, req, res, _next) {
  console.error(err);
  const status = err.status || 500;
  // err.status is only ever set at a deliberate throw site (every business
  // error in this codebase - 401/403/404/409/402/503) - Zod validation
  // errors and Multer upload errors are both already intercepted with
  // their own responses before reaching here (see validate.js,
  // upload.middleware.js). Anything WITHOUT .status is therefore a
  // genuinely unexpected error (a raw Mongoose CastError, a driver error,
  // a TypeError), whose raw message could contain internal details - so it
  // always gets the same generic message, regardless of what it says. Full
  // detail still goes to console.error above either way.
  const message = err.status ? (err.message || 'Internal server error') : 'Internal server error';
  res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
