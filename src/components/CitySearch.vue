<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { searchCities } from '../lib/openMeteo.js'
import { getCityKey } from '../lib/storage.js'

const props = defineProps({
  savedCityKeys: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['select'])

const query = ref('')
const results = ref([])
const loading = ref(false)
const error = ref('')
const hasSearched = ref(false)
const searchRoot = ref(null)

let debounceId = null
let activeRequest = 0

const showResults = computed(
  () => loading.value || error.value || results.value.length > 0 || hasSearched.value,
)

function isSaved(city) {
  return props.savedCityKeys.includes(getCityKey(city))
}

async function runSearch(rawQuery) {
  const trimmedQuery = rawQuery.trim()

  if (trimmedQuery.length < 2) {
    loading.value = false
    error.value = ''
    results.value = []
    hasSearched.value = false
    return
  }

  const requestId = ++activeRequest
  loading.value = true
  error.value = ''

  try {
    const nextResults = await searchCities(trimmedQuery)

    if (requestId !== activeRequest) {
      return
    }

    results.value = nextResults
    hasSearched.value = true
  } catch (requestError) {
    if (requestId !== activeRequest) {
      return
    }

    error.value =
      requestError instanceof Error
        ? requestError.message
        : 'Unable to search cities.'
    results.value = []
    hasSearched.value = true
  } finally {
    if (requestId === activeRequest) {
      loading.value = false
    }
  }
}

function scheduleSearch(value) {
  window.clearTimeout(debounceId)
  debounceId = window.setTimeout(() => {
    runSearch(value)
  }, 300)
}

function selectCity(city) {
  if (isSaved(city)) {
    return
  }

  emit('select', city)
  query.value = ''
  results.value = []
  error.value = ''
  hasSearched.value = false
}

function handleDocumentClick(event) {
  if (!searchRoot.value?.contains(event.target)) {
    results.value = []
    error.value = ''
    hasSearched.value = false
  }
}

watch(query, (value) => {
  scheduleSearch(value)
})

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  window.clearTimeout(debounceId)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div
    ref="searchRoot"
    class="search-card"
  >
    <label
      class="search-card__label"
      for="city-search"
    >
      Search for a city
    </label>

    <div class="search-card__field">
      <span class="search-card__icon" aria-hidden="true">⌕</span>
      <input
        id="city-search"
        v-model="query"
        class="search-card__input"
        type="text"
        autocomplete="off"
        placeholder="Start typing a city name..."
      />
    </div>

    <div
      v-if="showResults"
      class="search-results"
    >
      <p
        v-if="loading"
        class="search-results__state"
      >
        Searching cities...
      </p>

      <p
        v-else-if="error"
        class="search-results__state search-results__state--error"
      >
        {{ error }}
      </p>

      <p
        v-else-if="results.length === 0"
        class="search-results__state"
      >
        No matching cities found.
      </p>

      <ul
        v-else
        class="search-results__list"
      >
        <li
          v-for="city in results"
          :key="getCityKey(city)"
        >
          <button
            class="search-results__item"
            type="button"
            :disabled="isSaved(city)"
            @click="selectCity(city)"
          >
            <span class="search-results__name">{{ city.name }}</span>
            <span class="search-results__meta">
              {{ city.admin1 ? `${city.admin1}, ` : '' }}{{ city.country }}
            </span>
            <span
              v-if="isSaved(city)"
              class="search-results__badge"
            >
              Saved
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.search-card {
  position: relative;
}

.search-card__label {
  display: block;
  margin-bottom: 0.75rem;
  color: var(--text-soft);
  font-size: 0.92rem;
}

.search-card__field {
  position: relative;
}

.search-card__icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 1rem;
}

.search-card__input {
  width: 100%;
  border: 1px solid var(--border-strong);
  background: rgba(10, 18, 42, 0.86);
  color: var(--text-main);
  border-radius: 1rem;
  padding: 1rem 1rem 1rem 2.7rem;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-card__input::placeholder {
  color: var(--text-muted);
}

.search-card__input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 4px rgba(56, 223, 248, 0.12);
}

.search-results {
  position: absolute;
  top: calc(100% + 0.85rem);
  left: 0;
  right: 0;
  z-index: 20;
  background: rgba(14, 24, 53, 0.98);
  border: 1px solid rgba(112, 139, 196, 0.2);
  border-radius: 1rem;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.28);
  overflow: hidden;
}

.search-results__state {
  margin: 0;
  padding: 1rem 1.1rem;
  color: var(--text-soft);
}

.search-results__state--error {
  color: #ff9eb7;
}

.search-results__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.search-results__item {
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  padding: 1rem 1.1rem;
  display: grid;
  gap: 0.25rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease;
}

.search-results__item:hover:not(:disabled),
.search-results__item:focus-visible:not(:disabled) {
  background: rgba(56, 223, 248, 0.1);
  outline: none;
}

.search-results__item:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.search-results__list li + li .search-results__item {
  border-top: 1px solid rgba(112, 139, 196, 0.12);
}

.search-results__name {
  color: var(--text-main);
  font-weight: 600;
}

.search-results__meta {
  color: var(--text-soft);
  font-size: 0.9rem;
}

.search-results__badge {
  justify-self: start;
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: var(--accent-primary);
  background: rgba(56, 223, 248, 0.12);
  border-radius: 999px;
  padding: 0.24rem 0.55rem;
}
</style>
