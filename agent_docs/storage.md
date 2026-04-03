# Storage

## Module Scope

`src/lib/storage.ts` owns browser persistence and stable city keys. It should stay small, synchronous, and free of UI logic.

## Keys

The app persists three `localStorage` entries:

- `saved-cities-weather-dashboard:cities`
- `saved-cities-weather-dashboard:preferences`
- `saved-cities-weather-dashboard:weather-cache`

## Persistence Shapes

- cities: `City[]`
- preferences: `DashboardPreferences`
- weather cache: `Record<string, StoredWeatherRecord>`

`StoredWeatherRecord` intentionally omits UI-only state such as:

- `status`
- `warning`
- `isRefreshing`

Those fields are reconstructed in `src/App.vue` when cache entries are hydrated into `WeatherEntry`.

## Safety Rules

- all read helpers return safe fallbacks when `window` is unavailable
- invalid JSON is treated as missing data
- `loadSavedCities()` falls back to `[]`
- `loadWeatherCache()` falls back to `{}`
- `loadDashboardPreferences()` validates each field and falls back per-property to defaults

There is no schema migration layer yet. If persisted shapes change, add backward-compatible handling here before updating callers.

## Stable City Keys

`getCityKey(city)` is the app-wide identity function.

- prefer `city.id` when present
- otherwise fall back to ``${name}-${latitude}-${longitude}``

Use this key for cache entries, duplicate detection, pinning, and weather lookup. Do not key cities by display name or array position.

## Preference Validation

Accepted values are intentionally narrow:

- temperature unit: `celsius | fahrenheit`
- wind speed unit: `kmh | mph`
- sort mode: `saved | alphabetical | temperature-desc | temperature-asc | updated-desc`
- pinned city key: `string | null`
- show pinned city in grid: `boolean` (default `false`)

Unknown values are ignored in favor of defaults. If older stored preferences do not include `showPinnedCityInGrid`, it falls back to `false`.

## Boundary With App Logic

`src/lib/storage.ts` does not decide whether cached weather is still usable. Freshness checks and unit-match checks live in `src/App.vue` because they are workflow rules, not storage rules.
