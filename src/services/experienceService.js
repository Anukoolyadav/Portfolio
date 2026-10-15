const Experience        = require('../models/Experience');
const makePublicService = require('./publicContent');

module.exports = makePublicService(Experience, [
  'type', 'company', 'role', 'location', 'startDate', 'endDate',
  'highlights', 'techStack', 'links', 'order'
]);
