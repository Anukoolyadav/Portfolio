const mongoose = require('mongoose');

let dbReady = false;

function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<username>')) {
    console.warn('  ⚠️  MONGODB_URI not set — blog API disabled, site still serves.');
    return;
  }
  mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
    .then(() => { dbReady = true; console.log('  MongoDB connected ✓'); })
    .catch(err => {
      console.error('  MongoDB error:', err.message, '— retrying in 10s');
      setTimeout(connectDB, 10000);
    });
}

module.exports = { connectDB, isReady: () => dbReady };
