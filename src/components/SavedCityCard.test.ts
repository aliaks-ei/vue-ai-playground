import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SavedCityCard from './SavedCityCard.vue'
import type { City, WeatherEntry, WeatherSuccessState } from '../lib/types'

function mockCity(overrides: Partial<City> = {}): City {
  return {
    id: 1,
    name: 'Berlin',
    latitude: 52.52,
    longitude: 13.405,
    country: 'Germany',
    admin1: 'Berlin',
    timezone: 'Europe/Berlin',
    ...overrides,
  }
}

function mockSuccessWeather(overrides: Partial<WeatherSuccessState> = {}): WeatherSuccessState {
  return {
    status: 'success',
    current: {
      temperature: 22,
      apparentTemperature: 20,
      weatherCode: 0,
      condition: 'Clear Sky',
      windSpeed: 12,
      humidity: 55,
      precipitation: 0,
      isDay: true,
    },
    daily: [
      {
        date: '2026-03-30',
        min: 10,
        max: 23,
        weatherCode: 0,
        condition: 'Clear Sky',
        sunrise: '2026-03-30T06:30',
        sunset: '2026-03-30T19:45',
        precipitationProbabilityMax: 15,
      },
    ],
    hourly: [],
    lastUpdated: Date.now(),
    source: 'fresh',
    units: { temperature: 'celsius', windSpeed: 'kmh' },
    ...overrides,
  }
}

const defaultProps = {
  city: mockCity(),
  weather: mockSuccessWeather(),
  temperatureUnit: 'celsius' as const,
  windSpeedUnit: 'kmh' as const,
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SavedCityCard', () => {
  it('renders city name and location', () => {
    const wrapper = mount(SavedCityCard, { props: defaultProps })

    expect(wrapper.get('[data-test="city-name"]').text()).toBe('Berlin')
    expect(wrapper.text()).toContain('Berlin, Germany')
  })

  it('shows temperature and condition when weather is success', () => {
    const wrapper = mount(SavedCityCard, { props: defaultProps })

    expect(wrapper.get('[data-test="temperature"]').text()).toBe('22°C')
    expect(wrapper.get('[data-test="condition"]').text()).toBe('Clear Sky')
  })

  it('shows weather metrics when weather is success', () => {
    const wrapper = mount(SavedCityCard, { props: defaultProps })

    const text = wrapper.text()
    expect(text).toContain('20°C')
    expect(text).toContain('12 km/h')
    expect(text).toContain('55%')
    expect(text).toContain('15%')
  })

  it('shows "--" for temperature when weather is loading', () => {
    const weather: WeatherEntry = { status: 'loading' }
    const wrapper = mount(SavedCityCard, {
      props: { ...defaultProps, weather },
    })

    expect(wrapper.text()).toContain('...')
    expect(wrapper.text()).toContain('Loading weather details')
  })

  it('shows error message when weather has error status', () => {
    const weather: WeatherEntry = { status: 'error', error: 'Network failure' }
    const wrapper = mount(SavedCityCard, {
      props: { ...defaultProps, weather },
    })

    expect(wrapper.text()).toContain('--')
    expect(wrapper.text()).toContain('Network failure')
  })

  it('shows pinned badge when isPinned is true', () => {
    const wrapper = mount(SavedCityCard, {
      props: { ...defaultProps, isPinned: true },
    })

    expect(wrapper.find('[data-test="pinned-badge"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="pinned-badge"]').text()).toBe('Pinned')
  })

  it('hides pinned badge when isPinned is false', () => {
    const wrapper = mount(SavedCityCard, {
      props: { ...defaultProps, isPinned: false },
    })

    expect(wrapper.find('[data-test="pinned-badge"]').exists()).toBe(false)
  })

  it('shows status text with source info for success weather', () => {
    const wrapper = mount(SavedCityCard, { props: defaultProps })

    const status = wrapper.get('[data-test="status-text"]').text()
    expect(status).toContain('live')
  })

  it('shows "cache" label when weather source is cached', () => {
    const weather = mockSuccessWeather({ source: 'cached' })
    const wrapper = mount(SavedCityCard, {
      props: { ...defaultProps, weather },
    })

    const status = wrapper.get('[data-test="status-text"]').text()
    expect(status).toContain('cache')
  })

  it('shows syncing indicator when weather is refreshing', () => {
    const weather = mockSuccessWeather({ isRefreshing: true })
    const wrapper = mount(SavedCityCard, {
      props: { ...defaultProps, weather },
    })

    const status = wrapper.get('[data-test="status-text"]').text()
    expect(status).toContain('syncing')
  })

  it('shows warning text when weather has a warning', () => {
    const weather = mockSuccessWeather({ warning: 'Stale data' })
    const wrapper = mount(SavedCityCard, {
      props: { ...defaultProps, weather },
    })

    const status = wrapper.get('[data-test="status-text"]').text()
    expect(status).toBe('Stale data')
  })

  it('emits remove event when remove button is clicked', async () => {
    const wrapper = mount(SavedCityCard, { props: defaultProps })

    await wrapper.get('[data-test="remove-btn"]').trigger('click')

    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('emits details event when details button in CardActions is clicked', async () => {
    const wrapper = mount(SavedCityCard, { props: defaultProps })

    await wrapper.get('[data-test="details-btn"]').trigger('click')

    expect(wrapper.emitted('details')).toHaveLength(1)
  })

  it('emits retry event when retry button is clicked on error state', async () => {
    const weather: WeatherEntry = { status: 'error', error: 'Fail' }
    const wrapper = mount(SavedCityCard, {
      props: { ...defaultProps, weather },
    })

    await wrapper.get('[data-test="retry-btn"]').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('emits pin event when pin button is clicked', async () => {
    const wrapper = mount(SavedCityCard, { props: defaultProps })

    await wrapper.get('[data-test="pin-btn"]').trigger('click')

    expect(wrapper.emitted('pin')).toHaveLength(1)
  })

  it('formats temperature in fahrenheit when unit is fahrenheit', () => {
    const weather = mockSuccessWeather({
      current: {
        temperature: 72,
        apparentTemperature: 70,
        weatherCode: 0,
        condition: 'Clear Sky',
        windSpeed: 8,
        humidity: 40,
        precipitation: 0,
        isDay: true,
      },
    })
    const wrapper = mount(SavedCityCard, {
      props: { ...defaultProps, weather, temperatureUnit: 'fahrenheit' },
    })

    expect(wrapper.get('[data-test="temperature"]').text()).toBe('72°F')
  })

  it('displays city timezone badge', () => {
    const wrapper = mount(SavedCityCard, { props: defaultProps })

    expect(wrapper.text()).toContain('Europe/Berlin')
  })
})
