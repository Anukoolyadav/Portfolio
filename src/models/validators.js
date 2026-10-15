// Schema building blocks shared by Project and Experience.
const isHttpUrl = require('../utils/isHttpUrl');

// Optional URL field: empty is fine, anything else must be http(s).
const optionalUrl = () => ({
  type: String,
  trim: true,
  validate: { validator: v => !v || isHttpUrl(v), message: 'must be an http(s) URL' }
});

// Array length cap.
const maxItems = (n, label) => ({
  validator: arr => !arr || arr.length <= n,
  message: `${label} can have at most ${n} items`
});

// Array of trimmed strings, each at most `maxLength`, at most `count` items.
const stringList = (maxLength, count, label) => ({
  type: [{ type: String, trim: true, maxlength: maxLength }],
  validate: maxItems(count, label)
});

// pre('validate') helper: endDate (null = ongoing) must not be before startDate.
function checkDateOrder(doc) {
  if (doc.startDate && doc.endDate && doc.endDate < doc.startDate) {
    doc.invalidate('endDate', 'endDate must be on or after startDate');
  }
}

// Stable identity for seeded documents. Only scripts/seed.js sets it; documents
// created from the admin never have the field (absent, not null), which the
// sparse unique index relies on. Hidden from queries (select: false) and from
// toJSON so it never appears in an API response.
function seedKeyPlugin(schema) {
  schema.add({
    seedKey: { type: String, trim: true, maxlength: 100, select: false }
  });
  schema.index({ seedKey: 1 }, { unique: true, sparse: true });

  const previous = schema.get('toJSON') || {};
  schema.set('toJSON', {
    ...previous,
    transform(doc, ret, options) {
      delete ret.seedKey;
      return typeof previous.transform === 'function' ? previous.transform(doc, ret, options) : ret;
    }
  });
}

module.exports = { optionalUrl, maxItems, stringList, checkDateOrder, seedKeyPlugin };
