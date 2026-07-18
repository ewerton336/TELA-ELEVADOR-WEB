/**
 * Mapeia o código WMO (Open-Meteo) para um ícone de clima animado.
 *
 * Os ícones são SVGs animados (com transparência real) do set Meteocons
 * (Bas Milius — https://github.com/basmilius/meteocons), licença MIT,
 * servidos estaticamente de `public/weather/<nome>.svg`.
 *
 * Cobre a tabela completa de códigos WMO usada pela Open-Meteo, garantindo
 * que toda condição de clima possível tenha uma animação correspondente.
 */

const WMO_TO_ICON: Record<number, string> = {
  0: "clear-day", // Céu limpo
  1: "partly-cloudy-day", // Principalmente limpo
  2: "partly-cloudy-day", // Parcialmente nublado
  3: "overcast-day", // Nublado
  45: "fog-day", // Nevoeiro
  48: "fog", // Nevoeiro depositador
  51: "drizzle", // Garoa leve
  53: "drizzle", // Garoa moderada
  55: "drizzle", // Garoa densa
  56: "sleet", // Garoa congelante leve
  57: "sleet", // Garoa congelante densa
  61: "rain", // Chuva leve
  63: "rain", // Chuva moderada
  65: "rain", // Chuva forte
  66: "sleet", // Chuva congelante leve
  67: "sleet", // Chuva congelante forte
  71: "snow", // Neve leve
  73: "snow", // Neve moderada
  75: "snow", // Neve forte
  77: "snow", // Grãos de neve
  80: "partly-cloudy-day-rain", // Pancadas de chuva leve
  81: "partly-cloudy-day-rain", // Pancadas de chuva moderada
  82: "thunderstorms-day-rain", // Pancadas de chuva violentas
  85: "partly-cloudy-day-snow", // Pancadas de neve leve
  86: "snow", // Pancadas de neve fortes
  95: "thunderstorms-day", // Tempestade
  96: "thunderstorms-day-rain", // Tempestade com granizo leve
  99: "thunderstorms-rain", // Tempestade com granizo forte
};

const BASE_PATH = "/weather";

export function getWeatherIconUrl(
  weatherCode: number | null | undefined,
  isDay: boolean = true,
): string | null {
  if (weatherCode == null) return null;
  const name = WMO_TO_ICON[weatherCode];
  if (!name) return null;
  const resolved = isDay ? name : name.replace("-day", "-night");
  return `${BASE_PATH}/${resolved}.svg`;
}
