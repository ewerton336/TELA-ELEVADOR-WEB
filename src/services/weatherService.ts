import { getCache, setCache, isCacheExpired } from "@/lib/cache";

const CACHE_KEY = "weather";
const CACHE_TTL_MINUTES = 120; // 2 horas

// Praia Grande, SP
const LATITUDE = -24.0058;
const LONGITUDE = -46.4028;

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

// Códigos WMO para descrição e ícone
const weatherCodeMap: Record<number, { description: string; icon: string }> = {
  0: { description: "Céu limpo", icon: "☀️" },
  1: { description: "Principalmente limpo", icon: "🌤️" },
  2: { description: "Parcialmente nublado", icon: "⛅" },
  3: { description: "Nublado", icon: "☁️" },
  45: { description: "Neblina", icon: "🌫️" },
  48: { description: "Neblina com geada", icon: "🌫️" },
  51: { description: "Garoa leve", icon: "🌧️" },
  53: { description: "Garoa moderada", icon: "🌧️" },
  55: { description: "Garoa forte", icon: "🌧️" },
  61: { description: "Chuva leve", icon: "🌧️" },
  63: { description: "Chuva moderada", icon: "🌧️" },
  65: { description: "Chuva forte", icon: "🌧️" },
  66: { description: "Chuva congelante leve", icon: "🌨️" },
  67: { description: "Chuva congelante forte", icon: "🌨️" },
  71: { description: "Neve leve", icon: "❄️" },
  73: { description: "Neve moderada", icon: "❄️" },
  75: { description: "Neve forte", icon: "❄️" },
  77: { description: "Grãos de neve", icon: "❄️" },
  80: { description: "Pancadas de chuva leves", icon: "🌦️" },
  81: { description: "Pancadas de chuva moderadas", icon: "🌦️" },
  82: { description: "Pancadas de chuva fortes", icon: "⛈️" },
  85: { description: "Neve leve", icon: "🌨️" },
  86: { description: "Neve forte", icon: "🌨️" },
  95: { description: "Tempestade", icon: "⛈️" },
  96: { description: "Tempestade com granizo leve", icon: "⛈️" },
  99: { description: "Tempestade com granizo forte", icon: "⛈️" },
};

function getWeatherInfo(code: number): { description: string; icon: string } {
  return weatherCodeMap[code] || { description: "Desconhecido", icon: "❓" };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function getDayName(dateStr: string, index: number): string {
  if (index === 0) return "Hoje";
  if (index === 1) return "Amanhã";
  
  const date = new Date(dateStr + "T12:00:00");
  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return dayNames[date.getDay()];
}

export async function fetchWeather(): Promise<WeatherData> {
  // Verifica cache primeiro
  if (!isCacheExpired(CACHE_KEY)) {
    const cached = getCache<WeatherData>(CACHE_KEY);
    if (cached) {
      console.log("Usando clima do cache");
      return cached;
    }
  }

  console.log("Buscando clima da API...");
  
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=America/Sao_Paulo&forecast_days=2`;
    
    const response = await fetch(url);
    console.log("Resposta da API:", response.status);
    
    if (!response.ok) throw new Error(`Falha ao buscar clima: ${response.status}`);

    const data = await response.json();
    console.log("Dados recebidos:", data);
    
    const days: WeatherDay[] = data.daily.time.map((date: string, index: number) => {
      const code = data.daily.weathercode[index];
      const weatherInfo = getWeatherInfo(code);
      
      return {
        date,
        dateFormatted: formatDate(date),
        dayName: getDayName(date, index),
        temperatureMax: Math.round(data.daily.temperature_2m_max[index]),
        temperatureMin: Math.round(data.daily.temperature_2m_min[index]),
        weatherCode: code,
        weatherDescription: weatherInfo.description,
        weatherIcon: weatherInfo.icon,
      };
    });

    const weatherData: WeatherData = {
      location: "Praia Grande, SP",
      days,
      lastUpdated: new Date().toISOString(),
    };

    // Salva no cache
    setCache(CACHE_KEY, weatherData, CACHE_TTL_MINUTES);
    
    return weatherData;
  } catch (error) {
    // Se falhar, tenta retornar do cache mesmo expirado
    const cached = getCache<WeatherData>(CACHE_KEY);
    if (cached) return cached;
    
    throw error;
  }
}

export function getCachedWeather(): WeatherData | null {
  return getCache<WeatherData>(CACHE_KEY);
}

export function isWeatherCacheExpired(): boolean {
  return isCacheExpired(CACHE_KEY);
}
