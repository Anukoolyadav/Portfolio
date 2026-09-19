// Runs before every test file. Tests never send email and never use the real DB.
delete process.env.RESEND_API_KEY;
delete process.env.MONGODB_URI;
