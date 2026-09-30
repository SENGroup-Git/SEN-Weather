# SEN Weather Scripts

Generates the 20 on-air weather script codes twice a day (5am for today,
4:30pm for tomorrow) and displays them on a single password-gated page.

## Setup

1. **Add this folder to your existing Netlify site's repo** (the one you're
   already hosting on), or push it as its own site - either works, since it's
   fully self-contained.

2. **Install dependencies** (run once, commit the resulting `package-lock.json`):
   ```
   npm install
   ```

3. **Environment variables** - set these in Netlify: Site configuration →
   Environment variables:
   - `WILLYWEATHER_API_KEY` - your WillyWeather API key
   - `GENERATE_SECRET` - any random string, used to protect the manual test endpoint
   - `NETLIFY_SITE_ID` - your project's Site ID (shown in the `netlify init` output
     as "Project ID", or on the site dashboard under Site configuration -> General)
   - `NETLIFY_API_TOKEN` - a Personal Access Token: click your account avatar (top
     right of the Netlify dashboard) -> User settings -> Applications -> Personal
     access tokens -> New access token. Needed because Netlify Blobs' zero-config
     auto-detection doesn't reliably pick up site context on manual/CLI deploys
     that skip Netlify's Git-based build pipeline - see `lib/blobStore.js`.

4. **Set the site password** - edit `public/_headers` and replace
   `CHANGE_THIS_PASSWORD` with a real shared password before deploying.

5. **Enable Scheduled Functions** if your Netlify account hasn't already -
   this is on by default for most accounts, but check Site configuration →
   Environment variables / Functions if the scheduled function doesn't fire.

## Testing before relying on the schedule

Don't wait to see if it works. Hit the manual trigger once deployed, once
for each of the three run types:

```
https://YOUR-SITE.netlify.app/.netlify/functions/generate-now?key=YOUR_GENERATE_SECRET&run=am
https://YOUR-SITE.netlify.app/.netlify/functions/generate-now?key=YOUR_GENERATE_SECRET&run=afternoon
https://YOUR-SITE.netlify.app/.netlify/functions/generate-now?key=YOUR_GENERATE_SECRET&run=pm
```

- `am` - today's forecast, 5am read style ("heading for a top of X")
- `afternoon` - today's remaining forecast, 10am read style ("rest of the
  day... overnight low of X")
- `pm` - tomorrow's forecast, 4:30pm read style (recorded in advance, same
  phrasing as `am` but for the next day)

Then load the site's homepage (behind the Basic-Auth prompt) to confirm
whichever you last generated appears correctly.

## Things to verify / likely to need adjusting

- **WillyWeather field names** (`lib/willyweather.js`): temperature/precis
  parsing is confirmed against a live response. Wind field names
  (direction/speed, used for VICTWTHR only) are NOT yet confirmed - run
  `/.netlify/functions/debug-wind?key=YOUR_GENERATE_SECRET` once deployed,
  check the raw response, and adjust `parseWindDay()` in
  `lib/willyweather.js` if the field names differ (same process used to
  fix temperature parsing originally). Delete `debug-wind.js` once
  confirmed working, same as `debug-forecast.js` before it.
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

- `lib/locations.js` - the 20 show codes and their town/label config
- `lib/willyweather.js` - WillyWeather API client
- `lib/templates.js` - turns forecasts into script lines per format type
- `lib/dates.js` - Melbourne-timezone-aware date helpers
- `lib/generate.js` - orchestrates one full run and saves to Blobs
- `netlify/functions/scheduled-weather.js` - the scheduled trigger (DST-safe)
- `netlify/functions/get-scripts.js` - serves the latest batch to the page
- `netlify/functions/generate-now.js` - manual test trigger
- `public/index.html` - the display page
- `public/_headers` - Basic-Auth password gate (free-plan compatible)
