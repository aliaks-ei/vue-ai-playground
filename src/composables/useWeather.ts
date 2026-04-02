import { computed, ref } from "vue"
import type { Ref } from "vue"
import { fetchCityWeather } from "../lib/openMeteo"
import { getCityKey, loadWeatherCache, saveWeatherCache } from "../lib/storage"
import type {
  City,
  DashboardPreferences,
  StoredWeatherRecord,
  WeatherEntry,
  WeatherSuccessState,
} from "../lib/types"

const WEATHER_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 3

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

export function useWeather(savedCities: Ref<City[]>, preferences: Ref<DashboardPreferences>) {
  const weatherByCity = ref<Record<string, WeatherEntry>>({})
  const weatherCache = ref<Record<string, StoredWeatherRecord>>({})
  const weatherControllers = new Map<string, AbortController>()
  const refreshingAll = ref(false)

  const weatherSuccessEntries = computed(() =>
    savedCities.value.flatMap((city) => {
      const weather = weatherByCity.value[getCityKey(city)]
      if (weather?.status !== "success") return []
      return [{ city, weather }]
    }),
  )

  const syncedCitiesCount = computed(
    () => weatherSuccessEntries.value.filter(({ weather }) => weather.source === "fresh").length,
  )

  function hasSavedCity(cityKey: string): boolean {
    return savedCities.value.some((city) => getCityKey(city) === cityKey)
  }

  function updateWeatherEntry(cityKey: string, nextState: WeatherEntry): void {
    weatherByCity.value = { ...weatherByCity.value, [cityKey]: nextState }
  }

  function removeWeatherEntry(cityKey: string): void {
    const next = { ...weatherByCity.value }
    delete next[cityKey]
    weatherByCity.value = next
  }

  function persistWeatherRecord(cityKey: string, weather: WeatherSuccessState): void {
    weatherCache.value = {
      ...weatherCache.value,
      [cityKey]: {
        current: weather.current,
        daily: weather.daily,
        hourly: weather.hourly,
        lastUpdated: weather.lastUpdated,
        source: weather.source,
        units: weather.units,
      },
    }
    saveWeatherCache(weatherCache.value)
  }

  function removeWeatherRecord(cityKey: string): void {
    const next = { ...weatherCache.value }
    delete next[cityKey]
    weatherCache.value = next
    saveWeatherCache(weatherCache.value)
  }

  function getWeatherSuccess(city: City): WeatherSuccessState | null {
    const weather = weatherByCity.value[getCityKey(city)]
    return weather?.status === "success" ? weather : null
  }

  function getWeatherEntry(city: City): WeatherEntry {
    return weatherByCity.value[getCityKey(city)] ?? { status: "idle" }
  }

  function hydrateFromCache(cities: City[]): void {
    const nextEntries: Record<string, WeatherEntry> = {}

    for (const city of cities) {
      const cityKey = getCityKey(city)
      const cachedWeather = weatherCache.value[cityKey]

      if (!cachedWeather) continue

      if (
        cachedWeather.units.temperature !== preferences.value.temperatureUnit ||
        cachedWeather.units.windSpeed !== preferences.value.windSpeedUnit
      ) {
        continue
      }

      if (Date.now() - cachedWeather.lastUpdated > WEATHER_CACHE_MAX_AGE_MS) continue

      nextEntries[cityKey] = { status: "success", ...cachedWeather, source: "cached" }
    }

    weatherByCity.value = nextEntries
  }

  function initCache(): void {
    weatherCache.value = loadWeatherCache()
  }

  function cancelCity(cityKey: string): void {
    weatherControllers.get(cityKey)?.abort()
    weatherControllers.delete(cityKey)
  }

  async function loadWeatherForCity(
    city: City,
    options: { background?: boolean } = {},
  ): Promise<void> {
    const cityKey = getCityKey(city)
    const existingWeather = weatherByCity.value[cityKey]
    const controller = new AbortController()

    weatherControllers.get(cityKey)?.abort()
    weatherControllers.set(cityKey, controller)

    if (existingWeather?.status === "success") {
      updateWeatherEntry(cityKey, { ...existingWeather, isRefreshing: true, warning: "" })
    } else if (!options.background) {
      updateWeatherEntry(cityKey, { status: "loading" })
    }

    try {
      const nextWeather = await fetchCityWeather(city, {
        signal: controller.signal,
        temperatureUnit: preferences.value.temperatureUnit,
        windSpeedUnit: preferences.value.windSpeedUnit,
      })

      if (weatherControllers.get(cityKey) !== controller || !hasSavedCity(cityKey)) {
        return
      }

      const successState: WeatherSuccessState = {
        status: "success",
        ...nextWeather,
        lastUpdated: Date.now(),
        source: "fresh",
      }

      updateWeatherEntry(cityKey, successState)
      persistWeatherRecord(cityKey, successState)
    } catch (error: unknown) {
      if (isAbortError(error) || weatherControllers.get(cityKey) !== controller) return
      if (!hasSavedCity(cityKey)) return

      const message =
        error instanceof Error ? error.message : `Unable to load weather for ${city.name}.`

      if (existingWeather?.status === "success") {
        updateWeatherEntry(cityKey, { ...existingWeather, isRefreshing: false, warning: message })
        return
      }

      updateWeatherEntry(cityKey, { status: "error", error: message })
    } finally {
      if (weatherControllers.get(cityKey) === controller) {
        weatherControllers.delete(cityKey)
      }
    }
  }

  async function refreshAllCities(): Promise<void> {
    if (savedCities.value.length === 0) return

    refreshingAll.value = true

    try {
      await Promise.all(
        savedCities.value.map((city) => loadWeatherForCity(city, { background: true })),
      )
    } finally {
      refreshingAll.value = false
    }
  }

  return {
    weatherByCity,
    weatherSuccessEntries,
    syncedCitiesCount,
    refreshingAll,
    getWeatherEntry,
    getWeatherSuccess,
    loadWeatherForCity,
    refreshAllCities,
    hydrateFromCache,
    removeWeatherEntry,
    removeWeatherRecord,
    cancelCity,
    initCache,
  }
}
