# Testing Guidelines

## General Rules

1. **Use `it.each` for parameterized cases** instead of duplicating test blocks.

```ts
// Bad -- repetitive tests with identical structure
it('maps code 0 to Clear Sky', () => {
  expect(getWeatherLabel(0)).toBe('Clear Sky')
})
it('maps code 1 to Mainly Clear', () => {
  expect(getWeatherLabel(1)).toBe('Mainly Clear')
})
it('maps code 99 to Thunderstorm', () => {
  expect(getWeatherLabel(99)).toBe('Thunderstorm')
})

// Good -- parameterized
it.each([
  [0, 'Clear Sky'],
  [1, 'Mainly Clear'],
  [99, 'Thunderstorm'],
])('maps WMO code %i to "%s"', (code, expected) => {
  expect(getWeatherLabel(code)).toBe(expected)
})
```

2. **Test crucial flows, not trivially true behavior.** Don't assert that Vue reactivity works or that `v-if` hides elements. Test the meaningful paths your users rely on.

```ts
// Bad -- testing that Vue reactivity works
it('updates the ref when value changes', () => {
  const count = ref(0)
  count.value = 1
  expect(count.value).toBe(1) // this tests Vue, not your code
})

// Good -- testing a meaningful flow
it('shows forecast cards after weather data loads', async () => {
  vi.mocked(fetchWeather).mockResolvedValue(mockWeatherData)
  const wrapper = mount(CityDetailsDrawer, { props: { city: mockCity } })
  await flushPromises()
  expect(wrapper.findAll('[data-test="forecast-card"]')).toHaveLength(5)
})
```

3. **Use only top-level `describe` blocks** -- no nesting. Keep the test structure flat and scannable.

```ts
// Bad -- nested describes add indentation without value
describe('SavedCityCard', () => {
  describe('rendering', () => {
    describe('when weather data exists', () => {
      it('shows temperature', () => { ... })
    })
  })
})

// Good -- flat structure
describe('SavedCityCard', () => {
  it('shows temperature when weather data exists', () => { ... })
  it('shows loading spinner when status is loading', () => { ... })
  it('emits "remove" when delete button is clicked', () => { ... })
})
```

## Test Structure

4. **Follow the AAA pattern** -- Arrange, Act, Assert. Separate the three phases with blank lines.

```ts
// Bad -- everything mashed together
it('emits city-selected on click', async () => {
  const wrapper = mount(CityResult, { props: { city: { name: 'Berlin', lat: 52.52, lon: 13.41 } } })
  await wrapper.get('[data-test="select-btn"]').trigger('click')
  expect(wrapper.emitted('city-selected')).toHaveLength(1)
  expect(wrapper.emitted('city-selected')![0]).toEqual([{ name: 'Berlin', lat: 52.52, lon: 13.41 }])
})

// Good -- clear AAA separation
it('emits city-selected on click', async () => {
  const city = { name: 'Berlin', lat: 52.52, lon: 13.41 }
  const wrapper = mount(CityResult, { props: { city } })

  await wrapper.get('[data-test="select-btn"]').trigger('click')

  expect(wrapper.emitted('city-selected')).toHaveLength(1)
  expect(wrapper.emitted('city-selected')![0]).toEqual([city])
})
```

5. **Write descriptive test names** that read as specifications. A failing test name should tell you what broke without reading the test body.

```ts
// Bad
it('works', () => { ... })
it('test 1', () => { ... })
it('should handle the thing', () => { ... })

// Good
it('returns cached weather data when called within 5 minutes', () => { ... })
it('shows "No results" when the geocoding API returns an empty array', () => { ... })
it('debounces search input by 300ms', () => { ... })
```

## Component Testing

6. **Test the component's public interface** -- props in, rendered DOM and emitted events out. Treat the component as a black box.

```ts
// Bad -- accessing internal state
it('sets isOpen to true', async () => {
  const wrapper = mount(CityDetailsDrawer, { props: { city: mockCity } })
  await wrapper.get('[data-test="open-btn"]').trigger('click')
  expect(wrapper.vm.isOpen).toBe(true) // implementation detail
})

// Good -- asserting on the DOM effect
it('opens the drawer when open button is clicked', async () => {
  const wrapper = mount(CityDetailsDrawer, { props: { city: mockCity } })
  await wrapper.get('[data-test="open-btn"]').trigger('click')
  expect(wrapper.find('[data-test="drawer-panel"]').exists()).toBe(true)
})
```

7. **Use `data-test` selectors** to decouple tests from CSS classes and HTML structure.

```ts
// Bad -- coupled to CSS class names that may change
wrapper.find('.btn-primary-lg')
wrapper.find('div > ul > li:first-child')

// Good -- stable, intentional selectors
wrapper.find('[data-test="save-btn"]')
wrapper.find('[data-test="city-name"]')
```

8. **Always `await` DOM updates** after triggers, `setValue`, or any state change before asserting.

```ts
// Bad -- assertion may run before Vue re-renders
wrapper.get('input').setValue('Paris')
expect(wrapper.get('[data-test="results"]').text()).toContain('Paris')

// Good
await wrapper.get('input').setValue('Paris')
await flushPromises() // if async operations are involved
expect(wrapper.get('[data-test="results"]').text()).toContain('Paris')
```

9. **Prefer `mount` over `shallowMount`**. Shallow mounting hides integration bugs between parent and child components. Only stub children that have heavy side effects (network calls, timers).

## Mocking

10. **Use `vi.mock()` for module-level mocking** (API calls, storage). Use `vi.spyOn()` when you want to observe calls without replacing behavior. Use `vi.fn()` for standalone callbacks passed as props.

```ts
// Module mock -- replace the entire module
vi.mock('../lib/openMeteo', () => ({
  fetchWeather: vi.fn(),
}))

// Spy -- observe without replacing
const spy = vi.spyOn(Storage.prototype, 'setItem')
saveCities(cities)
expect(spy).toHaveBeenCalledWith('weather-app-cities', JSON.stringify(cities))

// Standalone mock -- for callback props
const onRemove = vi.fn()
mount(SavedCityCard, { props: { city, weather, onRemove } })
```

11. **Clean up mocks after each test** to prevent state leaking between tests.

```ts
afterEach(() => {
  vi.restoreAllMocks()
})
```

Or set `mockReset: true` in `vitest.config.ts` to do this automatically.

## What to Test vs. What to Skip

12. **High-value targets** (always test):
    - Pure utility functions (`openMeteo.ts`, `storage.ts`, `weatherCodes.ts`)
    - Rendering based on props and conditional states (loading, error, empty)
    - User interactions (click, input, submit) and emitted events
    - Edge cases (empty arrays, null values, API errors)

13. **Low-value targets** (skip):
    - Internal ref/reactive values -- test the DOM effect instead
    - CSS classes for styling purposes
    - Third-party library behavior (Vue Router, Pinia internals)
    - Exact HTML structure via snapshot tests alone
    - Private helpers that aren't exported -- test them through the public API
