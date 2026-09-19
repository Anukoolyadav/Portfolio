const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Escape a value for use in HTML text or a quoted attribute. null/undefined -> ''.
module.exports = function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => MAP[ch]);
};
