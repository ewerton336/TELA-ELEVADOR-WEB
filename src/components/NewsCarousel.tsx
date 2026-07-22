import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { NewsData, NewsItem } from "@/services/newsService";
import { NoticiaInterna } from "@/services/noticiaInternaService";
import { Newspaper, Building2 } from "lucide-react";
import { useFitText } from "@/hooks/useFitText";

type CarouselSlide =
  | { type: "external"; data: NewsItem }
  | { type: "internal"; data: NoticiaInterna };

interface NewsCarouselProps {
  data: NewsData | null;
  isLoading?: boolean;
  error?: Error | null;
  noticiasInternas?: NoticiaInterna[];
}

function interleaveWithInternal(
  external: NewsItem[],
  internal: NoticiaInterna[],
): CarouselSlide[] {
  if (internal.length === 0) {
    return external.map((d) => ({ type: "external", data: d }));
  }
  if (external.length === 0) {
    return internal.map((d) => ({ type: "internal", data: d }));
  }

  const result: CarouselSlide[] = [];
  let intIdx = 0;

  for (let i = 0; i < external.length; i++) {
    result.push({ type: "external", data: external[i] });
    if (intIdx < internal.length) {
      result.push({ type: "internal", data: internal[intIdx] });
      intIdx++;
    } else {
      // Loop internal news if fewer than external
      result.push({ type: "internal", data: internal[i % internal.length] });
    }
  }

  return result;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function NewsCarousel({ data, isLoading, error, noticiasInternas = [] }: NewsCarouselProps) {
  const [current, setCurrent] = useState(0);
  const slideDurationMs = 10000;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoEndedRef = useRef(false);

  const externalItems = useMemo(() => asArray<NewsItem>(data?.items), [data?.items]);
  const internalItems = useMemo(() => asArray<NoticiaInterna>(noticiasInternas), [noticiasInternas]);

  const slides = useMemo(
    () => interleaveWithInternal(externalItems, internalItems),
    [externalItems, internalItems],
  );

  const advanceSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  // Determine if current slide is a video
  const currentSlide = slides[current];
  const isVideoSlide =
    currentSlide?.type === "internal" &&
    currentSlide.data.tipoMidia === "video";

  useEffect(() => {
    if (slides.length === 0) return;
    setCurrent(0);
  }, [slides.length]);

  // Timer management - skip for video slides (they advance on ended).
  // A rotação continua girando mesmo offline (mostrando as notícias em cache);
  // o flash preto na transição é resolvido pelo gradiente de fundo do slide.
  useEffect(() => {
    if (slides.length === 0) return;
    const duration = isVideoSlide ? 60000 : slideDurationMs;
    timerRef.current = setTimeout(advanceSlide, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, slides.length, isVideoSlide, advanceSlide, slideDurationMs]);

  const handleVideoEnded = useCallback(() => {
    videoEndedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    advanceSlide();
  }, [advanceSlide]);

  // Renderiza apenas slide atual e próximo (reduz DOM)
  const visibleIndices = useMemo(() => {
    if (slides.length === 0) return [];
    const next = (current + 1) % slides.length;
    return current === next ? [current] : [current, next];
  }, [current, slides.length]);

  if (isLoading) {
    return (
      <div className="h-full rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 overflow-hidden">
        <div className="p-6 h-full animate-pulse space-y-4">
          <div className="h-4 bg-white/10 rounded w-1/4" />
          <div className="h-64 bg-white/10 rounded" />
          <div className="h-3 bg-white/10 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="h-full rounded-2xl border border-white/10 bg-slate-900/70 flex flex-col items-center justify-center text-white/60">
        <Newspaper className="w-8 h-8 mb-2" />
        {error ? (
          <>
            <p className="text-sm text-red-400">Erro ao carregar notícias</p>
            <p className="text-xs mt-1 text-white/40">Tentando novamente...</p>
          </>
        ) : (
          <>
            <p className="text-sm">Carregando notícias...</p>
            <p className="text-xs mt-1">Aguarde um momento</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full rounded-2xl overflow-hidden">
      <div className="fade-stack h-full">
        {visibleIndices.map((index) => {
          const slide = slides[index];
          const isActive = index === current;

          if (slide.type === "internal") {
            return (
              <div
                key={`int-${slide.data.id}-${index}`}
                className={`fade-slide ${isActive ? "is-active" : ""}`}
                aria-hidden={!isActive}
              >
                <InternalNewsSlide
                  item={slide.data}
                  isActive={isActive}
                  onVideoEnded={handleVideoEnded}
                />
              </div>
            );
          }

          const item = slide.data;
          return (
            <div
              key={`ext-${item.id}-${index}`}
              className={`fade-slide ${isActive ? "is-active" : ""}`}
              aria-hidden={!isActive}
            >
              <ExternalNewsSlide item={item} />
            </div>
          );
        })}
      </div>

      {/* Progress bar — CSS animation pura, zero re-renders */}
      {!isVideoSlide && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
          <div
            key={current}
            className="carousel-progress-bar h-full bg-orange-500"
            style={{ "--carousel-progress-duration": `${slideDurationMs}ms` } as React.CSSProperties}
          />
        </div>
      )}
    </div>
  );
}

function ExternalNewsSlide({ item }: { item: NewsItem }) {
  const fitRef = useFitText(`${item.title}|${item.description ?? ""}`);
  const [imgError, setImgError] = useState(false);

  // Reseta o estado de erro quando a imagem muda (evita fallback grudado).
  useEffect(() => {
    setImgError(false);
  }, [item.thumbnail]);

  return (
    <div className="relative h-full">
      {/* Fundo SEMPRE presente (gradiente local, sem rede). Fica por baixo da
          imagem — enquanto a imagem carrega OU quando falha (offline), aparece
          o gradiente em vez de preto, eliminando o flash preto na transição.
          Também evita o antigo loop de placeholder remoto (placehold.co), que
          offline reatribuía o onError infinitamente e travava a tela. */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800">
        <Newspaper className="w-24 h-24 text-white/10" />
      </div>
      {item.thumbnail && !imgError && (
        <img
          src={item.thumbnail}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
        />
      )}
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/90 via-black/55 to-transparent pointer-events-none" />
      <div className="relative h-full px-7 py-6 flex flex-col">
        <div className="flex items-center justify-between gap-3 text-sm text-white/80 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500/80 border border-white/20 text-white text-xs font-semibold px-2 py-1 rounded">
              <Newspaper className="w-3.5 h-3.5 inline mr-1" />
              {item.source}
            </div>
            {item.category && (
              <span className="bg-white/15 text-white text-[11px] font-bold px-2 py-1 rounded">
                {item.category}
              </span>
            )}
          </div>
          <span className="bg-black/45 px-2 py-1 rounded text-xs font-medium">
            {item.pubDateFormatted}
          </span>
        </div>

        <div className="relative flex-1 min-h-0 flex flex-col justify-end mt-3">
          <div ref={fitRef} className="news-text-panel news-text-block">
            <h3 className="news-title">{item.title}</h3>
            {item.description && (
              <p className="news-subtitle">{item.description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Slide de notícia interna (imagem ou vídeo)
export function InternalNewsSlide({
  item,
  isActive,
  onVideoEnded,
}: {
  item: NoticiaInterna;
  isActive: boolean;
  onVideoEnded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [imgError, setImgError] = useState(false);
  const fitRef = useFitText(`${item.titulo ?? ""}|${item.subtitulo ?? ""}`);

  const hasMedia = !!item.mediaUrl;
  const hasTitle = !!item.titulo;
  const hasSubtitle = !!item.subtitulo;
  const hasText = hasTitle || hasSubtitle;
  const showFallbackBg = !hasMedia || (item.tipoMidia === "imagem" && imgError);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isActive]);

  // Reset img error when mediaUrl changes
  useEffect(() => {
    setImgError(false);
  }, [item.mediaUrl]);

  return (
    <div className="relative h-full" data-testid="internal-news-slide">
      {/* Fallback background when no image/video */}
      {showFallbackBg && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800"
          data-testid="fallback-bg"
        >
          <Building2 className="w-24 h-24 text-white/10" />
        </div>
      )}

      {/* Media */}
      {hasMedia && item.tipoMidia === "video" ? (
        <video
          ref={videoRef}
          src={item.mediaUrl}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          onEnded={onVideoEnded}
        />
      ) : hasMedia && !imgError ? (
        <img
          src={item.mediaUrl}
          alt={item.titulo || "Notícia do condomínio"}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
        />
      ) : null}

      {/* Gradient scrim over media — only when text overlays media */}
      {hasText && !showFallbackBg && (
        <div className="internal-news-overlay absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      )}

      {/* Content */}
      <div className="relative h-full px-7 py-6 flex flex-col text-white">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            📢 Condomínio
          </span>
        </div>

        {hasText && (
          <div className="relative flex-1 min-h-0 flex flex-col justify-end mt-3">
            <div ref={fitRef} className="news-text-panel news-text-block">
              {hasTitle && <h3 className="news-title">{item.titulo}</h3>}
              {hasSubtitle && <p className="news-subtitle">{item.subtitulo}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
