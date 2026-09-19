const Project           = require('../models/Project');
const makePublicService = require('./publicContent');

const service = makePublicService(Project, [
  'title', 'slug', 'summary', 'highlights', 'body', 'techStack', 'category', 'role',
  'startDate', 'endDate', 'icon', 'coverImage', 'links', 'metrics', 'featured', 'order'
]);

async function getPublishedBySlug(slug) {
  if (typeof slug !== 'string' || slug.length > 80) return null;
  return service.findOnePublished({ slug });
}

module.exports = { ...service, getPublishedBySlug };
