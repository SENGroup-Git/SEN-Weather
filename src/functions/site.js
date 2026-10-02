/**
 * src/functions/site.js
 *
 * Serves the display page and its assets from public/ - replaces Netlify's
 * static hosting. A catch-all route: the named routes (api/get-scripts,
 * api/generate-now, api/debug-wind) are more specific, so Azure matches them first
 * and everything else lands here.
 */

const { app } = require('@azure/functions');
const fs = require('node:fs/promises');
const path = require('node:path');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

async function site(request) {
  const requested = request.params.path || 'index.html';
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));

  // Block anything that tries to climb out of public/ (e.g. "../lib/...").
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    return { status: 404, body: 'Not found' };
  }

  try {
    const body = await fs.readFile(filePath);
    const type = MIME_TYPES[path.extname(filePath)] || 'application/octet-stream';
    return { status: 200, headers: { 'Content-Type': type }, body };
  } catch {
    return { status: 404, body: 'Not found' };
  }
}

app.http('site', {
  route: '{*path}',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: site,
});

module.exports = { site };
