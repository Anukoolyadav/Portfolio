// Projects section of index.html. Markup mirrors the original hand-written rows.
const { escapeHtml, formatMonth, formatEnd, techLink, bulletList } = require('./helpers');

const LINKS = [
  ['github', 'fab fa-github',             'GitHub'],
  ['live',   'fas fa-external-link-alt',  'Live'],
  ['paper',  'fas fa-file-alt',           'Paper'],
  ['video',  'fas fa-play',               'Video']
];

const EMPTY = '      <p class="section-empty">No projects to show right now — check back soon.</p>';

function renderItem(p) {
  const icon  = p.icon ? `          <div class="proj-icon">${escapeHtml(p.icon)}</div>\n` : '';
  const dates = p.startDate
    ? `          <div class="proj-date">${escapeHtml(formatMonth(p.startDate))}<br>${escapeHtml(formatEnd(p.endDate))}</div>\n`
    : '';
  const tech = (p.techStack || []).length
    ? `          <div class="tech-row">${p.techStack.map(t => `<span class="tech">${escapeHtml(t)}</span>`).join('')}</div>\n`
    : '';
  const links = LINKS.map(([key, iconClass, label]) => techLink(p.links?.[key], iconClass, label)).join('');

  return '      <div class="proj-row reveal">\n' +
         '        <div class="proj-row-left">\n' +
         icon +
         dates +
         '        </div>\n' +
         '        <div>\n' +
         `          <h3>${escapeHtml(p.title)}</h3>\n` +
         bulletList(p.highlights || [], '          ') +
         tech +
         (links ? `          <div class="tech-row">${links}</div>\n` : '') +
         '        </div>\n' +
         '      </div>';
}

module.exports = {
  name:        'projects',
  placeholder: '<!--#PROJECTS#-->',
  service:     require('../services/projectService'),
  seedFile:    'projects.seed.json',
  seedKey:     'projects',
  empty:       EMPTY,
  render:      items => (items.length ? items.map(renderItem).join('\n') : EMPTY)
};
