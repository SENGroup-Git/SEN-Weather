/**
 * lib/dataStore.js
 *
 * Minimal JSON key-value store backed by the filesystem - replaces Netlify
 * Blobs now that this app runs on Azure App Service instead of Netlify.
 * Only ever stores one object under the key "latest", so a directory of
 * small JSON files is all this needs.
 *
 * On Azure App Service (Linux), anything under /home persists across
 * restarts and redeploys (backed by Azure Files); /home/site/wwwroot -
 * where the deployed code itself lives - gets wiped and replaced on every
 * deploy, so data must live outside it, under /home/data. Locally, it
 * lives in .data/ in the project folder (gitignored).
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.WEBSITE_SITE_NAME
  ? '/home/data'
  : path.join(__dirname, '..', '.data');

function filePath(key) {
  return path.join(DATA_DIR, `${key}.json`);
}

function getWeatherStore() {
  return {
    async get(key, options = {}) {
      try {
        const raw = fs.readFileSync(filePath(key), 'utf8');
        return options.type === 'json' ? JSON.parse(raw) : raw;
      } catch (err) {
        if (err.code === 'ENOENT') return null;
        throw err;
      }
    },
    async setJSON(key, value) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(filePath(key), JSON.stringify(value));
    },
  };
}

module.exports = { getWeatherStore };
