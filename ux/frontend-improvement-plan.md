# CyberPulse AI frontend improvement plan

Date: 16 September 2026. Status: partially implemented plan.

Implementation update: the first map-focused slice is now implemented. It includes the responsive dark sidebar/light shell, detailed OpenFreeMap street tiles, selectable hotspot pins and H3 boundary, geographic search, Photon-backed PIN-code lookup, location details, ATM cluster selection, deep links, map/table switching, an accessible table when WebGL is unavailable, and a basemap retry state. See [map setup and verification](../docs/map-setup.md). Broader table, prediction-workspace, reports, typography, and production recovery validation remain planned.

Chosen direction: professional light dashboard with a dark sidebar, confirmed by the user.

Updated priority: the user specifically requests a detailed map showing location pins and PIN codes. Deliver the map improvements immediately after the shared shell foundation, ahead of the broader table redesign.

This plan is based on a source review of the current frontend, services, existing design system, UI guidelines, and primary investigator persona. Browser rendering and usability testing have not yet been performed. Findings below describe code-level gaps; visual quality and responsive behavior need browser verification during implementation.

## 1. Intended outcome

Help an investigating officer answer three questions quickly: what needs attention, why a location is considered risky, and what action is available next.

Make the main journey coherent: dashboard → complaint → money trail and prediction → alert review → investigation follow-up. Preserve the existing routes, role capabilities, synthetic-data disclosures, and server-backed prediction behavior.

## 2. Findings that drive the work

| Current evidence | User impact | Planned response |
|---|---|---|
| Dashboard layout renders identical navigation link styles and a fixed `w-56` sidebar without responsive variants. | Current location is unclear; navigation consumes space on narrow screens. | Active navigation, breadcrumbs, responsive sidebar and mobile drawer. |
| Dashboard starts with a map, hotspot list, and recent alerts; no compact operational summary is rendered. | Users must scan several regions to understand what needs attention. | Clear attention section and, where supported by scoped service totals, a compact summary row. |
| Complaints fetch 25 rows and support a page query but render neither pagination nor filter controls. | Records beyond the first page are difficult to reach through the interface. | Shared pagination plus controls for existing service filters and sorting. |
| Transactions similarly fetch a page without rendering pagination; tables use different containers and spacing across routes. | Browsing and scanning behave differently by screen. | One table shell, toolbar, footer, formatting pattern, and responsive overflow treatment. |
| Alerts and investigations repeat local status-color mappings. | Visual meaning and accessibility can drift. | Shared status and severity badges with text, icon, and semantic color. |
| Prediction results are vertically stacked; the explanation is a text list, and the header can show two filled actions. | Location, time window, explanation, and next action compete for attention. | Structured prediction summary, factor bars, and one primary action per state. |
| Some list errors tell users to retry without providing a retry action; the shared loading state is a spinner. | Recovery is unclear and loading gives little sense of page structure. | Contextual recovery controls and skeleton variants through the shared state component. |
| Existing design documents specify typography and reusable primitives beyond what is wired into the current frontend. | Screens feel less consistent than the intended design. | Implement the existing design foundation before introducing new visual conventions. |

## 3. Visual direction

- Retain deep navy sidebar `#0B1B33`, light canvas `#F6F8FB`, white panels, and blue primary actions `#1B5FBF`.
- Use a light top bar to give the content more visual breathing room; keep the synthetic-data badge clearly visible.
- Follow the existing type scale: 24px page titles, 18px section titles, 14px body text, and 12px metadata. Use tabular numerals for amounts, scores, dates, and identifiers.
- Wire the specified Inter and JetBrains Mono families with suitable fallbacks. Verify readability and loading behavior in the browser.
- Use 32px desktop page padding, 20px card padding, 24px section gaps, and the existing 4/6/8px radius scale. Reduce outer padding on small screens.
- Use subtle borders and restrained elevation. Reserve risk colors for risk or status, and pair them with labels and icons.
- Use consistent navigation and action icons with visible labels or accessible names. Follow the existing Lucide direction; verify dependencies before introducing it.
- Keep animation brief and functional, with reduced-motion support. Validate actual foreground/background contrast instead of relying on documented contrast claims.

## 4. Page and workflow changes

### Application shell

Group navigation under Monitoring (Dashboard, Risk Map, Alerts), Casework (Complaints, Transactions, Investigations), and Administration (Reports, Settings), retaining route names and capability behavior.

Add an active indicator with `aria-current`, breadcrumbs on detail pages, a skip link, and a consistent page header with one primary action. Label the role selector as a demo control. Keep settings near the sidebar footer and make disclosures deliberate parts of the layout.

Desktop uses the full sidebar. Tablet uses a compact navigation option; small screens use an accessible menu drawer. Main content needs `min-width: 0`; dense tables scroll inside their own region rather than widening the page.

### Dashboard

Arrange the page as:

1. Page title and short context, with the existing demo entry point.
2. Compact operational summary using validated service totals, if available for the current role.
3. Large risk-map panel beside ranked predicted hotspots.
4. Recent alerts with clear severity, status, linked detail, and an explicit route to the full queue.

Candidate summaries are total complaints, high-risk complaints, and alerts awaiting review. Each requires a precise definition, role-scoped query, and link to the matching filtered list. Do not derive totals from a paginated result or present unsupported trends. New aggregate contracts are a separately estimated dependency; the dashboard layout can ship without these cards.

Give each panel a clear title, contextual empty state, and independent recovery action. Preserve map selection and viewport while other data refreshes. Show data freshness only when a trustworthy timestamp is available; avoid implying live production data.

### Complaints and transactions

Build a reusable table shell with a sticky header, aligned numeric columns, consistent row height, hover/focus treatment, results count, and pagination. Keep explicit record links and full copyable identifiers.

Expose filters and sorting already supported by each service. Keep applied state in the URL, reset to page one when filters change, and retain filters across pagination and browser navigation. Use immediate selection changes and debounced valid text input, following the existing UI guidelines. Show persistent field labels, active filters, and a clear reset action.

Keep transaction simulation visually separate from record browsing, in a labelled collapsible section. Search across all record types is a later feature requiring a defined backend contract.

### Complaint detail and prediction

Create a compact complaint summary header with ID, amount, location, filed time, and analysis state. At wide desktop widths, place the money trail in the larger column and the prediction summary alongside it. Stack them in a logical reading order on smaller screens.

Structure the prediction around location, expected withdrawal window, risk score, confidence, and estimated exposure. Keep risk score and confidence distinctly labelled. Show ranked alternatives below the primary result and explanations as labelled factor bars with percentage and direction text, using the response values unchanged.

Before analysis, make Analyze Complaint the primary action. During analysis, disable repeat submissions and announce progress without invented stages. After a successful result, emphasize Generate Alert and make reanalysis secondary. Pending or failed reanalysis must not leave an action enabled against an invalid prior result. Dependency failure shows the established degraded state without prediction figures.

Keep transaction-chain details in a clearly headed section below the main workspace. Preserve the accessible graph table, deterministic graph layout, and model explanation/fallback notices.

### Risk map

This is the highest-priority screen improvement. The target is a detailed, readable street map with selectable location pins, locality and PIN-code information, and a clear relationship between a predicted area and nearby recorded ATM points.

Current evidence: `.env.example` configures MapLibre's demo style. Actual deployment configuration was not inspected. `MapCanvas.tsx` starts at an India-wide zoom, renders hotspots and ATMs as circles, and replaces the basemap with a rectangular placeholder on any map error. Hotspot and ATM contracts include latitude/longitude but no postal code. Hotspots use H3 resolution 8. Those facts require both map presentation work and a location-metadata service; PIN codes cannot be added reliably through styling alone.

**Detailed basemap and controls**

- Keep MapLibre and configure a street-level basemap with road names, neighbourhoods, landmarks, and building footprints where the provider has coverage. Verify coverage in the project's actual demo localities before choosing a provider.
- Evaluate MapTiler as a candidate for tiles and place lookup. Its documented geocoding service supports forward/reverse lookup and requires an API key: [official geocoding documentation](https://docs.maptiler.com/cloud/api/geocoding/). Selection depends on tested Indian PIN-code coverage, attribution, usage terms, and cost; this plan does not purchase a service or assume credentials exist.
- Default to a light street map consistent with the dashboard. Satellite/hybrid is an optional subsequent layer if provider coverage and licensing support it.
- Use most of the available page height, with a search toolbar, zoom, fullscreen, metric scale, reset-to-results, layer toggles, and a visible legend. MapLibre provides a [metric-capable scale control](https://maplibre.org/maplibre-gl-js/docs/API/classes/ScaleControl/).
- Fit the initial viewport to available results. Selecting a hotspot zooms to its area with padding for the details panel. Preserve the user's viewport during refresh.

**Location pins and geographic precision**

- Use distinct labelled pin symbols for predicted hotspots and recorded ATM coordinates. Show rank and selected state without relying on color alone; retain clustering for dense ATM points.
- Anchor each pin to its stored coordinate. Selecting it displays locality, city, district, state, available PIN code, latitude/longitude, and source/precision information, followed by risk, withdrawal window, and related records.
- Draw the selected hotspot's actual H3 polygon, labelled “Predicted area.” Its point is a reference location within the prediction representation, not a confirmed withdrawal address. Do not invent a circular confidence radius.
- Label ATM points as synthetic recorded locations in this prototype. A detailed basemap or nearby real-world landmark must not imply a real ATM or confirmed incident exists at a synthetic coordinate.
- Keep geographic lookup results separate from prediction overlays: searching a place or PIN code navigates the map and never creates a risk prediction.
- Provide copy-location and recenter controls. Preserve source precision rather than adding decimal places that imply greater accuracy.

**PIN codes and place search**

- Add nullable location metadata to the backend response: locality, postal code, lookup source, lookup time, and match type/status. Store PIN codes as strings; syntactic validation does not establish that a code is correct for a coordinate.
- Resolve the selected coordinate through a backend location adapter using a validated postal reference dataset or provider. Return only explicitly supplied postal values. A postcode attached to a nearby feature is not automatically the postcode containing the selected coordinate.
- Display “PIN code unavailable” when missing, and “Approximate postal match” when appropriate. Never infer a PIN code from the city name or fill in a plausible value.
- A postal match for the hotspot reference point describes that point; it does not claim that the entire H3 area shares one PIN code. Only draw postal boundaries when actual boundary data is available.
- Add search by locality, city, six-digit PIN code, and latitude/longitude. Show a selectable result list for ambiguous matches. Restrict geographic search to India and validate coordinate bounds/order. Backend support for this map-specific search is now in scope; global record search remains deferred.
- Lookup only on selection or deliberate search, with debouncing, cancellation of superseded requests, and bounded retries. Keep private lookup credentials on the server; use provider-supported restrictions for browser tile keys. Cache geographic metadata only where terms permit, separately from uncached predictions.
- Keep the map and risk data usable if place lookup fails. Preserve existing service authorization and send only geographic queries to the provider, not complaint details.

**Panel behavior and reliability**

- Use a docked details panel on desktop so users can still inspect the selected place. Use a full-width accessible overlay on narrow screens. Both show the same location information as the accessible table.
- Fix `/risk-map#<h3Index>` selection so dashboard links open the intended area, fetching the selected item even when it is outside the initial result limit.
- Ensure all ATM cluster/count/point layers follow the ATM toggle. Make clusters expand on selection and individual ATM pins open their details.
- Shipped: map/table switching preserves selection, and the accessible table remains available without WebGL. Verify these paths against the deployed data volume and assistive technology.
- Shipped: a failed basemap preserves pins and offers retry. Remaining work: distinguish tile/glyph failures more precisely and validate selection preservation through repeated recovery in a deployment.
- Replace the rectangular “India outline” placeholder with a neutral unavailable background or a properly sourced geographic outline. Keep valid overlays, location text, and the table available; clearly identify unavailable street detail.

**Map delivery gates**

1. A selected point is positioned at the API coordinate, with correct longitude/latitude ordering; an area prediction also displays its H3 boundary.
2. Streets and locality labels remain legible at neighbourhood zoom in representative project locations. Provider configuration and attribution are verified.
3. PIN-code lookup is tested against independent reference records for several localities, including a boundary case, missing result, and ambiguous result. Any approximate result is labelled.
4. Search, pin selection, detail panel, URL selection, and accessible table stay synchronized. Ordinary geographic search results never appear as predicted hotspots.
5. Missing credentials, failed tiles, missing postal data, failed lookup, and unavailable WebGL each produce a useful state without fabricated data.
6. Desktop and mobile controls, cluster expansion, layer toggles, keyboard selection, and reduced motion work. Map panning and selection remain responsive at the supported dataset limits.

### Alerts and investigations

Make queues easy to scan using consistent priority, severity, and status components. Preserve existing filters and add clear active-filter feedback. Link related complaint, alert, and investigation records wherever the underlying relationship exists.

Organize investigation detail into case summary, evidence/prediction, notes and activity, and available status actions. Use existing audit events for the timeline and existing state-machine transitions for controls. Show the reason an action is unavailable where that helps the user proceed. Keep confirmation and success feedback attached to the actual action outcome.

### Reports, settings, and demo

Use the same panel, heading, filter, and state patterns throughout. Reports need consistent chart legends, axes, accessible data representations, and prominent synthetic evaluation context. Separate model evaluation from operational summaries.

Settings should distinguish read-only system information from editable preferences, with visible save progress and validation. The demo should show a clear step indicator, one next action, and preserve its single real prediction call.

## 5. Implementation sequence

| Phase | Deliverables | Completion check |
|---|---|---|
| 1 — Foundation and shell | Tokens and typography wiring; shared buttons, panels, page headers, badges; active navigation and responsive shell. | Every existing route uses a coherent shell; keyboard navigation and small-screen menu work. |
| 2 — Detailed map and location information | Street basemap, pins and H3 boundary, location panel, postal lookup and map search, deep links, accessible fallback and recovery. | Shipped interaction paths are covered; deployment-level provider, assistive-technology, and repeated-recovery verification remain planned. |
| 3 — Dashboard and browsing | Dashboard hierarchy; shared table toolbar/footer; complaints and transactions pagination; consistent filters. | Users can reach every result page and return to the same filtered list. Any summary card has a documented service source. |
| 4 — Investigation workflow | Complaint workspace, prediction hierarchy and factor bars, contextual alert actions, refined graph details, case timeline. | Complaint → analysis → alert → investigation works end to end, including failed requests and role restrictions. |
| 5 — Remaining screens and verification | Reports/settings/demo consistency, contextual states, responsive and accessibility fixes. | Representative routes pass the acceptance checks below. |

First implementation slice: shell + detailed risk map + location/PIN-code panel, followed by the dashboard map integration. Postal enrichment is an explicit backend dependency and may be delivered after the basemap/pin improvements, with an honest unavailable state in the interim.

Primary implementation locations:

- `packages/config/tailwind.preset.js`, `apps/web/app/globals.css`, and `apps/web/app/layout.tsx` for the visual foundation.
- `apps/web/app/(dashboard)/layout.tsx` plus proposed `components/layout/` helpers for navigation and page framing.
- `apps/web/components/common/` for shared UI and state patterns.
- Existing route pages and domain component folders for incremental screen updates.
- `apps/web/components/map/MapCanvas.tsx`, `HotspotDrawer.tsx`, `MapAccessibleTable.tsx`, and `types.ts` for the map experience; `apps/web/services/hotspotService.ts` and a proposed backend location adapter/route for geographic enrichment. Update schemas and migrations only if metadata persistence is selected.

Keep server-rendered lists and detail data on the server. Add small client components only for interaction. Preserve lazy loading for map, graph, and charts. Reuse current libraries and components; do not migrate frameworks as part of this redesign.

The workspace already contains substantial modified and untracked implementation work. During implementation, edit incrementally around those changes and do not reset or overwrite them.

## 6. Acceptance and validation

- Review representative list, detail, map, dashboard, and demo screens at 1920, 1440, 1280, 768, and 390px widths. Check reflow at 320px and zoom to 200%; dense visualizations may scroll within labelled regions.
- Users can identify the current page, return to their previous list context, and locate the next available action without guessing.
- Complaints and transactions pagination works beyond page one; changing filters resets pagination and back/forward restores state.
- Every control has a usable keyboard path, visible focus, and an accessible name. Overlays trap and restore focus appropriately. Status updates are announced.
- Measure text and control contrast; verify risk/status is understandable without color. Target no serious or critical automated accessibility findings on changed screens, supplemented by manual checks.
- Verify loading, empty, filtered-empty, request error, and dependency-unavailable states as applicable. Failed prediction requests display no stale prediction result or invented values.
- Confirm independent map/chart/graph failures leave the rest of the page usable. Accessible tables continue to represent the same underlying visualization data.
- Test actual task behavior: finding a complaint, analyzing it, reviewing the explanation, generating an alert, and following up on its investigation. Treat task-completion observations as evidence; do not claim measured improvements before testing.
- Run frontend lint and typecheck plus relevant existing unit/integration checks after implementation. Add focused interaction tests for pagination/filter persistence and changed action-state behavior. Verify the Playwright harness exists and is configured before relying on the declared end-to-end script.
- Check route bundle budgets and loading behavior after shared components are introduced; preserve lazy-loaded heavy visualizations.

## 7. Scope boundaries and dependencies

The scope is a frontend design and usability improvement with detailed maps, map-specific place/PIN-code search, and sourced geographic metadata. Map provider configuration and a location-enrichment contract are required dependencies. New aggregate metrics, global record search, new export formats, saved views, bulk actions, and additional prediction capabilities require separate contracts and estimates. Show controls only when their capability is implemented.

The prototype disclosure, exact required strings, neutral risk language, server authorization, data formatting, and model-output provenance remain acceptance requirements. Existing visualizations, accessible alternatives, live announcements, and reduced-motion behavior are assets to retain and refine.

The initial shell and detailed map slice is implemented; the remaining phases are a roadmap. Extend the verified map/shell visual language to tables and the investigation workflow next. The public defaults are OpenFreeMap for street detail and Photon for geographic lookup, replacing the earlier MapTiler candidate; see the setup document for usage limits and replacement configuration.
