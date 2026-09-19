const Project = require('../models/Project');

// The only fields the public ever sees. Never status, _id, __v or timestamps.
const PUBLIC_FIELDS = [
  'title', 'slug', 'summary', 'highlights', 'body', 'techStack', 'category', 'role',
  'startDate', 'endDate', 'icon', 'coverImage', 'links', 'metrics', 'featured', 'order'
];

const PUBLIC_SELECT = PUBLIC_FIELDS.join(' ') + ' -_id';

function toPublic(doc) {
  const out = {};
  for (const f of PUBLIC_FIELDS) if (doc[f] !== undefined) out[f] = doc[f];
  return out;
}

async function listPublished() {
  const docs = await Project.find({ status: 'published' })
    .sort({ order: 1, createdAt: 1 })
    .select(PUBLIC_SELECT)
    .lean();
  return docs.map(toPublic);
}

async function getPublishedBySlug(slug) {
  if (typeof slug !== 'string' || slug.length > 80) return null;
  const doc = await Project.findOne({ slug, status: 'published' }).select(PUBLIC_SELECT).lean();
  return doc ? toPublic(doc) : null;
}

// Any document at all, regardless of status — distinguishes "empty collection"
// (seed fallback) from "nothing published" (empty state).
async function hasAny() {
  return Boolean(await Project.exists({}));
}

module.exports = { PUBLIC_FIELDS, toPublic, listPublished, getPublishedBySlug, hasAny };
