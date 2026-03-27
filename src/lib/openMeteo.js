import { getWeatherLabel } from './weatherCodes.js'

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

function ensureOk(response, fallbackMessage) {
  if (!response.ok) {
    throw new Error(fallbackMessage)
  }
}

function normalizeCity(result) {
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

function roundTemperature(value) {
  if (typeof value !== 'number') {
    return null
  }

  return Math.round(value)
}

export async function searchCities(query) {
  const params = new URLSearchParams({
    name: query,
    count: '5',
    language: 'en',
    format: 'json',
  })

  const response = await fetch(`${GEOCODING_URL}?${params.toString()}`)
  ensureOk(response, 'Unable to search cities right now.')

  const payload = await response.json()

  return (payload.results ?? []).map(normalizeCity)
}

export async function fetchCityWeather(city) {
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

  const payload = await response.json()

  return {
    current: {
      temperature: roundTemperature(payload.current?.temperature_2m),
      weatherCode: payload.current?.weather_code ?? null,
      condition: getWeatherLabel(payload.current?.weather_code),
    },
    daily: (payload.daily?.time ?? []).map((date, index) => {
      const weatherCode = payload.daily?.weather_code?.[index] ?? null

      return {
        date,
        min: roundTemperature(payload.daily?.temperature_2m_min?.[index]),
        max: roundTemperature(payload.daily?.temperature_2m_max?.[index]),
        weatherCode,
        condition: getWeatherLabel(weatherCode),
      }
    }),
  }
}
