const express = require('express');
const path    = require('path');
const fs      = require('fs');

// Builds the Express app without connecting to the DB or listening,
// so tests can import it directly.
function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // Health check for Render
  app.get('/health', (req, res) => res.status(200).send('OK'));

  // Routes
  app.use('/api/admin',   require('./src/routes/adminRoutes'));
  app.use('/api/contact', require('./src/routes/contactRoutes'));

  // Resume PDF download
  app.get('/download/resume', (req, res) => {
    const filePath = path.join(__dirname, 'Anukool_CV2026.pdf');
    if (!fs.existsSync(filePath)) return res.status(404).send('Resume PDF not found.');
    res.setHeader('Content-Disposition', 'attachment; filename="Anukool_Yadav_Resume.pdf"');
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(filePath);
  });

  return app;
}

module.exports = { createApp };
