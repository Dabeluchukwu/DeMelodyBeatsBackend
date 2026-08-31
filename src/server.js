import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🔥 De Melody Beats API running on http://localhost:${PORT}`);
  console.log(`📧 Contact: ${process.env.CONTACT_EMAIL || 'demelodybeats@gmail.com'}`);
});