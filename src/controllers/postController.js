const Post = require('../models/Post');

const makeExcerpt = content =>
  content.replace(/[#*`_[\]()]/g, '').slice(0, 180).trim() + '…';

exports.getAllPublished = async (req, res) => {
  try {
    const posts = await Post.find({ published: true }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getOne = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    res.json(post);
  } catch { res.status(404).json({ error: 'Not found' }); }
};

exports.getAllAdmin = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
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
};

exports.update = async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.content) update.excerpt = makeExcerpt(update.content);
    if (update.tags && !Array.isArray(update.tags))
      update.tags = update.tags.split(',').map(t => t.trim()).filter(Boolean);
    const post = await Post.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!post) return res.status(404).json({ error: 'Not found' });
    res.json(post);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
