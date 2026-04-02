# Architecture

## Purpose

This app is a client-side weather dashboard. It lets users save cities, hydrates recent weather from `localStorage`, refreshes live data from Open-Meteo, and shows both summary cards and a detail drawer. There is no backend, no auth, and no global store.

## State Ownership

Business logic lives in `src/composables/`. `src/App.vue` is the orchestration layer that wires composables together and owns cross-cutting workflows.

Composables own:

- `useWeather` — in-memory weather state, cache hydration, fetch lifecycle, abort controller management
- `usePreferences` — dashboard preferences (temperature unit, wind unit, sort mode, pinned city)
- `useSavedCities` — saved city list and `localStorage` persistence
- `useAppMessage` — transient status message state

`App.vue` owns:

- cross-composable workflows (`addCity`, `removeCity`, `restoreCities`)
- drawer selection state (`selectedCityKey`)
- geolocation flow (`addCurrentLocation`)
- derived display computeds (`sortedCities`, `primaryCity`, `comparisonHighlights`)

If a change affects more than one composable, it probably belongs in `App.vue`.

## Module Boundaries

- `src/composables/`: domain business logic as Vue composables — one concern per file
- `src/App.vue`: workflow orchestration and cross-composable coordination only; no raw `localStorage` or fetch calls
- `src/lib/openMeteo.ts`: external API calls and response normalization only
- `src/lib/storage.ts`: `localStorage` read/write helpers, defaults, and stable city key generation
- `src/lib/types.ts`: shared domain types and the `WeatherEntry` async-state union
- `src/lib/formatters.ts` and `src/lib/weatherCodes.ts`: display formatting and weather-code lookup helpers
- `src/components/*.vue`: props/events driven UI with local interaction state only

Keep side effects in `src/lib/` or composables. Do not introduce fetch or persistence logic inside presentational components.

## Core Invariants

- `WeatherEntry` is the shared async model: `idle | loading | success | error`.
- UI should branch on `weather.status`, not on ad hoc booleans.
- Weather data is keyed by `getCityKey(city)`, not by array index.
- Cached weather is only hydrated when its units match current preferences and the record is newer than three hours.
- Existing successful weather stays visible during background refresh; failures in that case become `warning` text instead of replacing the entry with an error screen.
- Unit changes trigger a full refresh because cached records are unit-specific.

## Where New Logic Goes

- New API fields or request params: `src/lib/openMeteo.ts` and `src/lib/types.ts`
- New persisted preferences or cache shape: `src/lib/storage.ts`, `src/lib/types.ts`, then `usePreferences`
- New weather loading behaviour or cache rules: `useWeather`
- New city list rules: `useSavedCities`
- New cross-city computations, refresh rules, or cross-composable coordination: `src/App.vue`
- New card/drawer rendering for existing data: the relevant component
- New display-only formatting: `src/lib/formatters.ts`

## Avoid

- adding a store library for local workflow changes
- duplicating cache or preference logic across components
- persisting UI-only flags such as loading state or warnings
- coupling sorting, pinning, or drawer state to rendered order
