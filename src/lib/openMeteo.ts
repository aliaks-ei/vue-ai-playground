import type { City, CurrentWeather, ForecastDay, WeatherSuccessState } from './types'
import { getWeatherLabel } from './weatherCodes'

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

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
    weather_code?: number
  }
  daily?: {
    time?: string[]
    weather_code?: Array<number | undefined>
    temperature_2m_max?: Array<number | undefined>
    temperature_2m_min?: Array<number | undefined>
  }
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
    admin1: result.admin1 || '',
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone,
  }
}

function roundTemperature(value: number | undefined): number | null {
  if (typeof value !== 'number') {
    return null
  }

  return Math.round(value)
}

function buildCurrentWeather(payload: ForecastPayload): CurrentWeather {
  return {
    temperature: roundTemperature(payload.current?.temperature_2m),
    weatherCode: payload.current?.weather_code ?? null,
    condition: getWeatherLabel(payload.current?.weather_code),
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
    }
  })
}

export async function searchCities(query: string): Promise<City[]> {
  const params = new URLSearchParams({
    name: query,
    count: '5',
    language: 'en',
    format: 'json',
  })

  const response = await fetch(`${GEOCODING_URL}?${params.toString()}`)
  ensureOk(response, 'Unable to search cities right now.')

  const payload = (await response.json()) as GeocodingPayload

  return (payload.results ?? []).map(normalizeCity)
}

export async function fetchCityWeather(city: City): Promise<Omit<WeatherSuccessState, 'status'>> {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: 'temperature_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    forecast_days: '5',
    temperature_unit: 'celsius',
    timezone: 'auto',
  })

  const response = await fetch(`${FORECAST_URL}?${params.toString()}`)
  ensureOk(response, `Unable to load weather for ${city.name}.`)

  const payload = (await response.json()) as ForecastPayload

  return {
    current: buildCurrentWeather(payload),
    daily: buildForecast(payload),
  }
}
