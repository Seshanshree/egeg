const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const SUBMISSIONS_FILE = path.join(ROOT, 'contact-submissions.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': MIME_TYPES['.json'] });
  res.end(JSON.stringify(payload));
}

function validatePayload({ name, email, message }) {
  if (!name || name.length < 2 || name.length > 80) return 'Name must be between 2 and 80 characters.';
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || email.length > 120 || !emailPattern.test(email)) return 'Please provide a valid email address.';
  if (!message || message.length < 10 || message.length > 2000) return 'Message must be between 10 and 2000 characters.';
  return null;
}

async function readSubmissions() {
  try {
    return JSON.parse(await fs.readFile(SUBMISSIONS_FILE, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function handleContact(req, res) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1_000_000) {
      req.destroy();
    }
  });

  req.on('end', async () => {
    let parsed;
    try {
      parsed = JSON.parse(body || '{}');
    } catch {
      return sendJson(res, 400, { error: 'Request body must be valid JSON.' });
    }

    const payload = {
      name: String(parsed?.name || '').trim(),
      email: String(parsed?.email || '').trim(),
      message: String(parsed?.message || '').trim(),
    };

    const error = validatePayload(payload);
    if (error) return sendJson(res, 400, { error });

    try {
      const submissions = await readSubmissions();
      submissions.push({ ...payload, createdAt: new Date().toISOString() });
      await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
      return sendJson(res, 201, { message: 'Your message was received successfully.' });
    } catch (writeError) {
      console.error('Failed to save contact form submission:', writeError);
      return sendJson(res, 500, { error: 'Server error while saving your message.' });
    }
  });
}

async function handleStatic(req, res, pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(requestedPath).replace(/^\.\.(\/|\\|$)+/, '');
  const filePath = path.join(ROOT, safePath);

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Server error');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && url.pathname === '/api/contact') {
    return handleContact(req, res);
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    return handleStatic(req, res, url.pathname);
  }

  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
