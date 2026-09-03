/**
 * lib/willyweather.js
 *
 * Thin client for the WillyWeather v2 API.
 *
 * Field names for `weather` forecasts (precis, precisCode, min, max) were
 * confirmed against a live API response - see parseForecastDays().
 *
 * Field names for `wind` forecasts (direction, speed) are NOT yet
 * confirmed against a live response the same way - WillyWeather's docs
 * page blocks automated fetching, so parseWindDay() below is built from
 * their documented shape and third-party client libraries. Use
 * netlify/functions/debug-wind.js once deployed to check the raw response
 * and adjust parseWindDay() if the field names differ (same process used
 * to fix the temperature parsing originally).
 *
 * Docs: https://www.willyweather.com.au/api/docs/v2.html
 */

const BASE_URL = 'https://api.willyweather.com.au/v2';

// In-memory cache, lives for the duration of one function invocation.
// Several show codes share the same underlying town (e.g. Victoria state
// codes all use Melbourne), so this avoids calling the API twice for the
// same place in the same run.
const searchCache = new Map();
const forecastCache = new Map();
const windCache = new Map();

function getApiKey() {
  const key = process.env.WILLYWEATHER_API_KEY;
  if (!key) {
    throw new Error('WILLYWEATHER_API_KEY environment variable is not set');
  }
  return key;
}

async function searchLocation(searchTerm) {
  if (searchCache.has(searchTerm)) return searchCache.get(searchTerm);

  const apiKey = getApiKey();
  const url = `${BASE_URL}/${apiKey}/search.json?query=${encodeURIComponent(searchTerm)}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`WillyWeather search failed for "${searchTerm}": ${res.status}`);
  }
  const results = await res.json();
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error(`WillyWeather search returned no results for "${searchTerm}"`);
  }
  const locationId = results[0].id;
  searchCache.set(searchTerm, locationId);
  return locationId;
}

/**
 * Returns a normalised array of daily forecasts:
 *   [{ date: '2026-07-23', precis: 'Sunny', precisCode: 'sunny', min: 12, max: 26 }, ...]
 * for `days` days starting today.
 */
async function getForecast(locationId, days = 3) {
  const cacheKey = `${locationId}:${days}`;
  if (forecastCache.has(cacheKey)) return forecastCache.get(cacheKey);

  const apiKey = getApiKey();
  const url =
    `${BASE_URL}/${apiKey}/locations/${locationId}/weather.json` +
    `?forecasts=weather&days=${days}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`WillyWeather forecast failed for location ${locationId}: ${res.status}`);
  }
  const data = await res.json();
  const parsed = parseForecastDays(data, days);
  forecastCache.set(cacheKey, parsed);
  return parsed;
}

/**
 * Returns normalised wind data for a single day:
 *   { directionText: 'N', speed: 20 }
 * `dayIndex` is 0-based from today (0 = today, 1 = tomorrow, etc).
 */
async function getWind(locationId, dayIndex = 0) {
  const cacheKey = `${locationId}:wind`;
  let days;
  if (windCache.has(cacheKey)) {
    days = windCache.get(cacheKey);
  } else {
    const apiKey = getApiKey();
    const url =
      `${BASE_URL}/${apiKey}/locations/${locationId}/weather.json` +
      `?forecasts=wind&days=${dayIndex + 1}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`WillyWeather wind forecast failed for location ${locationId}: ${res.status}`);
    }
    const data = await res.json();
    days = data?.forecasts?.wind?.days || [];
    windCache.set(cacheKey, days);
  }
  return parseWindDay(days[dayIndex]);
}

/**
 * Fetch a location ID (using the config's hardcoded locationId if present,
 * otherwise falling back to a live search) and its forecast in one call.
 */
async function getForecastForTown(town, days = 3) {
  const locationId = town.locationId || (await searchLocation(town.searchTerm));
  return getForecast(locationId, days);
}

/** Same lookup pattern as getForecastForTown, but for wind data. */
async function getWindForTown(town, dayIndex = 0) {
  const locationId = town.locationId || (await searchLocation(town.searchTerm));
  return getWind(locationId, dayIndex);
}

function parseForecastDays(rawResponse, days) {
  const weatherDays = rawResponse?.forecasts?.weather?.days || [];

  const out = [];
  for (let i = 0; i < days; i++) {
    const wDay = weatherDays[i];
    const wEntry = wDay?.entries?.[0] || {};

    out.push({
      date: wDay?.dateTime ? wDay.dateTime.slice(0, 10) : null,
      precis: wEntry.precis || 'Fine',
      precisCode: wEntry.precisCode || 'fine',
      min: typeof wEntry.min === 'number' ? Math.round(wEntry.min) : null,
      max: typeof wEntry.max === 'number' ? Math.round(wEntry.max) : null,
    });
  }
  return out;
}

/**
 * UNCONFIRMED field names - see file header comment. Tries a couple of
 * plausible key variants for direction/speed so it has the best chance of
 * working first try, but treat this as provisional until checked against
 * a real response via debug-wind.js.
 */
function parseWindDay(windDay) {
  const entry = windDay?.entries?.[0] || {};
  const directionText =
    entry.directionText || entry.direction || entry.compassDirection || null;
  const speed =
    typeof entry.speed === 'number'
      ? entry.speed
      : typeof entry.averageSpeed === 'number'
      ? entry.averageSpeed
      : null;

  return {
    directionText,
    speed: speed != null ? Math.round(speed) : null,
  };
}

module.exports = { searchLocation, getForecast, getForecastForTown, getWind, getWindForTown };
