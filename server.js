require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const fs       = require('fs');
const path     = require('path');

const app        = express();
const PORT       = process.env.PORT       || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || 'anukool';
const MONGO_URI  = process.env.MONGODB_URI;

app.use(express.json());
app.use(express.static(__dirname));

// ── MongoDB connection ────────────────────────────────────────────
if (!MONGO_URI || MONGO_URI.includes('<username>')) {
  console.error('\n  ❌  MONGODB_URI is not set in .env');
  console.error('     Edit .env and add your MongoDB Atlas connection string.\n');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('  MongoDB connected ✓'))
  .catch(err => { console.error('  MongoDB error:', err.message); process.exit(1); });

// ── Post schema ───────────────────────────────────────────────────
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

const Post = mongoose.model('Post', postSchema);

// ── Helpers ───────────────────────────────────────────────────────
const makeExcerpt = content =>
  content.replace(/[#*`_[\]()]/g, '').slice(0, 180).trim() + '…';

const auth = (req, res, next) => {
  if (req.headers['x-admin-pass'] === ADMIN_PASS) return next();
  res.status(401).json({ error: 'Unauthorized' });
};

// ── Resume download ───────────────────────────────────────────────
app.get('/download/resume', (req, res) => {
  const filePath = path.join(__dirname, 'Anukool_CV2026.pdf');
  if (!fs.existsSync(filePath)) {
    return res.status(404).send(
      'Resume PDF not found. Place Anukool_CV2026.pdf in the project folder.'
    );
  }
  res.setHeader('Content-Disposition', 'attachment; filename="Anukool_Yadav_Resume.pdf"');
  res.setHeader('Content-Type', 'application/pdf');
  res.sendFile(filePath);
});

// ── Public API ────────────────────────────────────────────────────

// List all published posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find({ published: true }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Single post by ID
app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    res.json(post);
  } catch { res.status(404).json({ error: 'Not found' }); }
});

// ── Admin API ─────────────────────────────────────────────────────

// All posts including drafts
app.get('/api/admin/posts', auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create post
app.post('/api/posts', auth, async (req, res) => {
  try {
    const { title, content, tags, published = true } = req.body;
    if (!title || !content)
      return res.status(400).json({ error: 'Title and content required' });

    const tagsArr = Array.isArray(tags)
      ? tags
      : (tags || '').split(',').map(t => t.trim()).filter(Boolean);

    const post = await Post.create({
      title, content, published,
      tags: tagsArr,
      excerpt: makeExcerpt(content),
      createdAt: new Date()
    });
    res.status(201).json(post);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update post
app.put('/api/posts/:id', auth, async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.content) update.excerpt = makeExcerpt(update.content);
    if (update.tags && !Array.isArray(update.tags)) {
      update.tags = update.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    const post = await Post.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!post) return res.status(404).json({ error: 'Not found' });
    res.json(post);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete post
app.delete('/api/posts/:id', auth, async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Portfolio  →  http://localhost:${PORT}`);
  console.log(`  Admin      →  http://localhost:${PORT}/admin.html`);
  console.log(`  Password   →  ${ADMIN_PASS}\n`);
});
