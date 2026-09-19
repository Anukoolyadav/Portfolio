// Cookie-session auth: login, logout, cookie flags, token validation, old header gone.
const request = require('supertest');
const listen  = require('./helpers/server');
const session = require('../src/auth/session');
const { PASSWORD, originOf, anonAgent, loginAgent } = require('./helpers/auth');

const app = listen();
const login = body => anonAgent(app).post('/api/admin/login').send(body);
const setCookieHeader = res => (res.headers['set-cookie'] || []).find(c => c.startsWith(`${session.COOKIE_NAME}=`));
const withCookie = (path, value) =>
  request(app).get(path).set('Origin', originOf(app)).set('Cookie', `${session.COOKIE_NAME}=${value}`);

describe('POST /api/admin/login', () => {
  test('correct password -> 200 and a session cookie that works', async () => {
    const agent = anonAgent(app);
    await agent.get('/api/admin/session').expect(401);
    const res = await agent.post('/api/admin/login').send({ password: PASSWORD }).expect(200);
    expect(res.body).toEqual({ ok: true });
    expect(setCookieHeader(res)).toBeDefined();
    await agent.get('/api/admin/session').expect(200);
  });

  test('wrong password -> 401 and no cookie', async () => {
    const res = await login({ password: 'definitely-wrong' }).expect(401);
    expect(res.body).toEqual({ error: 'Incorrect password.' });
    expect(setCookieHeader(res)).toBeUndefined();
  });

  test.each([[{}], [{ password: '' }], [{ password: 123 }], [{ password: 'x'.repeat(201) }]])(
    'malformed body %j -> 400', async body => {
      await login(body).expect(400);
    });

  test('the response never echoes the password', async () => {
    const res = await login({ password: PASSWORD }).expect(200);
    expect(JSON.stringify(res.headers) + res.text).not.toContain(PASSWORD);
  });

  test('admin responses are not cacheable', async () => {
    const res = await login({ password: PASSWORD }).expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('cookie flags', () => {
  test('HttpOnly, SameSite=Strict, scoped path, 8h Max-Age, not Secure outside production', async () => {
    const cookie = setCookieHeader(await login({ password: PASSWORD }).expect(200));
    expect(cookie).toMatch(/; HttpOnly/);
    expect(cookie).toMatch(/; SameSite=Strict/);
    expect(cookie).toMatch(/; Path=\/api\/admin/);
    expect(cookie).toMatch(/; Max-Age=28800/);
    expect(cookie).not.toMatch(/; Secure/);
  });

  test('Secure when NODE_ENV=production', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const cookie = setCookieHeader(await login({ password: PASSWORD }).expect(200));
      expect(cookie).toMatch(/; Secure/);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});

describe('session validation', () => {
  test('a valid token is accepted', async () => {
    await withCookie('/api/admin/session', session.createToken()).expect(200);
  });

  test('an expired token is rejected', async () => {
    const expired = session.createToken(Date.now() - session.MAX_AGE_MS - 1000);
    await withCookie('/api/admin/session', expired).expect(401);
    await withCookie('/api/admin/projects', expired).expect(401);
  });

  test('a tampered token is rejected', async () => {
    const [body, sig] = session.createToken().split('.');
    const longer = Buffer.from(JSON.stringify({ v: 1, iat: 0, exp: Date.now() * 10, nonce: 'x' })).toString('base64url');
    await withCookie('/api/admin/session', `${longer}.${sig}`).expect(401);
    await withCookie('/api/admin/session', `${body}.${sig.slice(0, -1)}`).expect(401);
    await withCookie('/api/admin/session', 'garbage').expect(401);
  });

  test('a token signed with a different secret is rejected', async () => {
    const original = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = 'some-other-secret-some-other-secret-1234';
    const foreign = session.createToken();
    process.env.SESSION_SECRET = original;
    await withCookie('/api/admin/session', foreign).expect(401);
  });
});

describe('POST /api/admin/logout', () => {
  test('clears the cookie; the agent is logged out afterwards', async () => {
    const agent = await loginAgent(app);
    await agent.get('/api/admin/session').expect(200);
    const res = await agent.post('/api/admin/logout').expect(200);
    const cleared = setCookieHeader(res);
    expect(cleared).toMatch(/^admin_session=;/);
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(cleared).toMatch(/; Path=\/api\/admin/);
    await agent.get('/api/admin/session').expect(401);
  });
});

describe('the old x-admin-pass header', () => {
  test.each([['/api/admin/session'], ['/api/admin/projects'], ['/api/admin/experience']])(
    'no longer authenticates %s, even with the right password', async path => {
      await request(app).get(path).set('x-admin-pass', PASSWORD).expect(401);
    });
});
