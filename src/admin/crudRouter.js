// Admin CRUD router shared by Projects and Experience.
//
//   GET    /            all documents incl. drafts, by order
//   POST   /            create (whitelisted fields; appended to the end of the order)
//   PUT    /:id         update (whitelisted fields; full schema validation incl. hooks)
//   DELETE /:id         delete
//   PATCH  /:id/publish { published: true|false }
//   PATCH  /reorder     { ids: [...] } — every document id exactly once; one bulkWrite
//
// Every successful write marks the collection as managed (so the seed fallback and
// the seed script never resurrect deleted entries) and calls invalidate(). Errors are generic;
// validation failures return { error, fields } with our own messages only.
const router      = require('express').Router;
const mongoose    = require('mongoose');
const auth        = require('../middleware/auth');
const requireDB   = require('../middleware/requireDB');
const { sanitize } = require('./sanitize');
const fieldErrors = require('./validationErrors');
const { markManaged } = require('../services/managedCollections');

const isId = id => mongoose.isValidObjectId(id) && String(new mongoose.Types.ObjectId(id)) === id;

// Admin view of a document: toJSON gives `id` and strips seedKey; drop internals.
function toAdmin(doc) {
  const { _id, __v, ...rest } = doc.toJSON();
  return rest;
}

module.exports = function makeCrudRouter({ model, spec, invalidate, label, collection }) {
  // After any successful write: remember the admin manages this collection, refresh the page.
  const afterWrite = async () => {
    await markManaged(collection);
    invalidate();
  };

  const r = router();
  r.use(auth, requireDB);

  const fail = (res, where, err) => {
    console.error(`Admin ${label} ${where} failed:`, err?.name || 'Error');
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  };

  // Maps expected failures to 4xx; returns true if handled.
  const handleWriteError = (res, err) => {
    if (err?.name === 'ValidationError') {
      res.status(400).json({ error: 'Validation failed.', fields: fieldErrors(err) });
      return true;
    }
    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      res.status(409).json({ error: `That ${field} is already in use.`, fields: { [field]: 'is already in use' } });
      return true;
    }
    return false;
  };

  const readBody = (req, res) => {
    const { data, errors } = sanitize(req.body, spec);
    if (Object.keys(errors).length) {
      res.status(400).json({ error: 'Validation failed.', fields: errors });
      return null;
    }
    return data;
  };

  const findById = async (req, res) => {
    if (!isId(req.params.id)) { res.status(400).json({ error: 'Invalid id.' }); return null; }
    const doc = await model.findById(req.params.id);
    if (!doc) res.status(404).json({ error: `${label} not found.` });
    return doc;
  };

  r.get('/', async (req, res) => {
    try {
      const docs = await model.find().sort({ order: 1, createdAt: 1 });
      res.json(docs.map(toAdmin));
    } catch (err) { fail(res, 'list', err); }
  });

  r.post('/', async (req, res) => {
    const data = readBody(req, res);
    if (!data) return;
    try {
      const last = await model.findOne().sort({ order: -1 }).select('order').lean();
      const doc  = await model.create({ ...data, order: (last?.order ?? 0) + 1 });
      await afterWrite();
      res.status(201).json(toAdmin(doc));
    } catch (err) {
      if (!handleWriteError(res, err)) fail(res, 'create', err);
    }
  });

  // Must be declared before '/:id' routes.
  r.patch('/reorder', async (req, res) => {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || !ids.every(id => typeof id === 'string' && isId(id))) {
      return res.status(400).json({ error: 'ids must be an array of document ids.' });
    }
    if (new Set(ids).size !== ids.length) {
      return res.status(400).json({ error: 'ids must not contain duplicates.' });
    }
    try {
      const existing = (await model.find().select('_id').lean()).map(d => String(d._id));
      if (existing.length !== ids.length || !ids.every(id => existing.includes(id))) {
        return res.status(400).json({ error: `ids must list every ${label.toLowerCase()} exactly once.` });
      }
      await model.bulkWrite(ids.map((id, index) => ({
        updateOne: { filter: { _id: id }, update: { $set: { order: index + 1 } } }
      })));
      await afterWrite();
      res.json({ ok: true });
    } catch (err) { fail(res, 'reorder', err); }
  });

  r.put('/:id', async (req, res) => {
    const data = readBody(req, res);
    if (!data) return;
    try {
      const doc = await findById(req, res);
      if (!doc) return;
      doc.set(data);
      await doc.save();
      await afterWrite();
      res.json(toAdmin(doc));
    } catch (err) {
      if (!handleWriteError(res, err)) fail(res, 'update', err);
    }
  });

  r.patch('/:id/publish', async (req, res) => {
    if (typeof req.body?.published !== 'boolean' || Object.keys(req.body).length !== 1) {
      return res.status(400).json({ error: 'Body must be { "published": true | false }.' });
    }
    try {
      const doc = await findById(req, res);
      if (!doc) return;
      doc.status = req.body.published ? 'published' : 'draft';
      await doc.save();
      await afterWrite();
      res.json(toAdmin(doc));
    } catch (err) {
      if (!handleWriteError(res, err)) fail(res, 'publish', err);
    }
  });

  r.delete('/:id', async (req, res) => {
    try {
      const doc = await findById(req, res);
      if (!doc) return;
      await doc.deleteOne();
      await afterWrite();
      res.json({ ok: true });
    } catch (err) { fail(res, 'delete', err); }
  });

  return r;
};
