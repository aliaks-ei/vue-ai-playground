import { describe, it, expect, vi, afterEach } from "vitest"
import { mount } from "@vue/test-utils"
import CityDetailsDrawer from "./CityDetailsDrawer.vue"
import type { City, WeatherEntry, WeatherSuccessState } from "../lib/types"

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

function mockSuccessWeather(overrides: Partial<WeatherSuccessState> = {}): WeatherSuccessState {
  return {
    status: "success",
    current: {
      temperature: 22,
      apparentTemperature: 20,
      weatherCode: 0,
      condition: "Clear Sky",
      windSpeed: 12,
      humidity: 55,
      precipitation: 1.2,
      isDay: true,
    },
    daily: [
      {
        date: "2026-03-30",
        min: 10,
        max: 23,
        weatherCode: 0,
        condition: "Clear Sky",
        sunrise: "2026-03-30T06:30",
        sunset: "2026-03-30T19:45",
        precipitationProbabilityMax: 15,
      },
      {
        date: "2026-03-31",
        min: 8,
        max: 20,
        weatherCode: 2,
        condition: "Partly Cloudy",
        sunrise: "2026-03-31T06:28",
        sunset: "2026-03-31T19:47",
        precipitationProbabilityMax: 30,
      },
    ],
    hourly: [
      {
        time: "2026-03-30T14:00",
        temperature: 22,
        weatherCode: 0,
        condition: "Clear Sky",
        precipitationProbability: 5,
      },
    ],
    lastUpdated: Date.now(),
    source: "fresh",
    units: { temperature: "celsius", windSpeed: "kmh" },
    ...overrides,
  }
}

const defaultProps = {
  open: true,
  city: mockCity(),
  weather: mockSuccessWeather(),
  temperatureUnit: "celsius" as const,
  windSpeedUnit: "kmh" as const,
}

const globalStubs = {
  global: {
    stubs: {
      Teleport: true,
    },
  },
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("CityDetailsDrawer", () => {
  it("does not render drawer panel when open is false", () => {
    const wrapper = mount(CityDetailsDrawer, {
      props: { ...defaultProps, open: false },
      ...globalStubs,
    })

    expect(wrapper.find('[data-test="drawer-panel"]').exists()).toBe(false)
  })

  it("renders drawer panel when open is true", () => {
    const wrapper = mount(CityDetailsDrawer, { props: defaultProps, ...globalStubs })

    expect(wrapper.find('[data-test="drawer-panel"]').exists()).toBe(true)
  })

  it("shows city name in the header", () => {
    const wrapper = mount(CityDetailsDrawer, { props: defaultProps, ...globalStubs })

    expect(wrapper.get('[data-test="drawer-city-name"]').text()).toBe("Berlin")
  })

  it("shows loading state when weather status is loading", () => {
    const weather: WeatherEntry = { status: "loading" }
    const wrapper = mount(CityDetailsDrawer, {
      props: { ...defaultProps, weather },
      ...globalStubs,
    })

    expect(wrapper.find('[data-test="drawer-loading"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="drawer-loading"]').text()).toBe("Loading forecast...")
  })

  it("shows loading state when weather status is idle", () => {
    const weather: WeatherEntry = { status: "idle" }
    const wrapper = mount(CityDetailsDrawer, {
      props: { ...defaultProps, weather },
      ...globalStubs,
    })

    expect(wrapper.find('[data-test="drawer-loading"]').exists()).toBe(true)
  })

  it("shows error state with error message", () => {
    const weather: WeatherEntry = { status: "error", error: "API timeout" }
    const wrapper = mount(CityDetailsDrawer, {
      props: { ...defaultProps, weather },
      ...globalStubs,
    })

    expect(wrapper.find('[data-test="drawer-error"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="drawer-error"]').text()).toContain("API timeout")
  })

  it("shows retry button in error state", () => {
    const weather: WeatherEntry = { status: "error", error: "Fail" }
    const wrapper = mount(CityDetailsDrawer, {
      props: { ...defaultProps, weather },
      ...globalStubs,
    })

    expect(wrapper.find('[data-test="drawer-retry-btn"]').exists()).toBe(true)
  })

  it("emits retry when retry button is clicked", async () => {
    const weather: WeatherEntry = { status: "error", error: "Fail" }
    const wrapper = mount(CityDetailsDrawer, {
      props: { ...defaultProps, weather },
      ...globalStubs,
    })

    await wrapper.get('[data-test="drawer-retry-btn"]').trigger("click")

    expect(wrapper.emitted("retry")).toHaveLength(1)
  })

  it("emits close when close button is clicked", async () => {
    const wrapper = mount(CityDetailsDrawer, { props: defaultProps, ...globalStubs })

    await wrapper.get('[data-test="close-btn"]').trigger("click")

    expect(wrapper.emitted("close")).toHaveLength(1)
  })

  it("shows weather content when weather is success", () => {
    const wrapper = mount(CityDetailsDrawer, { props: defaultProps, ...globalStubs })

    expect(wrapper.find('[data-test="drawer-content"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="drawer-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="drawer-error"]').exists()).toBe(false)
  })

  it("displays current temperature and condition", () => {
    const wrapper = mount(CityDetailsDrawer, { props: defaultProps, ...globalStubs })

    const text = wrapper.get('[data-test="drawer-content"]').text()
    expect(text).toContain("22°C")
    expect(text).toContain("Clear Sky")
  })

  it("displays weather metrics (feels like, wind, humidity, precipitation)", () => {
    const wrapper = mount(CityDetailsDrawer, { props: defaultProps, ...globalStubs })

    const text = wrapper.get('[data-test="drawer-content"]').text()
    expect(text).toContain("20°C")
    expect(text).toContain("12 km/h")
    expect(text).toContain("55%")
    expect(text).toContain("1.2 mm")
  })

  it("renders forecast day entries", () => {
    const wrapper = mount(CityDetailsDrawer, { props: defaultProps, ...globalStubs })

    const days = wrapper.findAll('[data-test="forecast-day"]')
    expect(days).toHaveLength(2)
  })

  it('shows "Live sync" label when source is fresh', () => {
    const wrapper = mount(CityDetailsDrawer, { props: defaultProps, ...globalStubs })

    expect(wrapper.text()).toContain("Live sync")
  })

  it('shows "Cache hydrate" label when source is cached', () => {
    const weather = mockSuccessWeather({ source: "cached" })
    const wrapper = mount(CityDetailsDrawer, {
      props: { ...defaultProps, weather },
      ...globalStubs,
    })

    expect(wrapper.text()).toContain("Cache hydrate")
  })

  it("formats temperature in fahrenheit when unit is fahrenheit", () => {
    const wrapper = mount(CityDetailsDrawer, {
      props: { ...defaultProps, temperatureUnit: "fahrenheit" },
      ...globalStubs,
    })

    expect(wrapper.text()).toContain("22°F")
  })

  it("emits close when Escape key is pressed", async () => {
    const wrapper = mount(CityDetailsDrawer, { props: defaultProps, ...globalStubs })

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted("close")).toHaveLength(1)
  })
})
