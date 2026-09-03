/**
 * netlify/functions/get-scripts.js
 *
 * Read-only endpoint the display page calls to get the latest generated
 * batch of scripts. Also gated by the site's Basic-Auth rule in
 * public/_headers.
 */

const { getWeatherStore } = require('../../lib/blobStore');

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
