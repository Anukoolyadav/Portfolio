// "Managed" markers: once a content collection has been seeded or edited in the
// admin, an empty collection means "intentionally empty" (render the empty state),
// not "never set up" (render the seed fallback). Also stops the seed script from
// re-creating entries the admin deleted.
const Setting = require('../models/Setting');

const markerKey = collection => `managed:${collection}`;

async function markManaged(collection) {
  await Setting.updateOne(
    { key: markerKey(collection) },
    { $set: { managed: true } },
    { upsert: true }
  );
}

async function isManaged(collection) {
  return Boolean(await Setting.exists({ key: markerKey(collection), managed: true }));
}

module.exports = { markManaged, isManaged };
