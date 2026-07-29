const { ZodError } = require('zod');

function formatIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

// schema: { params?, query?, body? } - each a Zod schema.
// Parsed output replaces req.[params|query|body] in place, so downstream
// controllers always see coerced, whitelisted, validated data - unknown
// keys are stripped by Zod's default object parsing, which doubles as a
// second, independent line of defense against mass assignment.
function validate(schema) {
  return (req, res, next) => {
    try {
      if (schema.params) req.params = schema.params.parse(req.params);
      if (schema.query) req.query = schema.query.parse(req.query);
      if (schema.body) req.body = schema.body.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ message: 'Validation failed', errors: formatIssues(err) });
      }
      next(err);
    }
  };
}

module.exports = validate;
