<script setup>
import { computed } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  city: {
    type: Object,
    default: null,
  },
  weather: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'retry'])

const forecastDays = computed(() => props.weather?.daily ?? [])

function formatTemperature(value) {
  if (typeof value !== 'number') {
    return '--'
  }

  return `${Math.round(value)}°C`
}

function formatDate(dateString) {
  const normalizedDate = `${dateString}T12:00:00`

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(normalizedDate))
}
</script>

<template>
  <Teleport to="body">
    <transition name="drawer-fade">
      <div
        v-if="open"
        class="drawer-overlay"
        @click.self="emit('close')"
      >
        <aside class="city-drawer">
          <header class="city-drawer__header">
            <div>
              <p class="eyebrow">Forecast details</p>
              <h2>{{ city?.name }}</h2>
              <p class="city-drawer__location">
                {{ city?.admin1 ? `${city.admin1}, ` : '' }}{{ city?.country }}
              </p>
            </div>

            <button
              class="city-drawer__close"
              type="button"
              aria-label="Close details"
              @click="emit('close')"
            >
              ×
            </button>
          </header>

          <div
            v-if="weather?.status === 'loading' || weather?.status === 'idle'"
            class="city-drawer__state"
          >
            Loading forecast...
          </div>

          <div
            v-else-if="weather?.status === 'error'"
            class="city-drawer__state city-drawer__state--error"
          >
            <p>{{ weather.error }}</p>
            <button
              class="city-drawer__retry"
              type="button"
              @click="emit('retry')"
            >
              Retry
            </button>
          </div>

          <div
            v-else
            class="city-drawer__content"
          >
            <section class="city-drawer__hero">
              <div>
                <p class="city-drawer__label">Current weather</p>
                <p class="city-drawer__temperature">
                  {{ formatTemperature(weather.current?.temperature) }}
                </p>
                <p class="city-drawer__condition">{{ weather.current?.condition }}</p>
              </div>

              <div class="city-drawer__summary">
                <span>5-day outlook</span>
              </div>
            </section>

            <section class="forecast-list">
              <article
                v-for="day in forecastDays"
                :key="day.date"
                class="forecast-list__item"
              >
                <div>
                  <p class="forecast-list__date">{{ formatDate(day.date) }}</p>
                  <p class="forecast-list__condition">{{ day.condition }}</p>
                </div>

                <div class="forecast-list__temps">
                  <span>{{ formatTemperature(day.max) }}</span>
                  <span>{{ formatTemperature(day.min) }}</span>
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
  background: rgba(2, 6, 18, 0.62);
  backdrop-filter: blur(8px);
  z-index: 40;
  display: flex;
  justify-content: flex-end;
}

.city-drawer {
  width: min(420px, 100%);
  height: 100%;
  background:
    linear-gradient(180deg, rgba(15, 25, 55, 0.98), rgba(7, 13, 32, 1));
  border-left: 1px solid rgba(112, 139, 196, 0.18);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  box-shadow: -24px 0 48px rgba(0, 0, 0, 0.26);
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

.city-drawer__close {
  border: 0;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  font-size: 1.35rem;
  cursor: pointer;
}

.city-drawer__state {
  padding: 1.2rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-soft);
}

.city-drawer__state--error {
  color: #ff9eb7;
}

.city-drawer__retry {
  margin-top: 0.9rem;
  border: 0;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  padding: 0.7rem 0.95rem;
  border-radius: 0.85rem;
  cursor: pointer;
}

.city-drawer__content {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.city-drawer__hero {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid rgba(112, 139, 196, 0.16);
  border-radius: 1.2rem;
  padding: 1.2rem;
  background: linear-gradient(160deg, rgba(41, 61, 116, 0.9), rgba(12, 21, 45, 0.9));
}

.city-drawer__label {
  margin: 0;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.74rem;
}

.city-drawer__temperature {
  margin: 0.45rem 0 0;
  font-size: 3rem;
  font-weight: 700;
}

.city-drawer__condition {
  margin: 0.25rem 0 0;
  color: var(--text-soft);
}

.city-drawer__summary {
  align-self: flex-start;
  border-radius: 999px;
  padding: 0.45rem 0.7rem;
  color: var(--accent-primary);
  background: rgba(56, 223, 248, 0.12);
  font-size: 0.82rem;
}

.forecast-list {
  display: grid;
  gap: 0.85rem;
}

.forecast-list__item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  border: 1px solid rgba(112, 139, 196, 0.14);
  border-radius: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.04);
}

.forecast-list__date,
.forecast-list__condition {
  margin: 0;
}

.forecast-list__date {
  font-weight: 600;
}

.forecast-list__condition {
  margin-top: 0.25rem;
  color: var(--text-soft);
}

.forecast-list__temps {
  display: flex;
  gap: 0.75rem;
  color: var(--text-main);
  font-weight: 600;
}

.forecast-list__temps span:last-child {
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
}
</style>
