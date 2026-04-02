# Open-Meteo Integration

## Module Scope

`src/lib/openMeteo.ts` is the only module that should know about Open-Meteo URLs, query parameters, raw payload shapes, and response normalization.

Keep this module responsible for transport and mapping. Keep orchestration, retries, caching policy, and UI messaging in `src/App.vue`.

## Endpoints In Use

- `searchCities(query, options)` calls the geocoding search endpoint
- `reverseGeocodeCity(latitude, longitude, options)` calls the reverse geocoding endpoint
- `fetchCityWeather(city, options)` calls the forecast endpoint

Current request assumptions:

- search uses `count=5`, `language=en`, `format=json`
- reverse geocoding uses `count=1`, `language=en`, `format=json`
- forecast uses `forecast_days=7`, `timezone=auto`
- hourly output is trimmed to the first 12 returned entries

## Normalization Rules

### Cities

- `id` falls back to ``${name}-${latitude}-${longitude}`` when the API omits one
- `admin1` falls back to an empty string
- the app stores normalized `City` objects, not raw API payloads

### Weather

- temperature values are rounded to whole numbers
- wind, humidity, precipitation, and precipitation probability are rounded to one decimal place
- weather code labels come from `src/lib/weatherCodes.ts`
- `buildCurrentWeather()` returns the normalized current snapshot
- `buildForecast()` maps each daily row into a `ForecastDay`
- `buildHourlyForecast()` maps the first 12 hourly rows into `HourlyForecastPoint[]`

`fetchCityWeather()` returns normalized weather data plus the requested unit settings, but it does not add app-level fields like `status`, `lastUpdated`, `source`, `warning`, or `isRefreshing`. `App.vue` owns those.

## Error Policy

Non-OK HTTP responses are converted into user-facing `Error` messages:

- city search: `Unable to search cities right now.`
- reverse geocoding: `Unable to determine your current city.`
- forecast: `Unable to load weather for ${city.name}.`

This module does not retry requests and does not swallow failed responses.

## Safe Changes

When changing this module:

- update `src/lib/types.ts` if normalized shapes change
- keep raw API interfaces local unless another module truly needs them
- preserve the separation between raw payload parsing and app-level state management
- prefer adding new normalized fields over leaking raw payload structure into components
