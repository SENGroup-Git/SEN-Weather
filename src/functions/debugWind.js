/**
 * src/functions/debugWind.js
 *
 * TEMPORARY debug tool - replaces functions/debug-wind.js.
 * Returns the raw WillyWeather wind forecast for Melbourne so the field
 * names in lib/willyweather.js's parseWindDay() can be confirmed.
 * Delete this file once wind is showing correctly in the VICTWTHR output.
 *
 * Usage: /api/debug-wind?key=YOUR_GENERATE_SECRET
 */

const { app } = require('@azure/functions');
const { searchLocation } = require('../../lib/willyweather');

async function debugWind(request) {
  const secret = process.env.GENERATE_SECRET;
  if (!secret || request.query.get('key') !== secret) {
    return { status: 401, body: 'Unauthorized' };
  }

  const apiKey = process.env.WILLYWEATHER_API_KEY;

  try {
    const locationId = await searchLocation('Melbourne, VIC');
    const url =
      `https://api.willyweather.com.au/v2/${apiKey}/locations/${locationId}/weather.json` +
      `?forecasts=wind&days=2`;
    const res = await fetch(url);
    const raw = await res.json();
    return { status: 200, jsonBody: { locationId, raw } };
  } catch (err) {
    return { status: 500, body: `Debug fetch failed: ${err.message}` };
  }
}

app.http('debugWind', {
  route: 'api/debug-wind',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: debugWind,
});

module.exports = { debugWind };
