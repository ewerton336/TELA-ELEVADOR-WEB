import { useEffect, useState } from "react";
import { getWeatherIconUrl } from "@/lib/weatherIcons";

// Cache em memória do markup SVG já buscado (chaveado por URL).
const svgMarkupCache = new Map<string, string>();

/**
 * Garante width/height explícitos no <svg> raiz. Os ícones do Meteocons vêm
 * apenas com viewBox; sem dimensões explícitas o html2canvas (usado no "print"
 * da tela) não consegue rasterizar o ícone — daí o clima sumir do print.
 */
function withExplicitSize(markup: string, size: number): string {
  if (/<svg[^>]*\swidth=/i.test(markup)) return markup;
  return markup.replace(/<svg\b/i, `<svg width="${size}" height="${size}"`);
}

interface WeatherIconProps {
  /** Código WMO (Open-Meteo) da condição do tempo. */
  weatherCode: number;
  /** Emoji exibido enquanto carrega, se não houver ícone, ou se o SVG falhar. */
  fallbackEmoji?: string;
  /** Tamanho do ícone em pixels. */
  sizePx?: number;
  /** Texto alternativo / descrição da condição (acessibilidade). */
  alt?: string;
  className?: string;
}

/**
 * Renderiza o ícone de clima animado (SVG do Meteocons) correspondente ao
 * código WMO. O SVG é embutido **inline** no DOM (em vez de <img src>), o que
 * mantém a animação na tela E garante que o ícone apareça no print
 * (html2canvas). Se o código não tiver ícone, ou o SVG falhar, cai no emoji.
 */
export function WeatherIcon({
  weatherCode,
  fallbackEmoji = "❓",
  sizePx = 36,
  alt = "Condição do tempo",
  className = "",
}: WeatherIconProps) {
  const url = getWeatherIconUrl(weatherCode);
  const [markup, setMarkup] = useState<string | null>(() =>
    url ? svgMarkupCache.get(url) ?? null : null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) return;
    const cached = svgMarkupCache.get(url);
    if (cached) {
      setMarkup(cached);
      setFailed(false);
      return;
    }
    let active = true;
    Promise.resolve()
      .then(() => fetch(url))
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("not found"))))
      .then((txt) => {
        const sized = withExplicitSize(txt, sizePx);
        svgMarkupCache.set(url, sized);
        if (active) {
          setMarkup(sized);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [url, sizePx]);

  // Sem ícone mapeado, falha de carregamento, ou ainda carregando → emoji.
  if (!url || failed || !markup) {
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

  // SVG inline: anima na tela e é capturado fielmente no print.
  return (
    <span
      className={`weather-svg inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: sizePx, height: sizePx, lineHeight: 0 }}
      role="img"
      aria-label={alt}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
