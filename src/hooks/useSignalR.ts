import { useEffect, useRef, useCallback, useState } from "react";
import {
  HubConnectionBuilder,
  HubConnection,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { getMessages, Message } from "@/services/messageService";
import { getPredio, OrientationMode } from "@/services/predioService";

interface UseSignalROptions {
  slug: string;
  onAvisosReceived: (messages: Message[]) => void;
  onOrientationReceived: (mode: OrientationMode) => void;
}

export function useSignalR({
  slug,
  onAvisosReceived,
  onOrientationReceived,
}: UseSignalROptions) {
  const connectionRef = useRef<HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const startTimeRef = useRef(Date.now());
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs para callbacks (evita que mudança de callback reconecte o hub)
  const onAvisosRef = useRef(onAvisosReceived);
  onAvisosRef.current = onAvisosReceived;
  const onOrientationRef = useRef(onOrientationReceived);
  onOrientationRef.current = onOrientationReceived;

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
        const predioData = await getPredio(slug);
        const mode = predioData.orientationMode ?? "auto";
        onOrientationRef.current(mode);
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
      const predioData = await getPredio(slug);
      onOrientationRef.current(predioData.orientationMode ?? "auto");
    } catch {
      // silencioso
    }
  }, [slug]);

  // Tentativa manual infinita de reconexão (para WiFi intermitente do elevador)
  const startManualRetry = useCallback(
    (connection: HubConnection) => {
      if (retryTimerRef.current) return;

      const attempt = async () => {
        if (connection.state === HubConnectionState.Connected) {
          retryTimerRef.current = null;
          return;
        }

        try {
          await connection.start();
          await connection.invoke("JoinPredio", slug);
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
    const connection = new HubConnectionBuilder()
      .withUrl("/hub/predio")
      .withAutomaticReconnect([0, 1000, 2000, 5000, 10_000, 30_000])
      .configureLogging(LogLevel.Warning)
      .build();

    // --- Handlers de dados ---
    connection.on("ReceiveAvisos", (avisos: unknown) => {
      if (Array.isArray(avisos)) {
        const mapped = mapAvisosToMessages(avisos);
        console.log("[SignalR] Avisos recebidos:", mapped.length);
        onAvisosRef.current(mapped);
      }
    });

    connection.on("ReceiveOrientation", (mode: string) => {
      console.log("[SignalR] Orientação recebida:", mode);
      onOrientationRef.current(mode as OrientationMode);
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
      await connection.invoke("JoinPredio", slug);
      await syncAfterReconnect();
    });

    connection.onclose(() => {
      console.log("[SignalR] Conexão fechada");
      setIsConnected(false);
      startFallbackPolling();
      // Inicia loop de reconexão infinita (WiFi do elevador)
      startManualRetry(connection);
    });

    // --- Iniciar conexão ---
    const start = async () => {
      try {
        await connection.start();
        await connection.invoke("JoinPredio", slug);
        connectionRef.current = connection;
        setIsConnected(true);
        startTimeRef.current = Date.now();
        console.log("[SignalR] Conectado ao grupo:", slug);
      } catch (err) {
        console.error("[SignalR] Erro ao conectar:", err);
        setIsConnected(false);
        startFallbackPolling();
        startManualRetry(connection);
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
