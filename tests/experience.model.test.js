const db         = require('./helpers/db');
const Experience = require('../src/models/Experience');

const base = { type: 'job', company: 'Acme', role: 'Engineer', startDate: '2025-01-01' };

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(db.clear);

describe('Experience validation', () => {
  test('requires type, company, role and startDate', async () => {
    await expect(Experience.create({})).rejects.toThrow(/type|company|role|startDate/);
  });

  test('rejects unknown types', async () => {
    await expect(Experience.create({ ...base, type: 'contract' })).rejects.toThrow(/type/);
  });

  test('rejects endDate before startDate', async () => {
    await expect(Experience.create({ ...base, endDate: '2024-12-01' })).rejects.toThrow(/endDate/);
  });

  test('defaults to draft and ongoing', async () => {
    const e = await Experience.create(base);
    expect(e.status).toBe('draft');
    expect(e.endDate).toBeNull();
    expect(e.toJSON().id).toBeDefined();
  });

  test.each([
    ['javascript:alert(1)'],
    ['data:text/html,<script>alert(1)</script>'],
    ['/relative/path'],
    ['ftp://example.com/file']
  ])('rejects link %s', async url => {
    for (const key of ['company', 'certificate', 'other']) {
      await expect(Experience.create({ ...base, links: { [key]: url } })).rejects.toThrow(new RegExp(`links\\.${key}`));
    }
  });

  test('accepts http and https links', async () => {
    const e = await Experience.create({ ...base, links: { company: 'https://acme.test', certificate: 'http://acme.test/c.pdf' } });
    expect(e.links.company).toBe('https://acme.test');
  });
});
