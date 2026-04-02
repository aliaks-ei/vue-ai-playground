# CLAUDE.md

## Project

Vue 3 + Vite + TypeScript client-side weather dashboard. Searches cities via Open-Meteo geocoding, saves them in `localStorage`, shows current weather and 5-day forecast. No backend, no auth.

## Code Map

- `src/App.vue` — app state: saved cities, weather cache, drawer state, status messages.
- `src/components/CitySearch.vue` — debounced city lookup and selection.
- `src/components/SavedCityCard.vue` — saved city card with weather state.
- `src/components/CityDetailsDrawer.vue` — detailed forecast drawer.
- `src/components/CardActions.vue` — shared retry/details action row.
- `src/lib/openMeteo.ts` — API calls and response normalization.
- `src/lib/storage.ts` — `localStorage` helpers and city key generation.
- `src/lib/types.ts` — shared domain types; discriminated `WeatherEntry` state.
- `src/lib/formatters.ts` — display formatting helpers.
- `src/lib/weatherCodes.ts` — WMO weather code mappings.
- `src/lib/*.test.ts`, `src/components/*.test.ts` — Vitest unit tests.
- `src/styles.css` — global styles.

## Architecture Constraints

- State orchestration lives in `App.vue`; no global store.
- API and persistence logic stays in `src/lib/`, not in components.
- Async state model: `idle | loading | success | error`.

## Commands

```bash
npm run dev         # Vite dev server
npm run type-check  # vue-tsc
npm run test        # Vitest once
npm run lint        # ESLint
npm run build       # production build
```

## Checks

After making changes, always run: `npm run lint`, `npm run type-check`, and `npm run test` (if component or test files changed).

## Agent Docs

Read only the docs relevant to the task:

- `agent_docs/architecture.md` — state ownership, module boundaries, and async-state invariants.
- `agent_docs/data-flow.md` — startup hydration, refresh behavior, and city/weather workflows.
- `agent_docs/open-meteo.md` — API contract and normalization rules.
- `agent_docs/storage.md` — `localStorage` keys, validation, and city-key rules.
- `agent_docs/ui-boundaries.md` — component responsibilities and props/events boundaries.
- `agent_docs/testing.md` — shared testing rules.

## Testing

Read `agent_docs/testing.md` before adding or changing tests.
