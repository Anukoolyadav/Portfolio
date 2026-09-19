// Server-side rendering of DB-backed sections into public/index.html.
//
// Per section:
// - DB-rendered HTML is cached until invalidate(name) is called
//   (call it after every admin write to that resource).
// - Seed fallback (published seed entries) ONLY when the DB is not ready, errors,
//   or the collection has zero documents. Fallback output is not cached, so the
//   page switches to DB data once Mongo is up.
// - If documents exist but none are published, the section's empty state is
//   rendered — an admin delete/unpublish is never overridden by the seed file.
const fs   = require('fs');
const path = require('path');
const { isReady } = require('../config/db');

const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'public', 'index.html');
const DATA_DIR      = path.join(__dirname, '..', '..', 'data');

const SECTIONS = [
  require('../views/projectsSection'),
  require('../views/experienceSection')
];

let template = null;
const cache  = new Map();   // section name -> DB-rendered HTML
const seeds  = new Map();   // section name -> published seed items

function loadTemplate() {
  if (template === null) {
    template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    for (const s of SECTIONS) {
      if (!template.includes(s.placeholder)) {
        console.warn(`  ⚠️  ${s.placeholder} not found in index.html — ${s.name} will not render.`);
      }
    }
  }
  return template;
}

function seedPublished(section) {
  if (!seeds.has(section.name)) {
    let items = [];
    try {
      const all = JSON.parse(fs.readFileSync(path.join(DATA_DIR, section.seedFile), 'utf8'))[section.seedKey] || [];
      items = all.filter(i => i.status === 'published')
                 .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } catch (err) {
      console.error(`  Could not read ${section.seedFile}:`, err.name);
    }
    seeds.set(section.name, items);
  }
  return seeds.get(section.name);
}

async function renderSection(section) {
  if (cache.has(section.name)) return cache.get(section.name);
  if (isReady()) {
    try {
      const items = await section.service.listPublished();
      if (items.length || await section.service.hasAny()) {
        const html = section.render(items);   // empty items -> empty state
        cache.set(section.name, html);
        return html;
      }
    } catch (err) {
      console.error(`  ${section.name} render from DB failed, using seed fallback:`, err.name);
    }
  }
  return section.render(seedPublished(section));
}

async function getIndexHtml() {
  let html = loadTemplate();
  for (const section of SECTIONS) {
    const fragment = await renderSection(section);
    html = html.replace(section.placeholder, () => fragment);   // fn: no $-pattern expansion
  }
  return html;
}

// invalidate('projects') / invalidate('experience'); no argument clears everything.
function invalidate(name) {
  if (name === undefined) cache.clear();
  else cache.delete(name);
}

const byName = Object.fromEntries(SECTIONS.map(s => [s.name, s]));
module.exports = { getIndexHtml, invalidate, sections: byName };
