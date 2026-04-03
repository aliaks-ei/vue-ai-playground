import type {
  City,
  DashboardPreferences,
  SortMode,
  StoredWeatherRecord,
  TemperatureUnit,
  WindSpeedUnit,
} from "./types"

const CITY_STORAGE_KEY = "saved-cities-weather-dashboard:cities"
const PREFERENCES_STORAGE_KEY = "saved-cities-weather-dashboard:preferences"
const WEATHER_CACHE_STORAGE_KEY = "saved-cities-weather-dashboard:weather-cache"
const RECENT_SEARCHES_STORAGE_KEY = "saved-cities-weather-dashboard:recent-searches"

const MAX_RECENT_SEARCHES = 5

const validTemperatureUnits: TemperatureUnit[] = ["celsius", "fahrenheit"]
const validWindSpeedUnits: WindSpeedUnit[] = ["kmh", "mph"]
const validSortModes: SortMode[] = [
  "saved",
  "alphabetical",
  "temperature-desc",
  "temperature-asc",
  "updated-desc",
  "weather-desc",
]

export const defaultDashboardPreferences: DashboardPreferences = {
  temperatureUnit: "celsius",
  windSpeedUnit: "kmh",
  sortMode: "saved",
  pinnedCityKey: null,
}

function loadJson(storageKey: string): unknown {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey)

    if (!storedValue) {
      return null
    }

    return JSON.parse(storedValue)
  } catch {
    return null
  }
}

function saveJson(storageKey: string, value: unknown): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(storageKey, JSON.stringify(value))
}

export function getCityKey(city: Partial<City> | null | undefined): string {
  if (city?.id !== undefined && city.id !== null) {
    return String(city.id)
  }

  return `${city?.name ?? "city"}-${city?.latitude ?? "lat"}-${city?.longitude ?? "lon"}`
}

export function loadSavedCities(): City[] {
  const parsedValue = loadJson(CITY_STORAGE_KEY)
  return Array.isArray(parsedValue) ? (parsedValue as City[]) : []
}

export function saveCities(cities: City[]): void {
  saveJson(CITY_STORAGE_KEY, cities)
}

export function loadDashboardPreferences(): DashboardPreferences {
  const parsedValue = loadJson(PREFERENCES_STORAGE_KEY)

  if (!parsedValue || typeof parsedValue !== "object") {
    return { ...defaultDashboardPreferences }
  }

  const rawPreferences = parsedValue as Partial<DashboardPreferences>

  return {
    temperatureUnit: validTemperatureUnits.includes(rawPreferences.temperatureUnit ?? "celsius")
      ? (rawPreferences.temperatureUnit as TemperatureUnit)
      : defaultDashboardPreferences.temperatureUnit,
    windSpeedUnit: validWindSpeedUnits.includes(rawPreferences.windSpeedUnit ?? "kmh")
      ? (rawPreferences.windSpeedUnit as WindSpeedUnit)
      : defaultDashboardPreferences.windSpeedUnit,
    sortMode: validSortModes.includes(rawPreferences.sortMode ?? "saved")
      ? (rawPreferences.sortMode as SortMode)
      : defaultDashboardPreferences.sortMode,
    pinnedCityKey:
      typeof rawPreferences.pinnedCityKey === "string" ? rawPreferences.pinnedCityKey : null,
  }
}

export function saveDashboardPreferences(preferences: DashboardPreferences): void {
  saveJson(PREFERENCES_STORAGE_KEY, preferences)
}

export function loadWeatherCache(): Record<string, StoredWeatherRecord> {
  const parsedValue = loadJson(WEATHER_CACHE_STORAGE_KEY)

  if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
    return {}
  }

  return parsedValue as Record<string, StoredWeatherRecord>
}

export function saveWeatherCache(cache: Record<string, StoredWeatherRecord>): void {
  saveJson(WEATHER_CACHE_STORAGE_KEY, cache)
}

export function loadRecentSearches(): City[] {
  const parsedValue = loadJson(RECENT_SEARCHES_STORAGE_KEY)
  return Array.isArray(parsedValue) ? (parsedValue as City[]) : []
}

export function saveRecentSearches(cities: City[]): void {
  saveJson(RECENT_SEARCHES_STORAGE_KEY, cities.slice(0, MAX_RECENT_SEARCHES))
}
