import type {
  City,
  CurrentWeather,
  ForecastDay,
  HourlyForecastPoint,
  TemperatureUnit,
  WeatherSuccessState,
  WindSpeedUnit,
} from "./types"
import { getWeatherLabel } from "./weatherCodes"

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
const REVERSE_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/reverse"
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

interface GeocodingResult {
  id?: string | number
  name: string
  country: string
  admin1?: string
  latitude: number
  longitude: number
  timezone: string
}

interface GeocodingPayload {
  results?: GeocodingResult[]
}

interface ForecastPayload {
  current?: {
    temperature_2m?: number
    apparent_temperature?: number
    weather_code?: number
    relative_humidity_2m?: number
    wind_speed_10m?: number
    precipitation?: number
    is_day?: number
  }
  hourly?: {
    time?: string[]
    temperature_2m?: Array<number | undefined>
    weather_code?: Array<number | undefined>
    precipitation_probability?: Array<number | undefined>
  }
  daily?: {
    time?: string[]
    weather_code?: Array<number | undefined>
    temperature_2m_max?: Array<number | undefined>
    temperature_2m_min?: Array<number | undefined>
    sunrise?: Array<string | undefined>
    sunset?: Array<string | undefined>
    precipitation_probability_max?: Array<number | undefined>
  }
}

interface SearchOptions {
  signal?: AbortSignal
}

interface WeatherRequestOptions {
  signal?: AbortSignal
  temperatureUnit: TemperatureUnit
  windSpeedUnit: WindSpeedUnit
}

function ensureOk(response: Response, fallbackMessage: string): void {
  if (!response.ok) {
    throw new Error(fallbackMessage)
  }
}

function normalizeCity(result: GeocodingResult): City {
  return {
    id: result.id ?? `${result.name}-${result.latitude}-${result.longitude}`,
    name: result.name,
    country: result.country,
    admin1: result.admin1 || "",
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone,
  }
}

function roundTemperature(value: number | undefined): number | null {
  if (typeof value !== "number") {
    return null
  }

  return Math.round(value)
}

function roundMetric(value: number | undefined): number | null {
  if (typeof value !== "number") {
    return null
  }

  return Math.round(value * 10) / 10
}

function buildCurrentWeather(payload: ForecastPayload): CurrentWeather {
  return {
    temperature: roundTemperature(payload.current?.temperature_2m),
    apparentTemperature: roundTemperature(payload.current?.apparent_temperature),
    weatherCode: payload.current?.weather_code ?? null,
    condition: getWeatherLabel(payload.current?.weather_code),
    windSpeed: roundMetric(payload.current?.wind_speed_10m),
    humidity: roundMetric(payload.current?.relative_humidity_2m),
    precipitation: roundMetric(payload.current?.precipitation),
    isDay: typeof payload.current?.is_day === "number" ? payload.current.is_day === 1 : null,
  }
}

function buildForecast(payload: ForecastPayload): ForecastDay[] {
  return (payload.daily?.time ?? []).map((date, index) => {
    const weatherCode = payload.daily?.weather_code?.[index] ?? null

    return {
      date,
      min: roundTemperature(payload.daily?.temperature_2m_min?.[index]),
      max: roundTemperature(payload.daily?.temperature_2m_max?.[index]),
      weatherCode,
      condition: getWeatherLabel(weatherCode),
      sunrise: payload.daily?.sunrise?.[index] ?? null,
      sunset: payload.daily?.sunset?.[index] ?? null,
      precipitationProbabilityMax: roundMetric(
        payload.daily?.precipitation_probability_max?.[index],
      ),
    }
  })
}

function buildHourlyForecast(payload: ForecastPayload): HourlyForecastPoint[] {
  return (payload.hourly?.time ?? []).slice(0, 12).map((time, index) => {
    const weatherCode = payload.hourly?.weather_code?.[index] ?? null

    return {
      time,
      temperature: roundTemperature(payload.hourly?.temperature_2m?.[index]),
      weatherCode,
      condition: getWeatherLabel(weatherCode),
      precipitationProbability: roundMetric(payload.hourly?.precipitation_probability?.[index]),
    }
  })
}

export async function searchCities(query: string, options: SearchOptions = {}): Promise<City[]> {
  const params = new URLSearchParams({
    name: query,
    count: "5",
    language: "en",
    format: "json",
  })

  const response = await fetch(`${GEOCODING_URL}?${params.toString()}`, {
    signal: options.signal,
  })
  ensureOk(response, "Unable to search cities right now.")

  const payload = (await response.json()) as GeocodingPayload

  return (payload.results ?? []).map(normalizeCity)
}

export async function reverseGeocodeCity(
  latitude: number,
  longitude: number,
  options: SearchOptions = {},
): Promise<City | null> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    language: "en",
    format: "json",
    count: "1",
  })

  const response = await fetch(`${REVERSE_GEOCODING_URL}?${params.toString()}`, {
    signal: options.signal,
  })
  ensureOk(response, "Unable to determine your current city.")

  const payload = (await response.json()) as GeocodingPayload
  const firstResult = payload.results?.[0]

  return firstResult ? normalizeCity(firstResult) : null
}

export async function fetchCityWeather(
  city: City,
  options: WeatherRequestOptions,
): Promise<
  Omit<WeatherSuccessState, "status" | "lastUpdated" | "source" | "isRefreshing" | "warning">
> {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code,is_day",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max",
    hourly: "temperature_2m,weather_code,precipitation_probability",
    forecast_days: "7",
    temperature_unit: options.temperatureUnit,
    wind_speed_unit: options.windSpeedUnit,
    timezone: "auto",
  })

  const response = await fetch(`${FORECAST_URL}?${params.toString()}`, {
    signal: options.signal,
  })
  ensureOk(response, `Unable to load weather for ${city.name}.`)

  const payload = (await response.json()) as ForecastPayload

  return {
    current: buildCurrentWeather(payload),
    daily: buildForecast(payload),
    hourly: buildHourlyForecast(payload),
    units: {
      temperature: options.temperatureUnit,
      windSpeed: options.windSpeedUnit,
    },
  }
}
