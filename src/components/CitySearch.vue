<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { searchCities } from '../lib/openMeteo'
import { getCityKey } from '../lib/storage'
import type { City } from '../lib/types'

interface Props {
  savedCityKeys?: string[]
  isLocating?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  savedCityKeys: () => [],
  isLocating: false,
})

const emit = defineEmits<{
  select: [city: City]
  locate: []
}>()

const query = ref('')
const results = ref<City[]>([])
const loading = ref(false)
const error = ref('')
const hasSearched = ref(false)
const activeIndex = ref(-1)
const searchRoot = ref<HTMLDivElement | null>(null)

let debounceId: ReturnType<typeof window.setTimeout> | undefined
let activeController: AbortController | null = null

const showResults = computed(
  () => loading.value || error.value || results.value.length > 0 || hasSearched.value,
)

function isSaved(city: City): boolean {
  return props.savedCityKeys.includes(getCityKey(city))
}

async function runSearch(rawQuery: string): Promise<void> {
  const trimmedQuery = rawQuery.trim()

  activeController?.abort()

  if (trimmedQuery.length < 2) {
    loading.value = false
    error.value = ''
    results.value = []
    hasSearched.value = false
    activeIndex.value = -1
    return
  }

  const controller = new AbortController()
  activeController = controller
  loading.value = true
  error.value = ''

  try {
    const nextResults = await searchCities(trimmedQuery, {
      signal: controller.signal,
    })

    if (activeController !== controller) {
      return
    }

    results.value = nextResults
    hasSearched.value = true
    activeIndex.value = nextResults.findIndex((city) => !isSaved(city))
  } catch (requestError: unknown) {
    if (
      activeController !== controller ||
      (requestError instanceof DOMException && requestError.name === 'AbortError')
    ) {
      return
    }

    error.value =
      requestError instanceof Error
        ? requestError.message
        : 'Unable to search cities.'
    results.value = []
    hasSearched.value = true
    activeIndex.value = -1
  } finally {
    if (activeController === controller) {
      loading.value = false
    }
  }
}

function scheduleSearch(value: string): void {
  window.clearTimeout(debounceId)
  debounceId = window.setTimeout(() => {
    void runSearch(value)
  }, 250)
}

function resetSearch(): void {
  query.value = ''
  results.value = []
  error.value = ''
  hasSearched.value = false
  activeIndex.value = -1
}

function selectCity(city: City): void {
  if (isSaved(city)) {
    return
  }

  emit('select', city)
  resetSearch()
}

function moveActiveIndex(direction: 1 | -1): void {
  const selectableIndexes = results.value.reduce<number[]>((indexes, city, index) => {
    if (!isSaved(city)) {
      indexes.push(index)
    }

    return indexes
  }, [])

  if (selectableIndexes.length === 0) {
    activeIndex.value = -1
    return
  }

  const currentPosition = selectableIndexes.indexOf(activeIndex.value)
  const nextPosition =
    currentPosition === -1
      ? 0
      : (currentPosition + direction + selectableIndexes.length) % selectableIndexes.length

  activeIndex.value = selectableIndexes[nextPosition]
}

function handleKeydown(event: KeyboardEvent): void {
  if (!showResults.value || results.value.length === 0) {
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActiveIndex(1)
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActiveIndex(-1)
  }

  if (event.key === 'Enter' && activeIndex.value >= 0) {
    event.preventDefault()
    const activeCity = results.value[activeIndex.value]

    if (activeCity) {
      selectCity(activeCity)
    }
  }

  if (event.key === 'Escape') {
    resetSearch()
  }
}

function handleDocumentClick(event: MouseEvent): void {
  if (!(event.target instanceof Node)) {
    return
  }

  if (!searchRoot.value?.contains(event.target)) {
    resetSearch()
  }
}

watch(query, (value) => {
  scheduleSearch(value)
})

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  activeController?.abort()
  window.clearTimeout(debounceId)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div
    ref="searchRoot"
    class="search-card"
  >
    <div class="search-card__topline">
      <label
        class="search-card__label"
        for="city-search"
      >
        Search for a city
      </label>

      <button
        class="search-card__location-button"
        type="button"
        :disabled="isLocating"
        @click="emit('locate')"
      >
        {{ isLocating ? 'Locating…' : 'Use current location' }}
      </button>
    </div>

    <div class="search-card__field">
      <span
        class="search-card__icon"
        aria-hidden="true"
      >
        ⌕
      </span>
      <input
        id="city-search"
        v-model="query"
        class="search-card__input"
        type="text"
        autocomplete="off"
        placeholder="Start typing a city name..."
        @keydown="handleKeydown"
      />
    </div>

    <p class="search-card__hint">Arrow keys navigate results. Enter adds the active city.</p>

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
          v-for="(city, index) in results"
          :key="getCityKey(city)"
        >
          <button
            class="search-results__item"
            :class="{ 'search-results__item--active': index === activeIndex }"
            type="button"
            :disabled="isSaved(city)"
            @mouseenter="activeIndex = isSaved(city) ? -1 : index"
            @click="selectCity(city)"
          >
            <span class="search-results__name">{{ city.name }}</span>
            <span class="search-results__meta">
              {{ city.admin1 ? `${city.admin1}, ` : '' }}{{ city.country }}
            </span>
            <span class="search-results__meta search-results__meta--soft">
              {{ city.timezone }}
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

.search-card__topline {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.search-card__label,
.search-card__hint {
  color: var(--text-soft);
}

.search-card__label {
  display: block;
  font-size: 0.92rem;
}

.search-card__location-button {
  border: 0;
  border-radius: 999px;
  padding: 0.68rem 0.9rem;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  cursor: pointer;
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
  border-radius: 1rem;
  padding: 1rem 1rem 1rem 2.7rem;
  background: rgba(5, 9, 16, 0.88);
  color: var(--text-main);
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-card__input::placeholder {
  color: var(--text-muted);
}

.search-card__input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 4px rgba(115, 190, 255, 0.12);
}

.search-card__hint {
  margin: 0.65rem 0 0;
  font-size: 0.85rem;
}

.search-results {
  position: absolute;
  top: calc(100% + 0.85rem);
  left: 0;
  right: 0;
  z-index: 20;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  background: rgba(10, 14, 23, 0.98);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.28);
}

.search-results__state {
  margin: 0;
  padding: 1rem;
  color: var(--text-soft);
}

.search-results__state--error {
  color: #ffc1c8;
}

.search-results__list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.search-results__item {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.15rem;
  padding: 0.95rem 1rem;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: transparent;
  color: var(--text-main);
  text-align: left;
  cursor: pointer;
}

.search-results__item--active,
.search-results__item:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: none;
}

.search-results__item:disabled {
  cursor: default;
  opacity: 0.65;
}

.search-results__name {
  font-weight: 700;
}

.search-results__meta {
  color: var(--text-soft);
  font-size: 0.9rem;
}

.search-results__meta--soft {
  color: var(--text-muted);
}

.search-results__badge {
  margin-top: 0.35rem;
  color: var(--accent-primary);
  font-size: 0.82rem;
  font-weight: 700;
}

@media (max-width: 640px) {
  .search-card__topline {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
