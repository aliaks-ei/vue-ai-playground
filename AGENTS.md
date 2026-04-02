# Repository Guidelines

## Project Map

This repository is a Vue 3 + Vite + TypeScript weather dashboard. Application code lives in `src/`.

- `src/App.vue` is the state owner and top-level workflow coordinator.
- `src/components/` contains the UI: `CitySearch.vue`, `SavedCityCard.vue`, `CityDetailsDrawer.vue`, and `CardActions.vue`.
- `src/lib/openMeteo.ts` handles geocoding and forecast fetching plus response normalization.
- `src/lib/storage.ts` wraps `localStorage` reads/writes and stable city key generation.
- `src/lib/types.ts` holds shared domain types, including the `WeatherEntry` union used across the app.
- `src/lib/formatters.ts` provides display formatting utilities.
- `src/lib/weatherCodes.ts` maps WMO codes to labels/icons.
- `src/lib/*.test.ts` and `src/components/*.test.ts` contain Vitest tests.
- `src/main.ts`, `vite.config.ts`, `tsconfig.json`, `.oxlintrc.json`, and `.prettierrc.json` define the app bootstrap and toolchain.

## Architecture Notes

- The app is fully client-side. Do not introduce secrets, server-only assumptions, or backend dependencies without an intentional architecture change.
- `App.vue` keeps the main state in refs and derives secondary state with `computed()`. Prefer extending that pattern over adding a store library.
- Keep side effects in `src/lib/` and keep presentational components focused on props, events, and rendering.
- The weather loading flow uses a shared async state model: `idle | loading | success | error`.

## Commands

- `npm run dev` starts the Vite dev server.
- `npm run type-check` runs `vue-tsc --noEmit`.
- `npm run test` runs Vitest once.
- `npm run test:watch` runs Vitest in watch mode.
- `npm run lint` runs Oxlint.
- `npm run format` formats `src/` files in-place with Prettier.
- `npm run format:check` checks formatting without writing (CI-friendly).
- `npm run build` creates the production bundle.
- `npm run preview` serves the production build locally.

## Working Conventions

- Follow the existing Vue SFC style: `<script setup lang="ts">`, 2-space indentation, and scoped component styles.
- Use PascalCase for component files and camelCase for functions, refs, and helpers.
- Prefer shared TypeScript types in `src/lib/types.ts` when values cross component or module boundaries.
- Match the existing CSS naming style in templates and styles rather than inventing a new convention mid-file.

## Testing

- Always run `npm run format` after making changes.
- Always run `npm run lint` after making changes.
- Always run `npm run type-check` after making changes.
- Run `npm run test` after changing component files or test files.
- Run `npm run build` before handing off substantive changes.
- Read the relevant docs in `agent_docs/` when the task touches that area:
  - `agent_docs/architecture.md` for state ownership and module boundaries
  - `agent_docs/data-flow.md` for startup, refresh, and city/weather workflows
  - `agent_docs/open-meteo.md` for API contract and normalization behavior
  - `agent_docs/storage.md` for persistence and city-key rules
  - `agent_docs/ui-boundaries.md` for component responsibilities and props/events boundaries
- Read `agent_docs/testing.md` for the shared verification and testing rules.
- Read `agent_docs/testing.md` before writing or expanding tests.

## PR Notes

- Use short, imperative commit subjects.
- PRs should summarize user-visible changes and list the verification you actually ran.
- Include screenshots or a short recording when the UI changed in a meaningful way.
