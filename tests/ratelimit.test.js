// Login rate limiting and trust proxy. Small windows keep the tests fast; every
// app below has its own limiter store.
const request = require('supertest');
const listen  = require('./helpers/server');
const parseTrustProxy = require('../src/config/trustProxy');
const { PASSWORD, anonAgent } = require('./helpers/auth');

const WINDOW = 1500;   // generous vs. request latency, so bursts never straddle a reset
const LIMIT  = 3;

const app      = listen({ loginRateLimit: { windowMs: WINDOW, limit: LIMIT } });
const otherApp = listen({ loginRateLimit: { windowMs: WINDOW, limit: LIMIT } });
const proxied  = listen({ loginRateLimit: { windowMs: WINDOW, limit: LIMIT }, trustProxy: '1' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const attempt = (server, password, headers = {}) =>
  anonAgent(server).post('/api/admin/login').set(headers).send({ password });

describe('login rate limit', () => {
// Each test starts with fresh windows.
beforeEach(() => sleep(WINDOW + 50));

test('locks out after the limit of failed attempts, even for the right password', async () => {
  for (let i = 0; i < LIMIT; i++) await attempt(app, 'wrong-password').expect(401);
  const blocked = await attempt(app, 'wrong-password').expect(429);
  expect(blocked.body.error).toMatch(/Too many failed sign-in attempts/);
  await attempt(app, PASSWORD).expect(429);
});

test('the lockout resets after the window', async () => {
  for (let i = 0; i < LIMIT; i++) await attempt(app, 'wrong-password').expect(401);
  await attempt(app, PASSWORD).expect(429);
  await sleep(WINDOW + 50);
  await attempt(app, PASSWORD).expect(200);
});

test('successful logins do not count toward the limit', async () => {
  for (let i = 0; i < LIMIT + 2; i++) await attempt(app, PASSWORD).expect(200);
  for (let i = 0; i < LIMIT; i++) await attempt(app, 'wrong-password').expect(401);
  await attempt(app, 'wrong-password').expect(429);
});

test('limiter state is per app: another app is unaffected', async () => {
  for (let i = 0; i < LIMIT; i++) await attempt(app, 'wrong-password').expect(401);
  await attempt(app, PASSWORD).expect(429);
  await attempt(otherApp, PASSWORD).expect(200);
});

test('only login is limited — other routes keep working during a lockout', async () => {
  for (let i = 0; i <= LIMIT; i++) await attempt(app, 'wrong-password');
  await request(app).get('/health').expect(200);
  await request(app).get('/api/admin/session').expect(401);   // auth still answers normally
});

test('with trust proxy off (default), a spoofed X-Forwarded-For does not bypass the limit', async () => {
  for (let i = 0; i < LIMIT; i++) {
    await attempt(app, 'wrong-password', { 'X-Forwarded-For': `203.0.113.${i}` }).expect(401);
  }
  await attempt(app, 'wrong-password', { 'X-Forwarded-For': '203.0.113.99' }).expect(429);
});

test('with TRUST_PROXY=1, clients behind the proxy are limited separately', async () => {
  for (let i = 0; i < LIMIT; i++) {
    await attempt(proxied, 'wrong-password', { 'X-Forwarded-For': '198.51.100.1' }).expect(401);
  }
  await attempt(proxied, 'wrong-password', { 'X-Forwarded-For': '198.51.100.1' }).expect(429);
  await attempt(proxied, PASSWORD, { 'X-Forwarded-For': '198.51.100.2' }).expect(200);
});

});

describe('parseTrustProxy', () => {
  test.each([
    [undefined, false], ['', false], ['false', false], ['FALSE', false], ['0', false],
    ['1', 1], ['2', 2], ['true', true], ['loopback', 'loopback'], [' 10.0.0.0/8 ', '10.0.0.0/8']
  ])('%p -> %p', (input, expected) => {
    expect(parseTrustProxy(input)).toBe(expected);
  });
});
