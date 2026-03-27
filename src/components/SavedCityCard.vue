<script setup lang="ts">
import { computed } from 'vue'
import CardActions from './CardActions.vue'
import type { City, CurrentWeather, WeatherEntry } from '../lib/types'

interface Props {
  city: City
  weather: WeatherEntry
}

const props = defineProps<Props>()

const emit = defineEmits<{
  details: []
  remove: []
  retry: []
}>()

const currentWeather = computed<CurrentWeather | null>(() =>
  props.weather.status === 'success' ? props.weather.current : null,
)

const weatherError = computed(() =>
  props.weather.status === 'error' ? props.weather.error : 'Unable to load weather.',
)

const weatherTheme = computed(() => getWeatherTheme(currentWeather.value?.weatherCode))

function formatTemperature(value: number | null | undefined): string {
  if (typeof value !== 'number') {
    return '--'
  }

  return `${Math.round(value)}°C`
}

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

function getStatusLabel(status: WeatherEntry['status']): string {
  if (status === 'error') {
    return 'Connection issue'
  }

  if (status === 'loading' || status === 'idle') {
    return 'Live update'
  }

  return 'Current weather'
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
    <div class="city-card__aurora city-card__aurora--primary" />
    <div class="city-card__aurora city-card__aurora--secondary" />

    <div class="city-card__header">
      <div class="city-card__eyebrow-group">
        <span class="city-card__eyebrow">{{ getStatusLabel(props.weather.status) }}</span>
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
      v-if="props.weather.status === 'loading' || props.weather.status === 'idle'"
      class="city-card__body city-card__body--status"
    >
      <div>
        <p class="city-card__temperature">--</p>
        <p class="city-card__condition">Fetching current weather</p>
      </div>

      <div class="city-card__visual">
        <div class="city-card__orb" />
      </div>
    </div>

    <div
      v-else-if="props.weather.status === 'error'"
      class="city-card__body city-card__body--status"
    >
      <div>
        <p class="city-card__temperature">--</p>
        <p class="city-card__condition">{{ weatherError }}</p>
      </div>

      <div class="city-card__visual">
        <div class="city-card__orb city-card__orb--alert" />
      </div>
    </div>

    <div
      v-else
      class="city-card__body"
    >
      <div>
        <p class="city-card__temperature">
          {{ formatTemperature(currentWeather?.temperature) }}
        </p>
        <p class="city-card__condition">{{ currentWeather?.condition }}</p>
      </div>

      <div class="city-card__visual">
        <div class="city-card__orb" />
      </div>
    </div>

    <div class="city-card__footer">
      <div class="city-card__meta">
        <span class="city-card__meta-label">Forecast</span>
        <span class="city-card__meta-value">5-day outlook</span>
      </div>

      <CardActions
        :show-retry="props.weather.status === 'error'"
        @retry="emit('retry')"
        @details="emit('details')"
      />
    </div>
  </article>
</template>

<style scoped>
.city-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border: 1px solid rgba(164, 196, 255, 0.18);
  border-radius: 1.65rem;
  padding: 1.4rem;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.16), transparent 36%),
    linear-gradient(145deg, rgba(15, 28, 62, 0.98), rgba(5, 13, 30, 0.98));
  box-shadow:
    0 26px 50px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  min-height: 265px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.city-card--sunny {
  background:
    radial-gradient(circle at 82% 18%, rgba(255, 204, 82, 0.24), transparent 24%),
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.16), transparent 36%),
    linear-gradient(145deg, rgba(30, 65, 124, 0.98), rgba(8, 20, 42, 0.98));
}

.city-card--cloudy,
.city-card--mist {
  background:
    radial-gradient(circle at 82% 18%, rgba(195, 220, 255, 0.2), transparent 24%),
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.14), transparent 36%),
    linear-gradient(145deg, rgba(39, 56, 95, 0.98), rgba(10, 18, 37, 0.98));
}

.city-card--rain,
.city-card--storm {
  background:
    radial-gradient(circle at 82% 18%, rgba(56, 223, 248, 0.2), transparent 24%),
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.12), transparent 36%),
    linear-gradient(145deg, rgba(18, 47, 88, 0.98), rgba(4, 11, 26, 0.98));
}

.city-card--snow {
  background:
    radial-gradient(circle at 82% 18%, rgba(229, 242, 255, 0.24), transparent 24%),
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.16), transparent 36%),
    linear-gradient(145deg, rgba(37, 61, 94, 0.98), rgba(8, 17, 35, 0.98));
}

.city-card--error {
  background:
    radial-gradient(circle at 82% 18%, rgba(255, 126, 162, 0.24), transparent 24%),
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.14), transparent 36%),
    linear-gradient(145deg, rgba(72, 25, 49, 0.98), rgba(24, 10, 20, 0.98));
}

.city-card__aurora {
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(40px);
  opacity: 0.8;
  z-index: -1;
}

.city-card__aurora--primary {
  top: -2.5rem;
  right: -1.25rem;
  width: 7rem;
  height: 7rem;
  background: rgba(255, 255, 255, 0.16);
}

.city-card__aurora--secondary {
  bottom: -2.75rem;
  left: -1rem;
  width: 8rem;
  height: 8rem;
  background: rgba(56, 223, 248, 0.18);
}

.city-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.city-card__eyebrow-group {
  display: grid;
  gap: 0.35rem;
}

.city-card__eyebrow {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 0.32rem 0.65rem;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(238, 244, 255, 0.82);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.city-card__header h3 {
  margin: 0;
  font-size: 1.65rem;
  line-height: 1.05;
}

.city-card__location {
  margin: 0;
  color: rgba(238, 244, 255, 0.72);
  font-size: 0.92rem;
}

.city-card__remove {
  width: 2.35rem;
  height: 2.35rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(8, 15, 34, 0.34);
  color: rgba(255, 255, 255, 0.76);
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.15rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.city-card__body {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
}

.city-card__body--status {
  align-items: end;
}

.city-card__temperature {
  margin: 0;
  font-size: clamp(3rem, 7vw, 4.2rem);
  font-weight: 700;
  line-height: 0.9;
  letter-spacing: -0.04em;
}

.city-card__condition {
  margin: 0.6rem 0 0;
  color: rgba(238, 244, 255, 0.78);
  line-height: 1.45;
  max-width: 15rem;
}

.city-card__visual {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 6.6rem;
  min-height: 6.6rem;
}

.city-card__orb {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 30%, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.2) 22%, transparent 23%),
    radial-gradient(circle at 65% 65%, rgba(255, 255, 255, 0.26), transparent 38%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.04));
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 18px 30px rgba(0, 0, 0, 0.18);
}

.city-card--sunny .city-card__orb {
  background:
    radial-gradient(circle at 32% 30%, rgba(255, 248, 210, 0.98), rgba(255, 225, 119, 0.72) 28%, transparent 29%),
    radial-gradient(circle at 65% 65%, rgba(255, 228, 150, 0.28), transparent 38%),
    linear-gradient(145deg, rgba(255, 208, 90, 0.95), rgba(255, 144, 67, 0.22));
}

.city-card--cloudy .city-card__orb,
.city-card--mist .city-card__orb {
  background:
    radial-gradient(circle at 32% 30%, rgba(248, 251, 255, 0.96), rgba(211, 227, 255, 0.55) 28%, transparent 29%),
    radial-gradient(circle at 65% 65%, rgba(195, 220, 255, 0.26), transparent 38%),
    linear-gradient(145deg, rgba(217, 230, 255, 0.88), rgba(122, 157, 216, 0.2));
}

.city-card--rain .city-card__orb,
.city-card--storm .city-card__orb {
  background:
    radial-gradient(circle at 32% 30%, rgba(230, 250, 255, 0.96), rgba(117, 220, 255, 0.62) 28%, transparent 29%),
    radial-gradient(circle at 65% 65%, rgba(56, 223, 248, 0.3), transparent 38%),
    linear-gradient(145deg, rgba(95, 190, 255, 0.86), rgba(59, 108, 205, 0.24));
}

.city-card--snow .city-card__orb {
  background:
    radial-gradient(circle at 32% 30%, rgba(255, 255, 255, 0.98), rgba(220, 238, 255, 0.68) 28%, transparent 29%),
    radial-gradient(circle at 65% 65%, rgba(216, 237, 255, 0.24), transparent 38%),
    linear-gradient(145deg, rgba(241, 247, 255, 0.92), rgba(141, 184, 226, 0.22));
}

.city-card__orb--alert,
.city-card--error .city-card__orb {
  background:
    radial-gradient(circle at 32% 30%, rgba(255, 238, 244, 0.96), rgba(255, 159, 187, 0.62) 28%, transparent 29%),
    radial-gradient(circle at 65% 65%, rgba(255, 113, 156, 0.22), transparent 38%),
    linear-gradient(145deg, rgba(255, 142, 176, 0.88), rgba(160, 53, 92, 0.2));
}

.city-card__footer {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: end;
}

.city-card__meta {
  display: grid;
  gap: 0.2rem;
}

.city-card__meta-label {
  color: rgba(238, 244, 255, 0.46);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.68rem;
}

.city-card__meta-value {
  color: rgba(238, 244, 255, 0.86);
  font-weight: 600;
  font-size: 0.94rem;
}

@media (max-width: 640px) {
  .city-card {
    min-height: 240px;
    padding: 1.2rem;
    border-radius: 1.35rem;
  }

  .city-card__header h3 {
    font-size: 1.45rem;
  }

  .city-card__body {
    grid-template-columns: 1fr;
  }

  .city-card__visual {
    width: 5.4rem;
    min-height: 5.4rem;
  }

  .city-card__footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
