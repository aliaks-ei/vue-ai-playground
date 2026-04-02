import type { TemperatureUnit, WindSpeedUnit, WeatherSuccessState } from "./types"

export function formatTemperature(value: number | null | undefined, unit: TemperatureUnit): string {
  if (typeof value !== "number") {
    return "--"
  }

  return `${Math.round(value)}°${unit === "celsius" ? "C" : "F"}`
}

export function formatWindSpeed(value: number | null | undefined, unit: WindSpeedUnit): string {
  if (typeof value !== "number") {
    return "--"
  }

  return `${Math.round(value)} ${unit === "kmh" ? "km/h" : "mph"}`
}

export function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number") {
    return "--"
  }

  return `${Math.round(value)}%`
}

export function formatPrecipitation(value: number | null | undefined): string {
  if (typeof value !== "number") {
    return "--"
  }

  return `${value.toFixed(1)} mm`
}

export function formatRelativeTime(timestamp: number): string {
  const deltaMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000))

  if (deltaMinutes < 1) {
    return "just now"
  }

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`
  }

  const deltaHours = Math.round(deltaMinutes / 60)

  if (deltaHours < 24) {
    return `${deltaHours}h ago`
  }

  const deltaDays = Math.round(deltaHours / 24)
  return `${deltaDays}d ago`
}

export function formatDayDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateString}T12:00:00`))
}

export function formatClockTime(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString))
}

export function formatHourLabel(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
  }).format(new Date(dateString))
}

export function getWeatherSignal(weather: WeatherSuccessState): string[] {
  const signals: string[] = []
  const today = weather.daily[0]

  const strongWindThreshold = weather.units.windSpeed === "mph" ? 22 : 35
  if (
    typeof weather.current.windSpeed === "number" &&
    weather.current.windSpeed >= strongWindThreshold
  ) {
    signals.push("Strong wind")
  }

  if (
    typeof today?.precipitationProbabilityMax === "number" &&
    today.precipitationProbabilityMax >= 60
  ) {
    signals.push("High rain chance")
  }

  if (typeof today?.min === "number" && today.min <= 0) {
    signals.push("Freezing night")
  }

  if (signals.length === 0) {
    signals.push(weather.current.isDay ? "Daylight now" : "Night conditions")
  }

  return signals
}
