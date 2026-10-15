const mongoose = require('mongoose');
const { optionalUrl, stringList, checkDateOrder, seedKeyPlugin } = require('./validators');

const TYPES    = ['internship', 'job'];
const STATUSES = ['draft', 'published'];

const experienceSchema = new mongoose.Schema(
  {
    type:       { type: String, enum: TYPES, required: true },
    company:    { type: String, required: true, trim: true, maxlength: 100 },
    role:       { type: String, required: true, trim: true, maxlength: 100 },
    location:   { type: String, trim: true, maxlength: 100 },
    startDate:  { type: Date, required: true },
    endDate:    { type: Date, default: null },     // null = ongoing ("Present")
    highlights: stringList(400, 10, 'highlights'),
    techStack:  stringList(40, 25, 'techStack'),   // rendered as a final "Stack: …" bullet
    links: {
      company:     optionalUrl(),
      certificate: optionalUrl(),
      other:       optionalUrl()
    },
    status: { type: String, enum: STATUSES, default: 'draft', index: true },
    order:  { type: Number, default: 0, index: true }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

experienceSchema.plugin(seedKeyPlugin);

experienceSchema.pre('validate', function () {
  checkDateOrder(this);
});

module.exports = mongoose.model('Experience', experienceSchema);
module.exports.TYPES    = TYPES;
module.exports.STATUSES = STATUSES;
