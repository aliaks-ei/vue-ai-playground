import type { City } from './types'

const STORAGE_KEY = 'saved-cities-weather-dashboard:cities'

export function getCityKey(city: Partial<City> | null | undefined): string {
  if (city?.id !== undefined && city?.id !== null) {
    return String(city.id)
  }

  return `${city?.name ?? 'city'}-${city?.latitude ?? 'lat'}-${city?.longitude ?? 'lon'}`
}

export function loadSavedCities(): City[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY)

    if (!storedValue) {
      return []
    }

    const parsedValue: unknown = JSON.parse(storedValue)
    return Array.isArray(parsedValue) ? (parsedValue as City[]) : []
  } catch {
    return []
  }
}

export function saveCities(cities: City[]): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cities))
}
