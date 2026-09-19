// No DB connection in this file: simulates Mongo being down or unconfigured.
const request = require('supertest');
const { createApp } = require('../app');
const seed = require('../data/projects.seed.json').projects;

const app = createApp();

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
