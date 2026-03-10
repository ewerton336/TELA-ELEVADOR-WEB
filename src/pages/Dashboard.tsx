import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DigitalClock } from "@/components/DigitalClock";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { WeatherCard } from "@/components/WeatherCard";
import { MessageBoard } from "@/components/MessageBoard";
import { NewsCarousel } from "@/components/NewsCarousel";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useSignalR } from "@/hooks/useSignalR";
import {
  fetchWeatherBySlug,
  getCachedWeather,
  WeatherData,
} from "@/services/weatherService";
import { fetchNews, getCachedNews, NewsData } from "@/services/newsService";
import { getMessages, Message } from "@/services/messageService";
import { getPredio, OrientationMode, Predio } from "@/services/predioService";
import { getNoticiasInternas, NoticiaInterna } from "@/services/noticiaInternaService";

export function Dashboard() {
  const { isSyncing } = useOfflineSync();
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [orientationMode, setOrientationMode] =
    useState<OrientationMode>("auto");
  const [predio, setPredio] = useState<Predio | null>(null);

  useEffect(() => {
    if (!slug) {
      navigate("/gramado", { replace: true });
    }
  }, [slug, navigate]);

  // SignalR — avisos e orientação em tempo real (substitui polling)
  const { isConnected: isSignalRConnected } = useSignalR({
    slug: slug ?? "gramado",
    onAvisosReceived: (msgs) => setMessages(msgs),
    onOrientationReceived: (mode) => {
      setOrientationMode((prev) => {
        if (prev !== mode) {
          console.log(`[Dashboard] Orientação alterada: ${prev} → ${mode}`);
        }
        return mode;
      });
    },
    onNoticiasInternasReceived: (noticias) => queryClient.setQueryData(["noticiasInternas", slug], noticias),
  });

  useEffect(() => {
    const loadPredio = async () => {
      try {
        const predioData = await getPredio(slug ?? "gramado");
        setPredio(predioData);
        document.title = predioData.nome;
        setOrientationMode(predioData.orientationMode ?? "auto");
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

  // Carrega mensagens iniciais (SignalR faz o push depois)
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
  }, [slug]);

  // Query de clima com fallback para cache
  const {
    data: weatherData,
    isLoading: weatherLoading,
    error: weatherError,
  } = useQuery<WeatherData | null>({
    queryKey: ["weather", slug],
    initialData: slug
      ? (getCachedWeather(slug)?.days?.length ?? 0) > 0
        ? (getCachedWeather(slug) ?? undefined)
        : undefined
      : undefined,
    queryFn: async () => {
      if (!slug) return null;
      try {
        const result = await fetchWeatherBySlug(slug);
        return result;
      } catch (err) {
        // Se falhar, tenta retornar do cache
        const cached = getCachedWeather(slug);
        if (cached) return cached;
        throw err;
      }
    },
    enabled: !!slug,
    staleTime: (query) =>
      query.state.data && (query.state.data as WeatherData | null)?.days?.length
        ? 1000 * 60 * 30  // 30 minutos se tiver dados
        : 1000 * 30,      // 30 segundos se estiver vazio
    refetchInterval: (query) =>
      query.state.data && (query.state.data as WeatherData | null)?.days?.length
        ? 1000 * 60 * 60  // 1 hora se tiver dados
        : 1000 * 30,      // 30 segundos se estiver vazio
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
    enabled: !!slug,
    staleTime: 1000 * 60 * 15, // 15 minutos
    refetchInterval: 1000 * 60 * 30, // 30 minutos
    retry: 3,
    retryDelay: 500,
  });

  // Query de notícias internas
  const { data: noticiasInternas = [] } = useQuery<NoticiaInterna[]>({
    queryKey: ["noticiasInternas", slug],
    queryFn: () => getNoticiasInternas(slug ?? "gramado"),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // 5 minutos
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
        <div className="relative w-full h-full overflow-hidden border border-white/10 bg-slate-950 elevator-frame">
          <div className="absolute inset-0 bg-slate-950/60 dashboard-ambient" />

          <div className="relative z-10 grid h-full grid-cols-[340px_1fr] gap-4 p-4 dashboard-grid">
            {/* Coluna de avisos à esquerda */}
            <aside
              className="h-full rounded-2xl bg-[#261446] border border-white/10 overflow-hidden dashboard-avisos"
            >
              <div className="h-full px-4 py-3">
                <MessageBoard messages={messages} />
              </div>
            </aside>

            {/* Barra superior com relogio, clima e status */}
            <header className="flex items-center justify-between gap-3 px-2 py-2 dashboard-header">
              <DigitalClock predio={predio} />

              <div className="flex items-center gap-3">
                <div className="max-w-sm">
                  <WeatherCard
                    data={weatherData ?? null}
                    isLoading={weatherLoading}
                    compact
                  />
                </div>

                <ConnectionStatus
                  isSyncing={isSyncing}
                  isSignalRConnected={isSignalRConnected}
                />
              </div>
            </header>

            {/* Carrossel de noticias */}
            <div className="h-full min-h-0 rounded-2xl overflow-hidden border border-white/10 bg-black/40 dashboard-news">
              <NewsCarousel data={newsData ?? null} isLoading={newsLoading} error={newsError} noticiasInternas={noticiasInternas} />
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
