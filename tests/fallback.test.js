// No DB connection in this file: simulates Mongo being down or unconfigured.
const request = require('supertest');
const listen  = require('./helpers/server');
const seed = require('../data/projects.seed.json').projects;

const app  = listen();

test('home page renders published seed projects when the DB is down', async () => {
  const res = await request(app).get('/').expect(200);
  const published = seed.filter(p => p.status === 'published');
  expect(published.length).toBeGreaterThan(0);

  for (const p of published) {
    const escapedTitle = p.title.replace(/&/g, '&amp;');
    expect(res.text).toContain(`<h3>${escapedTitle}</h3>`);
  }
});

test('draft seed projects are not rendered in the fallback', async () => {
  const res = await request(app).get('/').expect(200);
  for (const p of seed.filter(s => s.status === 'draft')) {
    expect(res.text).not.toContain(p.title);
  }
});

test('public API reports 503 instead of hanging when the DB is down', async () => {
  const res = await request(app).get('/api/projects').expect(503);
  expect(res.body.error).toMatch(/Database not ready/);
});

describe('experience fallback (DB down)', () => {
  const expSeed = require('../data/experience.seed.json').experience;

  test('renders published seed entries', async () => {
    const res = await request(app).get('/').expect(200);
    for (const e of expSeed.filter(x => x.status === 'published')) {
      expect(res.text).toContain(`<div class="tl-company">${e.company}</div>`);
    }
  });

  test('public API reports 503', async () => {
    await request(app).get('/api/experience').expect(503);
  });
});

test('admin CRUD returns 503 (not a hang) when the DB is down, once authenticated', async () => {
  process.env.ADMIN_PASS = 'test-admin-pass';
  for (const path of ['/api/admin/projects', '/api/admin/experience']) {
    await request(app).get(path).expect(401);
    const res = await request(app).get(path).set('x-admin-pass', 'test-admin-pass').expect(503);
    expect(res.body.error).toMatch(/Database not ready/);
  }
  // Login check has no DB dependency.
  await request(app).get('/api/admin/session').set('x-admin-pass', 'test-admin-pass').expect(200);
});
