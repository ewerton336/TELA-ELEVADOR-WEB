import { useState, useEffect, useCallback } from "react";
import { fetchWeatherBySlug } from "@/services/weatherService";
import { fetchNews } from "@/services/newsService";

interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  syncError: string | null;
}

export function useOfflineSync() {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncAt: null,
    syncError: null,
  });

  // Verificar conectividade real com o backend
  const checkRealConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("/api/gramado/predio", {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }, []);

  const syncData = useCallback(async (slug: string = "gramado") => {
    if (!navigator.onLine) return;

    setState((prev) => ({ ...prev, isSyncing: true, syncError: null }));

    try {
      await Promise.all([
        fetchWeatherBySlug(slug).catch(() => null),
        fetchNews().catch(() => null),
      ]);

      setState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date(),
        syncError: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        syncError:
          error instanceof Error ? error.message : "Erro ao sincronizar",
      }));
    }
  }, []);

  // Event listeners para online/offline
  useEffect(() => {
    const handleOnline = async () => {
      const isReallyOnline = await checkRealConnectivity();
      if (isReallyOnline) {
        setState((prev) => ({ ...prev, isOnline: true }));
        syncData();
      }
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkRealConnectivity, syncData]);

  // Polling periódico para verificar conectividade (a cada 30 segundos)
  useEffect(() => {
    const pollConnectivity = async () => {
      const isReallyOnline = await checkRealConnectivity();
      setState((prev) => ({
        ...prev,
        isOnline: isReallyOnline,
      }));
    };

    pollConnectivity();
    const intervalId = setInterval(pollConnectivity, 30000);

    return () => clearInterval(intervalId);
  }, [checkRealConnectivity]);

  // Sincronização automática a cada 5 minutos quando online
  useEffect(() => {
    if (!state.isOnline) return;

    const intervalId = setInterval(
      () => {
        syncData("gramado");
      },
      1000 * 60 * 5,
    );

    return () => clearInterval(intervalId);
  }, [state.isOnline, syncData]);

  return {
    ...state,
    syncData,
  };
}
