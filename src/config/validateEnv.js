// Startup checks. Returns human-readable problems that name variables but never
// include their values.
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

module.exports = function validateEnv(env = process.env) {
  const problems = [];

  const hash = env.ADMIN_PASS_HASH;
  if (!hash || !hash.trim()) {
    problems.push('ADMIN_PASS_HASH is not set. Generate it with: npm run hash-password');
  } else if (!BCRYPT_HASH.test(hash)) {
    problems.push('ADMIN_PASS_HASH is not a valid bcrypt hash (60 characters starting with $2). ' +
                  'Check it was copied completely and quoted as in .env.example.');
  }

  const secret = env.SESSION_SECRET;
  if (!secret) {
    problems.push('SESSION_SECRET is not set. Generate it with: openssl rand -hex 32');
  } else if (secret.length < 32) {
    problems.push('SESSION_SECRET must be at least 32 characters. Generate it with: openssl rand -hex 32');
  }

  return problems;
};

module.exports.BCRYPT_HASH = BCRYPT_HASH;
