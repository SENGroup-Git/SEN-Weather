/**
 * lib/blobStore.js
 *
 * Zero-config Netlify Blobs (`getStore('name')`) doesn't always pick up
 * site context automatically on manual/CLI deploys that skip Netlify's
 * Git-based build pipeline. Falling back to explicit siteID + token fixes
 * this reliably.
 *
 * Requires these two environment variables to be set (see README):
 *   NETLIFY_SITE_ID   - your project's Site ID (shown after `netlify init`,
 *                        or on the site's dashboard under Site configuration)
 *   NETLIFY_API_TOKEN - a Personal Access Token, created under
 *                        User settings -> Applications -> Personal access tokens
 */

const { getStore } = require('@netlify/blobs');

function getWeatherStore() {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_API_TOKEN;

  if (siteID && token) {
    return getStore({ name: 'sen-weather', siteID, token });
  }

  // Fallback to zero-config (works fine in `netlify dev` and most Git-based deploys)
  return getStore('sen-weather');
}

module.exports = { getWeatherStore };
