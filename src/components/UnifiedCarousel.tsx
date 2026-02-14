import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { NewsItem } from "@/services/newsService";
import { Message } from "@/services/messageService";
import { MessageSquare, AlertTriangle, Clock } from "lucide-react";

// Tipos para o carrossel unificado
type UnifiedSlide =
  | { type: "news"; data: NewsItem }
  | { type: "message"; data: Message }
  | { type: "urgent"; data: Message };

interface UnifiedCarouselProps {
  newsItems: NewsItem[];
  messages: Message[];
  isLoading?: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Função para intercalar arrays
function interleave<T>(...arrays: T[][]): T[] {
  const result: T[] = [];
  const maxLength = Math.max(...arrays.map((arr) => arr.length));

  for (let i = 0; i < maxLength; i++) {
    for (const arr of arrays) {
      if (i < arr.length) {
        result.push(arr[i]);
      }
    }
  }

  return result;
}

export function UnifiedCarousel({
  newsItems,
  messages,
  isLoading,
}: UnifiedCarouselProps) {
  const [current, setCurrent] = useState(0);
  const slideDurationMs = 10000;
  // Criar slides unificados com priorização inteligente
  const slides = useMemo((): UnifiedSlide[] => {
    // Separar mensagens por prioridade
    const urgentMessages = messages.filter((m) => m.priority === "urgent");
    const normalMessages = messages.filter((m) => m.priority === "normal");

    const urgentSlides: UnifiedSlide[] = urgentMessages.map((m) => ({
      type: "urgent",
      data: m,
    }));
    const messageSlides: UnifiedSlide[] = normalMessages.map((m) => ({
      type: "message",
      data: m,
    }));
    const newsSlides: UnifiedSlide[] = newsItems.map((n) => ({
      type: "news",
      data: n,
    }));

    // Urgentes primeiro, depois intercala avisos normais e notícias
    return [...urgentSlides, ...interleave(messageSlides, newsSlides)];
  }, [messages, newsItems]);

  // Log apenas quando slides mudam (DEVE vir ANTES de qualquer return condicional)
  useEffect(() => {
    if (slides.length > 0) {
      console.log(`📰 Carrossel: ${slides.length} itens`);
    }
  }, [slides.length]);

  useEffect(() => {
    if (slides.length === 0) {
      return;
    }

    setCurrent(0);
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, slideDurationMs);

    return () => clearInterval(timer);
  }, [slides.length, slideDurationMs]);

  // Estado de loading
  if (isLoading && slides.length === 0) {
    return (
      <Card className="glass-card border-white/10 h-full">
        <div className="p-8 h-full flex flex-col items-center justify-center">
          <div className="animate-pulse space-y-4 w-full max-w-2xl">
            <div className="h-8 bg-white/10 rounded w-1/3 mx-auto" />
            <div className="h-64 bg-white/10 rounded" />
            <div className="h-6 bg-white/10 rounded w-3/4 mx-auto" />
          </div>
        </div>
      </Card>
    );
  }

  // Sem conteúdo
  if (slides.length === 0) {
    return (
      <Card className="glass-card border-white/10 h-full">
        <div className="p-8 h-full flex flex-col items-center justify-center text-white/50">
          <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-xl">Aguardando conteúdo...</p>
          <p className="text-sm mt-2">Notícias e avisos aparecerão aqui</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="h-full">
      <div className="fade-stack h-full">
        {slides.map((slide, index) => (
          <div
            key={`${slide.type}-${index}`}
            className={`fade-slide ${index === current ? "is-active" : ""}`}
            aria-hidden={index !== current}
          >
            {slide.type === "news" && (
              <NewsSlide item={slide.data as NewsItem} />
            )}
            {slide.type === "message" && (
              <MessageSlide message={slide.data as Message} />
            )}
            {slide.type === "urgent" && (
              <UrgentSlide message={slide.data as Message} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Slide de Notícia
function NewsSlide({ item }: { item: NewsItem }) {
  return (
    <Card className="glass-card border-white/10 h-full overflow-hidden">
      <div className="h-full relative">
        {/* Imagem de fundo */}
        <img
          src={item.thumbnail}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://placehold.co/800x450/c4170c/ffffff?text=G1+Santos";
          }}
        />

        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />

        {/* Conteúdo sobre a imagem */}
        <div className="absolute inset-0 p-6 flex flex-col justify-end">
          {/* Badge fonte, categoria e tempo */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
              {item.source}
            </span>
            {item.category && (
              <span className="bg-red-500/80 text-white text-xs font-medium px-2 py-1 rounded">
                {item.category}
              </span>
            )}
            <span className="bg-black/50 text-white/80 text-xs px-2 py-1 rounded">
              {item.pubDateFormatted}
            </span>
          </div>

          {/* Título grande */}
          <h2 className="text-white font-bold text-2xl md:text-3xl lg:text-4xl leading-tight line-clamp-4 drop-shadow-lg">
            {item.title}
          </h2>
        </div>
      </div>
    </Card>
  );
}

// Slide de Aviso Normal
function MessageSlide({ message }: { message: Message }) {
  return (
    <Card className="glass-card border-white/10 border-l-4 border-l-amber-400 h-full overflow-hidden">
      <div className="h-full p-6 md:p-8 flex flex-col bg-gradient-to-br from-amber-900/20 to-orange-900/10">
        <div className="flex items-center gap-2 flex-shrink-0">
          <MessageSquare className="w-6 h-6 text-amber-400" />
          <span className="text-sm text-amber-300 font-medium">
            Aviso do Condomínio
          </span>
        </div>

        <h2 className="text-2xl md:text-3xl lg:text-4xl text-white mt-4 leading-tight font-semibold flex-shrink-0">
          {message.title}
        </h2>

        <div className="flex-1 flex items-center py-4">
          <p className="text-white/90 text-xl md:text-2xl leading-relaxed">
            {message.content}
          </p>
        </div>

        <div className="flex items-center gap-2 text-white/40 flex-shrink-0">
          <Clock className="w-5 h-5" />
          <span className="text-base">{formatDate(message.createdAt)}</span>
        </div>
      </div>
    </Card>
  );
}

// Slide de Aviso Urgente
function UrgentSlide({ message }: { message: Message }) {
  return (
    <Card className="border-2 border-red-500 h-full overflow-hidden bg-gradient-to-br from-red-100 to-orange-100">
      <div className="h-full p-6 md:p-8 flex flex-col">
        <div className="flex items-center gap-3 flex-shrink-0">
          <AlertTriangle className="w-8 h-8 text-red-600 animate-pulse" />
          <span className="text-base bg-red-600 text-white px-4 py-1.5 rounded-full font-bold">
            ⚠️ URGENTE
          </span>
        </div>

        <h2 className="text-2xl md:text-3xl lg:text-4xl text-red-800 mt-4 leading-tight font-bold flex-shrink-0">
          {message.title}
        </h2>

        <div className="flex-1 flex items-center py-4">
          <p className="text-gray-800 text-xl md:text-2xl leading-relaxed">
            {message.content}
          </p>
        </div>

        <div className="flex items-center gap-2 text-gray-500 flex-shrink-0">
          <Clock className="w-5 h-5" />
          <span className="text-base">{formatDate(message.createdAt)}</span>
        </div>
      </div>
    </Card>
  );
}
