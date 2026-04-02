# UI Boundaries

## Rule Of Thumb

Components in `src/components/` should receive normalized data through props, render UI for one concern, and communicate upward through emitted events. They should not own saved-city state, persistence, or weather-fetch orchestration.

## Component Responsibilities

### `CitySearch.vue`

- owns local search query, result list, error text, active keyboard index, and debounce timing
- calls `searchCities()` directly for typeahead results
- prevents selecting an already-saved city
- emits:
  - `select(city)` when the user chooses a result
  - `locate()` when the user asks for current location

This component may manage request cancellation for search UX, but it should not save cities or update global preferences.

### `SavedCityCard.vue`

- renders one city summary card from `city`, `weather`, and current unit props
- derives display-only text such as status copy and visual theme
- emits:
  - `details()`
  - `remove()`
  - `retry()`
  - `pin()`

It does not fetch weather or persist removals itself.

### `CardActions.vue`

- stateless action row shared by cards
- receives simple booleans
- emits `retry`, `details`, and `pin`

Keep it dumb. If button meaning changes, change the parent behavior, not this component’s scope.

### `CityDetailsDrawer.vue`

- renders the selected city and weather details
- handles close interactions like overlay click, close button, and Escape key
- emits:
  - `close()`
  - `retry()`

It treats `weather` as input and branches on `weather.status`. It does not decide which city is selected.

## Shared UI Conventions

- Prefer props in, DOM/events out.
- Use `data-test` selectors for interactive or asserted elements.
- Consume `WeatherEntry` directly rather than inventing parallel loading/error props.
- Keep formatting in `src/lib/formatters.ts` when the same presentation rule is used in more than one place.
- If behavior needs saved cities, preferences, cache, or cross-component coordination, move it up to `src/App.vue`.
