# SEN Weather Scripts

Generates the 20 on-air weather script codes twice a day (5am for today,
4:30pm for tomorrow) and displays them on a single password-gated page.

Runs as a plain Node app on Azure App Service (Linux) - no Netlify, no
external functions platform. `server.js` is the single entry point: it
serves the static page, handles the three API routes, and runs an
in-process scheduler that checks Melbourne local time every minute.

## Setup

1. **App Service** - Node 22 LTS, Linux. `package.json`'s `start` script
   (`node server.js`) is picked up automatically, no custom startup command
   needed.

2. **Environment variables** - set these in App Service -> Configuration ->
   Environment variables:
   - `WILLYWEATHER_API_KEY` - your WillyWeather API key
   - `GENERATE_SECRET` - any random string, used to protect the manual test
     endpoint (`/api/generate-now`, `/api/debug-wind`)
   - `SITE_PASSWORD` - the shared password for the site's Basic-Auth gate.
     Leave unset to disable the gate entirely (useful while testing).

3. **Continuous deployment** - App Service -> Deployment Center -> connect
   the GitHub repo and branch. Every push then auto-builds and redeploys.

4. **Data persistence** - the latest generated batch is written to
   `/home/data/latest.json` (see `lib/dataStore.js`). Anything under
   `/home` on Linux App Service survives restarts and redeploys, unlike
   `/home/site/wwwroot` (the deployed code itself), so this is safe across
   deploys as long as you stay on a single instance (no scale-out).

5. **Always On** - on the Free (F1) tier the app can go to sleep when idle,
   which pauses the in-process scheduler too. Upgrade to Basic (B1) or
   higher and enable Always On (Configuration -> General settings) before
   relying on the 5am/10am/4:30pm schedule actually firing unattended.

## Local development

```
npm install
node scripts/local-server.js
```

Then open http://localhost:8888. This uses made-up weather data by default
(`WILLYWEATHER_MOCK=true`) and a placeholder `GENERATE_SECRET`
(`local-dev-secret`) so it works with no real API key - see
`scripts/local-server.js`. It runs the exact same `server.js` Azure does,
just with those two defaults pre-set.

## Testing before relying on the schedule

Don't wait to see if it works. Hit the manual trigger once deployed, once
for each of the three run types:

```
https://YOUR-APP.azurewebsites.net/api/generate-now?key=YOUR_GENERATE_SECRET&run=am
https://YOUR-APP.azurewebsites.net/api/generate-now?key=YOUR_GENERATE_SECRET&run=afternoon
https://YOUR-APP.azurewebsites.net/api/generate-now?key=YOUR_GENERATE_SECRET&run=pm
```

- `am` - today's forecast, 5am read style ("heading for a top of X")
- `afternoon` - today's remaining forecast, 10am read style ("rest of the
  day... overnight low of X")
- `pm` - tomorrow's forecast, 4:30pm read style (recorded in advance, same
  phrasing as `am` but for the next day)

Then load the site's homepage (behind the Basic-Auth prompt, if
`SITE_PASSWORD` is set) to confirm whichever you last generated appears
correctly.

## Things to verify / likely to need adjusting

- **WillyWeather field names** (`lib/willyweather.js`): temperature/precis
  parsing is confirmed against a live response. Wind field names
  (direction/speed, used for VICTWTHR only) are NOT yet confirmed - run
  `/api/debug-wind?key=YOUR_GENERATE_SECRET` once deployed, check the raw
  response, and adjust `parseWindDay()` in `lib/willyweather.js` if the
  field names differ (same process used to fix temperature parsing
  originally). Delete `debug-wind.js` once confirmed working.
- **Location IDs** (`lib/locations.js`): every town currently does a live
  `search.json` lookup by name each run (cheap, but adds a small delay).
  Once you've confirmed each search resolves to the right town, you can
  hardcode the returned `id` into each town's `locationId` field to skip
  the search step.
- **Regional groupings for Track NSW / Track QLD**: the multi-town
  descriptive format groups towns by matching forecast conditions - it's
  a reasonable approximation of the real examples but is the one format
  most likely to need a light manual tidy-up on days with unusual weather
  splits.
- **Promo/tag line**: deliberately left out of every script - that's the
  "and don't miss tonight's..." line that changes daily based on what's on
  air, and stays a manual addition.

## Files

- `server.js` - single entry point: static file server, API routes, and
  the in-process schedule checker (5am / 10am / 4:30pm Melbourne time)
- `lib/locations.js` - the 20 show codes and their town/label config
- `lib/willyweather.js` - WillyWeather API client
- `lib/templates.js` - turns forecasts into script lines per format type
- `lib/dates.js` - Melbourne-timezone-aware date helpers
- `lib/generate.js` - orchestrates one full run and saves to the data store
- `lib/dataStore.js` - filesystem-backed JSON store (Azure Blobs stand-in)
- `functions/get-scripts.js` - serves the latest batch to the page
- `functions/generate-now.js` - manual test trigger
- `functions/debug-wind.js` - temporary wind-field debug endpoint
- `public/index.html` - the display page
- `scripts/local-server.js` - local dev launcher (mock data, no API key
  needed)
