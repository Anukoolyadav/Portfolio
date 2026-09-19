// Shared read-side helpers for publicly visible content (projects, experience).
// Only whitelisted fields ever leave the server — never status, _id, __v or timestamps.
module.exports = function makePublicService(Model, publicFields) {
  const select = publicFields.join(' ') + ' -_id';

  function toPublic(doc) {
    const out = {};
    for (const f of publicFields) if (doc[f] !== undefined) out[f] = doc[f];
    return out;
  }

  async function listPublished() {
    const docs = await Model.find({ status: 'published' })
      .sort({ order: 1, createdAt: 1 })
      .select(select)
      .lean();
    return docs.map(toPublic);
  }

  async function findOnePublished(filter) {
    const doc = await Model.findOne({ ...filter, status: 'published' }).select(select).lean();
    return doc ? toPublic(doc) : null;
  }

  // Any document at all, regardless of status — distinguishes "empty collection"
  // (seed fallback) from "nothing published" (empty state).
  async function hasAny() {
    return Boolean(await Model.exists({}));
  }

  return { PUBLIC_FIELDS: publicFields, toPublic, listPublished, findOnePublished, hasAny };
};
