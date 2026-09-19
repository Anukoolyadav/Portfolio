const experience = require('../services/experienceService');

exports.list = async (req, res) => {
  try {
    res.json(await experience.listPublished());
  } catch (err) {
    console.error('GET /api/experience failed:', err.name);
    res.status(500).json({ error: 'Could not load experience.' });
  }
};
