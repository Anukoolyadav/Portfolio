const request    = require('supertest');
const db         = require('./helpers/db');
const listen     = require('./helpers/server');
const Project    = require('../src/models/Project');
const Experience = require('../src/models/Experience');
const pageView   = require('../src/services/pageView');

const PASS = 'test-admin-pass';
process.env.ADMIN_PASS = PASS;

const app = listen();
const H   = { 'x-admin-pass': PASS };

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(async () => {
  await db.clear();
  pageView.invalidate();
});

const home = async () => (await request(app).get('/').expect(200)).text;

// Shared suite for both resources.
const RESOURCES = [
  {
    name: 'projects',
    model: Project,
    valid: n => ({ title: `Project ${n}`, highlights: ['Did a thing'], techStack: ['Node.js'] }),
    visibleText: doc => doc.title,
    rename: { title: 'Renamed Project' },
    tooLong: { title: 'x'.repeat(151) },
    tooLongField: 'title',
    urlField: ['links', 'live']
  },
  {
    name: 'experience',
    model: Experience,
    valid: n => ({ type: 'job', company: `Company ${n}`, role: 'Engineer', startDate: '2025-01-01' }),
    visibleText: doc => doc.company,
    rename: { company: 'Renamed Co' },
    tooLong: { company: 'x'.repeat(101) },
    tooLongField: 'company',
    urlField: ['links', 'company']
  }
];

describe.each(RESOURCES)('/api/admin/$name', R => {
  const base = `/api/admin/${R.name}`;
  const create = (n, extra = {}) =>
    request(app).post(base).set(H).send({ ...R.valid(n), ...extra }).expect(201).then(r => r.body);

  describe('auth', () => {
    const fakeId = '64b7f0f0f0f0f0f0f0f0f0f0';
    const calls = [
      ['get',    ''],
      ['post',   ''],
      ['put',    `/${fakeId}`],
      ['delete', `/${fakeId}`],
      ['patch',  `/${fakeId}/publish`],
      ['patch',  '/reorder']
    ];
    test.each(calls)('%s %s without a password -> 401', async (method, path) => {
      await request(app)[method](base + path).send({}).expect(401);
    });
    test.each(calls)('%s %s with a wrong password -> 401', async (method, path) => {
      await request(app)[method](base + path).set('x-admin-pass', 'wrong').send({}).expect(401);
    });
  });

  test('list includes drafts, never seedKey/_id/__v', async () => {
    await create(1);
    await R.model.create({ ...R.valid(2), status: 'published', seedKey: `seed-${R.name}` });
    const res = await request(app).get(base).set(H).expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map(d => d.status).sort()).toEqual(['draft', 'published']);
    for (const d of res.body) {
      expect(d.id).toBeDefined();
      for (const hidden of ['seedKey', '_id', '__v']) expect(d).not.toHaveProperty(hidden);
    }
  });

  test('create defaults to draft and appends to the end of the order', async () => {
    const a = await create(1);
    const b = await create(2);
    expect(a.status).toBe('draft');
    expect(b.order).toBe(a.order + 1);
  });

  describe('validation', () => {
    test('rejects seedKey, order, _id and unknown fields (no mass assignment)', async () => {
      for (const extra of [{ seedKey: 'x' }, { order: 5 }, { _id: '64b7f0f0f0f0f0f0f0f0f0f0' },
                           { createdAt: '2020-01-01' }, { isAdmin: true }]) {
        const res = await request(app).post(base).set(H).send({ ...R.valid(1), ...extra }).expect(400);
        expect(Object.keys(res.body.fields)).toEqual(Object.keys(extra));
      }
      expect(await R.model.countDocuments()).toBe(0);
    });

    test('update also rejects seedKey and never stores it', async () => {
      const doc = await create(1);
      await request(app).put(`${base}/${doc.id}`).set(H).send({ seedKey: 'hijack' }).expect(400);
      const raw = await R.model.collection.findOne({});
      expect(Object.prototype.hasOwnProperty.call(raw, 'seedKey')).toBe(false);
    });

    test('rejects wrong types instead of coercing', async () => {
      const res = await request(app).post(base).set(H)
        .send({ ...R.valid(1), highlights: 'not-an-array', status: 1 }).expect(400);
      expect(res.body.fields).toMatchObject({ highlights: expect.any(String), status: expect.any(String) });
    });

    test('rejects over-long fields', async () => {
      const res = await request(app).post(base).set(H).send({ ...R.valid(1), ...R.tooLong }).expect(400);
      expect(res.body.fields[R.tooLongField]).toMatch(/at most/);
    });

    test.each([['javascript:alert(1)'], ['data:text/html,x'], ['/relative'], ['ftp://x.test']])(
      'rejects non-http(s) URL %s', async url => {
        const [obj, key] = R.urlField;
        const res = await request(app).post(base).set(H).send({ ...R.valid(1), [obj]: { [key]: url } }).expect(400);
        expect(res.body.fields[`${obj}.${key}`]).toMatch(/http/);
      });

    test('rejects unknown nested keys', async () => {
      const [obj] = R.urlField;
      const res = await request(app).post(base).set(H).send({ ...R.valid(1), [obj]: { evil: 'https://x.test' } }).expect(400);
      expect(res.body.fields[`${obj}.evil`]).toBeDefined();
    });

    test('rejects endDate before startDate on update (hooks run on edits)', async () => {
      const doc = await create(1, { startDate: '2025-06-01' });
      const res = await request(app).put(`${base}/${doc.id}`).set(H).send({ endDate: '2025-01-01' }).expect(400);
      expect(res.body.fields.endDate).toBeDefined();
    });

    test('malformed JSON -> 400 without internals', async () => {
      const res = await request(app).post(base).set(H).set('Content-Type', 'application/json').send('{bad').expect(400);
      expect(res.body).toEqual({ error: 'Invalid JSON body.' });
    });

    test('invalid and unknown ids', async () => {
      await request(app).put(`${base}/not-an-id`).set(H).send({}).expect(400);
      await request(app).delete(`${base}/64b7f0f0f0f0f0f0f0f0f0f0`).set(H).expect(404);
    });
  });

  test('update changes whitelisted fields and the public page right away', async () => {
    const doc = await create(1, { status: 'published' });
    expect(await home()).toContain(R.visibleText(R.valid(1)));

    const res = await request(app).put(`${base}/${doc.id}`).set(H).send(R.rename).expect(200);
    expect(res.body).toMatchObject(R.rename);
    const html = await home();
    expect(html).toContain(Object.values(R.rename)[0]);
    expect(html).not.toContain(R.visibleText(R.valid(1)));
  });

  test('publish/unpublish toggles status and the public page right away', async () => {
    await create(1, { status: 'published' });                  // keeps the section non-empty
    const doc = await create(2);
    expect(await home()).not.toContain(R.visibleText(R.valid(2)));

    await request(app).patch(`${base}/${doc.id}/publish`).set(H).send({ published: true }).expect(200);
    expect(await home()).toContain(R.visibleText(R.valid(2)));

    const res = await request(app).patch(`${base}/${doc.id}/publish`).set(H).send({ published: false }).expect(200);
    expect(res.body.status).toBe('draft');
    expect(await home()).not.toContain(R.visibleText(R.valid(2)));

    await request(app).patch(`${base}/${doc.id}/publish`).set(H).send({ published: 'yes' }).expect(400);
    await request(app).patch(`${base}/${doc.id}/publish`).set(H).send({ published: true, status: 'x' }).expect(400);
  });

  test('delete removes it from the page; a deleted seeded entry is not resurrected by the fallback', async () => {
    await create(1, { status: 'published' });
    const seeded = await R.model.create({ ...R.valid(2), status: 'published', seedKey: 'seeded-one' });
    expect(await home()).toContain(R.visibleText(R.valid(2)));

    await request(app).delete(`${base}/${seeded.id}`).set(H).expect(200);
    const html = await home();
    expect(html).not.toContain(R.visibleText(R.valid(2)));
    expect(html).toContain(R.visibleText(R.valid(1)));
    expect(await R.model.countDocuments()).toBe(1);
  });

  test('unpublishing the last published entry shows the empty state, not the seed', async () => {
    const doc = await create(1, { status: 'published' });
    await request(app).patch(`${base}/${doc.id}/publish`).set(H).send({ published: false }).expect(200);
    expect(await home()).toContain(pageView.sections[R.name].empty);
  });

  describe('reorder', () => {
    test('saves the new order with one bulkWrite and updates the page', async () => {
      const docs = [];
      for (const n of [1, 2, 3]) docs.push(await create(n, { status: 'published' }));
      const ids = [docs[2].id, docs[0].id, docs[1].id];

      const spy = jest.spyOn(R.model, 'bulkWrite');
      await request(app).patch(`${base}/reorder`).set(H).send({ ids }).expect(200);
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();

      const list = (await request(app).get(base).set(H).expect(200)).body;
      expect(list.map(d => d.id)).toEqual(ids);

      const html = await home();
      const pos = n => html.indexOf(R.visibleText(R.valid(n)));
      expect(pos(3)).toBeLessThan(pos(1));
      expect(pos(1)).toBeLessThan(pos(2));
    });

    test('rejects bad input', async () => {
      const a = await create(1);
      const b = await create(2);
      for (const body of [{}, { ids: 'x' }, { ids: [a.id, 'nope'] }, { ids: [a.id, a.id] },
                          { ids: [a.id] }, { ids: [a.id, b.id, '64b7f0f0f0f0f0f0f0f0f0f0'] }]) {
        await request(app).patch(`${base}/reorder`).set(H).send(body).expect(400);
      }
    });
  });
});

test('projects: duplicate slug on create or update -> 409', async () => {
  await request(app).post('/api/admin/projects').set(H).send({ title: 'Same', slug: 'same' }).expect(201);
  await request(app).post('/api/admin/projects').set(H).send({ title: 'Other', slug: 'same' }).expect(409);
  const other = (await request(app).post('/api/admin/projects').set(H).send({ title: 'Other' }).expect(201)).body;
  await request(app).put(`/api/admin/projects/${other.id}`).set(H).send({ slug: 'same' }).expect(409);
});

test('projects: featured toggle is saved', async () => {
  const p = (await request(app).post('/api/admin/projects').set(H).send({ title: 'F' }).expect(201)).body;
  expect(p.featured).toBe(false);
  const res = await request(app).put(`/api/admin/projects/${p.id}`).set(H).send({ featured: true }).expect(200);
  expect(res.body.featured).toBe(true);
});
