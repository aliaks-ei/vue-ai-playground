# Architecture

## Purpose

This app is a client-side weather dashboard. It lets users save cities, hydrates recent weather from `localStorage`, refreshes live data from Open-Meteo, and shows both summary cards and a detail drawer. There is no backend, no auth, and no global store.

## State Ownership

`src/App.vue` is the single orchestration layer. It owns:

- the saved city list
- the in-memory weather state keyed by city
- the persisted weather cache
- the selected city for the drawer
- dashboard preferences
- transient status messages
- bulk refresh and current-location UI state

If a change affects more than one component, persistence, or network state, it probably belongs in `App.vue`.

## Module Boundaries

- `src/App.vue`: workflow orchestration, async loading, cache hydration, preference updates, and wiring between components
- `src/lib/openMeteo.ts`: external API calls and response normalization only
- `src/lib/storage.ts`: `localStorage` read/write helpers, defaults, and stable city key generation
- `src/lib/types.ts`: shared domain types and the `WeatherEntry` async-state union
- `src/lib/formatters.ts` and `src/lib/weatherCodes.ts`: display formatting and weather-code lookup helpers
- `src/components/*.vue`: props/events driven UI with local interaction state only

Keep side effects in `src/lib/` or `App.vue`. Do not introduce fetch or persistence logic inside presentational components.

## Core Invariants

- `WeatherEntry` is the shared async model: `idle | loading | success | error`.
- UI should branch on `weather.status`, not on ad hoc booleans.
- Weather data is keyed by `getCityKey(city)`, not by array index.
- Cached weather is only hydrated when its units match current preferences and the record is newer than three hours.
- Existing successful weather stays visible during background refresh; failures in that case become `warning` text instead of replacing the entry with an error screen.
- Unit changes trigger a full refresh because cached records are unit-specific.

## Where New Logic Goes

- New API fields or request params: `src/lib/openMeteo.ts` and `src/lib/types.ts`
- New persisted preferences or cache shape: `src/lib/storage.ts`, `src/lib/types.ts`, then `src/App.vue`
- New cross-city computations, refresh rules, or selection logic: `src/App.vue`
- New card/drawer rendering for existing data: the relevant component
- New display-only formatting: `src/lib/formatters.ts`

## Avoid

- adding a store library for local workflow changes
- duplicating cache or preference logic across components
- persisting UI-only flags such as loading state or warnings
- coupling sorting, pinning, or drawer state to rendered order
