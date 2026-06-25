const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title:     { type: String, required: true },
    content:   { type: String, required: true },
    excerpt:   { type: String },
    tags:      [String],
    published: { type: Boolean, default: true },
    createdAt: { type: Date,    default: Date.now }
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

module.exports = mongoose.model('Post', postSchema);
