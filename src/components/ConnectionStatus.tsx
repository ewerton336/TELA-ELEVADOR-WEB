import { RefreshCw } from "lucide-react";

interface ConnectionStatusProps {
  isSyncing: boolean;
}

export function ConnectionStatus({ isSyncing }: ConnectionStatusProps) {
  if (!isSyncing) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 text-fs-meta font-medium">
      <RefreshCw className="w-5 h-5 animate-spin" />
      <span>Sincronizando...</span>
    </div>
  );
}
