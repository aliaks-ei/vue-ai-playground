export interface City {
  id: string | number | null
  name: string
  country: string
  admin1: string
  latitude: number
  longitude: number
  timezone: string
}

export type WeatherStatus = "idle" | "loading" | "success" | "error"
export type TemperatureUnit = "celsius" | "fahrenheit"
export type WindSpeedUnit = "kmh" | "mph"
export type SortMode =
  | "saved"
  | "alphabetical"
  | "temperature-desc"
  | "temperature-asc"
  | "updated-desc"

export interface WeatherUnits {
  temperature: TemperatureUnit
  windSpeed: WindSpeedUnit
}

export interface DashboardPreferences {
  temperatureUnit: TemperatureUnit
  windSpeedUnit: WindSpeedUnit
  sortMode: SortMode
  pinnedCityKey: string | null
}

export interface CurrentWeather {
  temperature: number | null
  apparentTemperature: number | null
  weatherCode: number | null
  condition: string
  windSpeed: number | null
  humidity: number | null
  precipitation: number | null
  isDay: boolean | null
}

export interface ForecastDay {
  date: string
  min: number | null
  max: number | null
  weatherCode: number | null
  condition: string
  sunrise: string | null
  sunset: string | null
  precipitationProbabilityMax: number | null
}

export interface HourlyForecastPoint {
  time: string
  temperature: number | null
  weatherCode: number | null
  condition: string
  precipitationProbability: number | null
}

export interface WeatherIdleState {
  status: "idle"
}

export interface WeatherLoadingState {
  status: "loading"
}

export interface WeatherErrorState {
  status: "error"
  error: string
}

export interface WeatherSuccessState {
  status: "success"
  current: CurrentWeather
  daily: ForecastDay[]
  hourly: HourlyForecastPoint[]
  lastUpdated: number
  source: "fresh" | "cached"
  units: WeatherUnits
  isRefreshing?: boolean
  warning?: string
}

export interface StoredWeatherRecord {
  current: CurrentWeather
  daily: ForecastDay[]
  hourly: HourlyForecastPoint[]
  lastUpdated: number
  source: "fresh" | "cached"
  units: WeatherUnits
}

export type WeatherEntry =
  | WeatherIdleState
  | WeatherLoadingState
  | WeatherErrorState
  | WeatherSuccessState
