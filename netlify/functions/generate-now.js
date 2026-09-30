/**
 * netlify/functions/generate-now.js
 *
 * Manual trigger for testing - lets you run generation on demand instead
 * of waiting for the schedule. Protected by a shared secret so it can't be
 * hit anonymously even though the site is also Basic-Auth gated.
 *
 * Usage: /.netlify/functions/generate-now?key=YOUR_SECRET&run=am
 * `run` is one of: am (5am/today), afternoon (10am/today-overnight-style),
 * pm (4:30pm/tomorrow). Defaults to "am" if omitted.
 * Set GENERATE_SECRET in Netlify environment variables.
 */

const { generateAll } = require('../../lib/generate');

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const secret = process.env.GENERATE_SECRET;

  if (!secret || params.key !== secret) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const runType = params.run || 'am';

  try {
    const result = await generateAll(runType);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result, null, 2),
    };
  } catch (err) {
    return { statusCode: 500, body: `Generation failed: ${err.message}` };
  }
};
