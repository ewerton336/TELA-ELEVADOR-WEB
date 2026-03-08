import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { NewsData, NewsItem } from "@/services/newsService";
import { NoticiaInterna } from "@/services/noticiaInternaService";
import { Newspaper } from "lucide-react";

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

              <div className="relative h-full px-6 sm:px-8 py-6 flex flex-col justify-between text-white">
                <div className="flex items-center justify-between gap-3 text-sm text-white/80">
                  <div className="flex items-center gap-2">
                    <div className="bg-orange-500/75 border border-white/20 text-white text-xs font-semibold px-2 py-1 rounded">
                      <Newspaper className="w-3.5 h-3.5 inline mr-1" />
                      {item.source}
                    </div>
                    {item.category && (
                      <span className="bg-orange-500/75 text-slate-900 text-[11px] text-white font-bold px-2 py-1 rounded shadow">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <span className="bg-black/40 px-2 py-1 rounded text-xs font-medium">
                    {item.pubDateFormatted}
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-center gap-4 max-w-[72%] news-content">
                  <h3 className="bg-orange-500/90 text-slate-900 font-black text-2xl sm:text-3xl md:text-4xl leading-tight px-3 py-2 rounded shadow-lg drop-shadow">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="bg-[#231344]/90 text-orange-100 text-base sm:text-lg leading-relaxed px-3 py-5 rounded-lg shadow max-w-2xl">
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
function InternalNewsSlide({
  item,
  isActive,
  onVideoEnded,
}: {
  item: NoticiaInterna;
  isActive: boolean;
  onVideoEnded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isActive]);

  return (
    <div className="relative h-full">
      {item.tipoMidia === "video" ? (
        <video
          ref={videoRef}
          src={item.mediaUrl}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          onEnded={onVideoEnded}
        />
      ) : (
        <img
          src={item.mediaUrl}
          alt={item.titulo || "Notícia do condomínio"}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      )}

      {/* Overlay gradiente */}
      <div className="absolute inset-0" />

      {/* Conteúdo */}
      <div className="relative h-full px-6 sm:px-8 py-6 flex flex-col justify-between text-white">
        <div className="flex items-center gap-2 text-sm text-white/80">
          <div className="bg-orange-500/75 border border-white/20 text-white text-xs font-semibold px-2 py-1 rounded">
            📢 Condomínio
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-end gap-3 max-w-[80%] pb-2">
          {item.titulo && (
            <h3 className="bg-orange-500/90 text-slate-900 font-black text-2xl sm:text-3xl md:text-4xl leading-tight px-3 py-2 rounded shadow-lg drop-shadow">
              {item.titulo}
            </h3>
          )}
          {item.subtitulo && (
            <p className="bg-[#231344]/90 text-orange-100 text-base sm:text-lg leading-relaxed px-3 py-5 rounded-lg shadow max-w-2xl">
              {item.subtitulo}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
