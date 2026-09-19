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

module.exports = { optionalUrl, maxItems, stringList, checkDateOrder };
