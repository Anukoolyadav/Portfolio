// CSRF second layer for state-changing admin requests.
//
// SameSite=Strict on the session cookie is the primary defence; this rejects any
// POST/PUT/PATCH/DELETE whose Origin (or Referer, when Origin is absent) does not
// match the Host the request was sent to. A missing/opaque ("null") Origin and
// Referer is rejected too.
//
// Behind a reverse proxy the Host header must be passed through unchanged
// (Nginx: proxy_set_header Host $host;), otherwise every admin write 403s.
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

module.exports = function sameOrigin(req, res, next) {
  if (!UNSAFE.has(req.method)) return next();

  const source = req.get('origin') || req.get('referer');
  const host   = req.get('host');
  if (!source || !host) return res.status(403).json({ error: 'Cross-site request blocked.' });

  let sourceHost;
  try {
    ({ host: sourceHost } = new URL(source));   // "null" and junk throw
  } catch {
    return res.status(403).json({ error: 'Cross-site request blocked.' });
  }

  if (sourceHost !== host) return res.status(403).json({ error: 'Cross-site request blocked.' });
  next();
};
