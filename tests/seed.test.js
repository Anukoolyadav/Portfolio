const request    = require('supertest');
const db         = require('./helpers/db');
const listen     = require('./helpers/server');
const Project    = require('../src/models/Project');
const Experience = require('../src/models/Experience');
const pageView   = require('../src/services/pageView');
const { RESOURCES, seedAll } = require('../scripts/seed');

const app = listen();
const projectSeed    = require('../data/projects.seed.json').projects;
const experienceSeed = require('../data/experience.seed.json').experience;

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(async () => {
  await db.clear();
  pageView.invalidate();
});

const rawDocs = model => model.collection.find({}).toArray();   // bypasses select:false

test('first seed inserts every entry with its seedKey', async () => {
  const r = await seedAll();
  expect(r.projects.inserted).toBe(projectSeed.length);
  expect(r.experience.inserted).toBe(experienceSeed.length);
  expect((await rawDocs(Project)).map(d => d.seedKey).sort())
    .toEqual(projectSeed.map(p => p.seedKey).sort());
});

test('editing slug of a seeded project, then re-seeding, creates no duplicate', async () => {
  await seedAll();
  await Project.updateOne({ seedKey: projectSeed[0].seedKey }, { slug: 'renamed-by-admin', title: 'Renamed' });

  const r = await seedAll({ only: 'projects' });
  expect(r.projects).toMatchObject({ inserted: 0, backfilled: 0, skipped: projectSeed.length });
  expect(await Project.countDocuments()).toBe(projectSeed.length);
  expect(await Project.exists({ slug: 'renamed-by-admin' })).toBeTruthy();   // admin edit kept
});

test('editing company, role and startDate of seeded experience, then re-seeding, creates no duplicate', async () => {
  await seedAll();
  await Experience.updateOne(
    { seedKey: experienceSeed[0].seedKey },
    { company: 'Edited Co', role: 'Edited Role', startDate: new Date('2020-01-01') }
  );

  const r = await seedAll({ only: 'experience' });
  expect(r.experience.inserted).toBe(0);
  expect(await Experience.countDocuments()).toBe(experienceSeed.length);
  expect(await Experience.exists({ company: 'Edited Co' })).toBeTruthy();
});

test('backfill matches pre-seedKey documents by their old identity, and is idempotent', async () => {
  // Documents as they looked before seedKey existed.
  for (const p of projectSeed) {
    const { seedKey, ...legacy } = p;
    await Project.create(legacy);
  }
  for (const e of experienceSeed) {
    const { seedKey, ...legacy } = e;
    await Experience.create(legacy);
  }

  const first = await seedAll();
  expect(first.projects).toMatchObject({ inserted: 0, backfilled: projectSeed.length });
  expect(first.experience).toMatchObject({ inserted: 0, backfilled: experienceSeed.length });
  expect((await rawDocs(Project)).every(d => d.seedKey)).toBe(true);

  const second = await seedAll();
  expect(second.projects).toMatchObject({ inserted: 0, backfilled: 0, skipped: projectSeed.length });
  expect(second.experience).toMatchObject({ inserted: 0, backfilled: 0, skipped: experienceSeed.length });
  expect(await Project.countDocuments()).toBe(projectSeed.length);
  expect(await Experience.countDocuments()).toBe(experienceSeed.length);
});

test('documents created without a seedKey have the field absent, not null', async () => {
  await Project.create([{ title: 'Admin One' }, { title: 'Admin Two' }]);   // sparse index allows many
  await Experience.create({ type: 'job', company: 'A', role: 'R', startDate: '2025-01-01' });
  for (const d of [...await rawDocs(Project), ...await rawDocs(Experience)]) {
    expect(Object.prototype.hasOwnProperty.call(d, 'seedKey')).toBe(false);
  }
});

test('seedKey is unique per collection', async () => {
  await Project.create({ title: 'A', seedKey: 'dup' });
  await expect(Project.create({ title: 'B', seedKey: 'dup' })).rejects.toMatchObject({ code: 11000 });
});

test('seedKey never appears in public API responses, queries or toJSON', async () => {
  await seedAll();
  await Project.updateMany({}, { status: 'published' });

  for (const path of ['/api/projects', `/api/projects/${projectSeed[0].slug}`, '/api/experience']) {
    const res = await request(app).get(path).expect(200);
    expect(JSON.stringify(res.body)).not.toContain('seedKey');
  }
  const doc = await Project.findOne({});
  expect(doc.seedKey).toBeUndefined();                          // select: false
  const withKey = await Project.findOne({}).select('+seedKey');
  expect(withKey.seedKey).toBeDefined();
  expect(JSON.stringify(withKey.toJSON())).not.toContain('seedKey');
});

test('every seed entry declares a seedKey', () => {
  for (const r of Object.values(RESOURCES)) {
    for (const item of require(`../data/${r.file}`)[r.key]) expect(item.seedKey).toMatch(/\S/);
  }
});
