// Runs before every test file. Tests never send email, never use the real DB and
// never read the real .env (nothing imported by the tests calls dotenv).
for (const key of ['RESEND_API_KEY', 'MONGODB_URI', 'PORT', 'ADMIN_PASS']) {
  delete process.env[key];
}
