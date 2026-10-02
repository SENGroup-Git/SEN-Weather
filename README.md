# SEN Weather Scripts

Generates the 20 on-air weather script codes three times a day (5am, 10am
and 4:30pm Melbourne time) and displays them on a single page for staff.

Hosted on an **Azure Function App (Flex Consumption)** in `rg-weatherapp`.
Previously a Netlify site, then briefly a test Azure Web App (`weatherappsen`).

## How it fits together

| Part | File | What it does |
|---|---|---|
| Timer | `src/functions/scheduledWeather.js` | Wakes every 15 min in UTC windows; only runs at 5am / 10am / 4:30pm Melbourne time |
| Page | `src/functions/site.js` + `public/` | Serves the display page and logo |
| Data endpoint | `src/functions/getScripts.js` | `GET /api/get-scripts` - returns the latest batch |
| Manual trigger | `src/functions/generateNow.js` | `GET /api/generate-now?key=SECRET&run=am` |
| Wind debug (temporary) | `src/functions/debugWind.js` | `GET /api/debug-wind?key=SECRET` |
| Storage | `lib/dataStore.js` | Saves `latest.json` to the `sen-weather` blob container |
| Weather logic | `lib/` (everything else) | Forecast fetching, templates, dates, locations |

## App settings (Function App -> Settings -> Environment variables)

- `WILLYWEATHER_API_KEY` - the WillyWeather API key
- `GENERATE_SECRET` - long random letters/numbers; protects the manual trigger and debug endpoints
- `STORAGE_ACCOUNT_NAME` - optional. If unset, the app uses the account from
  `AzureWebJobsStorage__accountName`, which Azure sets automatically when host
  storage uses managed identity.
- `APPLICATIONINSIGHTS_CONNECTION_STRING` - set by Azure when Application Insights is connected

Storage access uses the Function App's system-assigned managed identity, so
there are no storage keys. The identity needs **Storage Blob Data Contributor**
(or Owner) on the storage account. The `sen-weather` container is created
automatically on the first run.

Access control is Microsoft sign-in (App Service Authentication) on the
Function App, restricted to the SEN tenant. There is no site password.

## Deploying

1. `npm install`
2. In VS Code with the Azure Functions extension: right-click the Function App
   (`sen-weather-scripts`) -> **Deploy to Function App**.
3. Test each run type:
   ```
   https://<app-address>/api/generate-now?key=YOUR_GENERATE_SECRET&run=am
   https://<app-address>/api/generate-now?key=YOUR_GENERATE_SECRET&run=afternoon
   https://<app-address>/api/generate-now?key=YOUR_GENERATE_SECRET&run=pm
   ```
4. Open `https://<app-address>/` to check the page.

Run types:
- `am` - today's forecast, 5am read style ("heading for a top of X")
- `afternoon` - today's remaining forecast, 10am read style ("rest of the day... overnight low of X")
- `pm` - tomorrow's forecast, 4:30pm read style (recorded in advance, same phrasing as `am` but for the next day)

## Running locally

1. Install Azure Functions Core Tools and the Azurite storage emulator
   (VS Code extension, or `npm install -g azurite`), and start Azurite.
2. Copy `local.settings.example.json` to `local.settings.json` (never commit it).
   It defaults to mock weather data, so no API key is needed.
3. `npm start`, then open http://localhost:7071/
4. Trigger a run: http://localhost:7071/api/generate-now?key=local-dev-secret&run=am

## Things to verify / likely to need adjusting

- **WillyWeather field names** (`lib/willyweather.js`): temperature/precis
  parsing is confirmed against a live response. Wind field names
  (direction/speed, used for VICTWTHR only) are NOT yet confirmed - run
  `/api/debug-wind?key=YOUR_GENERATE_SECRET` once deployed, check the raw
  response, and adjust `parseWindDay()` in `lib/willyweather.js` if the
  field names differ (same process used to fix temperature parsing
  originally). Delete `src/functions/debugWind.js` once confirmed working.
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
