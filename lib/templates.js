/**
 * lib/templates.js
 *
 * Turns forecast data into the actual on-air lines, per the location
 * types in lib/locations.js. Deliberately does NOT include the closing
 * promo/tag line ("And SEN is your home of AFL & NRL...") - that changes
 * daily based on what's actually on air and stays a manual add by whoever
 * preps the bulletin.
 *
 * THREE RUNS A DAY, TWO PHRASING STYLES:
 *   - 5am  ('top' style)       - today's forecast, "heading for a top of X"
 *   - 10am ('overnight' style) - today's REMAINING forecast, "rest of the
 *                                day... overnight low of X", tomorrow/day-3
 *                                still using normal top-of-X phrasing
 *   - 3pm  ('top' style)       - TOMORROW's forecast, recorded in advance,
 *                                using the exact same 'top' phrasing as the
 *                                5am run (see lib/generate.js for the day-
 *                                shifting logic that makes "today" in the
 *                                wording actually mean tomorrow's date)
 *
 * Design choices made where the real examples were inconsistent or didn't
 * cover a new format (flagged so they're easy to revisit):
 *   - Single-city reads always use 3 lines (today / tomorrow / day-3),
 *     even though some real examples combined lines 2+3 into one.
 *   - Temperature descriptor for state-wide reads (since WillyWeather
 *     doesn't return free-text wind detail beyond direction/speed) is
 *     bucketed from the max temp: <15 "cool", 15-22 "mild", 23-30 "warm",
 *     >30 "hot".
 *   - Wind strength descriptor is bucketed from speed (km/h, provisional
 *     field mapping - see lib/willyweather.js): <11 "light", 11-24
 *     "moderate", 25-39 "fresh", >=40 "strong".
 */

function tempDescriptor(max) {
  if (max == null) return '';
  if (max < 15) return 'cool';
  if (max <= 22) return 'mild';
  if (max <= 30) return 'warm';
  return 'hot';
}

const WIND_DIRECTION_ADJECTIVES = {
  N: 'northerly',
  NNE: 'north-northeasterly',
  NE: 'north-easterly',
  ENE: 'east-northeasterly',
  E: 'easterly',
  ESE: 'east-southeasterly',
  SE: 'south-easterly',
  SSE: 'south-southeasterly',
  S: 'southerly',
  SSW: 'south-southwesterly',
  SW: 'south-westerly',
  WSW: 'west-southwesterly',
  W: 'westerly',
  WNW: 'west-northwesterly',
  NW: 'north-westerly',
  NNW: 'north-northwesterly',
};

function windDirectionAdjective(directionText) {
  if (!directionText) return null;
  return WIND_DIRECTION_ADJECTIVES[directionText.toUpperCase()] || null;
}

function windStrengthDescriptor(speed) {
  if (speed == null) return null;
  if (speed < 11) return 'light';
  if (speed < 25) return 'moderate';
  if (speed < 40) return 'fresh';
  return 'strong';
}

/** Builds " with moderate northerly winds" (or '' if wind data is missing). */
function windPhrase(wind) {
  if (!wind) return '';
  const strength = windStrengthDescriptor(wind.speed);
  const direction = windDirectionAdjective(wind.directionText);
  if (!strength || !direction) return '';
  return ` with ${strength} ${direction} winds`;
}

function lower1(str) {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

// ---- single: one town, 3-day read ----
function renderSingle(town, forecast, thirdDayName, style) {
  const [day1, day2, day3] = forecast;
  const line1 =
    style === 'overnight'
      ? `${town.label}'s weather – ${lower1(day1.precis)} for the rest of the day, heading for a low of ${day1.min} degrees overnight`
      : `${day1.precis} for ${town.label} today, heading for a top of ${day1.max} degrees`;
  return [
    line1,
    `${day2.precis} and ${day2.max} tomorrow`,
    `${day3.precis} and ${day3.max} on ${thirdDayName}`,
  ];
}

// ---- state: one proxy town, descriptive, no numbers/extension ----
// `wind` (optional) adds " with moderate northerly winds" etc to the line.
function renderState(stateLabel, forecast, style, wind) {
  const [day1] = forecast;
  const descriptor = tempDescriptor(day1.max);
  const wPhrase = windPhrase(wind);
  if (style === 'overnight') {
    return [`${stateLabel}'s weather – ${lower1(day1.precis)} for the afternoon, ${descriptor} temperatures${wPhrase}`];
  }
  return [`${stateLabel}'s weather: ${lower1(day1.precis)} across the state today, ${descriptor} temperatures${wPhrase}`];
}

// ---- stateDetailed: state-wide line + named-town breakdown ----
// towns[0] is the proxy town for the opening sentence (e.g. Perth for WA);
// towns[1..] are the detail towns named in the second sentence, each using
// a slightly different construction to match natural broadcast phrasing.
function renderStateDetailed(stateLabel, towns, forecastsByTown, style) {
  const [proxyDay1] = forecastsByTown[0];
  const descriptor = tempDescriptor(proxyDay1.max);
  const openingLine = `${stateLabel}'s weather: ${lower1(proxyDay1.precis)} across the state today, ${descriptor} temperatures`;

  const detailTowns = towns.slice(1);
  const detailForecasts = forecastsByTown.slice(1);
  const overnight = style === 'overnight';

  const clauses = detailTowns.map((town, i) => {
    const { precis, max, min } = detailForecasts[i][0];
    const value = overnight ? min : max;
    if (i === 0) return `${precis} for ${town.label}, ${overnight ? 'a low of ' : ''}${value}${overnight ? '' : ' the max'}`;
    if (i === 1) return `${lower1(precis)} for ${town.label} and ${value}`;
    return overnight
      ? `${town.label} also ${lower1(precis)} with a low of ${value}`
      : `${town.label} also ${lower1(precis)} and a top of ${value}`;
  });

  return [openingLine, clauses.join(', ')];
}

// ---- twoTown: two named towns ----
// 'top' style folds today+tomorrow together per town; 'overnight' style
// describes just the rest of today per town (no tomorrow extension),
// matching the original examples for this format.
function renderTwoTown(towns, forecasts, style) {
  const lines = [];
  towns.forEach((town, i) => {
    const [day1, day2] = forecasts[i];
    if (style === 'overnight') {
      const prefix = i === 0 ? `${town.label}'s weather: ` : `In ${town.label}, `;
      const dayPhrase = i === 0 ? 'for the rest of today' : 'this afternoon';
      const lowPrefix = i === 0 ? 'an overnight' : 'a';
      lines.push(`${prefix}${lower1(day1.precis)} ${dayPhrase}, ${lowPrefix} low of ${day1.min} degrees`);
    } else {
      const sameBothDays = day1.precis === day2.precis && day1.max === day2.max;
      const prefix = i === 0 ? `${town.label}'s weather: ` : `In ${town.label}, `;
      if (sameBothDays) {
        lines.push(`${prefix}${lower1(day1.precis)} and ${day1.max} degrees for today and tomorrow`);
      } else {
        lines.push(`${prefix}${lower1(day1.precis)} and ${day1.max} today, ${lower1(day2.precis)} and ${day2.max} tomorrow`);
      }
    }
  });
  return lines;
}

// ---- multiMetro: several named cities, today only ----
function renderMultiMetro(towns, forecasts, style) {
  const lines = [];
  towns.forEach((town, i) => {
    const [day1] = forecasts[i];
    if (style === 'overnight') {
      lines.push(
        i === 0
          ? `${town.label}'s weather - ${lower1(day1.precis)} for the afternoon, with an overnight low of ${day1.min} degrees`
          : `${town.label}, a ${lower1(day1.precis)} afternoon with a low of ${day1.min}`
      );
    } else {
      lines.push(
        i === 0
          ? `${day1.precis} for ${town.label} today, heading for a top of ${day1.max} degrees`
          : `${town.label} – ${lower1(day1.precis)} and ${day1.max}`
      );
    }
  });
  return lines;
}

// ---- multiTown: several towns grouped by shared conditions, descriptive only ----
// `highlightLabels` (optional) lists town labels that should show an inline
// temperature even though the rest of the group stays purely descriptive -
// keeps the read compact while still surfacing a number for towns that matter.
function renderMultiTown(regionLabel, towns, forecasts, highlightLabels, style) {
  const overnight = style === 'overnight';
  const dayWord = overnight ? 'this afternoon' : 'today';

  const groups = new Map(); // precis -> [display names]
  towns.forEach((town, i) => {
    const { precis, max, min } = forecasts[i][0];
    if (!groups.has(precis)) groups.set(precis, []);
    let displayName = town.label;
    if (highlightLabels.includes(town.label)) {
      displayName = overnight
        ? `${town.label} (an overnight low of ${min})`
        : `${town.label} (a top of ${max})`;
    }
    groups.get(precis).push(displayName);
  });

  const groupEntries = [...groups.entries()];
  const clauses = groupEntries.map(([precis, townLabels], i) => {
    const townList =
      townLabels.length === 1
        ? townLabels[0]
        : `${townLabels.slice(0, -1).join(', ')} and ${townLabels[townLabels.length - 1]}`;
    const suffix = i === 0 ? ` ${dayWord}` : '';
    return `${precis} for ${townList}${suffix}`;
  });

  return [`Checking ${regionLabel} weather`, clauses.join(', ')];
}

/**
 * Main entry point. `location` is one entry from lib/locations.js,
 * `forecastsByTown` is an array (same order as location.towns) where each
 * element is the array of daily forecasts for that town - already shifted
 * to the correct start day by lib/generate.js. `thirdDayName` is the human
 * day name for the 3rd forecast day. `style` is 'top' or 'overnight'.
 * `wind` (optional) is { directionText, speed } for locations with
 * includeWind set (currently just VICTWTHR).
 */
function renderScript(location, forecastsByTown, thirdDayName, style, wind) {
  switch (location.type) {
    case 'single':
      return renderSingle(location.towns[0], forecastsByTown[0], thirdDayName, style);
    case 'state':
      return renderState(location.stateLabel, forecastsByTown[0], style, wind);
    case 'stateDetailed':
      return renderStateDetailed(location.stateLabel, location.towns, forecastsByTown, style);
    case 'twoTown':
      return renderTwoTown(location.towns, forecastsByTown, style);
    case 'multiMetro':
      return renderMultiMetro(location.towns, forecastsByTown, style);
    case 'multiTown':
      return renderMultiTown(location.regionLabel, location.towns, forecastsByTown, location.highlightLabels || [], style);
    default:
      throw new Error(`Unknown location type: ${location.type}`);
  }
}

module.exports = { renderScript, tempDescriptor, windDirectionAdjective, windStrengthDescriptor };
