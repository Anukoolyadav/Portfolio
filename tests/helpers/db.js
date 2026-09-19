const mongoose = require('mongoose');
const { isLocalMongoUri } = require('../../src/utils/mongoUri');

// Server to use for tests; must be loopback-only.
const TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017';

// Every test file gets its own database, so parallel Jest workers — or two test
// runs at the same time — can never clear or drop each other's data.
const DB_NAME = `portfolio_test_${process.pid}_${process.env.JEST_WORKER_ID || 0}`;

async function connect() {
  if (!isLocalMongoUri(TEST_URI)) {
    throw new Error('Refusing to run DB tests: MONGODB_TEST_URI must point to localhost.');
  }
  await mongoose.connect(TEST_URI, { dbName: DB_NAME, serverSelectionTimeoutMS: 3000 });
  // Fresh, uniquely named DB: nothing to drop first. Wait for every model's
  // indexes (e.g. the unique slug index) before any test runs.
  await Promise.all(Object.values(mongoose.models).map(m => m.init()));
}

async function clear() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map(c => c.deleteMany({})));
}

async function disconnect() {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
}

module.exports = { connect, clear, disconnect, DB_NAME };
