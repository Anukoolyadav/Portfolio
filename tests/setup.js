// Runs before every test file. Tests never send email, never use the real DB and
// never read the real .env (nothing imported by the tests calls dotenv).
for (const key of ['RESEND_API_KEY', 'MONGODB_URI', 'PORT', 'ADMIN_PASS', 'TRUST_PROXY']) {
  delete process.env[key];
}

// Test-only credentials. The plain password is exported for the login helper.
const bcrypt = require('bcryptjs');
process.env.NODE_ENV        = 'test';
process.env.SESSION_SECRET  = 'test-session-secret-0123456789abcdef-0123456789';
process.env.TEST_ADMIN_PASSWORD = 'test-admin-password';
process.env.ADMIN_PASS_HASH = bcrypt.hashSync(process.env.TEST_ADMIN_PASSWORD, 4);   // low cost: fast tests
