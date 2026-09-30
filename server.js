/**
 * server.js
 *
 * Plain Node HTTP server - the app's single entry point on Azure App
 * Service, and locally via scripts/local-server.js (which just sets a
 * couple of dev-only env var defaults before requiring this file, so local
 * dev and production never drift apart).
 *
 * Replaces what used to be three separate pieces on Netlify:
 *   - the static file server (Netlify's CDN)          -> serveStatic()
 *   - individual Netlify Functions (unchanged handler
 *     shape: `async (event) => ({ statusCode, ... })`) -> handleFunction()
 *   - the scheduled function, cron-triggered by Netlify -> schedulerTick(),
 *     an in-process setInterval loop instead
 *
 * NOTE: on Azure's Free (F1) tier there's no "Always On" - the app can go
 * to sleep when idle, and the in-process scheduler below only runs while
 * the app is awake. For the schedule to be reliable, upgrade to Basic (B1)
 * or higher and enable Always On (Configuration -> General settings).
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const { generateAll } = require('./lib/generate');
const { melbourneParts, melbourneCalendarDate } = require('./lib/dates');

const PORT = process.env.PORT || 8888;
const PUBLIC_DIR = path.join(__dirname, 'public');

const FUNCTIONS = {
  'get-scripts': require('./functions/get-scripts').handler,
  'generate-now': require('./functions/generate-now').handler,
  'debug-wind': require('./functions/debug-wind').handler,
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

// --- Basic-Auth gate (replaces Netlify's public/_headers Basic-Auth rule) ---
// Set SITE_PASSWORD in App Service -> Configuration -> Environment variables.
// Left unset = no gate (matches previous local-dev behaviour, since that
// header rule only ever applied on Netlify's own edge, never locally).
function isAuthorised(req) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return true;

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) return false;

  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const suppliedPassword = decoded.split(':').slice(1).join(':');
  return suppliedPassword === password;
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

// --- Scheduler: replaces Netlify's cron-triggered scheduled-weather.js ---
// Checks real Melbourne time every minute; each run fires at most once per
// calendar day even though the check runs far more often than that.
//   - 5am     : today's forecast              ('am')
//   - 10am    : today's remaining forecast    ('afternoon')
//   - 4:30pm  : tomorrow's forecast           ('pm')
const RUN_WINDOWS = [
  { runType: 'am', hour: 5, minuteInRange: (m) => m < 15 },
  { runType: 'afternoon', hour: 10, minuteInRange: (m) => m < 15 },
  { runType: 'pm', hour: 16, minuteInRange: (m) => m >= 30 && m < 45 },
];
const firedToday = new Set();

function schedulerTick() {
  const { hour, minute } = melbourneParts();
  const dateKey = melbourneCalendarDate().toISOString().slice(0, 10);

  const match = RUN_WINDOWS.find((w) => w.hour === hour && w.minuteInRange(minute));
  if (!match) return;

  const fireKey = `${dateKey}:${match.runType}`;
  if (firedToday.has(fireKey)) return;
  firedToday.add(fireKey);

  generateAll(match.runType)
    .then((result) => console.log(`Scheduled run "${match.runType}" generated ${result.scripts.length} scripts`))
    .catch((err) => console.error(`Scheduled run "${match.runType}" failed:`, err));
}

function main() {
  const server = http.createServer(async (req, res) => {
    if (!isAuthorised(req)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="SEN Weather"' });
      return res.end('Unauthorized');
    }

    const match = req.url.match(/^\/api\/([^/?]+)/);
    if (match && FUNCTIONS[match[1]]) {
      return handleFunction(match[1], req, res);
    }
    return serveStatic(req, res);
  });

  server.listen(PORT, () => {
    console.log(`SEN-Weather server listening on port ${PORT}`);
    if (process.env.WILLYWEATHER_MOCK === 'true') {
      console.log('Mock weather mode ON - cards render with made-up data, no real API key needed.');
    } else if (!process.env.WILLYWEATHER_API_KEY) {
      console.log('Note: WILLYWEATHER_API_KEY is not set - generation will fail until you set it.');
    }
    if (!process.env.GENERATE_SECRET) {
      console.log('Note: GENERATE_SECRET is not set - generate-now/debug-wind will always 401.');
    }
    if (!process.env.SITE_PASSWORD) {
      console.log('Note: SITE_PASSWORD is not set - the site is NOT password-gated.');
    }
  });

  setInterval(schedulerTick, 60 * 1000);
}

main();
