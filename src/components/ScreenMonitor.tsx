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

interface ScreenInfo {
  connectionId: string;
  slug: string;
  connectedAt: string;
  lastHeartbeat: string;
  uptime: number; // seconds
  isVisible: boolean;
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

function isScreenAlive(screen: ScreenInfo): boolean {
  const diff = Date.now() - new Date(screen.lastHeartbeat).getTime();
  return diff < 120_000; // 2 minutos
}

function isOutdated(screenVersion: string | undefined | null, currentVersion: string): boolean {
  if (!screenVersion) return true;
  return screenVersion !== currentVersion;
}

export function ScreenMonitor({ token }: ScreenMonitorProps) {
  const [screens, setScreens] = useState<ScreenInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
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

    connection.on("ScreenSnapshot", (data: ScreenInfo[]) => {
      setScreens(data);
      setIsLoading(false);
    });

    connection.on(
      "ScreenConnected",
      (_info: { connectionId: string; slug: string }) => {
        // Re-fetch snapshot para pegar estado atualizado
        if (connection.state === HubConnectionState.Connected) {
          connection.invoke("JoinMonitor").catch(() => {});
        }
      },
    );

    connection.on("ScreenDisconnected", (info: { connectionId: string }) => {
      setScreens((prev) =>
        prev.filter((s) => s.connectionId !== info.connectionId),
      );
    });

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

  const totalOffline = screens.filter((s) => !isScreenAlive(s)).length;

  const handleForceRefresh = async (connectionId: string) => {
    setRefreshingIds((prev) => new Set(prev).add(connectionId));
    try {
      await requestAdminJson(
        "/monitor/force-refresh",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ connectionId }),
        },
        "forceRefresh",
      );
    } catch {
      // silencioso
    } finally {
      setTimeout(() => {
        setRefreshingIds((prev) => {
          const next = new Set(prev);
          next.delete(connectionId);
          return next;
        });
      }, 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor className="w-5 h-5 text-slate-600" />
          <div>
            <h3 className="text-lg font-semibold">Monitor de Telas</h3>
            <p className="text-sm text-slate-500">
              {screens.length} tela{screens.length !== 1 ? "s" : ""} conectada
              {screens.length !== 1 ? "s" : ""}
              {totalOffline > 0 && (
                <span className="text-red-500 ml-1">
                  ({totalOffline} sem heartbeat)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
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
            <p className="font-medium">Nenhuma tela conectada</p>
            <p className="text-sm mt-1">
              As telas dos elevadores aparecerão aqui quando estiverem online
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
                      const alive = isScreenAlive(screen);
                      const outdated = isOutdated(screen.appVersion, __APP_VERSION__);
                      const isRefreshing = refreshingIds.has(screen.connectionId);
                      return (
                        <div
                          key={screen.connectionId}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                alive
                                  ? "bg-green-500 animate-pulse"
                                  : "bg-red-500"
                              }`}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">
                                  Tela:{" "}
                                  <span className="font-mono text-xs text-slate-500">
                                    {screen.connectionId.slice(0, 8)}...
                                  </span>
                                </p>
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
                                Conectada há {formatUptime(screen.uptime)}
                              </p>
                              {screen.appVersion && (
                                <p className="text-[10px] text-slate-400 font-mono">
                                  v: {new Date(screen.appVersion).toLocaleString("pt-BR")}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-xs text-slate-500">
                                Último heartbeat
                              </p>
                              <p
                                className={`text-xs font-medium ${
                                  alive ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                {formatTimeAgo(screen.lastHeartbeat)}
                              </p>
                            </div>
                            <div
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                screen.isVisible
                                  ? "bg-blue-50 text-blue-600"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {screen.isVisible ? (
                                <Eye className="w-3 h-3" />
                              ) : (
                                <EyeOff className="w-3 h-3" />
                              )}
                              {screen.isVisible ? "Visível" : "Background"}
                            </div>
                            <Button
                              size="sm"
                              variant={outdated ? "default" : "outline"}
                              disabled={!alive || isRefreshing}
                              onClick={() => handleForceRefresh(screen.connectionId)}
                              title={!alive ? "Tela sem heartbeat — comando não será recebido" : "Forçar reload da tela"}
                              className="text-xs"
                            >
                              <RotateCw className={`w-3.5 h-3.5 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
                              {isRefreshing ? "Enviado" : "Atualizar"}
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
