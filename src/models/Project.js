const mongoose = require('mongoose');
const slugify  = require('../utils/slugify');
const { optionalUrl, maxItems, stringList, checkDateOrder } = require('./validators');

const CATEGORIES = ['ml', 'fullstack', 'research', 'game'];
const STATUSES   = ['draft', 'published'];
const SLUG_RE    = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const projectSchema = new mongoose.Schema(
  {
    title:      { type: String, required: true, trim: true, maxlength: 150 },
    slug:       { type: String, unique: true, trim: true, lowercase: true, maxlength: 80,
                  match: [SLUG_RE, 'slug must be lowercase letters, numbers and single hyphens'] },
    summary:    { type: String, trim: true, maxlength: 200 },
    highlights: stringList(400, 10, 'highlights'),
    body:       { type: String, maxlength: 20000 },   // markdown, rendered later
    techStack:  stringList(40, 25, 'techStack'),
    category:   { type: String, enum: CATEGORIES },
    role:       { type: String, trim: true, maxlength: 100 },
    startDate:  { type: Date },
    endDate:    { type: Date, default: null },         // null = ongoing
    icon:       { type: String, trim: true, maxlength: 16 },
    coverImage: {
      url: optionalUrl(),
      alt: { type: String, trim: true, maxlength: 200 }
    },
    links: {
      github: optionalUrl(),
      live:   optionalUrl(),
      paper:  optionalUrl(),
      video:  optionalUrl()
    },
    metrics: {
      type: [{
        _id:   false,
        label: { type: String, required: true, trim: true, maxlength: 40 },
        value: { type: String, required: true, trim: true, maxlength: 40 }
      }],
      validate: maxItems(6, 'metrics')
    },
    featured: { type: Boolean, default: false },
    status:   { type: String, enum: STATUSES, default: 'draft', index: true },
    order:    { type: Number, default: 0, index: true }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

projectSchema.pre('validate', function () {
  if (!this.slug && this.title) this.slug = slugify(this.title);
  if (this.coverImage?.url && !this.coverImage.alt) {
    this.invalidate('coverImage.alt', 'alt text is required when a cover image is set');
  }
  checkDateOrder(this);
});

module.exports = mongoose.model('Project', projectSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.STATUSES   = STATUSES;
