// Server-side rendering of the Projects section into public/index.html.
//
// - DB results are cached as full page HTML until invalidate() is called
//   (call it after every admin write).
// - If the DB is not ready, errors, or has no published projects, the seed file
//   (published entries only) is rendered instead so the section never breaks.
//   Fallback output is not cached, so the page switches to DB data once Mongo is up.
const fs   = require('fs');
const path = require('path');

const escapeHtml  = require('../utils/escapeHtml');
const isHttpUrl   = require('../utils/isHttpUrl');
const { isReady } = require('../config/db');
const projects    = require('./projectService');

const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'public', 'index.html');
const SEED_PATH     = path.join(__dirname, '..', '..', 'data', 'projects.seed.json');
const PLACEHOLDER   = '<!--#PROJECTS#-->';

const LINK_LABELS = [
  ['github', 'fab fa-github',          'GitHub'],
  ['live',   'fas fa-external-link-alt', 'Live'],
  ['paper',  'fas fa-file-alt',        'Paper'],
  ['video',  'fas fa-play',            'Video']
];

let template  = null;
let cached    = null;   // full page HTML rendered from DB data
let seedItems = null;

function loadTemplate() {
  if (template === null) {
    template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    if (!template.includes(PLACEHOLDER)) {
      console.warn(`  ⚠️  ${PLACEHOLDER} not found in index.html — projects will not render.`);
    }
  }
  return template;
}

function loadSeedPublished() {
  if (seedItems === null) {
    try {
      const { projects: all = [] } = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
      seedItems = all.filter(p => p.status === 'published')
                     .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } catch (err) {
      console.error('  Could not read projects seed file:', err.name);
      seedItems = [];
    }
  }
  return seedItems;
}

// "Oct 2025" — UTC so a 1st-of-month date never shifts to the previous month.
function formatMonth(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function renderDates(p) {
  if (!p.startDate) return '';
  const end = p.endDate ? formatMonth(p.endDate) : 'Present';
  return `          <div class="proj-date">${escapeHtml(formatMonth(p.startDate))}<br>${escapeHtml(end)}</div>\n`;
}

function renderLinks(links = {}) {
  const items = LINK_LABELS
    .filter(([key]) => isHttpUrl(links[key]))
    .map(([key, icon, label]) =>
      `<a class="tech" href="${escapeHtml(links[key])}" target="_blank" rel="noopener noreferrer" ` +
      `style="text-decoration:none"><i class="${icon}"></i> ${label}</a>`);
  return items.length ? `          <div class="tech-row">${items.join('')}</div>\n` : '';
}

function renderProject(p) {
  const icon       = p.icon ? `          <div class="proj-icon">${escapeHtml(p.icon)}</div>\n` : '';
  const highlights = (p.highlights || []).length
    ? '          <ul>\n' +
      p.highlights.map(h => `            <li>${escapeHtml(h)}</li>\n`).join('') +
      '          </ul>\n'
    : '';
  const tech = (p.techStack || []).length
    ? `          <div class="tech-row">${p.techStack.map(t => `<span class="tech">${escapeHtml(t)}</span>`).join('')}</div>\n`
    : '';

  return '      <div class="proj-row reveal">\n' +
         '        <div class="proj-row-left">\n' +
         icon +
         renderDates(p) +
         '        </div>\n' +
         '        <div>\n' +
         `          <h3>${escapeHtml(p.title)}</h3>\n` +
         highlights +
         tech +
         renderLinks(p.links) +
         '        </div>\n' +
         '      </div>';
}

function renderSection(items) {
  if (!items.length) {
    return '      <p class="proj-empty" style="color:var(--muted)">Projects coming soon.</p>';
  }
  return items.map(renderProject).join('\n');
}

function renderPage(items) {
  return loadTemplate().replace(PLACEHOLDER, () => renderSection(items));
}

async function getIndexHtml() {
  if (cached) return cached;
  if (isReady()) {
    try {
      const items = await projects.listPublished();
      if (items.length) {
        cached = renderPage(items);
        return cached;
      }
    } catch (err) {
      console.error('  Projects render from DB failed, using seed fallback:', err.name);
    }
  }
  return renderPage(loadSeedPublished());
}

function invalidate() {
  cached = null;
}

module.exports = { getIndexHtml, invalidate, renderSection, PLACEHOLDER };
