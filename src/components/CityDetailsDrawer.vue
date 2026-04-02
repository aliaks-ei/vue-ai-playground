<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue"
import {
  formatClockTime,
  formatDayDate,
  formatPercent,
  formatPrecipitation,
  formatRelativeTime,
  formatTemperature,
  formatWindSpeed,
} from "../lib/formatters"
import type {
  City,
  ForecastDay,
  TemperatureUnit,
  WeatherEntry,
  WeatherSuccessState,
  WindSpeedUnit,
} from "../lib/types"

interface Props {
  open?: boolean
  city?: City | null
  weather?: WeatherEntry | null
  temperatureUnit: TemperatureUnit
  windSpeedUnit: WindSpeedUnit
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  city: null,
  weather: null,
})

const emit = defineEmits<{
  close: []
  retry: []
}>()

const successWeather = computed<WeatherSuccessState | null>(() =>
  props.weather?.status === "success" ? props.weather : null,
)

const weatherError = computed(() =>
  props.weather?.status === "error" ? props.weather.error : "Unable to load weather.",
)

const forecastDays = computed<ForecastDay[]>(() => successWeather.value?.daily ?? [])

function handleEscape(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    emit("close")
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      window.addEventListener("keydown", handleEscape)
      return
    }

    window.removeEventListener("keydown", handleEscape)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleEscape)
})
</script>

<template>
  <Teleport to="body">
    <transition name="drawer-fade">
      <div v-if="open" class="drawer-overlay" @click.self="emit('close')">
        <aside
          class="city-drawer"
          role="dialog"
          aria-modal="true"
          data-test="drawer-panel"
          :aria-label="city ? `${city.name} forecast details` : 'Forecast details'"
        >
          <header class="city-drawer__header">
            <div>
              <p class="eyebrow">Forecast details</p>
              <h2 data-test="drawer-city-name">{{ city?.name }}</h2>
              <p class="city-drawer__location">
                {{ city?.admin1 ? `${city.admin1}, ` : "" }}{{ city?.country }}
              </p>
            </div>

            <button
              class="city-drawer__close"
              type="button"
              aria-label="Close details"
              data-test="close-btn"
              @click="emit('close')"
            >
              ×
            </button>
          </header>

          <div
            v-if="weather?.status === 'loading' || weather?.status === 'idle'"
            class="city-drawer__state"
            data-test="drawer-loading"
          >
            Loading forecast...
          </div>

          <div
            v-else-if="weather?.status === 'error'"
            class="city-drawer__state city-drawer__state--error"
            data-test="drawer-error"
          >
            <p>{{ weatherError }}</p>
            <button
              class="city-drawer__retry"
              type="button"
              data-test="drawer-retry-btn"
              @click="emit('retry')"
            >
              Retry
            </button>
          </div>

          <div v-else class="city-drawer__content" data-test="drawer-content">
            <section class="city-drawer__hero">
              <div>
                <p class="city-drawer__label">Current weather</p>
                <p class="city-drawer__temperature">
                  {{ formatTemperature(successWeather?.current.temperature, temperatureUnit) }}
                </p>
                <p class="city-drawer__condition">{{ successWeather?.current.condition }}</p>
              </div>

              <div class="city-drawer__summary">
                <span>
                  Updated {{ successWeather ? formatRelativeTime(successWeather.lastUpdated) : "" }}
                </span>
                <strong>{{
                  successWeather?.source === "cached" ? "Cache hydrate" : "Live sync"
                }}</strong>
              </div>
            </section>

            <section class="drawer-metrics">
              <article>
                <span>Feels like</span>
                <strong>
                  {{
                    formatTemperature(successWeather?.current.apparentTemperature, temperatureUnit)
                  }}
                </strong>
              </article>
              <article>
                <span>Wind</span>
                <strong>{{
                  formatWindSpeed(successWeather?.current.windSpeed, windSpeedUnit)
                }}</strong>
              </article>
              <article>
                <span>Humidity</span>
                <strong>{{ formatPercent(successWeather?.current.humidity) }}</strong>
              </article>
              <article>
                <span>Precipitation</span>
                <strong>{{ formatPrecipitation(successWeather?.current.precipitation) }}</strong>
              </article>
            </section>

            <section v-if="forecastDays[0]" class="sun-cycle">
              <article>
                <span>Sunrise</span>
                <strong>{{
                  forecastDays[0].sunrise ? formatClockTime(forecastDays[0].sunrise) : "--"
                }}</strong>
              </article>
              <article>
                <span>Sunset</span>
                <strong>{{
                  forecastDays[0].sunset ? formatClockTime(forecastDays[0].sunset) : "--"
                }}</strong>
              </article>
              <article>
                <span>Rain chance</span>
                <strong>{{ formatPercent(forecastDays[0].precipitationProbabilityMax) }}</strong>
              </article>
            </section>

            <section class="hourly-strip">
              <div class="section-heading">
                <h3>Next hours</h3>
              </div>

              <div class="hourly-strip__rail">
                <article
                  v-for="hour in successWeather?.hourly ?? []"
                  :key="hour.time"
                  class="hourly-strip__item"
                >
                  <p>{{ formatClockTime(hour.time) }}</p>
                  <strong>{{ formatTemperature(hour.temperature, temperatureUnit) }}</strong>
                  <span>{{ formatPercent(hour.precipitationProbability) }}</span>
                </article>
              </div>
            </section>

            <section class="forecast-list">
              <div class="section-heading">
                <h3>7-day outlook</h3>
              </div>

              <article
                v-for="day in forecastDays"
                :key="day.date"
                class="forecast-list__item"
                data-test="forecast-day"
              >
                <div>
                  <p class="forecast-list__date">{{ formatDayDate(day.date) }}</p>
                  <p class="forecast-list__condition">{{ day.condition }}</p>
                </div>

                <div class="forecast-list__meta">
                  <span>{{ formatPercent(day.precipitationProbabilityMax) }}</span>
                  <strong>{{ formatTemperature(day.max, temperatureUnit) }}</strong>
                  <span>{{ formatTemperature(day.min, temperatureUnit) }}</span>
                </div>
              </article>
            </section>
          </div>
        </aside>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  justify-content: flex-end;
  background: rgba(4, 8, 16, 0.7);
  backdrop-filter: blur(8px);
}

.city-drawer {
  width: min(520px, 100%);
  height: 100%;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: linear-gradient(180deg, rgba(12, 17, 28, 0.98), rgba(7, 11, 20, 1));
  box-shadow: -24px 0 48px rgba(0, 0, 0, 0.28);
}

.city-drawer__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.city-drawer__header h2 {
  margin: 0.25rem 0 0;
  font-size: 2rem;
}

.city-drawer__location {
  margin: 0.35rem 0 0;
  color: var(--text-soft);
}

.city-drawer__close,
.city-drawer__retry {
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  cursor: pointer;
}

.city-drawer__close {
  width: 2.25rem;
  height: 2.25rem;
  font-size: 1.35rem;
}

.city-drawer__retry {
  margin-top: 0.9rem;
  padding: 0.72rem 1rem;
}

.city-drawer__state {
  padding: 1.2rem;
  border-radius: 1rem;
  color: var(--text-soft);
  background: rgba(255, 255, 255, 0.04);
}

.city-drawer__state--error {
  color: #ffc2c8;
}

.city-drawer__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  padding-right: 0.15rem;
}

.city-drawer__hero {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.2rem;
  border-radius: 1.4rem;
  background:
    radial-gradient(circle at top right, rgba(114, 161, 255, 0.22), transparent 28%),
    linear-gradient(180deg, rgba(33, 50, 81, 0.95), rgba(13, 18, 30, 0.98));
}

.city-drawer__label,
.city-drawer__condition,
.section-heading h3,
.forecast-list__condition,
.hourly-strip__item p,
.sun-cycle span,
.drawer-metrics span,
.city-drawer__summary span {
  margin: 0;
  color: var(--text-soft);
}

.city-drawer__label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.76rem;
}

.city-drawer__temperature {
  margin: 0.45rem 0 0;
  font-size: 3rem;
  font-weight: 700;
}

.city-drawer__summary {
  display: grid;
  align-content: start;
  gap: 0.3rem;
  text-align: right;
}

.drawer-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.sun-cycle {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.drawer-metrics article,
.sun-cycle article {
  padding: 0.95rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.04);
}

.drawer-metrics strong,
.sun-cycle strong {
  display: block;
  margin-top: 0.4rem;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hourly-strip__rail {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(96px, 1fr);
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.2rem;
}

.hourly-strip__item {
  padding: 0.95rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.04);
}

.hourly-strip__item strong {
  display: block;
  margin: 0.4rem 0 0.25rem;
}

.hourly-strip__item span {
  color: var(--text-muted);
}

.forecast-list {
  display: grid;
  gap: 0.75rem;
}

.forecast-list__item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.04);
}

.forecast-list__date {
  margin: 0;
  font-weight: 700;
}

.forecast-list__meta {
  display: flex;
  gap: 0.85rem;
  align-items: center;
}

.forecast-list__meta strong {
  min-width: 3.5rem;
  text-align: right;
}

.forecast-list__meta span:first-child {
  color: var(--accent-primary);
}

.forecast-list__meta span:last-child {
  color: var(--text-muted);
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

@media (max-width: 720px) {
  .city-drawer {
    width: 100%;
  }

  .drawer-metrics,
  .sun-cycle {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .city-drawer__hero {
    flex-direction: column;
  }

  .city-drawer__summary {
    text-align: left;
  }

  .forecast-list__item {
    flex-direction: column;
    align-items: flex-start;
  }

  .forecast-list__meta {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
