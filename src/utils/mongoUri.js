const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

// True only if every host in a mongodb:// URI is loopback. mongodb+srv is always remote.
// Never logs or returns any part of the URI.
exports.isLocalMongoUri = function isLocalMongoUri(uri) {
  if (typeof uri !== 'string') return false;
  const m = uri.match(/^mongodb:\/\/(?:[^@/]*@)?([^/?]+)/);
  if (!m) return false;
  const hosts = m[1].split(',').map(h => h.replace(/:\d+$/, '').toLowerCase());
  return hosts.length > 0 && hosts.every(h => LOCAL_HOSTS.has(h));
};
