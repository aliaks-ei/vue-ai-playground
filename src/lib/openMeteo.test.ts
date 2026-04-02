import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { City } from "./types"
import { fetchCityWeather, reverseGeocodeCity, searchCities } from "./openMeteo"

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

function mockFetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  })
}

function mockFetchNotOk(status = 500) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  })
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("searchCities", () => {
  it("calls the geocoding API with the correct URL params", async () => {
    globalThis.fetch = mockFetchOk({ results: [] }) as typeof fetch

    await searchCities("Berlin")

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    const [calledUrl] = fetchMock.mock.calls[0] as [string]
    const url = new URL(calledUrl)

    expect(url.origin + url.pathname).toBe("https://geocoding-api.open-meteo.com/v1/search")
    expect(url.searchParams.get("name")).toBe("Berlin")
    expect(url.searchParams.get("count")).toBe("5")
    expect(url.searchParams.get("language")).toBe("en")
    expect(url.searchParams.get("format")).toBe("json")
  })

  it("returns normalized city objects from the results array", async () => {
    const raw = {
      id: 2950159,
      name: "Berlin",
      country: "Germany",
      admin1: "Berlin",
      latitude: 52.52437,
      longitude: 13.41053,
      timezone: "Europe/Berlin",
    }
    globalThis.fetch = mockFetchOk({ results: [raw] }) as typeof fetch

    const cities = await searchCities("Berlin")

    expect(cities).toEqual([
      {
        id: raw.id,
        name: raw.name,
        country: raw.country,
        admin1: raw.admin1,
        latitude: raw.latitude,
        longitude: raw.longitude,
        timezone: raw.timezone,
      },
    ])
  })

  it.each([
    { payload: {}, description: "payload has no results key" },
    { payload: { results: [] }, description: "results is an empty array" },
  ])("returns an empty array when $description", async ({ payload }) => {
    globalThis.fetch = mockFetchOk(payload) as typeof fetch

    const cities = await searchCities("test")

    expect(cities).toEqual([])
  })

  it("throws when the response is not ok", async () => {
    globalThis.fetch = mockFetchNotOk(503) as typeof fetch

    await expect(searchCities("Berlin")).rejects.toThrow("Unable to search cities right now.")
  })
})

describe("reverseGeocodeCity", () => {
  it("calls the reverse geocoding API and returns the first normalized result", async () => {
    globalThis.fetch = mockFetchOk({
      results: [
        {
          name: "Berlin",
          country: "Germany",
          admin1: "Berlin",
          latitude: 52.52,
          longitude: 13.405,
          timezone: "Europe/Berlin",
        },
      ],
    }) as typeof fetch

    const city = await reverseGeocodeCity(52.52, 13.405)

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    const [calledUrl] = fetchMock.mock.calls[0] as [string]
    const url = new URL(calledUrl)

    expect(url.origin + url.pathname).toBe("https://geocoding-api.open-meteo.com/v1/reverse")
    expect(url.searchParams.get("latitude")).toBe("52.52")
    expect(url.searchParams.get("longitude")).toBe("13.405")
    expect(city?.name).toBe("Berlin")
  })

  it("returns null when the reverse geocoding payload is empty", async () => {
    globalThis.fetch = mockFetchOk({ results: [] }) as typeof fetch

    await expect(reverseGeocodeCity(0, 0)).resolves.toBeNull()
  })
})

describe("fetchCityWeather", () => {
  const city = mockCity()

  const validPayload = {
    current: {
      temperature_2m: 15.7,
      apparent_temperature: 13.8,
      weather_code: 1,
      relative_humidity_2m: 56,
      wind_speed_10m: 19.3,
      precipitation: 0.4,
      is_day: 1,
    },
    hourly: {
      time: ["2024-01-01T10:00", "2024-01-01T11:00"],
      temperature_2m: [16.1, 17.8],
      weather_code: [1, 2],
      precipitation_probability: [10, 25],
    },
    daily: {
      time: ["2024-01-01", "2024-01-02"],
      weather_code: [1, 3],
      temperature_2m_max: [18.0, 12.5],
      temperature_2m_min: [10.0, 8.3],
      sunrise: ["2024-01-01T08:05", "2024-01-02T08:04"],
      sunset: ["2024-01-01T16:14", "2024-01-02T16:15"],
      precipitation_probability_max: [15, 75],
    },
  }

  it("calls the forecast API with the correct URL params", async () => {
    globalThis.fetch = mockFetchOk(validPayload) as typeof fetch

    await fetchCityWeather(city, {
      temperatureUnit: "celsius",
      windSpeedUnit: "kmh",
    })

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    const [calledUrl] = fetchMock.mock.calls[0] as [string]
    const url = new URL(calledUrl)

    expect(url.origin + url.pathname).toBe("https://api.open-meteo.com/v1/forecast")
    expect(url.searchParams.get("latitude")).toBe(String(city.latitude))
    expect(url.searchParams.get("longitude")).toBe(String(city.longitude))
    expect(url.searchParams.get("current")).toContain("apparent_temperature")
    expect(url.searchParams.get("daily")).toContain("precipitation_probability_max")
    expect(url.searchParams.get("hourly")).toBe(
      "temperature_2m,weather_code,precipitation_probability",
    )
    expect(url.searchParams.get("forecast_days")).toBe("7")
    expect(url.searchParams.get("temperature_unit")).toBe("celsius")
    expect(url.searchParams.get("wind_speed_unit")).toBe("kmh")
    expect(url.searchParams.get("timezone")).toBe("auto")
  })

  it("returns a normalized weather shape with current, hourly, daily, and units", async () => {
    globalThis.fetch = mockFetchOk(validPayload) as typeof fetch

    const weather = await fetchCityWeather(city, {
      temperatureUnit: "fahrenheit",
      windSpeedUnit: "mph",
    })

    expect(weather).toMatchObject({
      current: {
        temperature: 16,
        apparentTemperature: 14,
        weatherCode: 1,
        condition: "Mainly clear",
        humidity: 56,
        windSpeed: 19.3,
        precipitation: 0.4,
        isDay: true,
      },
      units: {
        temperature: "fahrenheit",
        windSpeed: "mph",
      },
    })
    expect(weather.daily).toHaveLength(2)
    expect(weather.hourly).toHaveLength(2)
  })

  it("maps each daily entry to the correct shape", async () => {
    globalThis.fetch = mockFetchOk(validPayload) as typeof fetch

    const { daily } = await fetchCityWeather(city, {
      temperatureUnit: "celsius",
      windSpeedUnit: "kmh",
    })

    expect(daily[0]).toEqual({
      date: "2024-01-01",
      min: 10,
      max: 18,
      weatherCode: 1,
      condition: "Mainly clear",
      sunrise: "2024-01-01T08:05",
      sunset: "2024-01-01T16:14",
      precipitationProbabilityMax: 15,
    })
  })

  it("maps the next hourly entries to the correct shape", async () => {
    globalThis.fetch = mockFetchOk(validPayload) as typeof fetch

    const { hourly } = await fetchCityWeather(city, {
      temperatureUnit: "celsius",
      windSpeedUnit: "kmh",
    })

    expect(hourly[1]).toEqual({
      time: "2024-01-01T11:00",
      temperature: 18,
      weatherCode: 2,
      condition: "Partly cloudy",
      precipitationProbability: 25,
    })
  })

  it("returns null numeric fields when the payload omits or invalidates them", async () => {
    globalThis.fetch = mockFetchOk({
      current: {
        temperature_2m: "n/a",
        apparent_temperature: undefined,
        weather_code: 0,
        relative_humidity_2m: undefined,
        wind_speed_10m: undefined,
        precipitation: undefined,
      },
      hourly: {
        time: ["2024-01-01T10:00"],
        temperature_2m: [undefined],
        weather_code: [0],
        precipitation_probability: [undefined],
      },
      daily: {
        time: ["2024-01-01"],
        weather_code: [0],
        temperature_2m_max: [null],
        temperature_2m_min: [undefined],
        sunrise: [undefined],
        sunset: [undefined],
        precipitation_probability_max: [undefined],
      },
    }) as typeof fetch

    const weather = await fetchCityWeather(city, {
      temperatureUnit: "celsius",
      windSpeedUnit: "kmh",
    })

    expect(weather.current.temperature).toBeNull()
    expect(weather.current.apparentTemperature).toBeNull()
    expect(weather.current.windSpeed).toBeNull()
    expect(weather.hourly[0].temperature).toBeNull()
    expect(weather.daily[0].max).toBeNull()
    expect(weather.daily[0].sunrise).toBeNull()
    expect(weather.daily[0].precipitationProbabilityMax).toBeNull()
  })

  it("throws when the response is not ok", async () => {
    globalThis.fetch = mockFetchNotOk(500) as typeof fetch

    await expect(
      fetchCityWeather(city, {
        temperatureUnit: "celsius",
        windSpeedUnit: "kmh",
      }),
    ).rejects.toThrow("Unable to load weather for Berlin.")
  })
})
