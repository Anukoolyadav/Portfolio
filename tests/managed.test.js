// "Managed collection" markers: no seed resurrection after admin deletes.
const request    = require('supertest');
const db         = require('./helpers/db');
const listen     = require('./helpers/server');
const Project    = require('../src/models/Project');
const Experience = require('../src/models/Experience');
const Setting    = require('../src/models/Setting');
const pageView   = require('../src/services/pageView');
const { isManaged } = require('../src/services/managedCollections');
const { seedAll } = require('../scripts/seed');

const PASS = 'test-admin-pass';
process.env.ADMIN_PASS = PASS;
const H = { 'x-admin-pass': PASS };

const app = listen();
const projectSeed    = require('../data/projects.seed.json').projects;
const experienceSeed = require('../data/experience.seed.json').experience;
const firstPublished = projectSeed.find(p => p.status === 'published');

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(async () => {
  await db.clear();
  pageView.invalidate();
});

const home = async () => (await request(app).get('/').expect(200)).text;
const seedTitle = firstPublished.title.replace(/&/g, '&amp;');

test('fresh DB, unmanaged empty collections -> seed fallback', async () => {
  expect(await isManaged('projects')).toBe(false);
  const html = await home();
  expect(html).toContain(`<h3>${seedTitle}</h3>`);
  expect(html).toContain(`<div class="tl-company">${experienceSeed[0].company}</div>`);
});

describe.each([
  ['projects',   '/api/admin/projects'],
  ['experience', '/api/admin/experience']
])('%s: deleting everything in the admin', (name, base) => {
  test('keeps the empty state — no seed resurrection', async () => {
    await seedAll({ only: name });
    const list = (await request(app).get(base).set(H).expect(200)).body;
    expect(list.length).toBeGreaterThan(0);
    for (const d of list) await request(app).delete(`${base}/${d.id}`).set(H).expect(200);

    const html = await home();
    expect(html).toContain(pageView.sections[name].empty);
    expect(await isManaged(name)).toBe(true);
  });
});

test('any successful admin write marks the collection managed; failed writes do not', async () => {
  await request(app).post('/api/admin/projects').set(H).send({ title: '' }).expect(400);
  expect(await isManaged('projects')).toBe(false);
  await request(app).post('/api/admin/projects').set(H).send({ title: 'Managed now' }).expect(201);
  expect(await isManaged('projects')).toBe(true);
  expect(await isManaged('experience')).toBe(false);
});

test('marker set directly + empty collection -> empty state, not seed', async () => {
  await Setting.create({ key: 'managed:experience', managed: true });
  const html = await home();
  expect(html).toContain(pageView.sections.experience.empty);
  expect(html).toContain(`<h3>${seedTitle}</h3>`);   // projects still unmanaged -> seed
});

describe('seed script and markers', () => {
  test('first seed inserts and marks; a second run skips managed collections', async () => {
    const first = await seedAll();
    expect(first.projects.inserted).toBe(projectSeed.length);
    expect(await isManaged('projects')).toBe(true);
    expect(await seedAll()).toEqual({ projects: { skippedManaged: true }, experience: { skippedManaged: true } });
  });

  test('re-seed after an admin delete does not recreate the entry; --force does', async () => {
    await seedAll({ only: 'projects' });
    const target = await Project.findOne({ seedKey: firstPublished.seedKey });
    await request(app).delete(`/api/admin/projects/${target.id}`).set(H).expect(200);

    expect((await seedAll({ only: 'projects' })).projects).toEqual({ skippedManaged: true });
    expect(await Project.exists({ seedKey: firstPublished.seedKey })).toBeNull();

    const forced = await seedAll({ only: 'projects', force: true });
    expect(forced.projects.inserted).toBe(1);
    expect(await Project.exists({ seedKey: firstPublished.seedKey })).toBeTruthy();
  });

  test('--update on a managed collection is skipped unless forced', async () => {
    await seedAll({ only: 'experience' });
    await Experience.updateOne({ seedKey: experienceSeed[0].seedKey }, { role: 'Edited in admin' });

    expect((await seedAll({ only: 'experience', update: true })).experience).toEqual({ skippedManaged: true });
    expect(await Experience.exists({ role: 'Edited in admin' })).toBeTruthy();

    await seedAll({ only: 'experience', update: true, force: true });
    expect(await Experience.exists({ role: 'Edited in admin' })).toBeNull();
  });

  test('backfill still works on collections without a marker', async () => {
    const { seedKey, ...legacy } = projectSeed[0];
    await Project.create(legacy);
    const r = await seedAll({ only: 'projects' });
    expect(r.projects).toMatchObject({ backfilled: 1, inserted: projectSeed.length - 1 });
  });
});

test('the marker is exposed by no API', async () => {
  await seedAll();
  await Project.updateMany({}, { status: 'published' });
  const responses = [
    await request(app).get('/api/projects'),
    await request(app).get('/api/experience'),
    await request(app).get('/api/admin/projects').set(H),
    await request(app).get('/api/admin/experience').set(H),
    await request(app).get('/')
  ];
  for (const res of responses) {
    expect(res.status).toBe(200);
    expect(res.text).not.toMatch(/managed:|"managed"/);
  }
  for (const path of ['/api/settings', '/api/admin/settings']) {
    await request(app).get(path).set(H).expect(404);
  }
});

test('this file runs on its own isolated database', () => {
  expect(db.DB_NAME).toMatch(/^portfolio_test_\d+_\d+$/);
});

test('importing the app and seed script never loads the real .env', () => {
  // tests/setup.js removes these; .env would define them if dotenv had run.
  expect(process.env.MONGODB_URI).toBeUndefined();
  expect(process.env.PORT).toBeUndefined();
});
