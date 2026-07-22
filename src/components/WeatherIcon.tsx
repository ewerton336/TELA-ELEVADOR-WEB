import { useEffect, useState } from "react";
import { getWeatherIconUrl } from "@/lib/weatherIcons";

interface WeatherIconProps {
  /** Código WMO (Open-Meteo) da condição do tempo. */
  weatherCode: number;
  isDay?: boolean;
  /** Emoji exibido enquanto carrega, se não houver ícone, ou se o WebP falhar. */
  fallbackEmoji?: string;
  /** Tamanho do ícone em pixels. */
  sizePx?: number;
  /** Texto alternativo / descrição da condição (acessibilidade). */
  alt?: string;
  className?: string;
}

/**
 * Renderiza o ícone de clima **animado** (Meteocons) como WebP animado.
 *
 * Por que WebP e não o SVG inline: os SVGs do Meteocons animam via SMIL, que
 * roda na MAIN THREAD forçando layout + recalc + paint ~60x/s por ícone — o que
 * derruba o FPS nos media players fracos do elevador (medido: ~540 invalidações
 * de layout/s só pelos ícones). O WebP animado roda no pipeline de imagem
 * (decode/composição na GPU), fora da main thread, mantendo a animação a custo
 * quase zero. Os WebPs são pré-renderizados a partir dos SVGs (script
 * `render-icons.mjs`, loop perfeito via setCurrentTime) e servidos de
 * `public/weather/<nome>.webp`.
 *
 * Um `<img>` também é capturado pelo html2canvas (print da tela) — como um
 * quadro estático, o que é suficiente.
 *
 * Se o WebP não carregar (código sem ícone, arquivo ausente, ou offline sem
 * cache), cai no emoji. O onError troca o estado UMA vez (sem risco de loop).
 */
export function WeatherIcon({
  weatherCode,
  isDay = true,
  fallbackEmoji = "❓",
  sizePx = 36,
  alt = "Condição do tempo",
  className = "",
}: WeatherIconProps) {
  const svgUrl = getWeatherIconUrl(weatherCode, isDay);
  const webpUrl = svgUrl ? svgUrl.replace(/\.svg$/, ".webp") : null;
  const [failed, setFailed] = useState(false);

  // Novo código de clima → tenta o ícone de novo (limpa erro anterior).
  useEffect(() => {
    setFailed(false);
  }, [webpUrl]);

  if (!webpUrl || failed) {
    return (
      <span
        className={`inline-flex items-center justify-center leading-none ${className}`}
        style={{ width: sizePx, height: sizePx, fontSize: sizePx * 0.85 }}
        role="img"
        aria-label={alt}
      >
        {fallbackEmoji}
      </span>
    );
  }

  return (
    <img
      src={webpUrl}
      width={sizePx}
      height={sizePx}
      alt={alt}
      className={`weather-webp shrink-0 ${className}`}
      style={{ width: sizePx, height: sizePx }}
      decoding="async"
      // Fallback único para emoji — sem re-atribuir src (evita loop offline).
      onError={() => setFailed(true)}
    />
  );
}
