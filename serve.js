const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');
const PUBLIC = path.join(__dirname, 'public');
const PORT = 3000;

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

function safeRead(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) return false;
    res.writeHead(200, { 'Content-Type': contentType || MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
  return true;
}

function tryFile(res, filePath) {
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      safeRead(res, filePath);
      return true;
    }
  } catch {}
  return false;
}

function htmlFallback(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
}

function tryCleanUrl(res, dir, url) {
  const htmlPath = path.join(dir, url + '.html');
  if (tryFile(res, htmlPath)) return true;
  const indexPath = path.join(dir, url, 'index.html');
  if (tryFile(res, indexPath)) return true;
  return false;
}

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];

  // Root → marketing landing page
  if (url === '/') {
    return htmlFallback(res, path.join(PUBLIC, 'landing.html'));
  }

  // /app or /app/* → Expo SPA
  if (url === '/app' || url === '/app/') {
    return htmlFallback(res, path.join(DIST, 'index.html'));
  }
  if (url.startsWith('/app/')) {
    const subPath = url.slice(5);
    const filePath = path.join(DIST, subPath);
    if (filePath.startsWith(DIST) && tryFile(res, filePath)) return;
    return htmlFallback(res, path.join(DIST, 'index.html'));
  }

  // Try public/ directory first (marketing pages, assets)
  const publicFile = path.join(PUBLIC, url);
  if (publicFile.startsWith(PUBLIC) && tryFile(res, publicFile)) return;

  // Try clean URL in public/ (e.g. /changelog → /changelog.html)
  if (tryCleanUrl(res, PUBLIC, url)) return;

  // Try dist/ directory (Expo build assets)
  const distFile = path.join(DIST, url);
  if (distFile.startsWith(DIST) && tryFile(res, distFile)) return;

  // Try clean URL in dist/
  if (tryCleanUrl(res, DIST, url)) return;

  // SPA fallback
  htmlFallback(res, path.join(DIST, 'index.html'));
});

server.listen(PORT, () => console.log(`HashWatch serving on http://localhost:${PORT}`));
