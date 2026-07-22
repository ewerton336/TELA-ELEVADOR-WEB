import { useEffect, useRef, useState, useCallback } from "react";
import {
  HubConnectionBuilder,
  HubConnection,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { Card, CardContent } from "@/components/ui/card";
import { Monitor, Wifi, WifiOff, Eye, EyeOff, RefreshCw, RotateCw, Camera, X, Download, Ruler, Clock, Image as ImageIcon, Copy, Check, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { requestAdminJson } from "@/services/apiClient";
import { getPredioHubUrl, buildBackendUrl } from "@/lib/backendUrl";
import { computeLatestVersion, isScreenOutdated } from "@/lib/screenVersion";

interface ScreenInfo {
  connectionId: string;
  deviceId: string;
  slug: string;
  connectedAt: string;
  lastHeartbeat: string;
  uptime: number; // seconds
  isVisible: boolean;
  connected: boolean;
  disconnectedAt?: string | null;
  pendingRefresh?: boolean;
  pendingScreenshot?: boolean;
  pendingDetails?: boolean;
  userAgent?: string;
  appVersion?: string;
}

// Detalhes da tela reportados pela tela do elevador (resolução, zoom etc.)
type ScreenDetails = Record<string, unknown>;

interface CaptureTimes {
  screenshotAt?: string;
  detailsAt?: string;
}

interface ScreenMonitorProps {
  token: string | null;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

import { formatTimeAgo } from "@/lib/dateFormatter";

// Formata os detalhes da tela em linhas legíveis (label → valor) para o modal.
function formatScreenDetailRows(
  details: ScreenDetails,
): { label: string; value: string }[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = details as any;
  const dim = (w?: unknown, h?: unknown) =>
    w != null && h != null ? `${w} × ${h}` : "—";
  return [
    { label: "Resolução física", value: dim(d.screen?.width, d.screen?.height) },
    {
      label: "Resolução disponível",
      value: dim(d.screen?.availWidth, d.screen?.availHeight),
    },
    {
      label: "Viewport (janela)",
      value: dim(d.window?.innerWidth, d.window?.innerHeight),
    },
    {
      label: "Viewport visual",
      value: d.visualViewport
        ? `${dim(d.visualViewport.width, d.visualViewport.height)} (escala ${d.visualViewport.scale})`
        : "—",
    },
    {
      label: "Device Pixel Ratio",
      value: String(
        d.window?.devicePixelRatio ?? d.zoom?.devicePixelRatio ?? "—",
      ),
    },
    {
      label: "Zoom estimado",
      value:
        d.zoom?.estimatedZoom != null
          ? `${Math.round(d.zoom.estimatedZoom * 100)}%`
          : "—",
    },
    { label: "Orientação", value: String(d.orientation ?? "—") },
    {
      label: "Profundidade de cor",
      value: d.screen?.colorDepth != null ? `${d.screen.colorDepth} bits` : "—",
    },
    {
      label: "Container .elevator-screen",
      value: d.elevatorContainer
        ? dim(d.elevatorContainer.offsetWidth, d.elevatorContainer.offsetHeight)
        : "—",
    },
    {
      label: "documentElement",
      value: dim(d.documentElement?.clientWidth, d.documentElement?.clientHeight),
    },
    { label: "Plataforma", value: String(d.platform ?? "—") },
    { label: "Idioma", value: String(d.language ?? "—") },
    {
      label: "Versão do app",
      value: d.appVersion
        ? new Date(d.appVersion).toLocaleString("pt-BR")
        : "—",
    },
    { label: "Modo (html)", value: String(d.effectiveOrientation ?? "—") },
    { label: "Badge data", value: rectStr(d.layout?.clockBadge) },
    {
      label: "Mês no badge",
      value: d.layout?.clockBadgeMonth
        ? `"${d.layout.clockBadgeMonthText ?? ""}" ${rectStr(d.layout.clockBadgeMonth)}`
        : "—",
    },
    { label: "Header", value: rectStr(d.layout?.dashboardHeader) },
    { label: "Ticker (rodapé)", value: rectStr(d.layout?.newsTicker) },
    { label: "Coluna avisos", value: rectStr(d.layout?.avisos) },
    {
      label: "RAM JS usada",
      value: (() => {
        const used = d.performance?.usedJSHeapSize;
        const limit = d.performance?.jsHeapSizeLimit;
        if (typeof used !== "number") return "—";
        const base = formatBytes(used);
        return typeof limit === "number" && limit > 0
          ? `${base} (${Math.round((used / limit) * 100)}%)`
          : base;
      })(),
    },
    { label: "RAM JS total", value: formatBytes(d.performance?.totalJSHeapSize) },
    {
      label: "Limite de heap JS",
      value: formatBytes(d.performance?.jsHeapSizeLimit),
    },
    {
      label: "Tempo desde carregamento",
      value:
        typeof d.performance?.uptimeSeconds === "number"
          ? formatUptime(d.performance.uptimeSeconds)
          : "—",
    },
    {
      label: "FPS (agora / pior 60s)",
      value: (() => {
        const fps = d.performance?.fps;
        const min = d.performance?.fpsMin;
        if (typeof fps !== "number" && typeof min !== "number") return "—";
        const a = typeof fps === "number" ? String(fps) : "—";
        const b = typeof min === "number" ? String(min) : "—";
        return `${a} / ${b}`;
      })(),
    },
    {
      label: "Pior quadro (60s)",
      value:
        typeof d.performance?.worstFrameMs === "number"
          ? `${d.performance.worstFrameMs} ms`
          : "—",
    },
    {
      label: "Long tasks (60s)",
      value:
        typeof d.performance?.longTasks === "number"
          ? `${d.performance.longTasks}${
              typeof d.performance?.longTaskMaxMs === "number" &&
              d.performance.longTaskMaxMs > 0
                ? ` (máx ${d.performance.longTaskMaxMs} ms)`
                : ""
            }`
          : "—",
    },
    {
      label: "Nós no DOM",
      value:
        typeof d.performance?.domNodes === "number"
          ? String(d.performance.domNodes)
          : "—",
    },
    {
      label: "Memória do dispositivo",
      value:
        d.hardware?.deviceMemory != null
          ? `${d.hardware.deviceMemory} GB`
          : "—",
    },
    {
      label: "Núcleos de CPU",
      value:
        d.hardware?.hardwareConcurrency != null
          ? String(d.hardware.hardwareConcurrency)
          : "—",
    },
    {
      label: "Modo desempenho",
      value:
        d.hardware?.perfMode === true
          ? "Ativo"
          : d.hardware?.perfMode === false
            ? "Desligado"
            : "—",
    },
  ];
}

function rectStr(
  r: { x: number; y: number; w: number; h: number } | null | undefined,
): string {
  if (!r) return "—";
  return `${r.w}×${r.h} @ (${r.x}, ${r.y})`;
}

// Formata bytes em MB (para o uso de memória JS reportado pela tela).
function formatBytes(bytes: unknown): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes)) return "—";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Heartbeat parado por muito tempo, mesmo com conexão ativa (tela travada)
function hasStaleHeartbeat(screen: ScreenInfo): boolean {
  if (!screen.connected) return false;
  const diff = Date.now() - new Date(screen.lastHeartbeat).getTime();
  return diff > 120_000; // 2 minutos
}

export function ScreenMonitor({ token }: ScreenMonitorProps) {
  const [screens, setScreens] = useState<ScreenInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // deviceIds com comando de atualização em andamento → "Enviado" | "Agendado"
  const [refreshingIds, setRefreshingIds] = useState<Map<string, string>>(new Map());
  const [capturingIds, setCapturingIds] = useState<Set<string>>(new Set());
  const [capturingDetailsIds, setCapturingDetailsIds] = useState<Set<string>>(new Set());
  const [screenshotUrls, setScreenshotUrls] = useState<Map<string, string>>(new Map());
  const [openScreenshotId, setOpenScreenshotId] = useState<string | null>(null);
  // deviceId → últimos detalhes (resolução/zoom/etc.) obtidos
  const [screenDetails, setScreenDetails] = useState<Map<string, { capturedAt: string; details: ScreenDetails }>>(new Map());
  const [openDetailsId, setOpenDetailsId] = useState<string | null>(null);
  const [detailsCopied, setDetailsCopied] = useState(false);
  // deviceId → data/hora do último print e dos últimos detalhes obtidos
  const [captureTimes, setCaptureTimes] = useState<Map<string, CaptureTimes>>(new Map());
  const connectionRef = useRef<HubConnection | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const detailsTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const screenshotUrlsRef = useRef<Map<string, string>>(new Map());

  // Atualiza (merge) a data/hora do último print/detalhes de uma tela.
  const mergeCaptureTime = useCallback((deviceId: string, patch: CaptureTimes) => {
    setCaptureTimes((prev) => {
      const next = new Map(prev);
      next.set(deviceId, { ...next.get(deviceId), ...patch });
      return next;
    });
  }, []);

  const tokenRef = useRef(token);
  tokenRef.current = token;

  const clearCaptureTimer = useCallback((deviceId: string) => {
    const timer = captureTimersRef.current.get(deviceId);
    if (timer) {
      clearTimeout(timer);
      captureTimersRef.current.delete(deviceId);
    }
  }, []);

  const stopCapturing = useCallback((deviceId: string) => {
    setCapturingIds((prev) => {
      const next = new Set(prev);
      next.delete(deviceId);
      return next;
    });
  }, []);

  const clearDetailsTimer = useCallback((deviceId: string) => {
    const timer = detailsTimersRef.current.get(deviceId);
    if (timer) {
      clearTimeout(timer);
      detailsTimersRef.current.delete(deviceId);
    }
  }, []);

  const stopCapturingDetails = useCallback((deviceId: string) => {
    setCapturingDetailsIds((prev) => {
      const next = new Set(prev);
      next.delete(deviceId);
      return next;
    });
  }, []);

  // Força re-render a cada 10s para atualizar "time ago"
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(timer);
  }, []);

  // Fallback REST
  const fetchScreensRest = useCallback(async () => {
    try {
      const data = await requestAdminJson<ScreenInfo[]>(
        "/monitor/screens",
        {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
        "getScreens",
      );
      setScreens(data);
    } catch {
      // silencioso
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(getPredioHubUrl())
      .withAutomaticReconnect([0, 2000, 5000, 10_000])
      .configureLogging(LogLevel.Warning)
      .build();

    const refreshSnapshot = () => {
      if (connection.state === HubConnectionState.Connected) {
        connection.invoke("JoinMonitor").catch(() => {});
      }
    };

    connection.on("ScreenSnapshot", (data: ScreenInfo[]) => {
      setScreens(data);
      setIsLoading(false);
    });

    // Tela (re)conectou — recarrega o snapshot completo para refletir o estado.
    connection.on("ScreenConnected", () => refreshSnapshot());

    // Tela desconectou — NÃO some da lista; recarrega o snapshot, que agora
    // traz a tela marcada como offline (retida por até 8h).
    connection.on("ScreenDisconnected", () => refreshSnapshot());

    connection.on(
      "ScreenHeartbeat",
      (hb: {
        connectionId: string;
        slug: string;
        uptime: number;
        isVisible: boolean;
        appVersion?: string;
        receivedAt: string;
      }) => {
        setScreens((prev) =>
          prev.map((s) =>
            s.connectionId === hb.connectionId
              ? {
                  ...s,
                  lastHeartbeat: hb.receivedAt,
                  uptime: hb.uptime,
                  isVisible: hb.isVisible,
                  connected: true,
                  appVersion: hb.appVersion ?? s.appVersion,
                }
              : s,
          ),
        );
      },
    );

    connection.on(
      "ScreenshotReady",
      async ({ deviceId, capturedAt }: { deviceId: string; capturedAt?: string }) => {
        try {
          const res = await fetch(
            buildBackendUrl(`/api/admin/monitor/screenshot/${deviceId}`),
            {
              headers: tokenRef.current
                ? { Authorization: `Bearer ${tokenRef.current}` }
                : {},
            },
          );
          if (!res.ok) return;
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const previous = screenshotUrlsRef.current.get(deviceId);
          if (previous) URL.revokeObjectURL(previous);
          screenshotUrlsRef.current.set(deviceId, url);
          setScreenshotUrls((prev) => new Map(prev).set(deviceId, url));
          mergeCaptureTime(deviceId, {
            screenshotAt: capturedAt ?? new Date().toISOString(),
          });
          clearCaptureTimer(deviceId);
          stopCapturing(deviceId);
          setOpenScreenshotId(deviceId);
        } catch {
          clearCaptureTimer(deviceId);
          stopCapturing(deviceId);
        }
      },
    );

    connection.on(
      "ScreenDetailsReady",
      async ({ deviceId, capturedAt }: { deviceId: string; capturedAt?: string }) => {
        try {
          const res = await fetch(
            buildBackendUrl(`/api/admin/monitor/details/${deviceId}`),
            {
              headers: tokenRef.current
                ? { Authorization: `Bearer ${tokenRef.current}` }
                : {},
            },
          );
          if (!res.ok) return;
          const payload = (await res.json()) as {
            capturedAt: string;
            details: ScreenDetails;
          };
          setScreenDetails((prev) =>
            new Map(prev).set(deviceId, {
              capturedAt: payload.capturedAt ?? capturedAt ?? new Date().toISOString(),
              details: payload.details,
            }),
          );
          mergeCaptureTime(deviceId, {
            detailsAt: payload.capturedAt ?? capturedAt ?? new Date().toISOString(),
          });
          clearDetailsTimer(deviceId);
          stopCapturingDetails(deviceId);
          setOpenDetailsId(deviceId);
        } catch {
          clearDetailsTimer(deviceId);
          stopCapturingDetails(deviceId);
        }
      },
    );

    connection.onreconnected(async () => {
      setIsConnected(true);
      await connection.invoke("JoinMonitor");
    });

    connection.onclose(() => {
      setIsConnected(false);
      // Fallback: polling REST a cada 15s
      refreshTimerRef.current = setInterval(fetchScreensRest, 15_000);
    });

    connection.onreconnecting(() => {
      setIsConnected(false);
    });

    const start = async () => {
      try {
        await connection.start();
        await connection.invoke("JoinMonitor");
        connectionRef.current = connection;
        setIsConnected(true);
      } catch {
        setIsConnected(false);
        // Fallback REST
        await fetchScreensRest();
        refreshTimerRef.current = setInterval(fetchScreensRest, 15_000);
      }
    };

    start();

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      connection.stop();
    };
  }, [
    fetchScreensRest,
    clearCaptureTimer,
    stopCapturing,
    mergeCaptureTime,
    clearDetailsTimer,
    stopCapturingDetails,
  ]);

  useEffect(() => {
    const timers = captureTimersRef.current;
    const detailsTimers = detailsTimersRef.current;
    const urls = screenshotUrlsRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      detailsTimers.forEach((timer) => clearTimeout(timer));
      detailsTimers.clear();
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  // Ao montar, busca os timestamps do "último obtido" (print/detalhes) de cada
  // tela — assim mostramos a última informação mesmo que o monitor não
  // estivesse aberto quando a captura agendada chegou.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await requestAdminJson<
          Array<{ deviceId: string; screenshotAt?: string | null; detailsAt?: string | null }>
        >(
          "/monitor/captures",
          {
            method: "GET",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
          "getCaptures",
        );
        if (cancelled) return;
        setCaptureTimes((prev) => {
          const next = new Map(prev);
          for (const c of data) {
            next.set(c.deviceId, {
              screenshotAt: c.screenshotAt ?? next.get(c.deviceId)?.screenshotAt,
              detailsAt: c.detailsAt ?? next.get(c.deviceId)?.detailsAt,
            });
          }
          return next;
        });
      } catch {
        // silencioso
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Agrupar por slug
  const grouped = screens.reduce<Record<string, ScreenInfo[]>>((acc, s) => {
    if (!acc[s.slug]) acc[s.slug] = [];
    acc[s.slug].push(s);
    return acc;
  }, {});

  const onlineCount = screens.filter((s) => s.connected).length;
  const offlineCount = screens.length - onlineCount;

  // "Mais recente" = maior build entre o do próprio master e o de todas as telas.
  // Evita falso "Desatualizada" quando a aba do master está num build antigo.
  const latestVersion = computeLatestVersion([
    __APP_VERSION__,
    ...screens.map((s) => s.appVersion),
  ]);

  // Marca otimisticamente uma ação como agendada (badge aparece na hora; o
  // próximo snapshot do servidor confirma).
  const setPendingFlag = useCallback(
    (
      deviceId: string,
      key: "pendingRefresh" | "pendingScreenshot" | "pendingDetails",
      value: boolean,
    ) => {
      setScreens((prev) =>
        prev.map((s) =>
          s.deviceId === deviceId ? { ...s, [key]: value } : s,
        ),
      );
    },
    [],
  );

  const authHeaders = (json = true) => ({
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const handleForceRefresh = async (screen: ScreenInfo) => {
    const label = screen.connected ? "Enviado" : "Agendado";
    setRefreshingIds((prev) => new Map(prev).set(screen.deviceId, label));
    try {
      const res = await requestAdminJson<{ queued?: boolean }>(
        "/monitor/force-refresh",
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ deviceId: screen.deviceId }),
        },
        "forceRefresh",
      );
      if (res?.queued) setPendingFlag(screen.deviceId, "pendingRefresh", true);
    } catch {
      // silencioso
    } finally {
      setTimeout(() => {
        setRefreshingIds((prev) => {
          const next = new Map(prev);
          next.delete(screen.deviceId);
          return next;
        });
      }, 2000);
    }
  };

  const handleRequestScreenshot = async (screen: ScreenInfo) => {
    const deviceId = screen.deviceId;
    if (screen.connected) {
      // Online: mostra spinner até o print chegar (ou expira em 15s).
      setCapturingIds((prev) => new Set(prev).add(deviceId));
      clearCaptureTimer(deviceId);
      captureTimersRef.current.set(
        deviceId,
        setTimeout(() => {
          captureTimersRef.current.delete(deviceId);
          stopCapturing(deviceId);
        }, 15_000),
      );
    }
    try {
      const res = await requestAdminJson<{ queued?: boolean }>(
        "/monitor/request-screenshot",
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ deviceId }),
        },
        "requestScreenshot",
      );
      if (res?.queued) {
        // Offline — print agendado para a próxima reconexão.
        setPendingFlag(deviceId, "pendingScreenshot", true);
        clearCaptureTimer(deviceId);
        stopCapturing(deviceId);
      }
    } catch {
      clearCaptureTimer(deviceId);
      stopCapturing(deviceId);
    }
  };

  const handleRequestDetails = async (screen: ScreenInfo) => {
    const deviceId = screen.deviceId;
    if (screen.connected) {
      setCapturingDetailsIds((prev) => new Set(prev).add(deviceId));
      clearDetailsTimer(deviceId);
      detailsTimersRef.current.set(
        deviceId,
        setTimeout(() => {
          detailsTimersRef.current.delete(deviceId);
          stopCapturingDetails(deviceId);
        }, 15_000),
      );
    }
    try {
      const res = await requestAdminJson<{ queued?: boolean }>(
        "/monitor/request-details",
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ deviceId }),
        },
        "requestDetails",
      );
      if (res?.queued) {
        // Offline — detalhes agendados para a próxima reconexão.
        setPendingFlag(deviceId, "pendingDetails", true);
        clearDetailsTimer(deviceId);
        stopCapturingDetails(deviceId);
      }
    } catch {
      clearDetailsTimer(deviceId);
      stopCapturingDetails(deviceId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Monitor className="w-5 h-5 text-slate-600" />
          <div>
            <h3 className="text-lg font-semibold">Monitor de Telas</h3>
            <p className="text-sm text-slate-500">
              {onlineCount} tela{onlineCount !== 1 ? "s" : ""} online
              {offlineCount > 0 && (
                <span className="text-slate-400 ml-1">
                  ({offlineCount} offline)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              isConnected
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {isConnected ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            {isConnected ? "Tempo real" : "Polling REST"}
          </div>
          {!isConnected && (
            <Button
              size="sm"
              variant="outline"
              onClick={fetchScreensRest}
              className="h-11 sm:h-9"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Atualizar
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="text-center text-slate-500 py-8">
          Carregando telas...
        </div>
      ) : screens.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma tela registrada</p>
            <p className="text-sm mt-1">
              As telas dos elevadores aparecerão aqui quando se conectarem
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([slug, slugScreens]) => (
              <Card key={slug}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-semibold text-sm uppercase tracking-wide text-slate-700">
                      {slug}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({slugScreens.length} tela
                      {slugScreens.length !== 1 ? "s" : ""})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {slugScreens.map((screen) => {
                      const online = screen.connected;
                      const stale = hasStaleHeartbeat(screen);
                      const outdated = isScreenOutdated(screen.appVersion, latestVersion);
                      const refreshLabel = refreshingIds.get(screen.deviceId);
                      const isRefreshing = refreshLabel !== undefined;
                      const isCapturing = capturingIds.has(screen.deviceId);
                      const isCapturingDetails = capturingDetailsIds.has(screen.deviceId);
                      const times = captureTimes.get(screen.deviceId);
                      const hasScreenshot = screenshotUrls.has(screen.deviceId);
                      const hasDetails = screenDetails.has(screen.deviceId);
                      return (
                        <div
                          key={screen.deviceId}
                          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border ${
                            online ? "bg-slate-50" : "bg-slate-100/70"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                online
                                  ? stale
                                    ? "bg-yellow-500"
                                    : "bg-green-500 animate-pulse"
                                  : "bg-slate-400"
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium">
                                  Tela:{" "}
                                  <span className="font-mono text-xs text-slate-500">
                                    {screen.deviceId.slice(0, 8)}...
                                  </span>
                                </p>
                                {!online && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                                    Offline
                                  </span>
                                )}
                                {screen.pendingRefresh && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                                    Atualização agendada
                                  </span>
                                )}
                                {screen.pendingScreenshot && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                                    Print agendado
                                  </span>
                                )}
                                {screen.pendingDetails && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-100 text-teal-700">
                                    Detalhes agendados
                                  </span>
                                )}
                                {outdated && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700">
                                    Desatualizada
                                  </span>
                                )}
                                {!outdated && screen.appVersion && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-600">
                                    Atualizada
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">
                                {online
                                  ? `Conectada há ${formatUptime(screen.uptime)}`
                                  : `Desconectada ${formatTimeAgo(screen.disconnectedAt ?? screen.lastHeartbeat)}`}
                              </p>
                              {screen.appVersion && (
                                <p className="text-[10px] text-slate-400 font-mono">
                                  v: {new Date(screen.appVersion).toLocaleString("pt-BR")}
                                </p>
                              )}
                              {(times?.screenshotAt || times?.detailsAt) && (
                                <div className="mt-1 flex flex-col gap-0.5">
                                  {times?.screenshotAt && (
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                      <ImageIcon className="w-3 h-3 text-purple-500" />
                                      <span>
                                        Último print {formatTimeAgo(times.screenshotAt)}
                                      </span>
                                      {hasScreenshot && (
                                        <button
                                          type="button"
                                          onClick={() => setOpenScreenshotId(screen.deviceId)}
                                          className="text-purple-600 hover:underline font-medium"
                                        >
                                          ver
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {times?.detailsAt && (
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                      <Ruler className="w-3 h-3 text-teal-500" />
                                      <span>
                                        Últimos detalhes {formatTimeAgo(times.detailsAt)}
                                      </span>
                                      {hasDetails && (
                                        <button
                                          type="button"
                                          onClick={() => setOpenDetailsId(screen.deviceId)}
                                          className="text-teal-600 hover:underline font-medium"
                                        >
                                          ver
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                            <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
                              <div className="text-left sm:text-right">
                                <p className="text-xs text-slate-500">
                                  Último heartbeat
                                </p>
                                <p
                                  className={`text-xs font-medium ${
                                    online && !stale
                                      ? "text-green-600"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {formatTimeAgo(screen.lastHeartbeat)}
                                </p>
                              </div>
                              <div
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                  online && screen.isVisible
                                    ? "bg-blue-50 text-blue-600"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {online && screen.isVisible ? (
                                  <Eye className="w-3 h-3" />
                                ) : (
                                  <EyeOff className="w-3 h-3" />
                                )}
                                {online
                                  ? screen.isVisible
                                    ? "Visível"
                                    : "Background"
                                  : "—"}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={outdated || !online ? "default" : "outline"}
                              disabled={isRefreshing}
                              onClick={() => handleForceRefresh(screen)}
                              title={
                                online
                                  ? "Forçar reload da tela"
                                  : "Tela offline — a atualização será aplicada quando ela reconectar"
                              }
                              className="text-xs h-11 sm:h-9 px-3 w-full sm:w-auto"
                            >
                              <RotateCw className={`w-4 h-4 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
                              {isRefreshing
                                ? refreshLabel
                                : online
                                  ? "Atualizar"
                                  : "Agendar"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isCapturing}
                              onClick={() => handleRequestScreenshot(screen)}
                              title={
                                online
                                  ? "Capturar print da tela"
                                  : "Tela offline — o print será capturado quando ela reconectar"
                              }
                              className="text-xs h-11 sm:h-9 px-3 w-full sm:w-auto"
                            >
                              <Camera className={`w-4 h-4 mr-1.5 ${isCapturing ? "animate-pulse" : ""}`} />
                              {isCapturing
                                ? "Capturando"
                                : online
                                  ? "Print"
                                  : "Agendar print"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isCapturingDetails}
                              onClick={() => handleRequestDetails(screen)}
                              title={
                                online
                                  ? "Coletar detalhes da tela (resolução, zoom, viewport)"
                                  : "Tela offline — os detalhes serão coletados quando ela reconectar"
                              }
                              className="text-xs h-11 sm:h-9 px-3 w-full sm:w-auto"
                            >
                              <Ruler className={`w-4 h-4 mr-1.5 ${isCapturingDetails ? "animate-pulse" : ""}`} />
                              {isCapturingDetails
                                ? "Coletando"
                                : online
                                  ? "Detalhes"
                                  : "Agendar detalhes"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <Dialog
        open={openScreenshotId !== null}
        onOpenChange={(open) => {
          if (!open) setOpenScreenshotId(null);
        }}
      >
        <DialogContent className="max-w-3xl p-3">
          {openScreenshotId && screenshotUrls.get(openScreenshotId) ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Print da tela{" "}
                  <span className="font-mono text-xs text-slate-500">
                    {openScreenshotId.slice(0, 8)}...
                  </span>
                  {captureTimes.get(openScreenshotId)?.screenshotAt && (
                    <span className="block text-[11px] font-normal text-slate-400">
                      Capturado em{" "}
                      {new Date(
                        captureTimes.get(openScreenshotId)!.screenshotAt!,
                      ).toLocaleString("pt-BR")}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={screenshotUrls.get(openScreenshotId)}
                    download={`print-${openScreenshotId.slice(0, 8)}.png`}
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 h-9 text-xs font-medium hover:bg-slate-50"
                  >
                    <Download className="w-4 h-4" />
                    Baixar
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenScreenshotId(null)}
                    className="h-9 px-3 text-xs"
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    Fechar
                  </Button>
                </div>
              </div>
              <img
                src={screenshotUrls.get(openScreenshotId)}
                alt="Print da tela do elevador"
                className="w-full h-auto rounded-md border"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={openDetailsId !== null}
        onOpenChange={(open) => {
          if (!open) setOpenDetailsId(null);
        }}
      >
        <DialogContent className="max-w-lg p-4">
          {openDetailsId && screenDetails.get(openDetailsId) ? (
            (() => {
              const entry = screenDetails.get(openDetailsId)!;
              const rows = formatScreenDetailRows(entry.details);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const ua = (entry.details as any)?.userAgent as string | undefined;
              const copyText = [
                `Detalhes da tela ${openDetailsId}`,
                `Obtido em ${new Date(entry.capturedAt).toLocaleString("pt-BR")}`,
                "",
                ...rows.map((r) => `${r.label}: ${r.value}`),
                ...(ua ? ["", `User-Agent: ${ua}`] : []),
              ].join("\n");
              const handleCopy = async () => {
                try {
                  await navigator.clipboard.writeText(copyText);
                } catch {
                  // Fallback para contextos sem clipboard API (http/permite).
                  const ta = document.createElement("textarea");
                  ta.value = copyText;
                  ta.style.position = "fixed";
                  ta.style.opacity = "0";
                  document.body.appendChild(ta);
                  ta.select();
                  try {
                    document.execCommand("copy");
                  } catch {
                    // ignora
                  }
                  document.body.removeChild(ta);
                }
                setDetailsCopied(true);
                setTimeout(() => setDetailsCopied(false), 2000);
              };
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const perf = (entry.details as any)?.performance ?? {};
              const fpsNow: number | null =
                typeof perf.fps === "number" ? perf.fps : null;
              const fpsWorst: number | null =
                typeof perf.fpsMin === "number" ? perf.fpsMin : null;
              // Faixa de cor: verde fluido, amarelo travando, vermelho crítico.
              const fpsTone = (v: number | null) =>
                v == null
                  ? { bg: "bg-slate-100", text: "text-slate-400", label: "—" }
                  : v >= 50
                    ? { bg: "bg-emerald-50", text: "text-emerald-600", label: "fluido" }
                    : v >= 25
                      ? { bg: "bg-amber-50", text: "text-amber-600", label: "travando" }
                      : { bg: "bg-red-50", text: "text-red-600", label: "crítico" };
              const tone = fpsTone(fpsNow);
              return (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Ruler className="w-4 h-4 text-teal-600" />
                        Detalhes da tela{" "}
                        <span className="font-mono text-xs text-slate-500">
                          {openDetailsId.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                        <Clock className="w-3 h-3" />
                        Obtido em{" "}
                        {new Date(entry.capturedAt).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopy}
                        className="h-9 px-3 text-xs"
                      >
                        {detailsCopied ? (
                          <>
                            <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1.5" />
                            Copiar
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOpenDetailsId(null)}
                        className="h-9 px-3 text-xs"
                      >
                        <X className="w-4 h-4 mr-1.5" />
                        Fechar
                      </Button>
                    </div>
                  </div>

                  {/* FPS em destaque — saúde da renderização do elevador em prod */}
                  <div
                    className={`flex items-center justify-between gap-3 rounded-lg px-4 py-3 ${tone.bg}`}
                  >
                    <div className="flex items-center gap-2">
                      <Gauge className={`w-5 h-5 ${tone.text}`} />
                      <div>
                        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          FPS agora
                        </div>
                        {fpsWorst != null && (
                          <div className="text-[11px] text-slate-400">
                            pior nos últimos 60s: {fpsWorst}
                          </div>
                        )}
                      </div>
                    </div>
                    {fpsNow != null ? (
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={`font-mono text-3xl font-bold leading-none ${tone.text}`}
                        >
                          {fpsNow}
                        </span>
                        <span className={`text-xs font-medium ${tone.text}`}>
                          fps · {tone.label}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 text-right max-w-[55%]">
                        Sem dado — a tela precisa recarregar com a versão nova
                      </span>
                    )}
                  </div>

                  <div className="rounded-md border divide-y divide-slate-100">
                    {rows.map((r) => (
                      <div
                        key={r.label}
                        className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs"
                      >
                        <span className="text-slate-500">{r.label}</span>
                        <span className="font-mono font-medium text-slate-800 text-right">
                          {r.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  {ua && (
                    <div className="text-[10px] text-slate-400 break-all">
                      <span className="font-medium text-slate-500">User-Agent:</span>{" "}
                      {ua}
                    </div>
                  )}
                </div>
              );
            })()
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
