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
import { setCache } from "@/lib/cache";

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
    console.log("[SignalR] Fallback polling ativado");

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
      console.log("[SignalR] Fallback polling desativado");
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
          stopFallbackPolling();
          await syncAfterReconnect();
          retryTimerRef.current = null;
          console.log("[SignalR] Reconexão manual bem-sucedida");
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
        console.log("[SignalR] Avisos recebidos:", mapped.length);
        // Atualiza cache para que fallback polling use dados recentes
        setCache(`messages:${slug}`, mapped, 24 * 60);
        onAvisosRef.current(mapped);
      }
    });

    connection.on("ReceiveTickerMensagens", (data: unknown) => {
      if (Array.isArray(data)) {
        console.log("[SignalR] Ticker mensagens recebidas:", data.length);
        setCache(`ticker:${slug}`, data, 24 * 60);
        onTickerMensagensRef.current?.(data as TickerMensagem[]);
      }
    });

    connection.on("ReceiveOrientation", (mode: string) => {
      console.log("[SignalR] Orientação recebida:", mode);
      onOrientationRef.current(mode as OrientationMode);
    });

    connection.on("NoticiasInternasChanged", (noticias: unknown) => {
      if (Array.isArray(noticias)) {
        console.log("[SignalR] Notícias internas recebidas:", noticias.length);
        onNoticiasInternasRef.current?.(noticias as NoticiaInterna[]);
      }
    });

    connection.on("ReceiveModules", (modules: unknown) => {
      if (modules && typeof modules === "object") {
        console.log("[SignalR] Módulos recebidos:", modules);
        onModulesRef.current?.(modules as ScreenModules);
      }
    });

    // Comando remoto: forçar atualização da tela
    connection.on("ForceRefresh", () => {
      console.log("[SignalR] ForceRefresh recebido — recarregando página");
      window.location.reload();
    });

    connection.on("RequestScreenshot", async () => {
      try {
        const html2canvas = (await import("html2canvas")).default;
        const el =
          (document.querySelector(".elevator-screen") as HTMLElement) ??
          document.body;
        const canvas = await html2canvas(el, {
          useCORS: true,
          backgroundColor: "#0f172a",
          logging: false,
          scale: 1,
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
      }
    });

    // --- Handlers de conexão ---
    connection.onreconnecting(() => {
      console.log("[SignalR] Reconectando...");
      setIsConnected(false);
      startFallbackPolling();
    });

    connection.onreconnected(async () => {
      console.log("[SignalR] Reconectado, re-entrando no grupo");
      setIsConnected(true);
      stopFallbackPolling();
      // Cancela retry manual para evitar JoinPredio duplicado
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      await connection.invoke("JoinPredio", slug, __APP_VERSION__, deviceId);
      await syncAfterReconnect();
    });

    connection.onclose(() => {
      console.log("[SignalR] Conexão fechada");
      setIsConnected(false);
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
        startTimeRef.current = Date.now();
        console.log("[SignalR] Conectado ao grupo:", slug);
      } catch (err) {
        console.error("[SignalR] Erro ao conectar:", err);
        setIsConnected(false);
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
