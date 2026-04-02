import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import CitySearch from "./CitySearch.vue"
import type { City } from "../lib/types"

vi.mock("../lib/openMeteo", () => ({
  searchCities: vi.fn(),
}))

import { searchCities } from "../lib/openMeteo"

function mockCity(overrides: Partial<City> = {}): City {
  return {
    id: 1,
    name: "Berlin",
    latitude: 52.52,
    longitude: 13.405,
    country: "Germany",
    admin1: "Berlin",
    timezone: "Europe/Berlin",
    ...overrides,
  }
}

describe("CitySearch", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("renders the search input", () => {
    const wrapper = mount(CitySearch)

    expect(wrapper.find('[data-test="search-input"]').exists()).toBe(true)
  })

  it("emits locate event when location button is clicked", async () => {
    const wrapper = mount(CitySearch)

    await wrapper.get('[data-test="locate-btn"]').trigger("click")

    expect(wrapper.emitted("locate")).toHaveLength(1)
  })

  it('shows "Locating…" text when isLocating is true', () => {
    const wrapper = mount(CitySearch, { props: { isLocating: true } })

    expect(wrapper.get('[data-test="locate-btn"]').text()).toBe("Locating…")
    expect(wrapper.get('[data-test="locate-btn"]').attributes("disabled")).toBeDefined()
  })

  it("debounces search input by 250ms", async () => {
    vi.mocked(searchCities).mockResolvedValue([mockCity()])
    const wrapper = mount(CitySearch)

    await wrapper.get('[data-test="search-input"]').setValue("Ber")

    expect(searchCities).not.toHaveBeenCalled()

    vi.advanceTimersByTime(250)
    await flushPromises()

    expect(searchCities).toHaveBeenCalledOnce()
  })

  it("does not search when query is less than 2 characters", async () => {
    vi.mocked(searchCities).mockResolvedValue([])
    const wrapper = mount(CitySearch)

    await wrapper.get('[data-test="search-input"]').setValue("B")
    vi.advanceTimersByTime(250)
    await flushPromises()

    expect(searchCities).not.toHaveBeenCalled()
  })

  it("shows search results after a successful search", async () => {
    const cities = [mockCity(), mockCity({ id: 2, name: "Bern", country: "Switzerland" })]
    vi.mocked(searchCities).mockResolvedValue(cities)
    const wrapper = mount(CitySearch)

    await wrapper.get('[data-test="search-input"]').setValue("Ber")
    vi.advanceTimersByTime(250)
    await flushPromises()

    const results = wrapper.findAll('[data-test="search-result"]')
    expect(results).toHaveLength(2)
    expect(results[0].text()).toContain("Berlin")
    expect(results[1].text()).toContain("Bern")
  })

  it('shows "No matching cities found." when search returns empty array', async () => {
    vi.mocked(searchCities).mockResolvedValue([])
    const wrapper = mount(CitySearch)

    await wrapper.get('[data-test="search-input"]').setValue("zzz")
    vi.advanceTimersByTime(250)
    await flushPromises()

    expect(wrapper.find('[data-test="search-empty"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="search-empty"]').text()).toBe("No matching cities found.")
  })

  it("shows error message when search fails", async () => {
    vi.mocked(searchCities).mockRejectedValue(new Error("Network error"))
    const wrapper = mount(CitySearch)

    await wrapper.get('[data-test="search-input"]').setValue("Ber")
    vi.advanceTimersByTime(250)
    await flushPromises()

    expect(wrapper.find('[data-test="search-error"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="search-error"]').text()).toBe("Network error")
  })

  it("emits select event when clicking an unsaved city result", async () => {
    const city = mockCity()
    vi.mocked(searchCities).mockResolvedValue([city])
    const wrapper = mount(CitySearch)

    await wrapper.get('[data-test="search-input"]').setValue("Ber")
    vi.advanceTimersByTime(250)
    await flushPromises()

    await wrapper.get('[data-test="search-result"]').trigger("click")

    expect(wrapper.emitted("select")).toHaveLength(1)
    expect(wrapper.emitted("select")![0]).toEqual([city])
  })

  it("disables result button for already saved cities", async () => {
    const city = mockCity()
    vi.mocked(searchCities).mockResolvedValue([city])
    const wrapper = mount(CitySearch, {
      props: { savedCityKeys: ["1"] },
    })

    await wrapper.get('[data-test="search-input"]').setValue("Ber")
    vi.advanceTimersByTime(250)
    await flushPromises()

    const resultBtn = wrapper.get('[data-test="search-result"]')
    expect(resultBtn.attributes("disabled")).toBeDefined()
    expect(wrapper.find('[data-test="saved-badge"]').exists()).toBe(true)
  })

  it("does not emit select when clicking a saved city", async () => {
    const city = mockCity()
    vi.mocked(searchCities).mockResolvedValue([city])
    const wrapper = mount(CitySearch, {
      props: { savedCityKeys: ["1"] },
    })

    await wrapper.get('[data-test="search-input"]').setValue("Ber")
    vi.advanceTimersByTime(250)
    await flushPromises()

    await wrapper.get('[data-test="search-result"]').trigger("click")

    expect(wrapper.emitted("select")).toBeUndefined()
  })

  it("resets search results after selecting a city", async () => {
    const city = mockCity()
    vi.mocked(searchCities).mockResolvedValue([city])
    const wrapper = mount(CitySearch)

    await wrapper.get('[data-test="search-input"]').setValue("Ber")
    vi.advanceTimersByTime(250)
    await flushPromises()

    await wrapper.get('[data-test="search-result"]').trigger("click")
    await flushPromises()

    expect(wrapper.find('[data-test="search-result"]').exists()).toBe(false)
  })

  it("selects active city with Enter key", async () => {
    const city = mockCity()
    vi.mocked(searchCities).mockResolvedValue([city])
    const wrapper = mount(CitySearch)

    await wrapper.get('[data-test="search-input"]').setValue("Ber")
    vi.advanceTimersByTime(250)
    await flushPromises()

    await wrapper.get('[data-test="search-input"]').trigger("keydown", { key: "Enter" })

    expect(wrapper.emitted("select")).toHaveLength(1)
  })

  it("clears results with Escape key", async () => {
    vi.mocked(searchCities).mockResolvedValue([mockCity()])
    const wrapper = mount(CitySearch)

    await wrapper.get('[data-test="search-input"]').setValue("Ber")
    vi.advanceTimersByTime(250)
    await flushPromises()

    expect(wrapper.find('[data-test="search-result"]').exists()).toBe(true)

    await wrapper.get('[data-test="search-input"]').trigger("keydown", { key: "Escape" })
    await flushPromises()

    expect(wrapper.find('[data-test="search-result"]').exists()).toBe(false)
  })
})
