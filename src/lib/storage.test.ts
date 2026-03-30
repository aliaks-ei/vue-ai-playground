import { beforeEach, describe, expect, it } from 'vitest'
import type { City, DashboardPreferences, StoredWeatherRecord } from './types'
import {
  defaultDashboardPreferences,
  getCityKey,
  loadDashboardPreferences,
  loadSavedCities,
  loadWeatherCache,
  saveCities,
  saveDashboardPreferences,
  saveWeatherCache,
} from './storage'

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

function mockPreferences(
  overrides: Partial<DashboardPreferences> = {},
): DashboardPreferences {
  return {
    ...defaultDashboardPreferences,
    temperatureUnit: 'fahrenheit',
    windSpeedUnit: 'mph',
    sortMode: 'updated-desc',
    pinnedCityKey: '42',
    ...overrides,
  }
}

function mockWeatherRecord(overrides: Partial<StoredWeatherRecord> = {}): StoredWeatherRecord {
  return {
    current: {
      temperature: 16,
      apparentTemperature: 14,
      weatherCode: 1,
      condition: 'Mainly clear',
      windSpeed: 12,
      humidity: 65,
      precipitation: 0.3,
      isDay: true,
    },
    daily: [],
    hourly: [],
    lastUpdated: 123,
    source: 'fresh',
    units: {
      temperature: 'celsius',
      windSpeed: 'kmh',
    },
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('getCityKey', () => {
  it('uses id when present', () => {
    expect(getCityKey(mockCity({ id: 42 }))).toBe('42')
  })

  it.each([undefined, null])('falls back to name-lat-lon when id is %s', (id) => {
    const city = mockCity({ id })
    expect(getCityKey(city)).toBe('Berlin-52.52-13.405')
  })

  it('uses safe fallbacks for missing fields', () => {
    expect(getCityKey({})).toBe('city-lat-lon')
  })
})

describe('saveCities + loadSavedCities', () => {
  it('persists and restores a list of cities', () => {
    const cities = [mockCity(), mockCity({ id: 2, name: 'Paris' })]

    saveCities(cities)

    expect(loadSavedCities()).toEqual(cities)
  })

  it('returns an empty array when nothing is stored', () => {
    expect(loadSavedCities()).toEqual([])
  })

  it.each([
    ['"not-an-array"', 'stored value is not a JSON array'],
    ['{corrupt', 'stored JSON is malformed'],
  ])('returns an empty array when %s', (value) => {
    localStorage.setItem('saved-cities-weather-dashboard:cities', value)

    expect(loadSavedCities()).toEqual([])
  })
})

describe('saveDashboardPreferences + loadDashboardPreferences', () => {
  it('persists dashboard preferences', () => {
    const preferences = mockPreferences()

    saveDashboardPreferences(preferences)

    expect(loadDashboardPreferences()).toEqual(preferences)
  })

  it('falls back to defaults for invalid persisted values', () => {
    localStorage.setItem(
      'saved-cities-weather-dashboard:preferences',
      JSON.stringify({
        temperatureUnit: 'kelvin',
        windSpeedUnit: 'knots',
        sortMode: 'random',
        pinnedCityKey: 1,
      }),
    )

    expect(loadDashboardPreferences()).toEqual(defaultDashboardPreferences)
  })
})

describe('saveWeatherCache + loadWeatherCache', () => {
  it('persists and restores cached weather by city key', () => {
    const cache = {
      berlin: mockWeatherRecord(),
      paris: mockWeatherRecord({
        lastUpdated: 456,
        units: {
          temperature: 'fahrenheit',
          windSpeed: 'mph',
        },
      }),
    }

    saveWeatherCache(cache)

    expect(loadWeatherCache()).toEqual(cache)
  })

  it('returns an empty object when the cache is missing or malformed', () => {
    expect(loadWeatherCache()).toEqual({})

    localStorage.setItem('saved-cities-weather-dashboard:weather-cache', '[1,2,3]')
    expect(loadWeatherCache()).toEqual({})

    localStorage.setItem('saved-cities-weather-dashboard:weather-cache', '{broken')
    expect(loadWeatherCache()).toEqual({})
  })
})
