export interface City {
  id: string | number | null
  name: string
  country: string
  admin1: string
  latitude: number
  longitude: number
  timezone: string
}

export type WeatherStatus = 'idle' | 'loading' | 'success' | 'error'

export interface CurrentWeather {
  temperature: number | null
  weatherCode: number | null
  condition: string
}

export interface ForecastDay {
  date: string
  min: number | null
  max: number | null
  weatherCode: number | null
  condition: string
}

export interface WeatherIdleState {
  status: 'idle'
}

export interface WeatherLoadingState {
  status: 'loading'
}

export interface WeatherErrorState {
  status: 'error'
  error: string
}

export interface WeatherSuccessState {
  status: 'success'
  current: CurrentWeather
  daily: ForecastDay[]
}

export type WeatherEntry =
  | WeatherIdleState
  | WeatherLoadingState
  | WeatherErrorState
  | WeatherSuccessState
