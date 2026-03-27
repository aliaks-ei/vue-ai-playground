import { beforeEach, describe, expect, it } from 'vitest'
import type { City } from './types'
import { getCityKey, loadSavedCities, saveCities } from './storage'

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

  it('overwrites a previous save with the full new list', () => {
    saveCities([mockCity({ id: 1, name: 'Berlin' })])
    saveCities([mockCity({ id: 2, name: 'Paris' })])
    expect(loadSavedCities()).toEqual([mockCity({ id: 2, name: 'Paris' })])
  })

  it('persists an empty list', () => {
    saveCities([mockCity()])
    saveCities([])
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

describe('addCity persistence ordering (regression)', () => {
  it('includes the newly added city when saved', () => {
    const existing = mockCity({ id: 1, name: 'Berlin' })
    const newCity = mockCity({ id: 2, name: 'Paris' })

    let savedCities = [existing]

    savedCities = [newCity, ...savedCities]
    saveCities(savedCities)

    const restored = loadSavedCities()
    expect(restored.map((city) => city.id)).toContain(newCity.id)
  })

  it('does not include the new city when saved before the list is updated', () => {
    const existing = mockCity({ id: 1, name: 'Berlin' })
    const newCity = mockCity({ id: 2, name: 'Paris' })

    let savedCities = [existing]

    saveCities(savedCities)
    savedCities = [newCity, ...savedCities]

    const restored = loadSavedCities()
    expect(restored.map((city) => city.id)).not.toContain(newCity.id)
  })

  it('restores all cities added in a session', () => {
    const cities = [
      mockCity({ id: 1, name: 'Berlin' }),
      mockCity({ id: 2, name: 'Paris' }),
      mockCity({ id: 3, name: 'Tokyo' }),
    ]

    let savedCities: City[] = []
    for (const city of cities) {
      savedCities = [city, ...savedCities]
      saveCities(savedCities)
    }

    const restored = loadSavedCities()
    expect(restored.map((city) => city.id)).toEqual(expect.arrayContaining([1, 2, 3]))
  })
})

describe('removeCity persistence', () => {
  it('removing a city and saving excludes it from the restored list', () => {
    const berlin = mockCity({ id: 1, name: 'Berlin' })
    const paris = mockCity({ id: 2, name: 'Paris' })

    saveCities([berlin, paris])

    const afterRemove = [berlin, paris].filter((city) => getCityKey(city) !== getCityKey(paris))
    saveCities(afterRemove)

    const restored = loadSavedCities()
    expect(restored.map((city) => city.id)).not.toContain(paris.id)
    expect(restored.map((city) => city.id)).toContain(berlin.id)
  })
})
