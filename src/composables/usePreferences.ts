import { ref } from "vue"
import {
  defaultDashboardPreferences,
  getCityKey,
  loadDashboardPreferences,
  saveDashboardPreferences,
} from "../lib/storage"
import type { City, DashboardPreferences, SortMode } from "../lib/types"

export function usePreferences() {
  const preferences = ref<DashboardPreferences>({ ...defaultDashboardPreferences })

  function updatePreferences(nextPreferences: Partial<DashboardPreferences>): void {
    preferences.value = { ...preferences.value, ...nextPreferences }
    saveDashboardPreferences(preferences.value)
  }

  function loadPreferences(): void {
    preferences.value = loadDashboardPreferences()
  }

  function setSortMode(sortMode: SortMode): void {
    updatePreferences({ sortMode })
  }

  function togglePinnedCity(city: City): void {
    const cityKey = getCityKey(city)
    updatePreferences({
      pinnedCityKey: preferences.value.pinnedCityKey === cityKey ? null : cityKey,
    })
  }

  return { preferences, updatePreferences, loadPreferences, setSortMode, togglePinnedCity }
}
