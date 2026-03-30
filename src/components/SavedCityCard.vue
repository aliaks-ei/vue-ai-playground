<script setup lang="ts">
import { computed } from 'vue'
import CardActions from './CardActions.vue'
import {
  formatPercent,
  formatRelativeTime,
  formatTemperature,
  formatWindSpeed,
} from '../lib/formatters'
import type {
  City,
  CurrentWeather,
  TemperatureUnit,
  WeatherEntry,
  WindSpeedUnit,
} from '../lib/types'

interface Props {
  city: City
  weather: WeatherEntry
  temperatureUnit: TemperatureUnit
  windSpeedUnit: WindSpeedUnit
  isPinned?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPinned: false,
})

const emit = defineEmits<{
  details: []
  remove: []
  retry: []
  pin: []
}>()

const currentWeather = computed<CurrentWeather | null>(() =>
  props.weather.status === 'success' ? props.weather.current : null,
)

const weatherError = computed(() =>
  props.weather.status === 'error' ? props.weather.error : 'Unable to load weather.',
)

const weatherTheme = computed(() => getWeatherTheme(currentWeather.value?.weatherCode))

const statusText = computed(() => {
  if (props.weather.status === 'success') {
    if (props.weather.warning) {
      return props.weather.warning
    }

    const freshness = props.weather.source === 'cached' ? 'cache' : 'live'
    const syncState = props.weather.isRefreshing ? ' · syncing' : ''

    return `Updated ${formatRelativeTime(props.weather.lastUpdated)} · ${freshness}${syncState}`
  }

  if (props.weather.status === 'error') {
    return weatherError.value
  }

  return 'Waiting for forecast'
})

function getWeatherTheme(code: number | null | undefined): string {
  if (typeof code !== 'number') {
    return 'default'
  }

  if (code === 0 || code === 1) {
    return 'sunny'
  }

  if (code === 2 || code === 3) {
    return 'cloudy'
  }

  if (code === 45 || code === 48) {
    return 'mist'
  }

  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return 'rain'
  }

  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return 'snow'
  }

  if (code >= 95) {
    return 'storm'
  }

  return 'default'
}
</script>

<template>
  <article
    class="city-card"
    :class="[
      `city-card--${props.weather.status}`,
      `city-card--${weatherTheme}`,
    ]"
  >
    <div class="city-card__topline">
      <span
        v-if="props.isPinned"
        class="city-card__badge"
      >
        Pinned
      </span>
      <span class="city-card__badge city-card__badge--muted">
        {{ props.city.timezone }}
      </span>
    </div>

    <div class="city-card__header">
      <div>
        <p class="city-card__location">
          {{ props.city.admin1 ? `${props.city.admin1}, ` : '' }}{{ props.city.country }}
        </p>
        <h3>{{ props.city.name }}</h3>
      </div>

      <button
        class="city-card__remove"
        type="button"
        aria-label="Remove city"
        @click="emit('remove')"
      >
        ×
      </button>
    </div>

    <div
      v-if="props.weather.status === 'success'"
      class="city-card__body"
    >
      <div class="city-card__headline">
        <p class="city-card__temperature">
          {{ formatTemperature(currentWeather?.temperature, props.temperatureUnit) }}
        </p>
        <p class="city-card__condition">{{ currentWeather?.condition }}</p>
      </div>

      <dl class="city-card__metrics">
        <div>
          <dt>Feels like</dt>
          <dd>
            {{ formatTemperature(currentWeather?.apparentTemperature, props.temperatureUnit) }}
          </dd>
        </div>
        <div>
          <dt>Wind</dt>
          <dd>{{ formatWindSpeed(currentWeather?.windSpeed, props.windSpeedUnit) }}</dd>
        </div>
        <div>
          <dt>Humidity</dt>
          <dd>{{ formatPercent(currentWeather?.humidity) }}</dd>
        </div>
        <div>
          <dt>Rain chance</dt>
          <dd>{{ formatPercent(props.weather.daily[0]?.precipitationProbabilityMax ?? null) }}</dd>
        </div>
      </dl>
    </div>

    <div
      v-else
      class="city-card__body city-card__body--status"
    >
      <p class="city-card__temperature">
        {{ props.weather.status === 'error' ? '--' : '...' }}
      </p>
      <p class="city-card__condition">
        {{ props.weather.status === 'error' ? weatherError : 'Loading weather details' }}
      </p>
    </div>

    <p class="city-card__status">{{ statusText }}</p>

    <div class="city-card__footer">
      <CardActions
        :show-retry="props.weather.status === 'error'"
        :is-pinned="props.isPinned"
        @retry="emit('retry')"
        @details="emit('details')"
        @pin="emit('pin')"
      />
    </div>
  </article>
</template>

<style scoped>
.city-card {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  min-height: 280px;
  padding: 1.4rem;
  border-radius: 1.5rem;
  color: var(--text-main);
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.09), transparent 28%),
    linear-gradient(180deg, rgba(11, 17, 29, 0.96), rgba(8, 12, 22, 0.96));
}

.city-card--sunny {
  background:
    radial-gradient(circle at top right, rgba(255, 194, 92, 0.22), transparent 26%),
    linear-gradient(180deg, rgba(31, 54, 91, 0.96), rgba(10, 16, 29, 0.98));
}

.city-card--cloudy,
.city-card--mist {
  background:
    radial-gradient(circle at top right, rgba(210, 224, 255, 0.18), transparent 26%),
    linear-gradient(180deg, rgba(35, 44, 65, 0.96), rgba(12, 16, 24, 0.98));
}

.city-card--rain,
.city-card--storm {
  background:
    radial-gradient(circle at top right, rgba(76, 178, 255, 0.22), transparent 26%),
    linear-gradient(180deg, rgba(16, 35, 60, 0.96), rgba(8, 14, 25, 0.98));
}

.city-card--snow {
  background:
    radial-gradient(circle at top right, rgba(236, 243, 255, 0.18), transparent 26%),
    linear-gradient(180deg, rgba(48, 67, 90, 0.96), rgba(15, 20, 29, 0.98));
}

.city-card--error {
  background:
    radial-gradient(circle at top right, rgba(255, 108, 120, 0.18), transparent 26%),
    linear-gradient(180deg, rgba(61, 21, 31, 0.96), rgba(23, 11, 16, 0.98));
}

.city-card__topline {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.city-card__badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.32rem 0.62rem;
  background: rgba(229, 236, 255, 0.16);
  color: var(--text-main);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.city-card__badge--muted {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-soft);
}

.city-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.city-card__location,
.city-card__condition,
.city-card__status {
  margin: 0;
  color: var(--text-soft);
}

.city-card__header h3 {
  margin: 0.2rem 0 0;
  font-size: 1.6rem;
}

.city-card__remove {
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  font-size: 1.35rem;
  cursor: pointer;
}

.city-card__body {
  display: grid;
  gap: 1rem;
}

.city-card__body--status {
  flex: 1;
  align-content: center;
}

.city-card__headline {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.city-card__temperature {
  margin: 0;
  font-size: 3.2rem;
  font-weight: 700;
  line-height: 0.92;
}

.city-card__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
  margin: 0;
}

.city-card__metrics div {
  padding-top: 0.7rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.city-card__metrics dt {
  color: var(--text-muted);
  font-size: 0.78rem;
}

.city-card__metrics dd {
  margin: 0.3rem 0 0;
  font-weight: 700;
}

.city-card__status {
  min-height: 2.5rem;
  font-size: 0.9rem;
  line-height: 1.45;
}

.city-card__footer {
  margin-top: auto;
}

@media (max-width: 640px) {
  .city-card {
    min-height: auto;
  }
}
</style>
