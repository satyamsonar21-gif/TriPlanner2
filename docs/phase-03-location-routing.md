# Phase 03 — Location, Maps & Routing Foundation

## 1. Architecture Overview

Phase 03 establishes a strict, provider-neutral geographic and routing intelligence layer inside TripPlanner:

```
UI Components (<MapView />, <PlacesSearchInput />, JourneyDetailPage, PlanJourneyPage)
  ↓
Application Services (ItineraryFeasibilityService, DestinationService, JourneyService)
  ↓
Domain Contracts (LocationProvider, GeocodingProvider, RoutingProvider)
  ↓
Caching & Deduplication Layer (GeoRequestCache + Safe Diagnostic Logger)
  ↓
Provider Adapters (GoogleMapsProvider | MockLocationProvider / MockRoutingProvider)
```

Domain logic and UI components **never** consume raw Google Maps response shapes. Every external payload is validated and normalized into canonical domain models (`GeoCoordinate`, `GeoLocation`, `RouteResult`, `RouteMatrixResult`, `FeasibilityEvaluation`).

---

## 2. Provider Strategy & Selection (`GeoServiceFactory`)

Provider selection is controlled via `src/config/env.ts` (`VITE_MAPS_PROVIDER_MODE`):
- **`auto`** (default): Uses `GoogleMapsProvider` when `VITE_GOOGLE_MAPS_BROWSER_KEY` is configured. In development/test (`VITE_ENABLE_MOCK_DATA=true`), falls back to deterministic `MockLocationProvider` / `MockRoutingProvider` and explicitly tags all outputs with `isDemoData: true`.
- **`google`**: Forces `GoogleMapsProvider`. Throws `MAPS_CONFIGURATION_MISSING` if credentials are missing.
- **`demo` / `mock`**: Forces deterministic fixture providers (`MockLocationProvider`, `MockRoutingProvider`) for automated tests, CI, and offline demos.
- **Production Safety Guarantee**: In production (`import.meta.env.PROD && !env.enableMockData`), if `VITE_GOOGLE_MAPS_BROWSER_KEY` is missing, the system throws a typed `GeoDomainError('MAPS_CONFIGURATION_MISSING')` rather than silently fabricating routes.

---

## 3. Environment Variables & Secret Separation

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `VITE_GOOGLE_MAPS_BROWSER_KEY` | Browser-Safe (Restricted) | HTTP-referrer restricted key for Maps JavaScript SDK & Places Autocomplete in client browser. |
| `GOOGLE_MAPS_SERVER_KEY` | **Server-Only Secret** (Never `VITE_`) | IP/Service restricted key for backend/Edge Function calls. Never bundled into browser JavaScript. |
| `VITE_MAPS_PROVIDER_MODE` | Browser-Safe | `'auto' \| 'google' \| 'demo' \| 'mock'` |
| `VITE_DEFAULT_TRANSFER_BUFFER_MINUTES` | Browser-Safe | Configurable default transfer safety buffer (default `15` minutes). |

---

## 4. Google Maps Platform Setup Guide

1. **Google Cloud Project & Billing**: Create or select a Google Cloud project with Billing enabled.
2. **Enable Required APIs Only**:
   - Maps JavaScript API
   - Places API (New)
   - Routes API / Directions
   - Geocoding API
3. **Browser Key Restrictions (`VITE_GOOGLE_MAPS_BROWSER_KEY`)**:
   - Application restriction: **HTTP referrers (web sites)** (`http://localhost:5173/*`, `https://your-production-domain.com/*`).
   - API restriction: Restrict key strictly to *Maps JavaScript API* and *Places API*.
4. **Server Key Restrictions (`GOOGLE_MAPS_SERVER_KEY`)**:
   - Keep exclusively in Supabase Edge Function secrets or server environment variables. Never prefix with `VITE_`.

---

## 5. Security & Abuse Protection

- **Redacted Logging**: `sanitizeLogString()` strips any `key=...` or `AIza...` tokens from error messages and diagnostic logs before storage or display.
- **Debouncing & Cancellation**: `<PlacesSearchInput />` debounces user keystrokes (320ms) and aborts stale requests via `AbortController`.
- **Bounded Query Length**: Queries exceeding 160 characters or fewer than 2 characters are rejected before reaching the provider.
- **Coordinates Are Data, Not Authorization**: All persistence in Supabase enforces server-side RLS policies (`public.locations`, `public.journeys`, `public.itinerary_items`).

---

## 6. Database Design (`20260926000002_phase03_geographic_normalization.sql`)

- **`public.locations`**: Canonical normalized table storing `id`, `name`, `formatted_address`, `latitude` (`CHECK [-90, 90]`), `longitude` (`CHECK [-180, 180]`), `city`, `region`, `country`, `country_code`, `postal_code`, `timezone`, `location_type` (controlled enum), `provider`, and `provider_place_id` (unique per provider).
- **Domain Table References**: `destinations`, `accommodations`, `activities`, and `itinerary_items` include `location_id UUID REFERENCES public.locations(id)` alongside indexed `geo_lat`, `geo_lng`, `geo_place_id`, and `geo_provider` columns.
- **No Raw JSON Blobs**: Raw Google API responses are never persisted as the source of truth.

---

## 7. Normalized Domain Models (`src/domains/geo/types.ts`)

- `GeoCoordinate`: `{ latitude, longitude, lat, lng }`
- `GeoLocation`: `{ id, name, latitude, longitude, coordinate, address, formattedAddress, city, region, country, countryCode, postalCode, provider, providerPlaceId, timezone, locationType, isDemoFixture }`
- `RouteRequest` / `RouteResult` / `RouteLeg`: Multi-stop route representation with leg distances, durations, polyline, and `isDemoData` provenance flag.
- `RouteMatrixRequest` / `RouteMatrixResult`: Normalized N×M origin-destination travel estimate cells.

---

## 8. Deterministic Itinerary Feasibility Logic (`ItineraryFeasibilityService`)

Given consecutive stops $A$ and $B$:
- $\text{availableBufferMinutes} = \lfloor (B.\text{start} - A.\text{end}) / 60000 \rfloor$
- $\text{travelTimeMinutes} = \lceil \text{route.durationSeconds} / 60 \rceil$
- $\text{requiredTotalMinutes} = \text{travelTimeMinutes} + \text{safetyBufferMinutes}$
- $\text{feasible} = \text{availableBufferMinutes} \ge \text{requiredTotalMinutes}$

Returns a structured `FeasibilityEvaluation` with explicit `reason` codes:
- `FEASIBLE`
- `INSUFFICIENT_TRANSFER_TIME`
- `TEMPORAL_OVERLAP`
- `INVALID_ITEM_TIME_WINDOW`
- `ROUTE_NOT_FOUND`
- `ROUTE_UNAVAILABLE`
- `INVALID_COORDINATES`
- `UNSUPPORTED_TRAVEL_MODE`

---

## 9. Caching & Request Deduplication (`src/domains/geo/cache.ts`)

- `GeoRequestCache` enforces a 5-minute TTL for routes/matrices and 15-minute TTL for place details, with an LRU eviction cap (`maxEntries`).
- Concurrent identical requests share a single in-flight `Promise` to prevent duplicate billing.

---

## 10. Phase 04 Living Journey Engine Integration Contract

Phase 04 consumers can invoke `ItineraryFeasibilityService` directly to answer all 7 core adaptation questions:
1. **Distance between A and B**: `routingProvider.getRoute({ origin: A, destination: B })` → `distanceMeters`
2. **Travel duration A → B**: `routingProvider.getRoute({ origin: A, destination: B, travelMode })` → `durationSeconds`
3. **Feasibility inside time window**: `feasibilityService.checkFeasibility(A, B, A.end, B.start, mode, config)`
4. **Transfer buffer calculation**: `evaluation.availableBufferMinutes - evaluation.travelTimeMinutes`
5. **Can candidate C fit between A and B?**: `feasibilityService.evaluateCandidateInsertion({ previousItem: A, candidateLocation: C, candidateStartTime, candidateEndTime, nextItem: B })`
6. **Travel impact of replacing B with C**: `feasibilityService.evaluateReplacementImpact({ previousItem: A, originalItem: B, candidateItem: C, nextItem: D })`
7. **Downstream infeasible items**: `feasibilityService.evaluateMultiStopItinerary(stops, config)` → `infeasibleDownstreamItemIds`

---

## 11. Known Limitations & Future Phase Hooks

- Real-time live traffic polling and automatic push re-accommodation are intentionally deferred to Phase 04/06.
- When running without a live `VITE_GOOGLE_MAPS_BROWSER_KEY` in development/demo mode, `<MapView />` renders the interactive TripPlanner Cartographic Projection canvas and displays the explicit `Demo route data` badge.
