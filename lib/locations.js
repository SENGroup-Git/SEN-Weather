/**
 * lib/locations.js
 *
 * Maps every show code (from the Weather Grid - Locations.xlsx, column D)
 * to what needs to be looked up from WillyWeather, and how it should read
 * on air.
 *
 * `type` controls which template function is used (see lib/templates.js):
 *   - "single"      one town, today/tomorrow/day-after with temps
 *   - "state"       one town used as a proxy for a whole state, descriptive only
 *   - "twoTown"     two named towns, each with today/tomorrow
 *   - "multiMetro"  several named cities, today only, temps, no extension
 *   - "multiTown"   several named towns, descriptive only, no temps
 *
 * `searchTerms` are queried against WillyWeather's /search.json endpoint.
 * Confirm the returned location IDs once and hardcode them below as
 * `locationId` to save an API call per run (left blank here since we
 * don't have a live API key yet - lib/willyweather.js falls back to a
 * live search if locationId is missing).
 */

const locations = [
  {
    code: 'FANVWTH',
    show: 'SEN FANATIC WEATHER',
    type: 'multiMetro',
    towns: [
      { label: 'Melbourne', searchTerm: 'Melbourne, VIC', locationId: null },
      { label: 'Sydney', searchTerm: 'Sydney, NSW', locationId: null },
      { label: 'Brisbane', searchTerm: 'Brisbane, QLD', locationId: null },
    ],
  },
  {
    code: 'SENMWTH',
    show: 'SEN MELBOURNE WEATHER',
    type: 'single',
    towns: [{ label: 'Melbourne', searchTerm: 'Melbourne, VIC', locationId: null }],
  },
  {
    code: 'VICTWTHR',
    show: '[VIC] SEN VICTORIA WTHR REPORT',
    type: 'state',
    stateLabel: 'Victoria',
    includeWind: true,
    towns: [{ label: 'Melbourne', searchTerm: 'Melbourne, VIC', locationId: null }],
  },
  {
    code: 'GEELWTH',
    show: 'SEN GEELONG WEATHER',
    type: 'single',
    towns: [{ label: 'Geelong', searchTerm: 'Geelong, VIC', locationId: null }],
  },
  {
    code: 'GVWTH',
    show: 'GOULBURN VALLEY WEATHER',
    type: 'single',
    towns: [{ label: 'Goulburn Valley', searchTerm: 'Cobram, VIC', locationId: null }],
  },
  {
    code: 'TASMWTH',
    show: 'SEN TASMANIA WEATHER',
    type: 'single',
    towns: [{ label: 'Hobart', searchTerm: 'Hobart, TAS', locationId: null }],
  },
  {
    code: 'ADLWTHR',
    show: 'SEN ADELAIDE WEATHER',
    type: 'single',
    towns: [{ label: 'Adelaide', searchTerm: 'Adelaide, SA', locationId: null }],
  },
  {
    code: 'SENMTGW',
    show: 'SEN MT GAMBIER WEATHER',
    type: 'single',
    towns: [{ label: 'Mount Gambier', searchTerm: 'Mount Gambier, SA', locationId: null }],
  },
  {
    code: 'NTWEATH',
    show: 'SEN NT WEATHER',
    type: 'twoTown',
    towns: [
      { label: 'Darwin', searchTerm: 'Darwin, NT', locationId: null },
      { label: 'Alice Springs', searchTerm: 'Alice Springs, NT', locationId: null },
    ],
  },
  {
    code: 'WAWTHR',
    show: 'SEN WA WEATHER',
    type: 'stateDetailed',
    stateLabel: 'Western Australia',
    // towns[0] is the proxy for the opening "across the state" line;
    // towns[1..] are named in order in the breakdown sentence.
    towns: [
      { label: 'Perth', searchTerm: 'Perth, WA', locationId: null },
      { label: 'Kalgoorlie', searchTerm: 'Kalgoorlie, WA', locationId: null },
      { label: 'the South West', searchTerm: 'Bunbury, WA', locationId: null },
      { label: 'Perth', searchTerm: 'Perth, WA', locationId: null },
    ],
  },
  {
    code: 'STWWT',
    show: 'SEN STH WEST WA WEATHER',
    type: 'single',
    towns: [{ label: 'South West WA', searchTerm: 'Bunbury, WA', locationId: null }],
  },
  {
    code: '1170WTH',
    show: 'SEN 1170 SYDNEY WEATHER',
    type: 'single',
    towns: [{ label: 'Sydney', searchTerm: 'Sydney, NSW', locationId: null }],
  },
  {
    code: 'SENQWTH',
    show: 'SENQ WEATHER',
    type: 'single',
    towns: [{ label: 'Brisbane', searchTerm: 'Brisbane, QLD', locationId: null }],
  },
  {
    code: 'SENGCWT',
    show: 'SEN GOLD COAST WEATHER',
    type: 'single',
    towns: [{ label: 'Gold Coast', searchTerm: 'Gold Coast, QLD', locationId: null }],
  },
  {
    code: 'TURWTH',
    show: 'SEN TURF',
    type: 'stateDetailed',
    stateLabel: 'Western Australia',
    towns: [
      { label: 'Perth', searchTerm: 'Perth, WA', locationId: null },
      { label: 'Kalgoorlie', searchTerm: 'Kalgoorlie, WA', locationId: null },
      { label: 'the South West', searchTerm: 'Bunbury, WA', locationId: null },
      { label: 'Perth', searchTerm: 'Perth, WA', locationId: null },
    ],
  },
  {
    code: 'RSNWTH',
    show: 'RSN',
    type: 'state',
    stateLabel: 'Victoria',
    towns: [{ label: 'Melbourne', searchTerm: 'Melbourne, VIC', locationId: null }],
  },
  {
    code: '1593WTH',
    show: 'SEN TRACK VIC WEATHER',
    type: 'state',
    stateLabel: 'Victoria',
    towns: [{ label: 'Melbourne', searchTerm: 'Melbourne, VIC', locationId: null }],
  },
  {
    code: 'NTASWTH',
    show: 'SEN TRACK TAS / NORTHERN TASMANIA WEATHER',
    type: 'twoTown',
    towns: [
      { label: 'Launceston', searchTerm: 'Launceston, TAS', locationId: null },
      { label: 'Devonport', searchTerm: 'Devonport, TAS', locationId: null },
    ],
  },
  {
    code: 'TKPEWTH',
    show: 'SEN TRACK PERTH',
    type: 'single',
    towns: [{ label: 'Perth', searchTerm: 'Perth, WA', locationId: null }],
  },
  {
    code: '1539WTH',
    show: 'SEN TRACK NSW WEATHER',
    type: 'multiTown',
    regionLabel: 'New South Wales & ACT',
    highlightLabels: ['Sydney', 'Canberra'], // these two get an inline temperature
    towns: [
      { label: 'Sydney', searchTerm: 'Sydney, NSW', locationId: null },
      { label: 'Central Coast', searchTerm: 'Gosford, NSW', locationId: null },
      { label: 'Illawarra', searchTerm: 'Wollongong, NSW', locationId: null },
      { label: 'Riverina', searchTerm: 'Wagga Wagga, NSW', locationId: null },
      { label: 'Canberra', searchTerm: 'Canberra, ACT', locationId: null },
    ],
  },
  {
    code: 'TKQWTH',
    show: 'SEN TRACK QLD WEATHER',
    type: 'multiTown',
    regionLabel: 'Queensland',
    towns: [
      { label: 'Brisbane', searchTerm: 'Brisbane, QLD', locationId: null },
      { label: 'Toowoomba', searchTerm: 'Toowoomba, QLD', locationId: null },
      { label: 'Kingaroy', searchTerm: 'Kingaroy, QLD', locationId: null },
      { label: 'Townsville', searchTerm: 'Townsville, QLD', locationId: null },
      { label: 'Ingham', searchTerm: 'Ingham, QLD', locationId: null },
      { label: 'Cairns', searchTerm: 'Cairns, QLD', locationId: null },
      { label: 'Atherton', searchTerm: 'Atherton, QLD', locationId: null },
    ],
  },
];

module.exports = { locations };
