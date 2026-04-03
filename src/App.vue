<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import CityDetailsDrawer from "./components/CityDetailsDrawer.vue"
import CitySearch from "./components/CitySearch.vue"
import SavedCityCard from "./components/SavedCityCard.vue"
import { useAppMessage } from "./composables/useAppMessage"
import { usePreferences } from "./composables/usePreferences"
import { useSavedCities } from "./composables/useSavedCities"
import { useWeather } from "./composables/useWeather"
import {
  formatPercent,
  formatRelativeTime,
  formatTemperature,
  formatWindSpeed,
  getWeatherSignal,
} from "./lib/formatters"
import { reverseGeocodeCity } from "./lib/openMeteo"
import { getCityKey } from "./lib/storage"
import type {
  City,
  SortMode,
  TemperatureUnit,
  WeatherSuccessState,
  WindSpeedUnit,
} from "./lib/types"

const { appMessage, appMessageTone, setMessage, clearMessage } = useAppMessage()
const {
  preferences,
  updatePreferences,
  loadPreferences,
  setSortMode,
  setShowPinnedCityInGrid,
  togglePinnedCity,
} = usePreferences()
const {
  savedCities,
  savedCityKeys,
  hasSavedCity,
  addCityToList,
  removeCityFromList,
  restoreFromStorage,
} = useSavedCities()
const {
  weatherByCity,
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
} = useWeather(savedCities, preferences)

const selectedCityKey = ref<string | null>(null)
const locatingCurrentCity = ref(false)

const selectedCity = computed(
  () => savedCities.value.find((city) => getCityKey(city) === selectedCityKey.value) ?? null,
)

const selectedWeather = computed(() => {
  if (!selectedCity.value) return null
  return getWeatherEntry(selectedCity.value)
})

const weatherSuccessEntriesWithSuccess = computed(() =>
  savedCities.value.flatMap((city) => {
    const weather = weatherByCity.value[getCityKey(city)]
    if (weather?.status !== "success") return []
    return [{ city, weather: weather as WeatherSuccessState }]
  }),
)

const sortedCities = computed(() => {
  const cities = [...savedCities.value]
  const savedOrder = new Map(cities.map((city, index) => [getCityKey(city), index]))
  const sortMode = preferences.value.sortMode

  return cities.sort((leftCity, rightCity) => {
    if (sortMode === "alphabetical") {
      return leftCity.name.localeCompare(rightCity.name)
    }

    if (sortMode === "updated-desc") {
      const leftUpdated = getWeatherSuccess(leftCity)?.lastUpdated ?? 0
      const rightUpdated = getWeatherSuccess(rightCity)?.lastUpdated ?? 0
      return rightUpdated - leftUpdated
    }

    if (sortMode === "temperature-desc" || sortMode === "temperature-asc") {
      const leftTemperature = getWeatherSuccess(leftCity)?.current.temperature
      const rightTemperature = getWeatherSuccess(rightCity)?.current.temperature

      const normalizedLeft =
        typeof leftTemperature === "number"
          ? leftTemperature
          : sortMode === "temperature-desc"
            ? Number.NEGATIVE_INFINITY
            : Number.POSITIVE_INFINITY
      const normalizedRight =
        typeof rightTemperature === "number"
          ? rightTemperature
          : sortMode === "temperature-desc"
            ? Number.NEGATIVE_INFINITY
            : Number.POSITIVE_INFINITY

      return sortMode === "temperature-desc"
        ? normalizedRight - normalizedLeft
        : normalizedLeft - normalizedRight
    }

    return (
      (savedOrder.get(getCityKey(leftCity)) ?? 0) - (savedOrder.get(getCityKey(rightCity)) ?? 0)
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
  if (!primaryCity.value) return null
  return getWeatherEntry(primaryCity.value)
})

const boardCities = computed(() => {
  if (!primaryCity.value) {
    return sortedCities.value
  }

  if (preferences.value.showPinnedCityInGrid) {
    return sortedCities.value
  }

  const primaryKey = getCityKey(primaryCity.value)
  return sortedCities.value.filter((city) => getCityKey(city) !== primaryKey)
})

const boardTitle = computed(() => {
  if (!primaryCity.value || preferences.value.showPinnedCityInGrid) {
    return "Saved cities"
  }

  return boardCities.value.length > 0 ? "Supporting cities" : "Saved cities"
})

const comparisonHighlights = computed(() => {
  const entries = weatherSuccessEntriesWithSuccess.value
  if (entries.length === 0) {
    return []
  }

  let hottest = entries[0]
  let coolest = entries[0]
  let windiest = entries[0]
  let rainiest = entries[0]

  for (const entry of entries) {
    const temp = entry.weather.current.temperature ?? Number.NEGATIVE_INFINITY
    const wind = entry.weather.current.windSpeed ?? Number.NEGATIVE_INFINITY
    const rain = entry.weather.daily[0]?.precipitationProbabilityMax ?? Number.NEGATIVE_INFINITY

    if (temp > (hottest.weather.current.temperature ?? Number.NEGATIVE_INFINITY)) {
      hottest = entry
    }
    if (temp < (coolest.weather.current.temperature ?? Number.POSITIVE_INFINITY)) {
      coolest = entry
    }
    if (wind > (windiest.weather.current.windSpeed ?? Number.NEGATIVE_INFINITY)) {
      windiest = entry
    }
    if (
      rain > (rainiest.weather.daily[0]?.precipitationProbabilityMax ?? Number.NEGATIVE_INFINITY)
    ) {
      rainiest = entry
    }
  }

  return [
    {
      label: "Warmest right now",
      city: hottest.city.name,
      value: formatTemperature(
        hottest.weather.current.temperature,
        preferences.value.temperatureUnit,
      ),
    },
    {
      label: "Coolest right now",
      city: coolest.city.name,
      value: formatTemperature(
        coolest.weather.current.temperature,
        preferences.value.temperatureUnit,
      ),
    },
    {
      label: "Strongest wind",
      city: windiest.city.name,
      value: formatWindSpeed(windiest.weather.current.windSpeed, preferences.value.windSpeedUnit),
    },
    {
      label: "Highest rain chance",
      city: rainiest.city.name,
      value: formatPercent(rainiest.weather.daily[0]?.precipitationProbabilityMax ?? null),
    },
  ]
})

async function addCity(city: City): Promise<void> {
  clearMessage()

  const cityKey = getCityKey(city)

  if (hasSavedCity(cityKey)) {
    setMessage(`${city.name} is already saved.`, "warning")
    return
  }

  addCityToList(city)

  if (!preferences.value.pinnedCityKey) {
    updatePreferences({ pinnedCityKey: cityKey })
  }

  await loadWeatherForCity(city)
}

function removeCity(city: City): void {
  const cityKey = getCityKey(city)

  cancelCity(cityKey)
  removeCityFromList(cityKey)
  removeWeatherEntry(cityKey)
  removeWeatherRecord(cityKey)

  if (selectedCityKey.value === cityKey) {
    selectedCityKey.value = null
  }

  if (preferences.value.pinnedCityKey === cityKey) {
    updatePreferences({
      pinnedCityKey: savedCities.value[0] ? getCityKey(savedCities.value[0]) : null,
    })
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

function setTemperatureUnit(unit: TemperatureUnit): void {
  if (preferences.value.temperatureUnit === unit) return
  updatePreferences({ temperatureUnit: unit })
  void refreshAllCities()
}

function setWindSpeedUnit(unit: WindSpeedUnit): void {
  if (preferences.value.windSpeedUnit === unit) return
  updatePreferences({ windSpeedUnit: unit })
  void refreshAllCities()
}

function togglePinnedCityVisibility(event: Event): void {
  const nextValue = (event.target as HTMLInputElement).checked
  setShowPinnedCityInGrid(nextValue)
}

async function handleRefreshAll(): Promise<void> {
  await refreshAllCities()
  setMessage("Weather refreshed for all saved cities.", "success")
}

async function addCurrentLocation(): Promise<void> {
  clearMessage()

  if (!navigator.geolocation) {
    setMessage("Geolocation is not supported in this browser.", "warning")
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
      setMessage("Unable to resolve your current city.", "warning")
      return
    }

    await addCity(currentCity)
    setMessage(`${currentCity.name} added from your current location.`, "success")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to use your current location."
    setMessage(message, "warning")
  } finally {
    locatingCurrentCity.value = false
  }
}

async function restoreCities(): Promise<void> {
  loadPreferences()
  initCache()

  const restoredCities = restoreFromStorage()
  hydrateFromCache(restoredCities)

  if (restoredCities.length === 0) return

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
          Track saved cities, compare conditions instantly, and keep a live weather workspace that
          hydrates from cache before it refreshes.
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
            <strong>{{ preferences.sortMode.replace("-", " ") }}</strong>
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
              @change="
                setTemperatureUnit(($event.target as HTMLSelectElement).value as TemperatureUnit)
              "
            >
              <option value="celsius">Celsius</option>
              <option value="fahrenheit">Fahrenheit</option>
            </select>
          </label>

          <label class="toolbar__field">
            <span>Wind</span>
            <select
              :value="preferences.windSpeedUnit"
              @change="
                setWindSpeedUnit(($event.target as HTMLSelectElement).value as WindSpeedUnit)
              "
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

          <label class="toolbar__toggle" data-test="show-pinned-toggle">
            <input
              type="checkbox"
              :checked="preferences.showPinnedCityInGrid"
              @change="togglePinnedCityVisibility"
            />
            <span>Keep pinned city in board</span>
          </label>

          <button
            class="toolbar__refresh"
            type="button"
            :disabled="savedCities.length === 0 || refreshingAll"
            @click="handleRefreshAll"
          >
            {{ refreshingAll ? "Refreshing…" : "Refresh all" }}
          </button>
        </div>

        <p v-if="appMessage" class="masthead__message" :data-tone="appMessageTone">
          {{ appMessage }}
        </p>
      </div>
    </header>

    <section v-if="primaryCity" class="spotlight">
      <div class="spotlight__main">
        <div class="spotlight__header">
          <div>
            <p class="eyebrow">Pinned forecast</p>
            <h2>{{ primaryCity.name }}</h2>
            <p class="spotlight__location">
              {{ primaryCity.admin1 ? `${primaryCity.admin1}, ` : "" }}{{ primaryCity.country }}
            </p>
          </div>

          <div class="spotlight__actions">
            <button
              class="spotlight__button spotlight__button--ghost"
              type="button"
              @click="togglePinnedCity(primaryCity)"
            >
              {{ preferences.pinnedCityKey === getCityKey(primaryCity) ? "Unpin" : "Pin city" }}
            </button>
            <button class="spotlight__button" type="button" @click="openDetails(primaryCity)">
              Open detail view
            </button>
          </div>
        </div>

        <div v-if="primaryWeather?.status === 'success'" class="spotlight__body">
          <div class="spotlight__temperature">
            <p>
              {{
                formatTemperature(primaryWeather.current.temperature, preferences.temperatureUnit)
              }}
            </p>
            <span>{{ primaryWeather.current.condition }}</span>
          </div>

          <div class="spotlight__metrics">
            <div>
              <span>Feels like</span>
              <strong>
                {{
                  formatTemperature(
                    primaryWeather.current.apparentTemperature,
                    preferences.temperatureUnit,
                  )
                }}
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
              <strong>{{
                formatPercent(primaryWeather.daily[0]?.precipitationProbabilityMax ?? null)
              }}</strong>
            </div>
          </div>

          <div class="spotlight__signals">
            <span v-for="signal in getWeatherSignal(primaryWeather)" :key="signal">
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

        <div v-else-if="primaryWeather?.status === 'error'" class="spotlight__fallback">
          <p>{{ primaryWeather.error }}</p>
          <button class="spotlight__button" type="button" @click="retryCity(primaryCity)">
            Retry city
          </button>
        </div>

        <div v-else class="spotlight__fallback">
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

        <div v-if="comparisonHighlights.length > 0" class="comparison-list">
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

        <p v-else class="comparison-list__empty">Add a city to start comparing live conditions.</p>
      </aside>
    </section>

    <main class="dashboard-panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Weather board</p>
          <h2>{{ boardTitle }}</h2>
        </div>

        <span class="section-header__count">
          {{ savedCities.length }} {{ savedCities.length === 1 ? "city" : "cities" }}
        </span>
      </div>

      <div v-if="savedCities.length === 0" class="empty-state">
        <p class="empty-state__title">No saved cities yet</p>
        <p class="empty-state__text">
          Search for a city or use your current location to build a cached, refreshable weather
          workspace.
        </p>
      </div>

      <section v-else-if="boardCities.length > 0" class="city-grid">
        <SavedCityCard
          v-for="city in boardCities"
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

      <div v-else class="empty-state empty-state--compact">
        <p class="empty-state__title">Your pinned city is taking the full stage</p>
        <p class="empty-state__text">
          Save another city to compare conditions side by side, or keep the pinned city visible in
          the board from the toolbar.
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
