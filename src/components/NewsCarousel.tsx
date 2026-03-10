import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { NewsData, NewsItem } from "@/services/newsService";
import { NoticiaInterna } from "@/services/noticiaInternaService";
import { Newspaper, Building2 } from "lucide-react";

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

export function NewsCarousel({ data, isLoading, error, noticiasInternas = [] }: NewsCarouselProps) {
  const [current, setCurrent] = useState(0);
  const slideDurationMs = 10000;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoEndedRef = useRef(false);

  const slides = useMemo(
    () => interleaveWithInternal(data?.items ?? [], noticiasInternas),
    [data?.items, noticiasInternas],
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

  // Timer management - skip for video slides (they advance on ended)
  useEffect(() => {
    if (slides.length === 0) return;
    if (isVideoSlide) {
      // For video slides, set a max timeout (60s) as safety net
      timerRef.current = setTimeout(advanceSlide, 60000);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    timerRef.current = setTimeout(advanceSlide, slideDurationMs);
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
            <div className="relative h-full">
              <img
                src={item.thumbnail}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://placehold.co/1200x800/1e293b/94a3b8?text=G1";
                }}
              />

              {/* Gradient scrim for text legibility */}
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              <div className="relative h-full px-8 sm:px-10 py-8 flex flex-col justify-between text-white">
                <div className="flex items-center justify-between gap-3 text-sm text-white/80">
                  <div className="flex items-center gap-2">
                    <div className="bg-orange-500/75 border border-white/20 text-white text-xs font-semibold px-2 py-1 rounded">
                      <Newspaper className="w-3.5 h-3.5 inline mr-1" />
                      {item.source}
                    </div>
                    {item.category && (
                      <span className="bg-white/15 text-white text-[11px] font-bold px-2 py-1 rounded">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <span className="bg-black/40 px-2 py-1 rounded text-xs font-medium">
                    {item.pubDateFormatted}
                  </span>
                </div>

                <div className="flex flex-col gap-3 max-w-[72%] news-content pb-4">
                  <h3 className="text-white font-black text-2xl sm:text-3xl md:text-4xl leading-tight">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-white/80 text-base sm:text-lg leading-relaxed max-w-2xl">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
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
      <div className="relative h-full px-8 sm:px-10 py-8 flex flex-col justify-between text-white">
        <div className="flex items-center gap-2">
          <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            📢 Condomínio
          </span>
        </div>

        {hasText && (
          <div className="flex flex-col gap-3 max-w-[85%] pb-4">
            {hasTitle && (
              <h3 className="internal-news-title font-black text-2xl sm:text-3xl md:text-4xl leading-tight text-white">
                {item.titulo}
              </h3>
            )}
            {hasSubtitle && (
              <p className="internal-news-subtitle text-white/90 text-base sm:text-lg leading-relaxed max-w-2xl">
                {item.subtitulo}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
