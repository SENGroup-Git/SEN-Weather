/**
 * src/functions/scheduledWeather.js
 *
 * Timer trigger - replaces the in-process scheduler in the old server.js
 * (and before that, Netlify's scheduled-weather.js).
 *
 * Three runs a day: 5am, 10am and 4:30pm Melbourne time.
 *
 * Azure Functions timers on Linux plans (including Flex Consumption) run in
 * UTC and can't be set to Melbourne time, so the timer fires every 15
 * minutes during broad UTC windows covering each run in both AEST (UTC+10)
 * and AEDT (UTC+11), and the code checks real Melbourne time before doing
 * anything:
 *   - UTC 18:00-19:59  -> 5am AEDT (18:00) / 5am AEST (19:00)
 *   - UTC 23:00-00:59  -> 10am AEDT (23:00 prev day) / 10am AEST (00:00)
 *   - UTC 05:00-06:59  -> 4:30pm AEDT (05:30) / 4:30pm AEST (06:30)
 *
 * Azure's schedule format has a leading "seconds" field:
 * {second} {minute} {hour} {day} {month} {day-of-week}.
 */

const { app } = require('@azure/functions');
const { generateAll } = require('../../lib/generate');
const { melbourneParts } = require('../../lib/dates');

function runTypeForNow() {
  const { hour, minute } = melbourneParts();
  if (hour === 5 && minute < 15) return 'am';
  if (hour === 10 && minute < 15) return 'afternoon';
  if (hour === 16 && minute >= 30 && minute < 45) return 'pm';
  return null;
}

app.timer('scheduledWeather', {
  schedule: '0 */15 0,5,6,18,19,23 * * *',
  runOnStartup: false,
  handler: async (timer, context) => {
    const runType = runTypeForNow();
    if (!runType) {
      context.log('Not a trigger window, skipping.');
      return;
    }

    const result = await generateAll(runType);
    context.log(`Generated ${result.scripts.length} scripts (${result.run}) at ${result.generatedAt}`);

    // A run where some scripts failed still "succeeds", so log it as an
    // error too - this is what the App Insights failure alert can watch for.
    if (result.errors.length > 0) {
      context.error(`${result.errors.length} script(s) failed: ${JSON.stringify(result.errors)}`);
    }
  },
});

module.exports = { runTypeForNow };
