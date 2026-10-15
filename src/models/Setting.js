const mongoose = require('mongoose');

// Internal site settings. Never exposed by any API.
// Currently one marker per content collection: { key: 'projects', managed: true }
// meaning "this collection has been seeded or edited — never fall back to seed data".
const settingSchema = new mongoose.Schema(
  {
    key:     { type: String, required: true, unique: true, trim: true, maxlength: 50 },
    managed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
