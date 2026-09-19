// Shared helpers for server-rendered sections.
const escapeHtml = require('../utils/escapeHtml');
const isHttpUrl  = require('../utils/isHttpUrl');

// "Oct 2025" — UTC so a 1st-of-month date never shifts to the previous month.
function formatMonth(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// End of a date range: null/undefined endDate means ongoing.
const formatEnd = endDate => (endDate ? formatMonth(endDate) : 'Present');

// <a class="tech"> external link used in project and experience cards.
// Returns '' unless the URL is http(s). `icon` and `label` are trusted constants
// or must already be escaped by the caller.
function techLink(url, icon, label) {
  if (!isHttpUrl(url)) return '';
  return `<a class="tech" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" ` +
         `style="text-decoration:none"><i class="${icon}"></i> ${label}</a>`;
}

// Bulleted list at the given indentation; '' when there are no items.
function bulletList(items, indent) {
  if (!items.length) return '';
  return `${indent}<ul>\n` +
         items.map(i => `${indent}  <li>${escapeHtml(i)}</li>\n`).join('') +
         `${indent}</ul>\n`;
}

module.exports = { escapeHtml, isHttpUrl, formatMonth, formatEnd, techLink, bulletList };
