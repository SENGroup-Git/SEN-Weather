/**
 * scripts/local-server.js
 *
 * Local dev server that stands in for `netlify dev`, which crashes on this
 * machine (Windows Defender locks the Deno binary it downloads for Edge
 * Functions - this project doesn't even use Edge Functions). Serves
 * public/ as static files, runs the Netlify Functions handlers directly
 * over HTTP, and spins up a local Netlify Blobs server so lib/blobStore.js's
 * zero-config getStore() call resolves without any real Netlify account.
 *
 * Usage: node scripts/local-server.js
 * Then open http://localhost:8888
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { BlobsServer } = require('@netlify/blobs/server');

if (process.env.WILLYWEATHER_MOCK === undefined) process.env.WILLYWEATHER_MOCK = 'true';

const PORT = process.env.PORT || 8888;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const BLOBS_DIR = path.join(__dirname, '..', '.netlify', 'blobs-local');

const FUNCTIONS = {
  'get-scripts': require('../netlify/functions/get-scripts').handler,
  'generate-now': require('../netlify/functions/generate-now').handler,
  'debug-wind': require('../netlify/functions/debug-wind').handler,
  'scheduled-weather': require('../netlify/functions/scheduled-weather').handler,
};

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

async function startBlobsServer() {
  const server = new BlobsServer({ directory: BLOBS_DIR, token: 'local-dev-token' });
  const { port } = await server.start();

  const context = { siteID: 'local-site', token: 'local-dev-token', edgeURL: `http://localhost:${port}` };
  process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify(context)).toString('base64');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handleFunction(name, req, res) {
  const handler = FUNCTIONS[name];
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const queryStringParameters = Object.fromEntries(url.searchParams);
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req);

  const event = {
    httpMethod: req.method,
    path: url.pathname,
    queryStringParameters,
    headers: req.headers,
    body,
    isBase64Encoded: false,
  };

  try {
    const result = await handler(event, {});
    res.writeHead(result.statusCode || 200, result.headers || {});
    res.end(result.body || '');
  } catch (err) {
    console.error(`Function "${name}" threw:`, err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Function error: ${err.message}`);
  }
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let filePath = path.join(PUBLIC_DIR, decodeURIComponent(url.pathname));
  if (url.pathname === '/') filePath = path.join(PUBLIC_DIR, 'index.html');

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

async function main() {
  await startBlobsServer();

  const server = http.createServer((req, res) => {
    const match = req.url.match(/^\/\.netlify\/functions\/([^/?]+)/);
    if (match && FUNCTIONS[match[1]]) {
      return handleFunction(match[1], req, res);
    }
    return serveStatic(req, res);
  });

  server.listen(PORT, () => {
    console.log(`SEN-Weather local dev server: http://localhost:${PORT}`);
    console.log(`Local Netlify Blobs store persisted at ${BLOBS_DIR}`);
    if (process.env.WILLYWEATHER_MOCK === 'true') {
      console.log('Mock weather mode ON - cards render with made-up data, no real API key needed. Set WILLYWEATHER_MOCK=false to hit the real WillyWeather API.');
    } else if (!process.env.WILLYWEATHER_API_KEY) {
      console.log('Note: WILLYWEATHER_API_KEY is not set - generate-now/debug-wind will fail until you set it.');
    }
    if (!process.env.GENERATE_SECRET) {
      console.log('Note: GENERATE_SECRET is not set - generate-now/debug-wind will always 401.');
    }
  });
}

main();
