const projects = require('../services/projectService');

exports.list = async (req, res) => {
  try {
    res.json(await projects.listPublished());
  } catch (err) {
    console.error('GET /api/projects failed:', err.name);
    res.status(500).json({ error: 'Could not load projects.' });
  }
};

exports.getBySlug = async (req, res) => {
  try {
    const project = await projects.getPublishedBySlug(req.params.slug);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    res.json(project);
  } catch (err) {
    console.error('GET /api/projects/:slug failed:', err.name);
    res.status(500).json({ error: 'Could not load project.' });
  }
};
