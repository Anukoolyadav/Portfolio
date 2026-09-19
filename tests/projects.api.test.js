const request = require('supertest');
const db      = require('./helpers/db');
const Project = require('../src/models/Project');
const listen  = require('./helpers/server');
const { PUBLIC_FIELDS } = require('../src/services/projectService');

const app  = listen();

beforeAll(db.connect);
afterAll(db.disconnect);

beforeEach(async () => {
  await db.clear();
  await Project.create([
    { title: 'Second Published', status: 'published', order: 2 },
    { title: 'Secret Draft',     status: 'draft',     order: 0 },
    { title: 'First Published',  status: 'published', order: 1 }
  ]);
});

describe('GET /api/projects', () => {
  test('returns published projects only, sorted by order', async () => {
    const res = await request(app).get('/api/projects').expect(200);
    expect(res.body.map(p => p.title)).toEqual(['First Published', 'Second Published']);
    expect(JSON.stringify(res.body)).not.toContain('Secret Draft');
  });

  test('never exposes internal fields', async () => {
    const res = await request(app).get('/api/projects').expect(200);
    for (const p of res.body) {
      for (const key of Object.keys(p)) expect(PUBLIC_FIELDS).toContain(key);
      expect(p).not.toHaveProperty('status');
      expect(p).not.toHaveProperty('_id');
      expect(p).not.toHaveProperty('__v');
      expect(p).not.toHaveProperty('createdAt');
    }
  });
});

describe('GET /api/projects/:slug', () => {
  test('returns a published project', async () => {
    const res = await request(app).get('/api/projects/first-published').expect(200);
    expect(res.body.title).toBe('First Published');
    expect(res.body).not.toHaveProperty('status');
  });

  test('404 for a draft', async () => {
    const res = await request(app).get('/api/projects/secret-draft').expect(404);
    expect(res.body).toEqual({ error: 'Project not found.' });
  });

  test('404 for an unknown slug', async () => {
    await request(app).get('/api/projects/does-not-exist').expect(404);
  });
});
