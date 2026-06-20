import { useState } from "react";
import { getWeatherIconUrl } from "@/lib/weatherIcons";

interface WeatherIconProps {
  /** Código WMO (Open-Meteo) da condição do tempo. */
  weatherCode: number;
  /** Emoji exibido caso não exista ícone para o código ou o SVG falhe ao carregar. */
  fallbackEmoji?: string;
  /** Classe de tamanho (ex.: "w-9 h-9"). */
  sizeClass?: string;
  /** Texto alternativo / descrição da condição (acessibilidade). */
  alt?: string;
  className?: string;
}

/**
 * Renderiza o ícone de clima animado (SVG do Meteocons) correspondente ao
 * código WMO. Se o código não tiver ícone mapeado, ou o SVG falhar ao
 * carregar, cai no emoji de fallback — mantendo retrocompatibilidade com o
 * `weatherIcon` (emoji) que ainda vem do banco.
 */
export function WeatherIcon({
  weatherCode,
  fallbackEmoji = "❓",
  sizeClass = "w-9 h-9",
  alt = "Condição do tempo",
  className = "",
}: WeatherIconProps) {
  const url = getWeatherIconUrl(weatherCode);
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <span
        className={`leading-none ${className}`}
        role="img"
        aria-label={alt}
      >
        {fallbackEmoji}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`${sizeClass} object-contain shrink-0 ${className}`}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
