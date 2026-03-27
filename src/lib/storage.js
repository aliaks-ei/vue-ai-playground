const STORAGE_KEY = 'saved-cities-weather-dashboard:cities'

export function getCityKey(city) {
  if (city?.id !== undefined && city?.id !== null) {
    return String(city.id)
  }

  return `${city?.name ?? 'city'}-${city?.latitude ?? 'lat'}-${city?.longitude ?? 'lon'}`
}

export function loadSavedCities() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY)

    if (!storedValue) {
      return []
    }

    const parsedValue = JSON.parse(storedValue)
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

export function saveCities(cities) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cities))
}
