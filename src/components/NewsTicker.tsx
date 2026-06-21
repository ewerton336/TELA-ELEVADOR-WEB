import React, { useMemo } from "react";
import type { NewsItem } from "@/services/newsService";

interface NewsTickerProps {
  items: NewsItem[];
  visible: boolean;
}

const SEPARATOR = " \u2022 ";

function NewsTickerInner({ items, visible }: NewsTickerProps) {
  const tickerText = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    if (safeItems.length === 0) return "";
    return safeItems.map((n) => n.title).join(SEPARATOR);
  }, [items]);

  if (!visible || !tickerText) return null;

  return (
    <div
      className="news-ticker"
      role="marquee"
      aria-live="off"
      aria-label="Ticker de notícias"
    >
      <div className="news-ticker-track">
        <span className="news-ticker-content" aria-hidden="false">
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
