<script setup>
const props = defineProps({
  city: {
    type: Object,
    required: true,
  },
  weather: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['details', 'remove', 'retry'])

function formatTemperature(value) {
  if (typeof value !== 'number') {
    return '--'
  }

  return `${Math.round(value)}°C`
}
</script>

<template>
  <article class="city-card">
    <div class="city-card__header">
      <div>
        <h3>{{ props.city.name }}</h3>
        <p class="city-card__location">
          {{ props.city.admin1 ? `${props.city.admin1}, ` : '' }}{{ props.city.country }}
        </p>
      </div>

      <button
        class="city-card__remove"
        type="button"
        aria-label="Remove city"
        @click="emit('remove')"
      >
        Remove
      </button>
    </div>

    <div
      v-if="props.weather.status === 'loading' || props.weather.status === 'idle'"
      class="city-card__status"
    >
      <p class="city-card__temperature">Loading...</p>
      <p class="city-card__condition">Fetching current weather</p>
    </div>

    <div
      v-else-if="props.weather.status === 'error'"
      class="city-card__status"
    >
      <p class="city-card__temperature">Unavailable</p>
      <p class="city-card__condition">{{ props.weather.error }}</p>
      <button
        class="city-card__retry"
        type="button"
        @click="emit('retry')"
      >
        Retry
      </button>
    </div>

    <div
      v-else
      class="city-card__status"
    >
      <p class="city-card__temperature">
        {{ formatTemperature(props.weather.current?.temperature) }}
      </p>
      <p class="city-card__condition">{{ props.weather.current?.condition }}</p>
    </div>

    <div class="city-card__actions">
      <button
        class="city-card__action city-card__action--primary"
        type="button"
        @click="emit('details')"
      >
        Details
      </button>
      <span class="city-card__meta">5-day forecast</span>
    </div>
  </article>
</template>

<style scoped>
.city-card {
  position: relative;
  border: 1px solid rgba(112, 139, 196, 0.18);
  border-radius: 1.3rem;
  padding: 1.35rem;
  background:
    linear-gradient(160deg, rgba(29, 44, 85, 0.94), rgba(12, 21, 46, 0.96));
  box-shadow: 0 22px 46px rgba(0, 0, 0, 0.18);
  min-height: 215px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.city-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.city-card__header h3 {
  margin: 0;
  font-size: 1.3rem;
}

.city-card__location {
  margin: 0.35rem 0 0;
  color: var(--text-soft);
}

.city-card__remove {
  border: 0;
  background: rgba(255, 122, 162, 0.12);
  color: #ff9eb7;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  cursor: pointer;
}

.city-card__status {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.city-card__temperature {
  margin: 0;
  font-size: clamp(2rem, 5vw, 2.8rem);
  font-weight: 700;
}

.city-card__condition {
  margin: 0.45rem 0 0;
  color: var(--text-soft);
}

.city-card__retry {
  margin-top: 0.85rem;
  align-self: flex-start;
  border: 1px solid rgba(56, 223, 248, 0.25);
  background: transparent;
  color: var(--accent-primary);
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  cursor: pointer;
}

.city-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.city-card__action {
  border: 0;
  border-radius: 0.9rem;
  padding: 0.8rem 1rem;
  cursor: pointer;
  font-weight: 600;
}

.city-card__action--primary {
  background: linear-gradient(135deg, var(--accent-primary), #63a5ff);
  color: #031222;
}

.city-card__meta {
  color: var(--text-muted);
  font-size: 0.9rem;
}
</style>
