// Strips HTML tag syntax from untrusted free-text input (e.g. an inquiry
// message) - not a general HTML sanitizer (no allowlist, no attribute
// parsing needed), since fields using this have zero legitimate use for
// markup. Only matches real tag-opening syntax (`<` or `</` immediately
// followed by a letter, per HTML tag grammar) so incidental math-like text
// such as "5 < 10 > 3" is left completely intact - a bare `<` not adjacent
// to a tag name is never valid HTML anyway, so leaving it as literal text
// is also safe.
function stripHtmlTags(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/<\/?[a-zA-Z][^>]*>/g, '');
}

module.exports = { stripHtmlTags };
