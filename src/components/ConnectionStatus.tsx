import { RefreshCw, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  isSyncing: boolean;
  isSignalRConnected: boolean;
}

export function ConnectionStatus({
  isSyncing,
  isSignalRConnected,
}: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-1 md:gap-2">
      {/* Indicador SignalR — Tempo real (conectado) ou Polling (desconectado) */}
      <div
        className={cn(
          "flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-xs font-medium transition-all",
          isSignalRConnected
            ? "bg-green-500/20 text-green-400"
            : "bg-yellow-500/20 text-yellow-400",
        )}
      >
        <Radio className="w-3 h-3 md:w-3.5 md:h-3.5" />
        <span className="hidden sm:inline">
          {isSignalRConnected ? "Tempo real" : "Polling"}
        </span>
      </div>

      {/* Indicador de sincronização */}
      {isSyncing && (
        <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
          <RefreshCw className="w-3 h-3 md:w-3.5 md:h-3.5 animate-spin" />
          <span className="hidden sm:inline">Sincronizando...</span>
        </div>
      )}
    </div>
  );
}
