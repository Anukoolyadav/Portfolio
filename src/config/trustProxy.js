// Parses TRUST_PROXY into a value for app.set('trust proxy', …). Default: off.
//
//   unset / '' / 'false' / '0'  -> false  (req.ip is the direct peer; X-Forwarded-For ignored)
//   '1', '2', …                 -> number of proxy hops to trust (use 1 behind a single Nginx)
//   'true'                      -> true   (trust every hop — only if you know why; spoofable)
//   anything else               -> passed through (e.g. 'loopback', '10.0.0.0/8')
module.exports = function parseTrustProxy(value) {
  if (value === undefined || value === null) return false;
  const v = String(value).trim();
  if (v === '' || v.toLowerCase() === 'false' || v === '0') return false;
  if (v.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
};
