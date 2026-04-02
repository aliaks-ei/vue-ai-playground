import { ref } from "vue"
import { loadRecentSearches, saveRecentSearches } from "../lib/storage"
import type { City } from "../lib/types"

export function useRecentSearches() {
  const recentSearches = ref<City[]>(loadRecentSearches())

  function addRecentSearch(city: City): void {
    const filtered = recentSearches.value.filter((c) => c.id !== city.id || c.name !== city.name)
    recentSearches.value = [city, ...filtered]
    saveRecentSearches(recentSearches.value)
  }

  function clearRecentSearches(): void {
    recentSearches.value = []
    saveRecentSearches([])
  }

  return { recentSearches, addRecentSearch, clearRecentSearches }
}
