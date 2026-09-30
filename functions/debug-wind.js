/**
 * functions/debug-wind.js
 *
 * TEMPORARY debug tool - returns the raw WillyWeather wind forecast for
 * Melbourne so we can confirm the actual field names and fix
 * lib/willyweather.js's parseWindDay(). Safe to delete once wind is
 * showing correctly in the real VICTWTHR output.
 *
 * Usage: /api/debug-wind?key=YOUR_GENERATE_SECRET
 */

const { searchLocation } = require('../lib/willyweather');

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const secret = process.env.GENERATE_SECRET;

  if (!secret || params.key !== secret) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const apiKey = process.env.WILLYWEATHER_API_KEY;

  try {
    const locationId = await searchLocation('Melbourne, VIC');
    const url =
      `https://api.willyweather.com.au/v2/${apiKey}/locations/${locationId}/weather.json` +
      `?forecasts=wind&days=2`;
    const res = await fetch(url);
    const raw = await res.json();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId, raw }, null, 2),
    };
  } catch (err) {
    return { statusCode: 500, body: `Debug fetch failed: ${err.message}` };
  }
};
