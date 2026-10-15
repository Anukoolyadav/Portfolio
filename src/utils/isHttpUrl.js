// True only for absolute http(s) URLs — rejects javascript:, data:, relative paths, etc.
module.exports = function isHttpUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};
