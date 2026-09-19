const mongoose = require('mongoose');
const { isLocalMongoUri } = require('../../src/utils/mongoUri');

// Separate database so tests never touch dev data. Must be loopback-only.
const TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/portfolio_test';

async function connect() {
  if (!isLocalMongoUri(TEST_URI)) {
    throw new Error('Refusing to run DB tests: MONGODB_TEST_URI must point to localhost.');
  }
  await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 3000 });
  await mongoose.connection.db.dropDatabase();
  await require('../../src/models/Project').init();   // build the unique slug index
}

async function clear() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map(c => c.deleteMany({})));
}

async function disconnect() {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
}

module.exports = { connect, clear, disconnect };
