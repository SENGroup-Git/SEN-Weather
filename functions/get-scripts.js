/**
 * functions/get-scripts.js
 *
 * Read-only endpoint the display page calls to get the latest generated
 * batch of scripts. The site itself is gated by server.js's Basic-Auth
 * middleware.
 */

const { getWeatherStore } = require('../lib/dataStore');

exports.handler = async () => {
  const store = getWeatherStore();
  const latest = await store.get('latest', { type: 'json' });

  if (!latest) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'No scripts generated yet' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(latest),
  };
};
