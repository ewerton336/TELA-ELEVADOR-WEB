import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

interface ConnectionStatusProps {
  isSyncing: boolean;
}

/**
 * Indicador de "Sincronizando...".
 *
 * Na tela do elevador (sempre à vista de quem está no elevador) esse spinner
 * atrapalhava a experiência — aparecia, por exemplo, toda vez que a conexão
 * voltava. A sincronização deve acontecer de forma silenciosa em foreground;
 * o indicador só é exibido quando a aba está em background (`document.hidden`),
 * onde ninguém está olhando para a tela.
 */
export function ConnectionStatus({ isSyncing }: ConnectionStatusProps) {
  const [hidden, setHidden] = useState(
    typeof document !== "undefined" ? document.hidden : false,
  );

  useEffect(() => {
    const onVisibilityChange = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Só mostra o indicador quando a tela NÃO está à vista (background).
  if (!isSyncing || !hidden) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 text-fs-meta font-medium">
      <RefreshCw className="w-5 h-5 animate-spin" />
      <span>Sincronizando...</span>
    </div>
  );
}
