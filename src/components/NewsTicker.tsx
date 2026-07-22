import React, { useMemo, useRef, useState, useLayoutEffect } from "react";
import type { NewsItem } from "@/services/newsService";

interface NewsTickerProps {
  items: NewsItem[];
  visible: boolean;
}

const SEPARATOR = " • ";

// Velocidade do ticker em pixels/segundo (na largura do próprio conteúdo).
// Menor = mais lento. Antes era duração fixa de 60s (≈30px/s e variável com a
// quantidade de notícia); agora é constante e mais lenta, para leitura
// confortável independentemente de quantas notícias há.
const TICKER_SPEED_PX_S = 18;

function NewsTickerInner({ items, visible }: NewsTickerProps) {
  const tickerText = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    if (safeItems.length === 0) return "";
    return safeItems.map((n) => n.title).join(SEPARATOR);
  }, [items]);

  const contentRef = useRef<HTMLSpanElement>(null);
  const [durationS, setDurationS] = useState(60);

  // Duração = largura de UMA cópia do conteúdo / velocidade → px/s constante.
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    if (w > 0) setDurationS(Math.max(30, Math.round(w / TICKER_SPEED_PX_S)));
  }, [tickerText]);

  if (!visible || !tickerText) return null;

  return (
    <div
      className="news-ticker"
      role="marquee"
      aria-live="off"
      aria-label="Ticker de notícias"
    >
      <div
        className="news-ticker-track"
        style={{ animationDuration: `${durationS}s` }}
      >
        <span
          ref={contentRef}
          className="news-ticker-content"
          aria-hidden="false"
        >
          {tickerText}
          {SEPARATOR}
          <span className="news-ticker-credit">
            Desenvolvido por Ewerton Guimarães • (13) 99782-7870
          </span>
          {SEPARATOR}
        </span>
        <span className="news-ticker-content" aria-hidden="true">
          {tickerText}
          {SEPARATOR}
          <span className="news-ticker-credit">
            Desenvolvido por Ewerton Guimarães • (13) 99782-7870
          </span>
          {SEPARATOR}
        </span>
      </div>
    </div>
  );
}

export const NewsTicker = React.memo(NewsTickerInner);
