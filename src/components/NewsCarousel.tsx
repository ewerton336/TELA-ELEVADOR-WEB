import { useEffect, useState, useRef } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { NewsData, NewsItem } from "@/services/newsService";
import { Newspaper } from "lucide-react";

interface NewsCarouselProps {
  data: NewsData | null;
  isLoading?: boolean;
}

export function NewsCarousel({ data, isLoading }: NewsCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [progress, setProgress] = useState(0);

  const autoplayRef = useRef(
    Autoplay({
      delay: 10000, // 10 segundos
      stopOnInteraction: false,
      stopOnMouseEnter: false,
    }),
  );

  // Progress bar animation
  useEffect(() => {
    setProgress(0);
    const duration = 10000; // 10 segundos
    const interval = 50; // Atualiza a cada 50ms
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [current]);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

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

  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className="h-full rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur flex flex-col items-center justify-center text-white/60">
        <Newspaper className="w-8 h-8 mb-2" />
        <p className="text-sm">Carregando notícias...</p>
        <p className="text-xs mt-1">Aguarde um momento</p>
      </div>
    );
  }

  return (
    <div className="relative h-full rounded-2xl overflow-hidden">
      <Carousel
        setApi={setApi}
        plugins={[autoplayRef.current]}
        className="h-full"
        opts={{
          loop: true,
        }}
      >
        <CarouselContent className="h-full">
          {data.items.map((item: NewsItem) => (
            <CarouselItem key={item.id} className="h-full">
              <div className="relative h-full">
                {/* Imagem de fundo */}
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://placehold.co/1200x800/1e293b/94a3b8?text=G1";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#1b0f3f]/90 via-[#0b0724]/70 to-black/35" />

                {/* Conteúdo */}
                <div className="relative h-full px-6 sm:px-8 py-6 flex flex-col justify-between text-white">
                  <div className="flex items-center justify-between gap-3 text-sm text-white/80">
                    <div className="flex items-center gap-2">
                      <div className="bg-white/10 border border-white/20 text-white text-xs font-semibold px-2 py-1 rounded">
                        <Newspaper className="w-3.5 h-3.5 inline mr-1" />
                        {item.source}
                      </div>
                      {item.category && (
                        <span className="bg-orange-500 text-slate-900 text-[11px] font-bold px-2 py-1 rounded shadow">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <span className="bg-black/40 px-2 py-1 rounded text-xs font-medium">
                      {item.pubDateFormatted}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-center gap-4 max-w-[72%]">
                    <h3 className="bg-orange-500 text-slate-900 font-black text-2xl sm:text-3xl md:text-4xl leading-tight px-3 py-2 rounded shadow-lg drop-shadow">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="bg-[#231344]/80 text-orange-100 text-base sm:text-lg leading-relaxed px-3 py-5 rounded-lg shadow max-w-2xl">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
        <div
          className="h-full bg-orange-500 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
