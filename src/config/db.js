const mongoose = require('mongoose');

function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<username>')) {
    console.warn('  ⚠️  MONGODB_URI not set — DB-backed features disabled, site still serves.');
    return;
  }
  mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
    .then(() => console.log('  MongoDB connected ✓'))
    .catch(err => {
      console.error('  MongoDB error:', err.message, '— retrying in 10s');
      setTimeout(connectDB, 10000);
    });
}

// Live connection state, so a dropped connection is noticed (1 = connected).
module.exports = { connectDB, isReady: () => mongoose.connection.readyState === 1 };
