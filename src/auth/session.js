// Stateless admin session: an HMAC-SHA256-signed token in an httpOnly cookie.
//
//   token = base64url(JSON payload) + "." + base64url(HMAC_SHA256(SESSION_SECRET, payloadPart))
//   payload = { v: 1, iat, exp, nonce }
//
// Verification is constant-time and rejects: wrong shape, bad signature, non-canonical
// encodings, unknown versions and expired tokens.
const crypto = require('crypto');

const COOKIE_NAME = 'admin_session';
const MAX_AGE_MS  = 8 * 60 * 60 * 1000;   // 8 hours
const COOKIE_PATH = '/api/admin';          // only sent to admin API calls

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET is missing or too short.');
  return s;
}

const hmac = body => crypto.createHmac('sha256', secret()).update(body).digest();

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmac(body).toString('base64url')}`;
}

function createToken(now = Date.now()) {
  return sign({ v: 1, iat: now, exp: now + MAX_AGE_MS, nonce: crypto.randomBytes(12).toString('hex') });
}

// Returns the payload for a valid, unexpired token; otherwise null.
function verifyToken(token, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 1024) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const given    = Buffer.from(sig, 'base64url');
  const expected = hmac(body);
  // Length check first (timingSafeEqual requires it); re-encoding check rejects
  // alternative spellings of the same bytes.
  if (given.length !== expected.length || given.toString('base64url') !== sig) return null;
  if (!crypto.timingSafeEqual(given, expected)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || payload.v !== 1 || typeof payload.exp !== 'number' || payload.exp <= now) return null;
  return payload;
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure:   process.env.NODE_ENV === 'production',
    path:     COOKIE_PATH
  };
}

// Reads one cookie from the raw Cookie header (no extra dependency).
function readCookie(req, name = COOKIE_NAME) {
  const header = req.headers.cookie;
  if (typeof header !== 'string') return undefined;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return undefined; }
    }
  }
  return undefined;
}

function setSessionCookie(res) {
  res.cookie(COOKIE_NAME, createToken(), { ...cookieOptions(), maxAge: MAX_AGE_MS });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

module.exports = {
  COOKIE_NAME, COOKIE_PATH, MAX_AGE_MS,
  sign, createToken, verifyToken, readCookie, setSessionCookie, clearSessionCookie
};
