import { useEffect, useRef, useState, useCallback } from "react";
import {
  HubConnectionBuilder,
  HubConnection,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { Card, CardContent } from "@/components/ui/card";
import { Monitor, Wifi, WifiOff, Eye, EyeOff, RefreshCw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestAdminJson } from "@/services/apiClient";
import { getPredioHubUrl } from "@/lib/backendUrl";
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
  userAgent?: string;
  appVersion?: string;
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
  const connectionRef = useRef<HubConnection | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  }, [fetchScreensRest]);

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

  const handleForceRefresh = async (screen: ScreenInfo) => {
    const label = screen.connected ? "Enviado" : "Agendado";
    setRefreshingIds((prev) => new Map(prev).set(screen.deviceId, label));
    try {
      await requestAdminJson(
        "/monitor/force-refresh",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ deviceId: screen.deviceId }),
        },
        "forceRefresh",
      );
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
    </div>
  );
}
