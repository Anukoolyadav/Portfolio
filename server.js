require('dotenv').config();

if (!process.env.ADMIN_PASS?.trim()) {
  console.error('  ✖  ADMIN_PASS is not set. Refusing to start — set it in .env (see .env.example) or in the host dashboard.');
  process.exit(1);
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
