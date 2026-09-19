// Writable fields per resource. Anything not listed here (seedKey, order, _id,
// timestamps, …) is rejected by sanitize(). Order changes go through /reorder.
const { stringObject, objectList } = require('./sanitize');

exports.project = {
  title:      'string',
  slug:       'string',
  summary:    'string',
  highlights: 'strings',
  body:       'string',
  techStack:  'strings',
  category:   'string',
  role:       'string',
  startDate:  'dateOrNull',
  endDate:    'dateOrNull',
  icon:       'string',
  coverImage: stringObject(['url', 'alt']),
  links:      stringObject(['github', 'live', 'paper', 'video']),
  metrics:    objectList(['label', 'value']),
  featured:   'boolean',
  status:     'string'
};

exports.experience = {
  type:       'string',
  company:    'string',
  role:       'string',
  location:   'string',
  startDate:  'date',
  endDate:    'dateOrNull',
  highlights: 'strings',
  techStack:  'strings',
  links:      stringObject(['company', 'certificate', 'other']),
  status:     'string'
};
