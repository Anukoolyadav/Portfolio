const request      = require('supertest');
const db           = require('./helpers/db');
const Project      = require('../src/models/Project');
const projectsView = require('../src/services/projectsView');
const { createApp } = require('../app');
const seed = require('../data/projects.seed.json').projects;

const app = createApp();

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(async () => {
  await db.clear();
  projectsView.invalidate();
});

const projectsSection = html =>
  html.slice(html.indexOf('<section id="projects">'), html.indexOf('</section>', html.indexOf('<section id="projects">')));

test('escapes an XSS payload in every rendered field', async () => {
  await Project.create({
    title: '<script>alert("t")</script>',
    icon: '<i onclick=x>',                        // fits the 16-char icon limit
    highlights: ['<b onmouseover="alert(2)">hi</b>'],
    techStack: ['"><svg onload=alert(3)>'],
    status: 'published'
  });

  const res = await request(app).get('/').expect(200);
  const section = projectsSection(res.text);

  expect(section).toContain('<h3>&lt;script&gt;alert(&quot;t&quot;)&lt;/script&gt;</h3>');
  expect(section).toContain('<div class="proj-icon">&lt;i onclick=x&gt;</div>');
  expect(section).toContain('<li>&lt;b onmouseover=&quot;alert(2)&quot;&gt;hi&lt;/b&gt;</li>');
  expect(section).toContain('<span class="tech">&quot;&gt;&lt;svg onload=alert(3)&gt;</span>');
  // No payload survives as a real tag
  expect(section).not.toMatch(/<script|<svg|<b |<i onclick/);
});

test('does not render drafts', async () => {
  await Project.create([
    { title: 'Visible Project', status: 'published' },
    { title: 'Hidden Draft',    status: 'draft' }
  ]);
  const res = await request(app).get('/').expect(200);
  expect(res.text).toContain('Visible Project');
  expect(res.text).not.toContain('Hidden Draft');
});

test('serves cached HTML until invalidate() is called', async () => {
  await Project.create({ title: 'Original Title', status: 'published' });
  expect((await request(app).get('/')).text).toContain('Original Title');

  await Project.updateOne({}, { title: 'Updated Title' });
  expect((await request(app).get('/')).text).toContain('Original Title');   // still cached

  projectsView.invalidate();
  expect((await request(app).get('/')).text).toContain('Updated Title');
});

test('the raw template placeholder is never served', async () => {
  await Project.create({ title: 'Anything', status: 'published' });
  for (const path of ['/', '/index.html']) {
    const res = await request(app).get(path).expect(200);
    expect(res.text).not.toContain(projectsView.PLACEHOLDER);
  }
});

describe('seed fallback vs empty state (DB connected)', () => {
  const seedTitle = seed.find(p => p.status === 'published').title.replace(/&/g, '&amp;');

  test('empty collection -> published seed projects', async () => {
    const res = await request(app).get('/').expect(200);
    expect(res.text).toContain(`<h3>${seedTitle}</h3>`);
    expect(res.text).not.toContain('class="section-empty"');
  });

  test('documents exist but none published -> empty state, never the seed', async () => {
    await Project.create({ title: 'Unpublished Only', status: 'draft' });
    const res = await request(app).get('/').expect(200);
    expect(res.text).toContain(projectsView.EMPTY_PROJECTS);
    expect(res.text).not.toContain(seedTitle);
    expect(res.text).not.toContain('Unpublished Only');
  });

  test('unpublishing the last project switches to the empty state after invalidate()', async () => {
    const p = await Project.create({ title: 'Live One', status: 'published' });
    expect((await request(app).get('/')).text).toContain('Live One');

    await Project.updateOne({ _id: p._id }, { status: 'draft' });
    projectsView.invalidate();
    const html = (await request(app).get('/')).text;
    expect(html).toContain(projectsView.EMPTY_PROJECTS);
    expect(html).not.toContain(seedTitle);
  });
});
