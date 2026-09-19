const db      = require('./helpers/db');
const Project = require('../src/models/Project');

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(db.clear);

describe('Project slug', () => {
  test('is generated from the title', async () => {
    const p = await Project.create({ title: 'Air Quality & PM2.5 — Prediction' });
    expect(p.slug).toBe('air-quality-pm2-5-prediction');
  });

  test('must be unique', async () => {
    await Project.create({ title: 'Same Title' });
    await expect(Project.create({ title: 'Same Title' })).rejects.toMatchObject({ code: 11000 });
    await expect(Project.create({ title: 'Other', slug: 'same-title' })).rejects.toMatchObject({ code: 11000 });
  });

  test('rejects non URL-safe slugs', async () => {
    await expect(Project.create({ title: 'x', slug: 'has spaces!' })).rejects.toThrow(/slug/);
  });
});

describe('Project URL validation', () => {
  test.each([
    ['javascript:alert(1)'],
    ['data:text/html,<script>alert(1)</script>'],
    ['/relative/path'],
    ['ftp://example.com/file']
  ])('rejects %s', async url => {
    await expect(Project.create({ title: 'x', links: { live: url } })).rejects.toThrow(/links\.live/);
  });

  test('accepts http and https', async () => {
    const p = await Project.create({ title: 'x', links: { github: 'https://github.com/a', paper: 'http://example.org' } });
    expect(p.links.github).toBe('https://github.com/a');
  });
});
