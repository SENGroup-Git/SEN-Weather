/**
 * lib/generate.js
 *
 * Orchestrates one full generation run: fetch forecasts (and wind data
 * where flagged) for every unique town, render all scripts, and save the
 * result to Netlify Blobs under the key "latest" so the display page and
 * any other consumer just reads one object.
 *
 * Three run types, each with a day offset and a phrasing style:
 *   - 'am'        : today,    'top' style       (5am)
 *   - 'afternoon' : today,    'overnight' style  (10am)
 *   - 'pm'        : tomorrow, 'top' style        (4:30pm, recorded in advance)
 */

const { getWeatherStore } = require('./blobStore');
const { locations } = require('./locations');
const { getForecastForTown, getWindForTown } = require('./willyweather');
const { renderScript } = require('./templates');
const { melbourneCalendarDate, thirdDayLabel } = require('./dates');

const RUN_CONFIG = {
  am: { dayOffset: 0, style: 'top', description: "5am read - today's forecast" },
  afternoon: { dayOffset: 0, style: 'overnight', description: "10am read - today's afternoon forecast" },
  pm: { dayOffset: 1, style: 'top', description: "4:30pm read - tomorrow's forecast" },
};

async function generateAll(runType) {
  const config = RUN_CONFIG[runType];
  if (!config) {
    throw new Error(`Unknown run type "${runType}" - expected one of: ${Object.keys(RUN_CONFIG).join(', ')}`);
  }
  const { dayOffset, style, description } = config;

  const baseDate = melbourneCalendarDate();
  const thirdDayName = thirdDayLabel(baseDate, dayOffset);

  const scripts = [];
  const errors = [];

  for (const location of locations) {
    try {
      const forecastsByTown = await Promise.all(
        location.towns.map(async (town) => {
          const raw = await getForecastForTown(town, 3 + dayOffset);
          return raw.slice(dayOffset, dayOffset + 3);
        })
      );

      let wind = null;
      if (location.includeWind) {
        wind = await getWindForTown(location.towns[0], dayOffset);
      }

      const lines = renderScript(location, forecastsByTown, thirdDayName, style, wind);
      scripts.push({ code: location.code, show: location.show, lines });
    } catch (err) {
      errors.push({ code: location.code, show: location.show, error: err.message });
      scripts.push({
        code: location.code,
        show: location.show,
        lines: [`(Weather unavailable - ${err.message})`],
      });
    }
  }

  const result = {
    generatedAt: new Date().toISOString(),
    run: runType,
    runDescription: description,
    thirdDayName,
    scripts,
    errors,
  };

  const store = getWeatherStore();
  await store.setJSON('latest', result);

  return result;
}

module.exports = { generateAll };
