const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
  console.log('  Email ready ✓');
} else {
  console.warn('  ⚠️  EMAIL_USER/EMAIL_PASS not set — contact form disabled');
}

exports.sendMessage = async (req, res) => {
  const { name, email, message, subject } = req.body;

  if (!name?.trim() || !email?.trim() || !message?.trim())
    return res.status(400).json({ error: 'Name, email, and message are required.' });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Invalid email address.' });

  if (!transporter)
    return res.status(503).json({ error: 'Email service not configured on server.' });

  try {
    await transporter.sendMail({
      from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
      to: 'anukool.xeep@gmail.com',
      replyTo: email,
      subject: subject?.trim() || `New message from ${name} — Portfolio`,
      text: `Name: ${name}\nEmail: ${email}\n${subject ? `Subject: ${subject}\n` : ''}\nMessage:\n${message}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a0f1e;color:#e2e8f0;border-radius:12px">
          <h2 style="color:#4ade80;margin:0 0 6px">New Portfolio Contact</h2>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">Someone reached out via your portfolio.</p>
          <div style="background:#0f172a;border-radius:8px;padding:20px;margin-bottom:16px;border:1px solid #1e293b">
            <p style="margin:0 0 10px"><strong style="color:#4ade80">Name:</strong> ${name}</p>
            <p style="margin:0 0 10px"><strong style="color:#4ade80">Email:</strong> <a href="mailto:${email}" style="color:#4ecdc4">${email}</a></p>
            ${subject?.trim() ? `<p style="margin:0"><strong style="color:#4ade80">Subject:</strong> ${subject}</p>` : ''}
          </div>
          <div style="background:#0f172a;border-radius:8px;padding:20px;border:1px solid #1e293b">
            <p style="margin:0 0 10px;color:#4ade80;font-weight:bold">Message:</p>
            <p style="margin:0;white-space:pre-wrap;color:#cbd5e1">${message}</p>
          </div>
          <p style="margin-top:24px;color:#64748b;font-size:12px">Sent via anukoolyadav.onrender.com</p>
        </div>`,
    });
    res.json({ success: true, message: "Message sent! I'll get back to you soon." });
  } catch (e) {
    console.error('Email send error:', e.message);
    res.status(500).json({ error: 'Failed to send. Please email me directly.' });
  }
};
