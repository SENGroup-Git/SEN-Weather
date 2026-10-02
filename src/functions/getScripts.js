/**
 * src/functions/getScripts.js
 *
 * GET /api/get-scripts - replaces functions/get-scripts.js.
 * Read-only endpoint the display page calls to get the latest batch.
 * Protected by the Function App's Microsoft sign-in (App Service
 * Authentication) once that is switched on.
 */

const { app } = require('@azure/functions');
const { getWeatherStore } = require('../../lib/dataStore');

async function getScripts() {
  const latest = await getWeatherStore().get('latest');

  if (!latest) {
    return { status: 404, jsonBody: { error: 'No scripts generated yet' } };
  }

  return {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
    jsonBody: latest,
  };
}

app.http('getScripts', {
  route: 'api/get-scripts',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: getScripts,
});

module.exports = { getScripts };
