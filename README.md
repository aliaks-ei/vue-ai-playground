# Saved Cities Weather Dashboard

Client-side weather dashboard built with Vue 3, Vite, and TypeScript. It lets you search for cities with Open-Meteo geocoding, save them in the browser, and view current weather plus a 5-day forecast.

## Features

- Search cities with a debounced lookup powered by Open-Meteo geocoding.
- Save cities locally in `localStorage` so they persist across page reloads.
- Show current weather for each saved city in a dashboard card.
- Open a detail drawer for a 5-day forecast.
- Handle `idle`, `loading`, `success`, and `error` states explicitly.
- Retry failed weather requests without removing the city.
- Run fully client-side with no backend, auth, or secrets.

## Tech Stack

- Vue 3
- Vite
- TypeScript
- Vitest
- ESLint
- Open-Meteo APIs

## Getting Started

### Prerequisites

- `npm`

### Install

```bash
npm install
```

### Start the app

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Available Scripts

- `npm run dev` - start the Vite dev server
- `npm run build` - create a production build
- `npm run preview` - preview the production build locally
- `npm run lint` - run Oxlint
- `npm run type-check` - run `vue-tsc --noEmit`
- `npm run test` - run Vitest once
- `npm run test:watch` - run Vitest in watch mode

## How It Works

1. The user searches for a city name.
2. The app calls the Open-Meteo geocoding API and shows up to 5 matches.
3. When a city is selected, it is saved to `localStorage`.
4. The app fetches current weather and a 5-day forecast for that city.
5. Saved cities are restored and refreshed when the app loads again.

## Project Structure

```text
src/
  App.vue                      # top-level state and workflow orchestration
  components/
    CardActions.vue            # shared retry/details actions
    CityDetailsDrawer.vue      # forecast drawer UI
    CitySearch.vue             # debounced city lookup and selection
    SavedCityCard.vue          # saved city weather card
  lib/
    openMeteo.ts               # Open-Meteo API calls and normalization
    storage.ts                 # localStorage helpers and stable city keys
    types.ts                   # shared domain types and async weather states
    *.test.ts                  # unit tests for shared logic
```

## Architecture Notes

- `App.vue` owns application state instead of using a global store.
- API and persistence logic live in `src/lib/`.
- Weather data uses a discriminated async state model: `idle | loading | success | error`.
- The app is intentionally browser-only.

## Data Sources

- [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs)

## Development Checks

For code changes, run:

```bash
npm run lint
npm run type-check
npm run test
```
