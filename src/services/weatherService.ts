import { getCache, setCache, isCacheExpired } from "@/lib/cache";
import { requestJson } from "@/services/apiClient";
import { logger } from "@/lib/logger";

const CACHE_TTL_MINUTES = 120; // 2 horas

export interface WeatherDay {
  date: string;
  dateFormatted: string;
  dayName: string;
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
}

export interface WeatherCurrent {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  isDay: boolean;
  lastUpdated: string;
}

export interface WeatherData {
  location: string;
  current?: WeatherCurrent;
  days: WeatherDay[];
  lastUpdated: string;
}

function getCacheKeyForCity(slug: string): string {
  return `weather_${slug}`;
}

function normalizeCurrent(raw: any): WeatherCurrent | undefined {
  if (!raw) return undefined;
  return {
    temperature: raw.temperature ?? 0,
    apparentTemperature: raw.apparentTemperature ?? 0,
    humidity: raw.humidity ?? 0,
    windSpeed: raw.windSpeed ?? 0,
    weatherCode: raw.weatherCode ?? 0,
    weatherDescription: raw.weatherDescription ?? "Desconhecido",
    weatherIcon: raw.weatherIcon ?? "❓",
    isDay: raw.isDay ?? true,
    lastUpdated: raw.lastUpdated ?? new Date().toISOString(),
  };
}

export async function fetchWeatherBySlug(slug: string): Promise<WeatherData> {
  const cacheKey = getCacheKeyForCity(slug);

  try {
    const weatherData = await requestJson<WeatherData>(
      slug,
      "/clima",
      { method: "GET" },
      "fetchWeatherBySlug",
    );

    // Normalize response - ensure we have the right structure
    const normalizedData: WeatherData = {
      location: weatherData.location || "Localização desconhecida",
      current: normalizeCurrent((weatherData as any).current),
      days: (weatherData.days || []).map((day: any) => ({
        date: day.date || "",
        dateFormatted: day.dateFormatted || "",
        dayName: day.dayName || "",
        temperatureMax: day.temperatureMax || 0,
        temperatureMin: day.temperatureMin || 0,
        weatherCode: day.weatherCode || 0,
        weatherDescription: day.weatherDescription || "Desconhecido",
        weatherIcon: day.weatherIcon || "❓",
      })),
      lastUpdated: weatherData.lastUpdated || new Date().toISOString(),
    };

    // Salva no cache apenas se tiver dados válidos
    if (normalizedData.days.length > 0) {
      setCache(cacheKey, normalizedData, CACHE_TTL_MINUTES);
    }

    return normalizedData;
  } catch (error) {
    // Se falhar, tenta retornar do cache mesmo expirado
    const cached = getCache<WeatherData>(cacheKey);
    if (cached) {
      logger.warn(`Usando cache expirado para ${slug}:`, error);
      return cached;
    }

    throw error;
  }
}

export function getCachedWeather(slug: string): WeatherData | null {
  return getCache<WeatherData>(getCacheKeyForCity(slug));
}

export function isWeatherCacheExpired(slug: string): boolean {
  return isCacheExpired(getCacheKeyForCity(slug));
}
