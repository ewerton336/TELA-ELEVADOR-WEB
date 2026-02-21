import { getCache, setCache, isCacheExpired } from "@/lib/cache";
import { requestJson } from "@/services/apiClient";

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

export interface WeatherData {
  location: string;
  days: WeatherDay[];
  lastUpdated: string;
}

function getCacheKeyForCity(slug: string): string {
  return `weather_${slug}`;
}

export async function fetchWeatherBySlug(slug: string): Promise<WeatherData> {
  const cacheKey = getCacheKeyForCity(slug);

  // Verifica cache primeiro
  if (!isCacheExpired(cacheKey)) {
    const cached = getCache<WeatherData>(cacheKey);
    if (cached) {
      console.log(`Usando clima do cache para ${slug}`);
      return cached;
    }
  }

  console.log(`Buscando clima da API para ${slug}...`);

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

    // Salva no cache
    setCache(cacheKey, normalizedData, CACHE_TTL_MINUTES);

    return normalizedData;
  } catch (error) {
    // Se falhar, tenta retornar do cache mesmo expirado
    const cached = getCache<WeatherData>(cacheKey);
    if (cached) {
      console.warn(`Usando cache expirado para ${slug}:`, error);
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
