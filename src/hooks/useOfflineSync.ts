import { useState, useEffect, useCallback } from "react";
import { fetchWeather } from "@/services/weatherService";
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

  const syncData = useCallback(async () => {
    if (!navigator.onLine) return;

    setState((prev) => ({ ...prev, isSyncing: true, syncError: null }));

    try {
      // Sincroniza clima e notícias em paralelo
      await Promise.all([
        fetchWeather(),
        fetchNews(),
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
        syncError: error instanceof Error ? error.message : "Erro ao sincronizar",
      }));
    }
  }, []);

  // Monitora mudanças de conexão
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
      // Tenta sincronizar quando reconecta
      syncData();
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
  }, [syncData]);

  // Sincronização automática a cada 5 minutos quando online
  useEffect(() => {
    if (!state.isOnline) return;

    const interval = setInterval(() => {
      syncData();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [state.isOnline, syncData]);

  // Sincroniza ao montar
  useEffect(() => {
    syncData();
  }, [syncData]);

  return {
    ...state,
    syncData,
  };
}
