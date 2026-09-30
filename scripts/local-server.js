/**
 * scripts/local-server.js
 *
 * Local dev launcher: sets a couple of dev-only defaults (mock weather
 * data, a placeholder GENERATE_SECRET) then starts the real server.js -
 * the same file Azure App Service runs in production, so local dev and
 * prod never drift apart.
 *
 * Usage: node scripts/local-server.js
 * Then open http://localhost:8888
 */

if (process.env.WILLYWEATHER_MOCK === undefined) process.env.WILLYWEATHER_MOCK = 'true';
if (process.env.GENERATE_SECRET === undefined) process.env.GENERATE_SECRET = 'local-dev-secret';

require('../server.js');
