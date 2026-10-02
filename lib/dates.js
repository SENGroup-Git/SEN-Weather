/**
 * lib/dates.js
 *
 * Azure Functions timer triggers run on UTC cron (Linux plans). These helpers work out what
 * "today" means in Melbourne time (AEST/AEDT, whichever currently applies)
 * regardless of when the underlying cron fires, and name the days used in
 * the read (e.g. "tomorrow", "Sunday").
 *
 * IMPORTANT: we extract the Melbourne y/m/d/h/min directly via
 * Intl.DateTimeFormat and build a "calendar date" (midnight UTC, values
 * representing the Melbourne date) rather than converting a JS Date
 * through Melbourne time twice - doing the conversion twice silently
 * shifts the result forward by up to a day.
 */

const MELBOURNE_TZ = 'Australia/Melbourne';

/** Extracts Melbourne-local y/m/d/h/min as plain numbers for a given instant. */
function melbourneParts(instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MELBOURNE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(instant);

  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') === 24 ? 0 : get('hour'), // some locales render midnight as 24
    minute: get('minute'),
  };
}

/**
 * A "calendar date" Date object (midnight UTC) whose y/m/d fields equal
 * today's date in Melbourne. Safe to use with addDays/weekdayName below
 * without any further timezone conversion.
 */
function melbourneCalendarDate(instant = new Date()) {
  const { year, month, day } = melbourneParts(instant);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Adds `days` days to a calendar date, returning a new Date (does not mutate). */
function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** Full weekday name, e.g. "Sunday". Must be given a calendar date (see above). */
function weekdayName(date) {
  return date.toLocaleDateString('en-AU', { timeZone: 'UTC', weekday: 'long' });
}

/**
 * Names the third day in a 3-day read. If it's a weekday, use its name
 * (e.g. "Thursday"); the examples always use a proper day name, never
 * "the day after tomorrow", so we follow that convention consistently.
 * `dayOffset` shifts the whole window forward (1 for the PM run, where
 * "today" in the script actually means tomorrow).
 */
function thirdDayLabel(baseDate, dayOffset = 0) {
  return weekdayName(addDays(baseDate, 2 + dayOffset));
}

module.exports = {
  melbourneParts,
  melbourneCalendarDate,
  addDays,
  weekdayName,
  thirdDayLabel,
  MELBOURNE_TZ,
};
