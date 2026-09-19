const express = require('express');
const path    = require('path');
const fs      = require('fs');

const pageView = require('./src/services/pageView');

// Builds the Express app without connecting to the DB or listening,
// so tests can import it directly.
function createApp() {
  const app = express();

  app.use(express.json());

  // Home page is server-rendered (projects injected); must come before static,
  // and static must not auto-serve the raw index.html template.
  app.get(['/', '/index.html'], async (req, res) => {
    try {
      res.set('Cache-Control', 'no-cache').type('html').send(await pageView.getIndexHtml());
    } catch (err) {
      console.error('Rendering / failed:', err.name);
      res.status(500).send('Something went wrong.');
    }
  });

  app.use(express.static(path.join(__dirname, 'public'), { index: false }));

  // Health check for Render
  app.get('/health', (req, res) => res.status(200).send('OK'));

  // Routes
  app.use('/api/projects',   require('./src/routes/projectRoutes'));
  app.use('/api/experience', require('./src/routes/experienceRoutes'));
  app.use('/api/admin',      require('./src/routes/adminRoutes'));
  app.use('/api/contact',    require('./src/routes/contactRoutes'));

  // Resume PDF download
  app.get('/download/resume', (req, res) => {
    const filePath = path.join(__dirname, 'Anukool_CV2026.pdf');
    if (!fs.existsSync(filePath)) return res.status(404).send('Resume PDF not found.');
    res.setHeader('Content-Disposition', 'attachment; filename="Anukool_Yadav_Resume.pdf"');
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(filePath);
  });

  // Last-resort error handler: generic JSON, never a stack trace or error text.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
    if (err.type === 'entity.too.large')    return res.status(413).json({ error: 'Request body too large.' });
    console.error('Unhandled error:', err.name || 'Error');
    res.status(500).json({ error: 'Something went wrong.' });
  });

  return app;
}

module.exports = { createApp };
