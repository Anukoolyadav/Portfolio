const request    = require('supertest');
const db         = require('./helpers/db');
const Experience = require('../src/models/Experience');
const pageView   = require('../src/services/pageView');
const listen  = require('./helpers/server');
const seed = require('../data/experience.seed.json').experience;

const app  = listen();
const base = { type: 'job', role: 'Engineer', startDate: '2025-01-01' };
const { empty: EMPTY, placeholder: PLACEHOLDER } = pageView.sections.experience;

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(async () => {
  await db.clear();
  pageView.invalidate();
});

const section = html => {
  const start = html.indexOf('<section id="experience">');
  return html.slice(start, html.indexOf('</section>', start));
};
const get = async () => section((await request(app).get('/').expect(200)).text);
const seedCompany = seed.find(e => e.status === 'published').company;

test('renders period, Present for ongoing, stack bullet and host-named link', async () => {
  await Experience.create({
    ...base, company: 'Acme', startDate: '2025-01-01', endDate: null, status: 'published',
    highlights: ['Did things.'], techStack: ['Node.js', 'MongoDB'],
    links: { company: 'https://www.acme.test/about' }
  });
  const html = await get();
  expect(html).toContain('<span class="tl-period">Jan 2025 – Present</span>');
  expect(html).toContain('<li>Stack: Node.js, MongoDB.</li>');
  expect(html).toContain('<i class="fas fa-external-link-alt"></i> acme.test</a>');
});

test('escapes an XSS payload in every rendered field', async () => {
  await Experience.create({
    ...base,
    company:    '<script>alert(1)</script>',
    role:       '<img src=x onerror=alert(2)>',
    location:   '"><svg onload=alert(3)>',
    highlights: ['<b onmouseover="alert(4)">hi</b>'],
    techStack:  ['<i onclick=x>'],
    status:     'published'
  });
  const html = await get();
  expect(html).toContain('<div class="tl-company">&lt;script&gt;alert(1)&lt;/script&gt;</div>');
  expect(html).toContain('<div class="tl-role">&lt;img src=x onerror=alert(2)&gt; · &quot;&gt;&lt;svg onload=alert(3)&gt;</div>');
  expect(html).toContain('<li>&lt;b onmouseover=&quot;alert(4)&quot;&gt;hi&lt;/b&gt;</li>');
  expect(html).toContain('<li>Stack: &lt;i onclick=x&gt;.</li>');
  expect(html).not.toMatch(/<script|<img|<svg|<b |<i onclick/);
});

test('a javascript: link that bypassed validation is still not rendered', async () => {
  // Insert straight into the collection, skipping mongoose validation.
  await Experience.collection.insertOne({
    ...base, startDate: new Date('2025-01-01'), company: 'Bypass Co', status: 'published',
    links: { company: 'javascript:alert(1)', other: 'https://ok.test' }
  });
  const html = await get();
  expect(html).toContain('Bypass Co');
  expect(html).not.toContain('javascript:');
  expect(html).toContain('href="https://ok.test"');
});

test('does not render drafts', async () => {
  await Experience.create([
    { ...base, company: 'Visible Co', status: 'published' },
    { ...base, company: 'Hidden Draft Co', status: 'draft' }
  ]);
  const html = await get();
  expect(html).toContain('Visible Co');
  expect(html).not.toContain('Hidden Draft Co');
});

test('cached until invalidate("experience"); invalidating projects does not refresh it', async () => {
  const e = await Experience.create({ ...base, company: 'Original Co', status: 'published' });
  expect(await get()).toContain('Original Co');

  await Experience.updateOne({ _id: e._id }, { company: 'Updated Co' });
  pageView.invalidate('projects');
  expect(await get()).toContain('Original Co');

  pageView.invalidate('experience');
  expect(await get()).toContain('Updated Co');
});

test('empty collection -> published seed entries', async () => {
  const html = await get();
  expect(html).toContain(`<div class="tl-company">${seedCompany}</div>`);
  expect(html).not.toContain(EMPTY);
});

test('documents exist but none published -> empty state, never the seed', async () => {
  await Experience.create({ ...base, company: 'Draft Only Co', status: 'draft' });
  const html = await get();
  expect(html).toContain(EMPTY);
  expect(html).not.toContain(seedCompany);
  expect(html).not.toContain('Draft Only Co');
});

test('the raw template placeholder is never served', async () => {
  for (const path of ['/', '/index.html']) {
    const res = await request(app).get(path).expect(200);
    expect(res.text).not.toContain(PLACEHOLDER);
  }
});
