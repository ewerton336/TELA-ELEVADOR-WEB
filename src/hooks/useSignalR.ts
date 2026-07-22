import { useEffect, useRef, useCallback, useState } from "react";
import {
  HubConnectionBuilder,
  HubConnection,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { getMessages, Message } from "@/services/messageService";
import { getTickerMensagens, TickerMensagem } from "@/services/tickerService";
import { getPredio, OrientationMode, ScreenModules } from "@/services/predioService";
import { NoticiaInterna, getNoticiasInternas } from "@/services/noticiaInternaService";
import { getPredioHubUrl, buildBackendUrl } from "@/lib/backendUrl";
import { getScreenDeviceId } from "@/lib/screenDeviceId";
import { setCache, clearAllCache } from "@/lib/cache";
import { logger } from "@/lib/logger";
import { getPerfSnapshot } from "@/lib/perfProbe";
import {
  markOnline,
  markOffline,
  getConnectivitySnapshot,
} from "@/lib/connectivityTracker";
import { getHistory } from "@/lib/offlineRecorder";

/**
 * Coleta os detalhes da tela onde a aplicação está rodando (resolução, zoom,
 * viewport, orientação etc.) para o monitor master poder comparar com o que os
 * testes assumem (ex.: 1920×1080 / 1080×1920).
 */
function collectScreenDetails() {
  const vv = window.visualViewport;
  const docEl = document.documentElement;
  const container = document.querySelector(
    ".elevator-screen",
  ) as HTMLElement | null;
  const dpr = window.devicePixelRatio || 1;
  const estimatedZoom = docEl?.clientWidth
    ? Math.round((window.innerWidth / docEl.clientWidth) * 100) / 100
    : null;

  return {
    capturedAtClient: new Date().toISOString(),
    appVersion: __APP_VERSION__,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth,
    },
    window: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      devicePixelRatio: dpr,
    },
    visualViewport: vv
      ? {
          width: Math.round(vv.width),
          height: Math.round(vv.height),
          scale: vv.scale,
        }
      : null,
    zoom: {
      devicePixelRatio: dpr,
      visualViewportScale: vv?.scale ?? null,
      estimatedZoom,
    },
    orientation:
      window.screen.orientation?.type ??
      (window.innerWidth >= window.innerHeight ? "landscape" : "portrait"),
    documentElement: {
      clientWidth: docEl?.clientWidth ?? null,
      clientHeight: docEl?.clientHeight ?? null,
    },
    elevatorContainer: container
      ? {
          offsetWidth: container.offsetWidth,
          offsetHeight: container.offsetHeight,
          clientWidth: container.clientWidth,
          clientHeight: container.clientHeight,
        }
      : null,
    effectiveOrientation: docEl?.className || "auto",
    layout: (() => {
      const rectOf = (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return {
          x: Math.round(b.x),
          y: Math.round(b.y),
          w: Math.round(b.width),
          h: Math.round(b.height),
        };
      };
      const monthEl = document.querySelector(".clock-badge-month");
      return {
        clockBadge: rectOf(".clock-badge"),
        clockBadgeMonth: rectOf(".clock-badge-month"),
        clockBadgeMonthText: monthEl ? (monthEl.textContent || "").trim() : null,
        dashboardHeader: rectOf(".dashboard-header"),
        newsTicker: rectOf(".news-ticker"),
        avisos: rectOf(".dashboard-avisos"),
      };
    })(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    // Uso de memória JS (Chromium) — permite acompanhar, pelo master, se o
    // heap da tela cresce ao longo do tempo (indício de acúmulo/vazamento).
    performance: (() => {
      const perf = performance as Performance & {
        memory?: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        };
      };
      const mem = perf.memory;
      // FPS/long-tasks — o gargalo real da lentidão 24/7 vive no compositor,
      // que o heap JS não mede. Ver src/lib/perfProbe.ts.
      const fps = getPerfSnapshot();
      return {
        usedJSHeapSize: mem?.usedJSHeapSize ?? null,
        totalJSHeapSize: mem?.totalJSHeapSize ?? null,
        jsHeapSizeLimit: mem?.jsHeapSizeLimit ?? null,
        // segundos desde que a página carregou (uptime da aba/tela)
        uptimeSeconds: Math.round(performance.now() / 1000),
        // Renderização (perfProbe): FPS atual/pior, pior quadro e long tasks
        // na janela dos últimos 60s. Correlacionar com uptimeSeconds mostra se
        // e quando a tela degrada.
        fps: fps.fps,
        fpsMin: fps.fpsMin,
        worstFrameMs: fps.worstFrameMs,
        longTasks: fps.longTasks,
        longTaskMaxMs: fps.longTaskMaxMs,
        // Total de nós no DOM — detecta acúmulo de elementos ao longo do tempo.
        domNodes: document.getElementsByTagName("*").length,
      };
    })(),
    // Histórico de quedas de conexão desde o load. O elevador perde WiFi ao se
    // mover; como o master não alcança um aparelho offline, a tela guarda o
    // histórico e reporta quando volta — permite correlacionar FPS × offline.
    connectivity: getConnectivitySnapshot(),
    history: getHistory(),
    hardware: {
      deviceMemory:
        (navigator as Navigator & { deviceMemory?: number }).deviceMemory ??
        null,
      hardwareConcurrency: navigator.hardwareConcurrency ?? null,
      // Reflete se o modo de desempenho está ativo nesta tela.
      perfMode: docEl?.classList.contains("perf-mode") ?? false,
    },
  };
}

async function reportScreenDetails() {
  try {
    await fetch(buildBackendUrl("/api/admin/monitor/details-data"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: getScreenDeviceId(),
        details: collectScreenDetails(),
      }),
    });
  } catch {
    void 0;
  }
}

interface UseSignalROptions {
  slug: string;
  onAvisosReceived: (messages: Message[]) => void;
  onTickerMensagensReceived?: (mensagens: TickerMensagem[]) => void;
  onOrientationReceived: (mode: OrientationMode) => void;
  onNoticiasInternasReceived?: (noticias: NoticiaInterna[]) => void;
  onModulesReceived?: (modules: ScreenModules) => void;
}

export function useSignalR({
  slug,
  onAvisosReceived,
  onTickerMensagensReceived,
  onOrientationReceived,
  onNoticiasInternasReceived,
  onModulesReceived,
}: UseSignalROptions) {
  const connectionRef = useRef<HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const startTimeRef = useRef(Date.now());
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenshotBusyRef = useRef(false);

  // Refs para callbacks (evita que mudança de callback reconecte o hub)
  const onAvisosRef = useRef(onAvisosReceived);
  onAvisosRef.current = onAvisosReceived;
  const onTickerMensagensRef = useRef(onTickerMensagensReceived);
  onTickerMensagensRef.current = onTickerMensagensReceived;
  const onOrientationRef = useRef(onOrientationReceived);
  onOrientationRef.current = onOrientationReceived;
  const onNoticiasInternasRef = useRef(onNoticiasInternasReceived);
  onNoticiasInternasRef.current = onNoticiasInternasReceived;
  const onModulesRef = useRef(onModulesReceived);
  onModulesRef.current = onModulesReceived;

  // Mapeia avisos do formato da API para Message[]
  const mapAvisosToMessages = useCallback(
    (avisos: Array<{
      id: number;
      titulo: string;
      mensagem: string;
      inicioEm?: string | null;
      fimEm?: string | null;
      ativo: boolean;
      prioridade?: string;
      criadoEm: string;
    }>): Message[] => {
      return avisos.map((a) => ({
        id: String(a.id),
        title: a.titulo,
        content: a.mensagem,
        priority: a.prioridade === "urgent" ? "urgent" : "normal",
        active: a.ativo,
        createdAt: a.criadoEm,
        updatedAt: a.criadoEm,
      })) as Message[];
    },
    [],
  );

  // Fallback de polling — ativa quando SignalR desconecta
  const startFallbackPolling = useCallback(() => {
    if (fallbackTimerRef.current) return; // já ativo
    logger.log("[SignalR] Fallback polling ativado");

    fallbackTimerRef.current = setInterval(async () => {
      try {
        const msgs = await getMessages(slug);
        if (msgs) onAvisosRef.current(msgs);
      } catch {
        // silencioso — sem rede
      }
      try {
        const ticker = await getTickerMensagens(slug);
        onTickerMensagensRef.current?.(ticker);
      } catch {
        void 0;
      }
      try {
        const predioData = await getPredio(slug);
        const mode = predioData.orientationMode ?? "auto";
        onOrientationRef.current(mode);
        if (predioData.modules) onModulesRef.current?.(predioData.modules);
      } catch {
        // silencioso
      }
    }, 10_000);
  }, [slug]);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackTimerRef.current) {
      logger.log("[SignalR] Fallback polling desativado");
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  // Busca dados atuais ao reconectar (pode ter perdido updates enquanto offline)
  const syncAfterReconnect = useCallback(async () => {
    try {
      const msgs = await getMessages(slug);
      if (msgs) onAvisosRef.current(msgs);
    } catch {
      // silencioso
    }
    try {
      const ticker = await getTickerMensagens(slug);
      onTickerMensagensRef.current?.(ticker);
    } catch {
      void 0;
    }
    try {
      const predioData = await getPredio(slug);
      onOrientationRef.current(predioData.orientationMode ?? "auto");
      if (predioData.modules) onModulesRef.current?.(predioData.modules);
    } catch {
      // silencioso
    }
    try {
      const ni = await getNoticiasInternas(slug);
      onNoticiasInternasRef.current?.(ni);
    } catch {
      // silencioso
    }
  }, [slug]);

  // Tentativa manual infinita de reconexão (para WiFi intermitente do elevador)
  const startManualRetry = useCallback(
    (connection: HubConnection, deviceId: string) => {
      if (retryTimerRef.current) return;

      const attempt = async () => {
        if (
          connection.state === HubConnectionState.Connected ||
          connection.state === HubConnectionState.Reconnecting
        ) {
          retryTimerRef.current = null;
          return;
        }

        try {
          await connection.start();
          await connection.invoke("JoinPredio", slug, __APP_VERSION__, deviceId);
          setIsConnected(true);
          markOnline();
          stopFallbackPolling();
          await syncAfterReconnect();
          void reportScreenDetails();
          retryTimerRef.current = null;
          logger.log("[SignalR] Reconexão manual bem-sucedida");
        } catch {
          // Tenta novamente em 15s
          retryTimerRef.current = setTimeout(attempt, 15_000);
        }
      };

      retryTimerRef.current = setTimeout(attempt, 15_000);
    },
    [slug, stopFallbackPolling, syncAfterReconnect],
  );

  useEffect(() => {
    const deviceId = getScreenDeviceId();

    const connection = new HubConnectionBuilder()
      .withUrl(getPredioHubUrl())
      .withAutomaticReconnect([0, 1000, 2000, 5000, 10_000, 30_000])
      .configureLogging(LogLevel.Warning)
      .build();

    // --- Handlers de dados ---
    connection.on("ReceiveAvisos", (avisos: unknown) => {
      if (Array.isArray(avisos)) {
        const mapped = mapAvisosToMessages(avisos);
        logger.log("[SignalR] Avisos recebidos:", mapped.length);
        // Atualiza cache para que fallback polling use dados recentes
        setCache(`messages:${slug}`, mapped, 24 * 60);
        onAvisosRef.current(mapped);
      }
    });

    connection.on("ReceiveTickerMensagens", (data: unknown) => {
      if (Array.isArray(data)) {
        logger.log("[SignalR] Ticker mensagens recebidas:", data.length);
        setCache(`ticker:${slug}`, data, 24 * 60);
        onTickerMensagensRef.current?.(data as TickerMensagem[]);
      }
    });

    connection.on("ReceiveOrientation", (mode: string) => {
      logger.log("[SignalR] Orientação recebida:", mode);
      onOrientationRef.current(mode as OrientationMode);
    });

    connection.on("NoticiasInternasChanged", (noticias: unknown) => {
      if (Array.isArray(noticias)) {
        logger.log("[SignalR] Notícias internas recebidas:", noticias.length);
        onNoticiasInternasRef.current?.(noticias as NoticiaInterna[]);
      }
    });

    connection.on("ReceiveModules", (modules: unknown) => {
      if (modules && typeof modules === "object") {
        logger.log("[SignalR] Módulos recebidos:", modules);
        onModulesRef.current?.(modules as ScreenModules);
      }
    });

    connection.on("ForceRefresh", async () => {
      logger.log("[SignalR] ForceRefresh recebido — limpando cache e recarregando");
      try {
        clearAllCache();
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        void 0;
      }
      window.location.reload();
    });

    connection.on("RequestScreenshot", async () => {
      if (screenshotBusyRef.current) return;
      screenshotBusyRef.current = true;
      try {
        // Captura NATIVA exata (PixelCopy no app Android), quando disponível —
        // pega os pixels reais (imagens cross-origin, GIF, gradiente). O
        // html2canvas re-renderiza o DOM e diverge da tela.
        const native = (
          window as unknown as {
            AndroidNative?: {
              captureAndUpload?: (deviceId: string, uploadUrl: string) => void;
            };
          }
        ).AndroidNative;
        if (native && typeof native.captureAndUpload === "function") {
          native.captureAndUpload(
            getScreenDeviceId(),
            buildBackendUrl("/api/admin/monitor/screenshot-data"),
          );
          return;
        }

        const html2canvas = (await import("html2canvas")).default;
        const el =
          (document.querySelector(".elevator-screen") as HTMLElement) ??
          document.body;
        const canvas = await html2canvas(el, {
          backgroundColor: "#0f172a",
          logging: false,
          scale: 1,
          // Imagens cross-origin (ex.: fotos de notícias do G1) não enviam CORS
          // e sairiam em branco no print. Com useCORS=false + proxy, o
          // html2canvas busca essas imagens pelo proxy do backend (same-origin).
          useCORS: false,
          proxy: buildBackendUrl("/api/media/proxy"),
          imageTimeout: 15000,
        });
        const dataUrl = canvas.toDataURL("image/png");
        await fetch(buildBackendUrl("/api/admin/monitor/screenshot-data"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: getScreenDeviceId(),
            imageBase64: dataUrl,
          }),
        });
      } catch {
        void 0;
      } finally {
        screenshotBusyRef.current = false;
      }
    });

    connection.on("RequestScreenDetails", () => {
      void reportScreenDetails();
    });

    // --- Handlers de conexão ---
    connection.onreconnecting(() => {
      logger.log("[SignalR] Reconectando...");
      setIsConnected(false);
      markOffline();
      startFallbackPolling();
    });

    connection.onreconnected(async () => {
      logger.log("[SignalR] Reconectado, re-entrando no grupo");
      setIsConnected(true);
      markOnline();
      stopFallbackPolling();
      // Cancela retry manual para evitar JoinPredio duplicado
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      await connection.invoke("JoinPredio", slug, __APP_VERSION__, deviceId);
      await syncAfterReconnect();
      void reportScreenDetails();
    });

    connection.onclose(() => {
      logger.log("[SignalR] Conexão fechada");
      setIsConnected(false);
      markOffline();
      startFallbackPolling();
      // Inicia loop de reconexão infinita (WiFi do elevador)
      startManualRetry(connection, deviceId);
    });

    // --- Iniciar conexão ---
    const start = async () => {
      try {
        await connection.start();
        await connection.invoke("JoinPredio", slug, __APP_VERSION__, deviceId);
        connectionRef.current = connection;
        setIsConnected(true);
        markOnline();
        startTimeRef.current = Date.now();
        logger.log("[SignalR] Conectado ao grupo:", slug);
      } catch (err) {
        logger.error("[SignalR] Erro ao conectar:", err);
        setIsConnected(false);
        markOffline();
        startFallbackPolling();
        startManualRetry(connection, deviceId);
      }
    };

    start();

    // --- Heartbeat periódico (30s) ---
    const heartbeatInterval = setInterval(() => {
      if (connection.state === HubConnectionState.Connected) {
        connection
          .invoke("Heartbeat", {
            slug,
            uptime: (Date.now() - startTimeRef.current) / 1000,
            isVisible: document.visibilityState === "visible",
            appVersion: __APP_VERSION__,
          })
          .catch(() => {});
      }
    }, 60_000);

    return () => {
      clearInterval(heartbeatInterval);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      stopFallbackPolling();
      connection.stop();
    };
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isConnected };
}
