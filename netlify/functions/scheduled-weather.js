/**
 * netlify/functions/scheduled-weather.js
 *
 * One scheduled function, deliberately checking real Melbourne local time
 * on every invocation rather than relying on a fixed UTC cron - Netlify's
 * cron does not shift for daylight saving, but Melbourne's clocks do.
 *
 * Three runs a day: 5am, 10am, 3pm Melbourne time. Cron fires every 15
 * minutes during three broad UTC windows covering each target time across
 * both AEST (UTC+10) and AEDT (UTC+11):
 *   - UTC 18:00-19:59  -> 5am AEDT (18:00) / 5am AEST (19:00)
 *   - UTC 23:00-00:59  -> 10am AEDT (23:00 prev day) / 10am AEST (00:00)
 *   - UTC 04:00-05:59  -> 3pm AEDT (04:00) / 3pm AEST (05:00)
 * The function itself only acts if Melbourne local time is actually within
 * a few minutes of 5:00am, 10:00am, or 3:00pm - every other invocation is
 * a no-op.
 */

const { schedule } = require('@netlify/functions');
const { generateAll } = require('../../lib/generate');
const { melbourneParts } = require('../../lib/dates');

const handler = async () => {
  const { hour, minute } = melbourneParts();

  let runType = null;
  if (hour === 5 && minute < 15) runType = 'am';
  else if (hour === 10 && minute < 15) runType = 'afternoon';
  else if (hour === 15 && minute < 15) runType = 'pm';

  if (!runType) {
    return { statusCode: 200, body: 'Not a trigger window, skipping.' };
  }

  const result = await generateAll(runType);
  return {
    statusCode: 200,
    body: `Generated ${result.scripts.length} scripts (${result.run}) at ${result.generatedAt}`,
  };
};

module.exports.handler = schedule('*/15 0,4,5,18,19,23 * * *', handler);
