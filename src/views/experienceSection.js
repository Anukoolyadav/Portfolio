// Experience & Internship timeline of index.html. Markup mirrors the original cards.
const { escapeHtml, formatMonth, formatEnd, techLink, bulletList } = require('./helpers');

const EMPTY = '      <p class="section-empty">No experience to show right now — check back soon.</p>';

// "veriterra.in" from "https://www.veriterra.in/..." — used as the company link label.
function hostLabel(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Website'; }
}

function renderItem(e) {
  const role   = e.location ? `${e.role} · ${e.location}` : e.role;
  const period = `${formatMonth(e.startDate)} – ${formatEnd(e.endDate)}`;

  // The page lists the stack as a final "Stack: a, b, c." bullet rather than tags.
  const bullets = [...(e.highlights || [])];
  if ((e.techStack || []).length) bullets.push(`Stack: ${e.techStack.join(', ')}.`);

  const links = [
    techLink(e.links?.company,     'fas fa-external-link-alt', escapeHtml(hostLabel(e.links?.company))),
    techLink(e.links?.certificate, 'fas fa-certificate',       'Certificate'),
    techLink(e.links?.other,       'fas fa-link',              'Link')
  ].join('');

  return '      <div class="tl-item">\n' +
         '        <div class="tl-card">\n' +
         '          <div class="tl-head">\n' +
         `            <div><div class="tl-company">${escapeHtml(e.company)}</div><div class="tl-role">${escapeHtml(role)}</div></div>\n` +
         `            <span class="tl-period">${escapeHtml(period)}</span>\n` +
         '          </div>\n' +
         bulletList(bullets, '          ') +
         (links ? `          <div class="tech-row">${links}</div>\n` : '') +
         '        </div>\n' +
         '      </div>';
}

module.exports = {
  name:        'experience',
  placeholder: '<!--#EXPERIENCE#-->',
  service:     require('../services/experienceService'),
  seedFile:    'experience.seed.json',
  seedKey:     'experience',
  empty:       EMPTY,
  render:      items => (items.length ? items.map(renderItem).join('\n') : EMPTY)
};
