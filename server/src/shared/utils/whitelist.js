function pickAllowedFields(source, allowedFields) {
  const result = {};
  if (!source || typeof source !== 'object') return result;

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      result[field] = source[field];
    }
  }

  return result;
}

module.exports = { pickAllowedFields };
