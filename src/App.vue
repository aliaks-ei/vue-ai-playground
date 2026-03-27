<script setup>
import { computed, onMounted, ref } from 'vue'
import CityDetailsDrawer from './components/CityDetailsDrawer.vue'
import CitySearch from './components/CitySearch.vue'
import SavedCityCard from './components/SavedCityCard.vue'
import { fetchCityWeather } from './lib/openMeteo.js'
import { getCityKey, loadSavedCities, saveCities } from './lib/storage.js'

const savedCities = ref([])
const weatherByCity = ref({})
const selectedCityKey = ref(null)
const appMessage = ref('')
const appMessageTone = ref('info')

const savedCityKeys = computed(() =>
  savedCities.value.map((city) => getCityKey(city)),
)

const selectedCity = computed(
  () =>
    savedCities.value.find((city) => getCityKey(city) === selectedCityKey.value) ??
    null,
)

const selectedWeather = computed(() => {
  if (!selectedCity.value) {
    return null
  }

  return weatherByCity.value[getCityKey(selectedCity.value)] ?? { status: 'idle' }
})

function setMessage(message, tone = 'info') {
  appMessage.value = message
  appMessageTone.value = tone
}

function clearMessage() {
  appMessage.value = ''
}

function updateWeatherEntry(cityKey, nextState) {
  weatherByCity.value = {
    ...weatherByCity.value,
    [cityKey]: nextState,
  }
}

function removeWeatherEntry(cityKey) {
  const nextEntries = { ...weatherByCity.value }
  delete nextEntries[cityKey]
  weatherByCity.value = nextEntries
}

function hasSavedCity(cityKey) {
  return savedCities.value.some((city) => getCityKey(city) === cityKey)
}

async function loadWeatherForCity(city) {
  const cityKey = getCityKey(city)

  updateWeatherEntry(cityKey, { status: 'loading' })

  try {
    const weather = await fetchCityWeather(city)

    if (!hasSavedCity(cityKey)) {
      return
    }

    updateWeatherEntry(cityKey, {
      status: 'success',
      ...weather,
    })
  } catch (error) {
    if (!hasSavedCity(cityKey)) {
      return
    }

    updateWeatherEntry(cityKey, {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unable to load weather.',
    })
  }
}

async function addCity(city) {
  clearMessage()

  const cityKey = getCityKey(city)

  if (hasSavedCity(cityKey)) {
    setMessage(`${city.name} is already saved.`, 'warning')
    return
  }

  savedCities.value = [city, ...savedCities.value]
  saveCities(savedCities.value)
  await loadWeatherForCity(city)
}

function removeCity(city) {
  const cityKey = getCityKey(city)

  savedCities.value = savedCities.value.filter(
    (savedCity) => getCityKey(savedCity) !== cityKey,
  )
  saveCities(savedCities.value)
  removeWeatherEntry(cityKey)

  if (selectedCityKey.value === cityKey) {
    selectedCityKey.value = null
  }

  clearMessage()
}

function openDetails(city) {
  selectedCityKey.value = getCityKey(city)
}

function closeDetails() {
  selectedCityKey.value = null
}

function retryCity(city) {
  clearMessage()
  loadWeatherForCity(city)
}

async function restoreCities() {
  const restoredCities = loadSavedCities()
  savedCities.value = restoredCities

  if (restoredCities.length === 0) {
    return
  }

  await Promise.all(restoredCities.map((city) => loadWeatherForCity(city)))
}

onMounted(() => {
  restoreCities()
})
</script>

<template>
  <div class="app-shell">
    <div class="app-shell__glow app-shell__glow--primary" />
    <div class="app-shell__glow app-shell__glow--secondary" />

    <header class="hero-panel">
      <div class="hero-panel__copy">
        <p class="eyebrow">Client-only Vue dashboard</p>
        <h1>Saved Cities Weather Dashboard</h1>
        <p class="hero-panel__text">
          Search for a city, save it locally, and keep a lightweight weather board
          with a 5-day forecast drawer.
        </p>
      </div>

      <div class="hero-panel__search">
        <CitySearch
          :saved-city-keys="savedCityKeys"
          @select="addCity"
        />

        <p
          v-if="appMessage"
          class="hero-panel__message"
          :data-tone="appMessageTone"
        >
          {{ appMessage }}
        </p>
      </div>
    </header>

    <main class="dashboard-panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Saved places</p>
          <h2>Your cities</h2>
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
          Use the search above to add a city and load its current weather.
        </p>
      </div>

      <section
        v-else
        class="city-grid"
      >
        <SavedCityCard
          v-for="city in savedCities"
          :key="getCityKey(city)"
          :city="city"
          :weather="weatherByCity[getCityKey(city)] ?? { status: 'idle' }"
          @details="openDetails(city)"
          @remove="removeCity(city)"
          @retry="retryCity(city)"
        />
      </section>
    </main>

    <CityDetailsDrawer
      :open="Boolean(selectedCity)"
      :city="selectedCity"
      :weather="selectedWeather"
      @close="closeDetails"
      @retry="selectedCity && retryCity(selectedCity)"
    />
  </div>
</template>
