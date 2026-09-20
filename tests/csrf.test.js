// Same-origin (CSRF) checks on state-changing admin requests.
const request = require('supertest');
const listen  = require('./helpers/server');
const { PASSWORD, originOf, loginAgent } = require('./helpers/auth');

const app = listen();
let admin, origin, host;

beforeAll(async () => {
  admin  = await loginAgent(app);
  origin = originOf(app);
  host   = `127.0.0.1:${app.address().port}`;
});

const cookie = () => admin.jar.getCookies({ domain: '127.0.0.1', path: '/api/admin', secure: false, script: false })
  .map(c => c.toValueString()).join('; ');

describe('login (POST) requires a same-origin request', () => {
  test.each([
    ['no Origin or Referer', {}],
    ['cross-site Origin',    { Origin: 'https://evil.example' }],
    ['opaque Origin',        { Origin: 'null' }],
    ['cross-site Referer',   { Referer: 'https://evil.example/page' }],
    ['malformed Origin',     { Origin: 'not-a-url' }]
  ])('%s -> 403', async (_label, headers) => {
    const res = await request(app).post('/api/admin/login').set(headers).send({ password: PASSWORD }).expect(403);
    expect(res.body).toEqual({ error: 'Cross-site request blocked.' });
    expect(res.headers['set-cookie']).toBeUndefined();   // no session handed out
  });

  test('same-origin Origin -> allowed', async () => {
    await request(app).post('/api/admin/login').set('Origin', origin).send({ password: PASSWORD }).expect(200);
  });

  test('Referer is accepted when Origin is absent', async () => {
    await request(app).post('/api/admin/login').set('Referer', `${origin}/admin.html`).send({ password: PASSWORD }).expect(200);
  });
});

describe('authenticated writes', () => {
  const write = headers => request(app).post('/api/admin/projects')
    .set('Cookie', cookie()).set(headers).send({ title: 'CSRF probe' });

  test('a valid session cookie is not enough without a same-origin Origin', async () => {
    await write({ Origin: 'https://evil.example' }).expect(403);
    await write({}).expect(403);
    expect(cookie()).toMatch(/admin_session=/);   // the cookie really was sent
  });

  test('the same request with a same-origin Origin passes the CSRF check', async () => {
    const res = await write({ Origin: origin });
    expect([201, 503]).toContain(res.status);     // 503 only if no DB is connected here
    expect(res.status).not.toBe(403);
  });

  test('Origin must match the Host header exactly, including port', async () => {
    await write({ Origin: `http://127.0.0.1:1${app.address().port}` }).expect(403);
    await write({ Origin: `http://${host}` }).then(r => expect(r.status).not.toBe(403));
  });
});

describe('safe methods are unaffected', () => {
  test.each([['/api/admin/session'], ['/api/admin/projects']])('GET %s without Origin -> not 403', async path => {
    const res = await request(app).get(path).set('Cookie', cookie());
    expect(res.status).not.toBe(403);
  });

  test('public GETs never require Origin', async () => {
    await request(app).get('/').expect(200);
    await request(app).get('/health').expect(200);
  });
});
