import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DigitalClock } from "@/components/DigitalClock";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { WeatherCard } from "@/components/WeatherCard";
import { MessageBoard } from "@/components/MessageBoard";
import { NewsCarousel } from "@/components/NewsCarousel";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import {
  fetchWeather,
  getCachedWeather,
  WeatherData,
} from "@/services/weatherService";
import { fetchNews, getCachedNews, NewsData } from "@/services/newsService";
import { getMessages, Message } from "@/services/messageService";
import { getPredio, OrientationMode } from "@/services/predioService";

export function Dashboard() {
  const { isOnline, isSyncing, lastSyncAt } = useOfflineSync();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [orientationMode, setOrientationMode] =
    useState<OrientationMode>("auto");

  useEffect(() => {
    if (!slug) {
      navigate("/gramado", { replace: true });
    }
  }, [slug, navigate]);

  useEffect(() => {
    const loadPredio = async () => {
      try {
        const predio = await getPredio(slug ?? "gramado");
        document.title = predio.nome;
        setOrientationMode(predio.orientationMode ?? "auto");
      } catch (err) {
        console.error("Erro ao carregar predio:", err);
      }
    };
    loadPredio();
  }, [slug]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("force-portrait", "force-landscape");
    if (orientationMode === "portrait") {
      root.classList.add("force-portrait");
    } else if (orientationMode === "landscape") {
      root.classList.add("force-landscape");
    }

    return () => {
      root.classList.remove("force-portrait", "force-landscape");
    };
  }, [orientationMode]);

  // Carrega mensagens iniciais
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const msgs = await getMessages(slug ?? "gramado");
        if (msgs !== null) {
          setMessages(msgs);
        }
      } catch (err) {
        console.error("Erro ao carregar mensagens:", err);
      }
    };
    loadInitial();
  }, []);

  // Atualiza mensagens e fontes periodicamente (para pegar mudanças do admin)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const msgs = await getMessages(slug ?? "gramado");
        if (msgs !== null) {
          setMessages(msgs);
        }
      } catch (err) {
        console.error("Erro no polling de mensagens:", err);
      }
    }, 5000); // A cada 5 segundos

    return () => clearInterval(interval);
  }, []);

  // Query de clima com fallback para cache
  const {
    data: weatherData,
    isLoading: weatherLoading,
    error: weatherError,
  } = useQuery<WeatherData | null>({
    queryKey: ["weather"],
    initialData: getCachedWeather() ?? undefined,
    queryFn: async () => {
      try {
        const result = await fetchWeather();
        return result;
      } catch (err) {
        // Se falhar, tenta retornar do cache
        const cached = getCachedWeather();
        if (cached) return cached;
        throw err;
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutos
    refetchInterval: 1000 * 60 * 60, // 1 hora
    retry: 3,
    retryDelay: 500,
  });

  // Log para debug
  useEffect(() => {
    if (weatherError) {
      console.error("Erro ao carregar clima:", weatherError);
    }
    if (weatherData) {
      console.log("Clima carregado:", weatherData);
    }
  }, [weatherData, weatherError]);

  // Query de notícias com fallback para cache
  const {
    data: newsData,
    isLoading: newsLoading,
    error: newsError,
  } = useQuery<NewsData | null>({
    queryKey: ["news", slug],
    queryFn: async () => {
      try {
        const result = await fetchNews(slug ?? "gramado");
        return result;
      } catch (err) {
        // Se falhar, tenta retornar do cache
        const cached = getCachedNews(slug ?? "gramado");
        if (cached) return cached;
        throw err;
      }
    },
    staleTime: 1000 * 60 * 15, // 15 minutos
    refetchInterval: 1000 * 60 * 30, // 30 minutos
    retry: 3,
    retryDelay: 500,
  });

  // Log para debug de notícias
  useEffect(() => {
    if (newsError) {
      console.error("Erro ao carregar notícias:", newsError);
    }
    if (newsData) {
      console.log("Notícias carregadas:", newsData.items?.length, "itens");
    }
  }, [newsData, newsError]);

  return (
    <div className="elevator-screen h-screen w-screen overflow-hidden">
      <div className="elevator-rotate">
        <div className="relative w-full h-full overflow-hidden border border-white/10 shadow-2xl bg-slate-950/80 backdrop-blur-lg elevator-frame">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_35%),radial-gradient(circle_at_80%_0,rgba(255,115,29,0.08),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(88,28,135,0.12),transparent_35%)]" />

          <div className="relative z-10 grid h-full grid-cols-[340px_1fr] gap-4 p-4 dashboard-grid">
          {/* Coluna de avisos à esquerda */}
          <aside className="h-full rounded-2xl bg-[#261446] border border-white/10 shadow-xl overflow-hidden dashboard-avisos">
            <div className="h-full px-4 py-3">
              <MessageBoard messages={messages} />
            </div>
          </aside>

          {/* Barra superior com relogio, clima e status */}
          <header className="flex items-center justify-between gap-3 px-2 dashboard-header">
            <DigitalClock />

            <div className="flex items-center gap-3">
              <div className="max-w-sm">
                <WeatherCard
                  data={weatherData ?? null}
                  isLoading={weatherLoading}
                  compact
                />
              </div>

              <ConnectionStatus
                isOnline={isOnline}
                isSyncing={isSyncing}
                lastSyncAt={lastSyncAt}
              />
            </div>
          </header>

          {/* Carrossel de noticias */}
          <div className="h-full min-h-0 rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-xl dashboard-news">
            <NewsCarousel data={newsData ?? null} isLoading={newsLoading} />
          </div>
        </div>

        {/* Créditos do desenvolvedor */}
          <div className="absolute bottom-2 right-4 z-20">
            <p className="text-white/100 text-[10px]">
              Desenvolvido por Ewerton Guimarães • (13) 99782-7870
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
