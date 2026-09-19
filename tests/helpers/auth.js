// Shared admin-auth helpers for tests. Credentials come from tests/setup.js,
// never from the real .env.
const request = require('supertest');

const PASSWORD = process.env.TEST_ADMIN_PASSWORD;

// The Origin a same-site browser would send to this test server.
const originOf = server => `http://127.0.0.1:${server.address().port}`;

// Agent without a session (but with a same-origin Origin header).
function anonAgent(server) {
  const agent = request.agent(server);
  agent.set('Origin', originOf(server));
  return agent;
}

// Agent that has logged in through POST /api/admin/login and keeps the cookie.
async function loginAgent(server) {
  const agent = anonAgent(server);
  await agent.post('/api/admin/login').send({ password: PASSWORD }).expect(200);
  return agent;
}

module.exports = { PASSWORD, originOf, anonAgent, loginAgent };
