require('dotenv').config();
const express = require('express');
const path    = require('path');
const fs      = require('fs');

const { connectDB } = require('./src/config/db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check for Render
app.get('/health', (req, res) => res.status(200).send('OK'));

// Connect to MongoDB (retries automatically on failure)
connectDB();

// Routes
app.use('/api/posts',   require('./src/routes/postRoutes'));
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

app.listen(PORT, '0.0.0.0', () => {
  const base = process.env.NODE_ENV === 'production'
    ? 'https://anukoolyadav.onrender.com'
    : `http://localhost:${PORT}`;
  console.log(`\n  Portfolio  →  ${base}`);
  console.log(`  Admin      →  ${base}/admin.html`);
  console.log(`  Password   →  ${process.env.ADMIN_PASS || 'anukool'}\n`);
});
