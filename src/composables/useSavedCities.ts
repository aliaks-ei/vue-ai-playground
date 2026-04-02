import { computed, ref } from "vue"
import { getCityKey, loadSavedCities, saveCities } from "../lib/storage"
import type { City } from "../lib/types"

export function useSavedCities() {
  const savedCities = ref<City[]>([])

  const savedCityKeys = computed(() => savedCities.value.map((city) => getCityKey(city)))

  function hasSavedCity(cityKey: string): boolean {
    return savedCities.value.some((city) => getCityKey(city) === cityKey)
  }

  function addCityToList(city: City): void {
    savedCities.value = [city, ...savedCities.value]
    saveCities(savedCities.value)
  }

  function removeCityFromList(cityKey: string): void {
    savedCities.value = savedCities.value.filter((city) => getCityKey(city) !== cityKey)
    saveCities(savedCities.value)
  }

  function restoreFromStorage(): City[] {
    savedCities.value = loadSavedCities()
    return savedCities.value
  }

  return {
    savedCities,
    savedCityKeys,
    hasSavedCity,
    addCityToList,
    removeCityFromList,
    restoreFromStorage,
  }
}
