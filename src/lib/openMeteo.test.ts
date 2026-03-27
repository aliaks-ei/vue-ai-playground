import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { City } from './types'
import { fetchCityWeather, searchCities } from './openMeteo'

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

function mockFetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  })
}

function mockFetchNotOk(status = 500) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('searchCities', () => {
  it('calls the geocoding API with the correct URL params', async () => {
    globalThis.fetch = mockFetchOk({ results: [] }) as typeof fetch

    await searchCities('Berlin')

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    const [calledUrl] = fetchMock.mock.calls[0] as [string]
    const url = new URL(calledUrl)

    expect(url.origin + url.pathname).toBe(
      'https://geocoding-api.open-meteo.com/v1/search',
    )
    expect(url.searchParams.get('name')).toBe('Berlin')
    expect(url.searchParams.get('count')).toBe('5')
    expect(url.searchParams.get('language')).toBe('en')
    expect(url.searchParams.get('format')).toBe('json')
  })

  it('returns normalized city objects from the results array', async () => {
    const raw = {
      id: 2950159,
      name: 'Berlin',
      country: 'Germany',
      admin1: 'Berlin',
      latitude: 52.52437,
      longitude: 13.41053,
      timezone: 'Europe/Berlin',
    }
    globalThis.fetch = mockFetchOk({ results: [raw] }) as typeof fetch

    const cities = await searchCities('Berlin')

    expect(cities).toHaveLength(1)
    expect(cities[0]).toEqual({
      id: raw.id,
      name: raw.name,
      country: raw.country,
      admin1: raw.admin1,
      latitude: raw.latitude,
      longitude: raw.longitude,
      timezone: raw.timezone,
    })
  })

  it('falls back to a composite id when the result has no id', async () => {
    const raw = {
      name: 'NoId City',
      country: 'Nowhere',
      admin1: '',
      latitude: 10,
      longitude: 20,
      timezone: 'UTC',
    }
    globalThis.fetch = mockFetchOk({ results: [raw] }) as typeof fetch

    const [city] = await searchCities('NoId City')

    expect(city.id).toBe('NoId City-10-20')
  })

  it.each([
    { payload: {}, description: 'payload has no results key' },
    { payload: { results: [] }, description: 'results is an empty array' },
  ])('returns an empty array when $description', async ({ payload }) => {
    globalThis.fetch = mockFetchOk(payload) as typeof fetch

    const cities = await searchCities('test')

    expect(cities).toEqual([])
  })

  it('throws when the response is not ok', async () => {
    globalThis.fetch = mockFetchNotOk(503) as typeof fetch

    await expect(searchCities('Berlin')).rejects.toThrow(
      'Unable to search cities right now.',
    )
  })
})

describe('fetchCityWeather', () => {
  const city = mockCity()

  const validPayload = {
    current: {
      temperature_2m: 15.7,
      weather_code: 1,
    },
    daily: {
      time: ['2024-01-01', '2024-01-02'],
      weather_code: [1, 3],
      temperature_2m_max: [18.0, 12.5],
      temperature_2m_min: [10.0, 8.3],
    },
  }

  it('calls the forecast API with the correct URL params', async () => {
    globalThis.fetch = mockFetchOk(validPayload) as typeof fetch

    await fetchCityWeather(city)

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    const [calledUrl] = fetchMock.mock.calls[0] as [string]
    const url = new URL(calledUrl)

    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast')
    expect(url.searchParams.get('latitude')).toBe(String(city.latitude))
    expect(url.searchParams.get('longitude')).toBe(String(city.longitude))
    expect(url.searchParams.get('current')).toBe('temperature_2m,weather_code')
    expect(url.searchParams.get('daily')).toBe(
      'weather_code,temperature_2m_max,temperature_2m_min',
    )
    expect(url.searchParams.get('forecast_days')).toBe('5')
    expect(url.searchParams.get('temperature_unit')).toBe('celsius')
    expect(url.searchParams.get('timezone')).toBe('auto')
  })

  it('returns a normalized current and daily shape', async () => {
    globalThis.fetch = mockFetchOk(validPayload) as typeof fetch

    const weather = await fetchCityWeather(city)

    expect(weather).toMatchObject({
      current: {
        temperature: 16,
        weatherCode: 1,
        condition: 'Mainly clear',
      },
      daily: expect.any(Array),
    })
    expect(weather.daily).toHaveLength(2)
  })

  it('maps each daily entry to the correct shape', async () => {
    globalThis.fetch = mockFetchOk(validPayload) as typeof fetch

    const { daily } = await fetchCityWeather(city)

    expect(daily[0]).toEqual({
      date: '2024-01-01',
      min: 10,
      max: 18,
      weatherCode: 1,
      condition: 'Mainly clear',
    })
    expect(daily[1]).toEqual({
      date: '2024-01-02',
      min: 8,
      max: 13,
      weatherCode: 3,
      condition: 'Overcast',
    })
  })

  it('rounds temperatures to the nearest integer', async () => {
    globalThis.fetch = mockFetchOk({
      current: { temperature_2m: -0.6, weather_code: 0 },
      daily: {
        time: ['2024-01-01'],
        weather_code: [0],
        temperature_2m_max: [22.4],
        temperature_2m_min: [-0.5],
      },
    }) as typeof fetch

    const { current, daily } = await fetchCityWeather(city)

    expect(current.temperature).toBe(-1)
    expect(daily[0].max).toBe(22)
    expect(daily[0].min).toBeCloseTo(0, 0)
  })

  it('returns null temperature when current temperature_2m is not a number', async () => {
    globalThis.fetch = mockFetchOk({
      current: { temperature_2m: 'n/a', weather_code: 0 },
      daily: { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [] },
    }) as typeof fetch

    const { current } = await fetchCityWeather(city)

    expect(current.temperature).toBeNull()
  })

  it('returns null daily min and max when temperatures are not numbers', async () => {
    globalThis.fetch = mockFetchOk({
      current: { temperature_2m: 10, weather_code: 0 },
      daily: {
        time: ['2024-01-01'],
        weather_code: [0],
        temperature_2m_max: [null],
        temperature_2m_min: [undefined],
      },
    }) as typeof fetch

    const { daily } = await fetchCityWeather(city)

    expect(daily[0].max).toBeNull()
    expect(daily[0].min).toBeNull()
  })

  it('returns an empty daily array when daily.time is absent', async () => {
    globalThis.fetch = mockFetchOk({
      current: { temperature_2m: 20, weather_code: 0 },
      daily: {},
    }) as typeof fetch

    const { daily } = await fetchCityWeather(city)

    expect(daily).toEqual([])
  })

  it('uses null weatherCode and a fallback condition when weather_code is missing', async () => {
    globalThis.fetch = mockFetchOk({
      current: { temperature_2m: 20 },
      daily: { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [] },
    }) as typeof fetch

    const { current } = await fetchCityWeather(city)

    expect(current.weatherCode).toBeNull()
    expect(current.condition).toBe('Weather unavailable')
  })

  it('throws when the response is not ok', async () => {
    globalThis.fetch = mockFetchNotOk(404) as typeof fetch

    await expect(fetchCityWeather(city)).rejects.toThrow(
      `Unable to load weather for ${city.name}.`,
    )
  })
})
