// Login brute-force protection: failed attempts per client IP per window.
// Successful logins are not counted. Once the limit is hit, every login attempt
// (even with the right password) gets 429 until the window resets.
//
// Defaults: 5 per 15 minutes. Override per app (tests) or via env:
//   LOGIN_RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_WINDOW_MS
// Each call creates its own in-memory store — state is never shared between apps.
const { rateLimit } = require('express-rate-limit');

const positiveInt = v => (/^\d+$/.test(String(v ?? '')) && Number(v) > 0 ? Number(v) : undefined);

module.exports = function makeLoginRateLimit(options = {}) {
  const windowMs = options.windowMs ?? positiveInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) ?? 15 * 60 * 1000;
  const limit    = options.limit    ?? positiveInt(process.env.LOGIN_RATE_LIMIT_MAX)       ?? 5;

  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      const minutes = Math.max(1, Math.ceil(windowMs / 60000));
      res.status(429).json({ error: `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` });
    }
  });
};
