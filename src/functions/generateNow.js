/**
 * src/functions/generateNow.js
 *
 * GET /api/generate-now?key=YOUR_SECRET&run=am - replaces
 * functions/generate-now.js. Manual trigger for testing, or as a
 * backup if a scheduled run fails. Protected by GENERATE_SECRET (and by
 * Microsoft sign-in once that is switched on).
 *
 * `run` is one of: am (5am/today), afternoon (10am), pm (4:30pm/tomorrow).
 * Defaults to "am" if omitted.
 */

const { app } = require('@azure/functions');
const { generateAll } = require('../../lib/generate');

async function generateNow(request) {
  const secret = process.env.GENERATE_SECRET;
  if (!secret || request.query.get('key') !== secret) {
    return { status: 401, body: 'Unauthorized' };
  }

  const runType = request.query.get('run') || 'am';

  try {
    const result = await generateAll(runType);
    return { status: 200, jsonBody: result };
  } catch (err) {
    return { status: 500, body: `Generation failed: ${err.message}` };
  }
}

app.http('generateNow', {
  route: 'api/generate-now',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: generateNow,
});

module.exports = { generateNow };
