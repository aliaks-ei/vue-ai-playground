<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CityDetailsDrawer from './components/CityDetailsDrawer.vue'
import CitySearch from './components/CitySearch.vue'
import SavedCityCard from './components/SavedCityCard.vue'
import {
  formatPercent,
  formatRelativeTime,
  formatTemperature,
  formatWindSpeed,
  getWeatherSignal,
} from './lib/formatters'
import { fetchCityWeather, reverseGeocodeCity } from './lib/openMeteo'
import {
  defaultDashboardPreferences,
  getCityKey,
  loadDashboardPreferences,
  loadSavedCities,
  loadWeatherCache,
  saveCities,
  saveDashboardPreferences,
  saveWeatherCache,
} from './lib/storage'
import type {
  City,
  DashboardPreferences,
  SortMode,
  StoredWeatherRecord,
  TemperatureUnit,
  WeatherEntry,
  WeatherSuccessState,
  WindSpeedUnit,
} from './lib/types'

type MessageTone = 'info' | 'warning' | 'success'

const WEATHER_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 3
const idleWeatherEntry: WeatherEntry = { status: 'idle' }

const savedCities = ref<City[]>([])
const weatherByCity = ref<Record<string, WeatherEntry>>({})
const weatherCache = ref<Record<string, StoredWeatherRecord>>({})
const selectedCityKey = ref<string | null>(null)
const preferences = ref<DashboardPreferences>({ ...defaultDashboardPreferences })
const appMessage = ref('')
const appMessageTone = ref<MessageTone>('info')
const refreshingAll = ref(false)
const locatingCurrentCity = ref(false)

const weatherControllers = new Map<string, AbortController>()

const savedCityKeys = computed(() => savedCities.value.map((city) => getCityKey(city)))

const selectedCity = computed(
  () =>
    savedCities.value.find((city) => getCityKey(city) === selectedCityKey.value) ??
    null,
)

const selectedWeather = computed(() => {
  if (!selectedCity.value) {
    return null
  }

  return weatherByCity.value[getCityKey(selectedCity.value)] ?? idleWeatherEntry
})

const weatherSuccessEntries = computed(() =>
  savedCities.value.flatMap((city) => {
    const weather = weatherByCity.value[getCityKey(city)]

    if (weather?.status !== 'success') {
      return []
    }

    return [{ city, weather }]
  }),
)

const sortedCities = computed(() => {
  const cities = [...savedCities.value]
  const savedOrder = new Map(cities.map((city, index) => [getCityKey(city), index]))
  const sortMode = preferences.value.sortMode

  return cities.sort((leftCity, rightCity) => {
    if (sortMode === 'alphabetical') {
      return leftCity.name.localeCompare(rightCity.name)
    }

    if (sortMode === 'updated-desc') {
      const leftUpdated = getWeatherSuccess(leftCity)?.lastUpdated ?? 0
      const rightUpdated = getWeatherSuccess(rightCity)?.lastUpdated ?? 0
      return rightUpdated - leftUpdated
    }

    if (sortMode === 'temperature-desc' || sortMode === 'temperature-asc') {
      const leftTemperature = getWeatherSuccess(leftCity)?.current.temperature
      const rightTemperature = getWeatherSuccess(rightCity)?.current.temperature

      const normalizedLeft =
        typeof leftTemperature === 'number'
          ? leftTemperature
          : sortMode === 'temperature-desc'
            ? Number.NEGATIVE_INFINITY
            : Number.POSITIVE_INFINITY
      const normalizedRight =
        typeof rightTemperature === 'number'
          ? rightTemperature
          : sortMode === 'temperature-desc'
            ? Number.NEGATIVE_INFINITY
            : Number.POSITIVE_INFINITY

      return sortMode === 'temperature-desc'
        ? normalizedRight - normalizedLeft
        : normalizedLeft - normalizedRight
    }

    return (
      (savedOrder.get(getCityKey(leftCity)) ?? 0) -
      (savedOrder.get(getCityKey(rightCity)) ?? 0)
    )
  })
})

const primaryCity = computed(() => {
  if (preferences.value.pinnedCityKey) {
    const pinnedCity = savedCities.value.find(
      (city) => getCityKey(city) === preferences.value.pinnedCityKey,
    )

    if (pinnedCity) {
      return pinnedCity
    }
  }

  return sortedCities.value[0] ?? null
})

const primaryWeather = computed(() => {
  if (!primaryCity.value) {
    return null
  }

  return weatherByCity.value[getCityKey(primaryCity.value)] ?? idleWeatherEntry
})

const secondaryCities = computed(() => {
  if (!primaryCity.value) {
    return sortedCities.value
  }

  const primaryKey = getCityKey(primaryCity.value)
  return sortedCities.value.filter((city) => getCityKey(city) !== primaryKey)
})

const comparisonHighlights = computed(() => {
  if (weatherSuccessEntries.value.length === 0) {
    return []
  }

  const hottest = [...weatherSuccessEntries.value].sort(
    (left, right) =>
      (right.weather.current.temperature ?? Number.NEGATIVE_INFINITY) -
      (left.weather.current.temperature ?? Number.NEGATIVE_INFINITY),
  )[0]
  const coolest = [...weatherSuccessEntries.value].sort(
    (left, right) =>
      (left.weather.current.temperature ?? Number.POSITIVE_INFINITY) -
      (right.weather.current.temperature ?? Number.POSITIVE_INFINITY),
  )[0]
  const windiest = [...weatherSuccessEntries.value].sort(
    (left, right) =>
      (right.weather.current.windSpeed ?? Number.NEGATIVE_INFINITY) -
      (left.weather.current.windSpeed ?? Number.NEGATIVE_INFINITY),
  )[0]
  const rainiest = [...weatherSuccessEntries.value].sort(
    (left, right) =>
      (right.weather.daily[0]?.precipitationProbabilityMax ?? Number.NEGATIVE_INFINITY) -
      (left.weather.daily[0]?.precipitationProbabilityMax ?? Number.NEGATIVE_INFINITY),
  )[0]

  return [
    {
      label: 'Warmest right now',
      city: hottest.city.name,
      value: formatTemperature(
        hottest.weather.current.temperature,
        preferences.value.temperatureUnit,
      ),
    },
    {
      label: 'Coolest right now',
      city: coolest.city.name,
      value: formatTemperature(
        coolest.weather.current.temperature,
        preferences.value.temperatureUnit,
      ),
    },
    {
      label: 'Strongest wind',
      city: windiest.city.name,
      value: formatWindSpeed(
        windiest.weather.current.windSpeed,
        preferences.value.windSpeedUnit,
      ),
    },
    {
      label: 'Highest rain chance',
      city: rainiest.city.name,
      value: formatPercent(rainiest.weather.daily[0]?.precipitationProbabilityMax ?? null),
    },
  ]
})

const syncedCitiesCount = computed(
  () => weatherSuccessEntries.value.filter(({ weather }) => weather.source === 'fresh').length,
)

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function getWeatherSuccess(city: City): WeatherSuccessState | null {
  const weather = weatherByCity.value[getCityKey(city)]
  return weather?.status === 'success' ? weather : null
}

function setMessage(message: string, tone: MessageTone = 'info'): void {
  appMessage.value = message
  appMessageTone.value = tone
}

function clearMessage(): void {
  appMessage.value = ''
}

function updateWeatherEntry(cityKey: string, nextState: WeatherEntry): void {
  weatherByCity.value = {
    ...weatherByCity.value,
    [cityKey]: nextState,
  }
}

function removeWeatherEntry(cityKey: string): void {
  const nextEntries = { ...weatherByCity.value }
  delete nextEntries[cityKey]
  weatherByCity.value = nextEntries
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
  const nextCache = { ...weatherCache.value }
  delete nextCache[cityKey]
  weatherCache.value = nextCache
  saveWeatherCache(weatherCache.value)
}

function hasSavedCity(cityKey: string): boolean {
  return savedCities.value.some((city) => getCityKey(city) === cityKey)
}

function getWeatherEntry(city: City): WeatherEntry {
  return weatherByCity.value[getCityKey(city)] ?? idleWeatherEntry
}

function hydrateWeatherFromCache(cities: City[]): void {
  const nextEntries: Record<string, WeatherEntry> = {}

  for (const city of cities) {
    const cityKey = getCityKey(city)
    const cachedWeather = weatherCache.value[cityKey]

    if (!cachedWeather) {
      continue
    }

    if (
      cachedWeather.units.temperature !== preferences.value.temperatureUnit ||
      cachedWeather.units.windSpeed !== preferences.value.windSpeedUnit
    ) {
      continue
    }

    if (Date.now() - cachedWeather.lastUpdated > WEATHER_CACHE_MAX_AGE_MS) {
      continue
    }

    nextEntries[cityKey] = {
      status: 'success',
      ...cachedWeather,
      source: 'cached',
    }
  }

  weatherByCity.value = nextEntries
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

  if (existingWeather?.status === 'success') {
    updateWeatherEntry(cityKey, {
      ...existingWeather,
      isRefreshing: true,
      warning: '',
    })
  } else if (!options.background) {
    updateWeatherEntry(cityKey, { status: 'loading' })
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
      status: 'success',
      ...nextWeather,
      lastUpdated: Date.now(),
      source: 'fresh',
    }

    updateWeatherEntry(cityKey, successState)
    persistWeatherRecord(cityKey, successState)
  } catch (error: unknown) {
    if (isAbortError(error) || weatherControllers.get(cityKey) !== controller) {
      return
    }

    if (!hasSavedCity(cityKey)) {
      return
    }

    const message =
      error instanceof Error ? error.message : `Unable to load weather for ${city.name}.`

    if (existingWeather?.status === 'success') {
      updateWeatherEntry(cityKey, {
        ...existingWeather,
        isRefreshing: false,
        warning: message,
      })
      return
    }

    updateWeatherEntry(cityKey, {
      status: 'error',
      error: message,
    })
  } finally {
    if (weatherControllers.get(cityKey) === controller) {
      weatherControllers.delete(cityKey)
    }
  }
}

async function addCity(city: City): Promise<void> {
  clearMessage()

  const cityKey = getCityKey(city)

  if (hasSavedCity(cityKey)) {
    setMessage(`${city.name} is already saved.`, 'warning')
    return
  }

  savedCities.value = [city, ...savedCities.value]
  saveCities(savedCities.value)

  if (!preferences.value.pinnedCityKey) {
    updatePreferences({ pinnedCityKey: cityKey })
  }

  await loadWeatherForCity(city)
}

function removeCity(city: City): void {
  const cityKey = getCityKey(city)

  savedCities.value = savedCities.value.filter(
    (savedCity) => getCityKey(savedCity) !== cityKey,
  )
  saveCities(savedCities.value)
  removeWeatherEntry(cityKey)
  removeWeatherRecord(cityKey)
  weatherControllers.get(cityKey)?.abort()
  weatherControllers.delete(cityKey)

  if (selectedCityKey.value === cityKey) {
    selectedCityKey.value = null
  }

  if (preferences.value.pinnedCityKey === cityKey) {
    updatePreferences({ pinnedCityKey: savedCities.value[0] ? getCityKey(savedCities.value[0]) : null })
  }

  clearMessage()
}

function openDetails(city: City): void {
  selectedCityKey.value = getCityKey(city)
}

function closeDetails(): void {
  selectedCityKey.value = null
}

function retryCity(city: City): void {
  clearMessage()
  void loadWeatherForCity(city)
}

function retrySelectedCity(): void {
  if (selectedCity.value) {
    retryCity(selectedCity.value)
  }
}

function updatePreferences(nextPreferences: Partial<DashboardPreferences>): void {
  preferences.value = {
    ...preferences.value,
    ...nextPreferences,
  }

  saveDashboardPreferences(preferences.value)
}

function setTemperatureUnit(unit: TemperatureUnit): void {
  if (preferences.value.temperatureUnit === unit) {
    return
  }

  updatePreferences({ temperatureUnit: unit })
  void refreshAllCities(true)
}

function setWindSpeedUnit(unit: WindSpeedUnit): void {
  if (preferences.value.windSpeedUnit === unit) {
    return
  }

  updatePreferences({ windSpeedUnit: unit })
  void refreshAllCities(true)
}

function setSortMode(sortMode: SortMode): void {
  updatePreferences({ sortMode })
}

function togglePinnedCity(city: City): void {
  const cityKey = getCityKey(city)

  updatePreferences({
    pinnedCityKey:
      preferences.value.pinnedCityKey === cityKey ? null : cityKey,
  })
}

async function refreshAllCities(showMessage = false): Promise<void> {
  if (savedCities.value.length === 0) {
    return
  }

  refreshingAll.value = true

  try {
    await Promise.all(savedCities.value.map((city) => loadWeatherForCity(city, { background: true })))

    if (showMessage) {
      setMessage('Weather refreshed for all saved cities.', 'success')
    }
  } finally {
    refreshingAll.value = false
  }
}

async function addCurrentLocation(): Promise<void> {
  clearMessage()

  if (!navigator.geolocation) {
    setMessage('Geolocation is not supported in this browser.', 'warning')
    return
  }

  locatingCurrentCity.value = true

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      })
    })

    const currentCity = await reverseGeocodeCity(
      position.coords.latitude,
      position.coords.longitude,
    )

    if (!currentCity) {
      setMessage('Unable to resolve your current city.', 'warning')
      return
    }

    await addCity(currentCity)
    setMessage(`${currentCity.name} added from your current location.`, 'success')
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unable to use your current location.'
    setMessage(message, 'warning')
  } finally {
    locatingCurrentCity.value = false
  }
}

async function restoreCities(): Promise<void> {
  preferences.value = loadDashboardPreferences()
  weatherCache.value = loadWeatherCache()

  const restoredCities = loadSavedCities()
  savedCities.value = restoredCities
  hydrateWeatherFromCache(restoredCities)

  if (restoredCities.length === 0) {
    return
  }

  await refreshAllCities()
}

onMounted(() => {
  void restoreCities()
})
</script>

<template>
  <div class="app-shell">
    <div class="app-shell__glow app-shell__glow--primary" />
    <div class="app-shell__glow app-shell__glow--secondary" />

    <header class="masthead">
      <div class="masthead__copy">
        <p class="eyebrow">Frontend-only weather cockpit</p>
        <h1>Atmosphere Board</h1>
        <p class="masthead__text">
          Track saved cities, compare conditions instantly, and keep a live weather
          workspace that hydrates from cache before it refreshes.
        </p>

        <div class="masthead__stats">
          <div>
            <span class="masthead__stat-label">Saved cities</span>
            <strong>{{ savedCities.length }}</strong>
          </div>
          <div>
            <span class="masthead__stat-label">Fresh sync</span>
            <strong>{{ syncedCitiesCount }}</strong>
          </div>
          <div>
            <span class="masthead__stat-label">Sort mode</span>
            <strong>{{ preferences.sortMode.replace('-', ' ') }}</strong>
          </div>
        </div>
      </div>

      <div class="masthead__panel">
        <CitySearch
          :saved-city-keys="savedCityKeys"
          :is-locating="locatingCurrentCity"
          @select="addCity"
          @locate="addCurrentLocation"
        />

        <div class="toolbar">
          <label class="toolbar__field">
            <span>Temperature</span>
            <select
              :value="preferences.temperatureUnit"
              @change="setTemperatureUnit(($event.target as HTMLSelectElement).value as TemperatureUnit)"
            >
              <option value="celsius">Celsius</option>
              <option value="fahrenheit">Fahrenheit</option>
            </select>
          </label>

          <label class="toolbar__field">
            <span>Wind</span>
            <select
              :value="preferences.windSpeedUnit"
              @change="setWindSpeedUnit(($event.target as HTMLSelectElement).value as WindSpeedUnit)"
            >
              <option value="kmh">km/h</option>
              <option value="mph">mph</option>
            </select>
          </label>

          <label class="toolbar__field">
            <span>Order</span>
            <select
              :value="preferences.sortMode"
              @change="setSortMode(($event.target as HTMLSelectElement).value as SortMode)"
            >
              <option value="saved">Saved order</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="temperature-desc">Warmest first</option>
              <option value="temperature-asc">Coolest first</option>
              <option value="updated-desc">Recently updated</option>
            </select>
          </label>

          <button
            class="toolbar__refresh"
            type="button"
            :disabled="savedCities.length === 0 || refreshingAll"
            @click="refreshAllCities(true)"
          >
            {{ refreshingAll ? 'Refreshing…' : 'Refresh all' }}
          </button>
        </div>

        <p
          v-if="appMessage"
          class="masthead__message"
          :data-tone="appMessageTone"
        >
          {{ appMessage }}
        </p>
      </div>
    </header>

    <section
      v-if="primaryCity"
      class="spotlight"
    >
      <div class="spotlight__main">
        <div class="spotlight__header">
          <div>
            <p class="eyebrow">Pinned forecast</p>
            <h2>{{ primaryCity.name }}</h2>
            <p class="spotlight__location">
              {{ primaryCity.admin1 ? `${primaryCity.admin1}, ` : '' }}{{ primaryCity.country }}
            </p>
          </div>

          <div class="spotlight__actions">
            <button
              class="spotlight__button spotlight__button--ghost"
              type="button"
              @click="togglePinnedCity(primaryCity)"
            >
              {{ preferences.pinnedCityKey === getCityKey(primaryCity) ? 'Unpin' : 'Pin city' }}
            </button>
            <button
              class="spotlight__button"
              type="button"
              @click="openDetails(primaryCity)"
            >
              Open detail view
            </button>
          </div>
        </div>

        <div
          v-if="primaryWeather?.status === 'success'"
          class="spotlight__body"
        >
          <div class="spotlight__temperature">
            <p>{{ formatTemperature(primaryWeather.current.temperature, preferences.temperatureUnit) }}</p>
            <span>{{ primaryWeather.current.condition }}</span>
          </div>

          <div class="spotlight__metrics">
            <div>
              <span>Feels like</span>
              <strong>
                {{ formatTemperature(primaryWeather.current.apparentTemperature, preferences.temperatureUnit) }}
              </strong>
            </div>
            <div>
              <span>Wind</span>
              <strong>
                {{ formatWindSpeed(primaryWeather.current.windSpeed, preferences.windSpeedUnit) }}
              </strong>
            </div>
            <div>
              <span>Humidity</span>
              <strong>{{ formatPercent(primaryWeather.current.humidity) }}</strong>
            </div>
            <div>
              <span>Today rain chance</span>
              <strong>{{ formatPercent(primaryWeather.daily[0]?.precipitationProbabilityMax ?? null) }}</strong>
            </div>
          </div>

          <div class="spotlight__signals">
            <span
              v-for="signal in getWeatherSignal(primaryWeather)"
              :key="signal"
            >
              {{ signal }}
            </span>
          </div>

          <p class="spotlight__status">
            Updated {{ formatRelativeTime(primaryWeather.lastUpdated) }}
            <span v-if="primaryWeather.source === 'cached'">from cache</span>
            <span v-else>live</span>
            <span v-if="primaryWeather.isRefreshing"> · syncing now</span>
            <span v-if="primaryWeather.warning"> · {{ primaryWeather.warning }}</span>
          </p>
        </div>

        <div
          v-else-if="primaryWeather?.status === 'error'"
          class="spotlight__fallback"
        >
          <p>{{ primaryWeather.error }}</p>
          <button
            class="spotlight__button"
            type="button"
            @click="retryCity(primaryCity)"
          >
            Retry city
          </button>
        </div>

        <div
          v-else
          class="spotlight__fallback"
        >
          <p>Loading current conditions for {{ primaryCity.name }}.</p>
        </div>
      </div>

      <aside class="spotlight__rail">
        <div class="section-header section-header--compact">
          <div>
            <p class="eyebrow">Comparison</p>
            <h3>Across your saved cities</h3>
          </div>
        </div>

        <div
          v-if="comparisonHighlights.length > 0"
          class="comparison-list"
        >
          <article
            v-for="highlight in comparisonHighlights"
            :key="highlight.label"
            class="comparison-list__item"
          >
            <span>{{ highlight.label }}</span>
            <strong>{{ highlight.value }}</strong>
            <p>{{ highlight.city }}</p>
          </article>
        </div>

        <p
          v-else
          class="comparison-list__empty"
        >
          Add a city to start comparing live conditions.
        </p>
      </aside>
    </section>

    <main class="dashboard-panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Weather board</p>
          <h2>{{ secondaryCities.length > 0 ? 'Supporting cities' : 'Saved cities' }}</h2>
        </div>

        <span class="section-header__count">
          {{ savedCities.length }} {{ savedCities.length === 1 ? 'city' : 'cities' }}
        </span>
      </div>

      <div
        v-if="savedCities.length === 0"
        class="empty-state"
      >
        <p class="empty-state__title">No saved cities yet</p>
        <p class="empty-state__text">
          Search for a city or use your current location to build a cached, refreshable
          weather workspace.
        </p>
      </div>

      <section
        v-else-if="secondaryCities.length > 0"
        class="city-grid"
      >
        <SavedCityCard
          v-for="city in secondaryCities"
          :key="getCityKey(city)"
          :city="city"
          :weather="getWeatherEntry(city)"
          :temperature-unit="preferences.temperatureUnit"
          :wind-speed-unit="preferences.windSpeedUnit"
          :is-pinned="preferences.pinnedCityKey === getCityKey(city)"
          @details="openDetails(city)"
          @pin="togglePinnedCity(city)"
          @remove="removeCity(city)"
          @retry="retryCity(city)"
        />
      </section>

      <div
        v-else
        class="empty-state empty-state--compact"
      >
        <p class="empty-state__title">Your pinned city is taking the full stage</p>
        <p class="empty-state__text">
          Save another city to compare conditions side by side.
        </p>
      </div>
    </main>

    <CityDetailsDrawer
      :open="Boolean(selectedCity)"
      :city="selectedCity"
      :weather="selectedWeather"
      :temperature-unit="preferences.temperatureUnit"
      :wind-speed-unit="preferences.windSpeedUnit"
      @close="closeDetails"
      @retry="retrySelectedCity"
    />
  </div>
</template>
