const request    = require('supertest');
const db         = require('./helpers/db');
const Experience = require('../src/models/Experience');
const { createApp } = require('../app');
const { PUBLIC_FIELDS } = require('../src/services/experienceService');

const app  = createApp();
const base = { type: 'job', role: 'Engineer', startDate: '2025-01-01' };

beforeAll(db.connect);
afterAll(db.disconnect);

beforeEach(async () => {
  await db.clear();
  await Experience.create([
    { ...base, company: 'Second Co', status: 'published', order: 2 },
    { ...base, company: 'Secret Draft Co', status: 'draft', order: 0 },
    { ...base, company: 'First Co', status: 'published', order: 1, type: 'internship' }
  ]);
});

describe('GET /api/experience', () => {
  test('returns published entries only, sorted by order', async () => {
    const res = await request(app).get('/api/experience').expect(200);
    expect(res.body.map(e => e.company)).toEqual(['First Co', 'Second Co']);
    expect(JSON.stringify(res.body)).not.toContain('Secret Draft Co');
  });

  test('never exposes internal fields', async () => {
    const res = await request(app).get('/api/experience').expect(200);
    for (const e of res.body) {
      for (const key of Object.keys(e)) expect(PUBLIC_FIELDS).toContain(key);
      for (const hidden of ['status', '_id', '__v', 'createdAt', 'updatedAt', 'id']) {
        expect(e).not.toHaveProperty(hidden);
      }
    }
  });
});
