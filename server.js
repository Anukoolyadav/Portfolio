require('dotenv').config();

const validateEnv = require('./src/config/validateEnv');

const problems = validateEnv();
if (problems.length) {
  console.error('  ✖  Refusing to start — fix these environment variables (see .env.example):');
  for (const p of problems) console.error(`     - ${p}`);
  process.exit(1);
}
if (process.env.ADMIN_PASS !== undefined) {
  console.warn('  ⚠️  ADMIN_PASS is no longer used (replaced by ADMIN_PASS_HASH) — remove it from your environment.');
}

const { createApp } = require('./app');
const { connectDB } = require('./src/config/db');

const PORT = process.env.PORT || 3000;

// Connect to MongoDB (retries automatically on failure)
connectDB();

createApp().listen(PORT, '0.0.0.0', () => {
  const base = process.env.NODE_ENV === 'production'
    ? 'https://anukoolyadav.onrender.com'
    : `http://localhost:${PORT}`;
  console.log(`\n  Portfolio  →  ${base}`);
  console.log(`  Admin      →  ${base}/admin.html\n`);
});
