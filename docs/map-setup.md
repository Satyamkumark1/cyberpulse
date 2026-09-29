# Detailed map and geographic lookup

The risk map now uses street tiles, ranked hotspot pins, the selected H3 area boundary, recorded ATM points/clusters, and a location panel with coordinates and sourced PIN-code information. The shared dashboard shell has active navigation, a light header, and a mobile menu.

## Configuration

```dotenv
NEXT_PUBLIC_MAP_TILE_URL=https://tiles.openfreemap.org/styles/liberty
LOCATION_SERVICE_URL=https://photon.komoot.io
```

The first variable is an existing public MapLibre style URL. Custom styles are respected. An absent style or the previous `demotiles.maplibre.org` default uses OpenFreeMap Liberty so existing local environments also receive street detail. Restart the Next.js process after changing configuration.

OpenFreeMap's [official quick start](https://openfreemap.org/quick_start/) documents the style integration. MapLibre displays the style's OpenFreeMap/OpenMapTiles/OpenStreetMap attribution. No new API key or package installation is needed for these defaults.

`LOCATION_SERVICE_URL` points to a Photon-compatible backend. Photon provides [forward, structured postcode, and reverse lookup](https://github.com/komoot/photon/blob/master/docs/api-v1.md). Its [public demo policy](https://github.com/komoot/photon#demo-server) permits reasonable project usage but provides no availability guarantee. Use a private instance for higher traffic or multiple server instances.

The prototype bounds requests with a per-client route limit and a process-wide upstream interval, deduplicates identical requests in flight, and caches only geographic metadata for one hour with a bounded cache. Search runs on explicit submission, not every keystroke. Only the geographic query is sent to the provider; complaint and prediction records are not included. Prediction results never enter the geography cache.

## Interpretation

- Pins use stored coordinates. A hotspot is an H3 area prediction, not a verified address; its hexagon is shown on selection.
- Reverse lookup describes a nearby mapped feature. Its PIN code is explicitly labelled approximate and may not describe the entire predicted area.
- A six-digit search uses Photon's structured postcode endpoint and accepts only matching postal codes. Postal-area features may identify the code in their name when explicitly classified as a postcode.
- Missing/invalid PIN codes stay unavailable. Provider failure leaves the original coordinate and risk map usable with a retry action.
- Geographic search results carry no risk assessment. Prototype ATM coordinates remain labelled synthetic even when the basemap shows real streets or landmarks.
- Search input uses `latitude, longitude`; map GeoJSON uses `[longitude, latitude]`.

## API

`GET /api/locations?q=<locality-or-PIN>` or `GET /api/locations?lat=<latitude>&lon=<longitude>`.

The endpoint enforces the existing `hotspots:read` capability, validates India coordinate bounds, and returns `{ data, lookedUpAt }`. Place records include coordinates, locality/district/state, nullable `postalCode`, `source`, and `matchType` (`place` or `nearby`). No database migration is required.

## Verification

```sh
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test:unit
# Start the normal development server, then:
pnpm --filter web test:map
```

Set `MAP_TEST_BASE_URL` when the running app is not on port 3000. The map suite mocks geographic and hotspot responses and external tiles. It checks deep links, PIN detail, map/table switching, coordinate validation, lookup failure, missing WebGL, mobile navigation, and failed-basemap fallback. Artifacts are written to `/tmp/cyberpulse-map-test-results`.

Implementation validation also exercised actual OpenFreeMap street rendering, a Chennai coordinate reverse lookup, PIN search for Noida, and the dashboard integration in Chromium. Desktop (1440px) and mobile (390px) map pages had no detected WCAG A/AA violations in axe; this automated check does not replace a full manual accessibility audit.
