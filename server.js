const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');

const app = express();
const PORT = process.env.PORT || 3000;
const SUBMISSIONS_FILE = path.join(__dirname, 'contact-submissions.json');

app.use(express.json());
app.use(express.static(__dirname));

function validatePayload({ name, email, message }) {
  if (!name || name.length < 2 || name.length > 80) {
    return 'Name must be between 2 and 80 characters.';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || email.length > 120 || !emailPattern.test(email)) {
    return 'Please provide a valid email address.';
  }

  if (!message || message.length < 10 || message.length > 2000) {
    return 'Message must be between 10 and 2000 characters.';
  }

  return null;
}

async function readSubmissions() {
  try {
    const fileContents = await fs.readFile(SUBMISSIONS_FILE, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

app.post('/api/contact', async (req, res) => {
  const payload = {
    name: String(req.body?.name || '').trim(),
    email: String(req.body?.email || '').trim(),
    message: String(req.body?.message || '').trim(),
  };

  const validationError = validatePayload(payload);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const record = {
    ...payload,
    createdAt: new Date().toISOString(),
  };

  try {
    const submissions = await readSubmissions();
    submissions.push(record);
    await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
    return res.status(201).json({ message: 'Your message was received successfully.' });
  } catch (error) {
    console.error('Failed to persist contact submission:', error);
    return res.status(500).json({ error: 'Server error while saving your message.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
