// "Air Quality & PM2.5 — Deep Learning" -> "air-quality-pm2-5-deep-learning"
module.exports = function slugify(text, maxLength = 80) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')   // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '');
};
