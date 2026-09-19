const { once } = require('events');
const { createApp } = require('../../app');

// One HTTP server per test file, bound explicitly to 127.0.0.1 and closed after
// the file's tests. Passing an app to supertest instead starts a new server on
// the IPv6 wildcard for every request while connecting over IPv4, which under
// parallel load can reach the wrong listener.
//
// Binding is asynchronous, so a beforeAll waits for 'listening' — tests can rely
// on server.address() (e.g. to build a same-origin Origin header).
module.exports = function listen(options) {
  const server = createApp(options).listen(0, '127.0.0.1');
  beforeAll(async () => {
    if (!server.listening) await once(server, 'listening');
  });
  afterAll(() => new Promise(resolve => server.close(resolve)));
  return server;
};
