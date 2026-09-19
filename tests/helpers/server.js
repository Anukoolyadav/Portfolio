const { createApp } = require('../../app');

// One HTTP server per test file, bound explicitly to 127.0.0.1 and closed after
// the file's tests. Passing an app to supertest instead starts a new server on
// the IPv6 wildcard for every request while connecting over IPv4, which under
// parallel load can reach the wrong listener.
module.exports = function listen() {
  const server = createApp().listen(0, '127.0.0.1');
  afterAll(() => new Promise(resolve => server.close(resolve)));
  return server;
};
