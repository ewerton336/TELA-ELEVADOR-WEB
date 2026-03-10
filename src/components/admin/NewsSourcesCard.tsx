import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/GlassCard";
import { Switch } from "@/components/ui/switch";
import { Newspaper, Rss, RefreshCw } from "lucide-react";
import {
  getFontesNoticia,
  updatePreferenciasNoticia,
  type FonteNoticiaAdmin,
} from "@/services/newsAdminService";
import {
  forceLoadNews,
  getNewsStats,
  type NewsStatsResponse,
} from "@/services/newsHealthCheckService";
import { toast } from "sonner";

interface NewsSourcesCardProps {
  slug: string;
  token: string | null;
  isDeveloper: boolean;
}

export function NewsSourcesCard({
  slug,
  token,
  isDeveloper,
}: NewsSourcesCardProps) {
  const [newsSources, setNewsSources] = useState<FonteNoticiaAdmin[]>([]);
  const [newsStats, setNewsStats] = useState<NewsStatsResponse>({});
  const [loadingHealthcheck, setLoadingHealthcheck] = useState<
    Record<string, boolean>
  >({});
  const [loadingAllHealthcheck, setLoadingAllHealthcheck] = useState(false);

  useEffect(() => {
    loadFontes();
    loadStats();
  }, [slug, token]);

  const loadFontes = async () => {
    try {
      const fontes = await getFontesNoticia(slug, token);
      setNewsSources(fontes);
    } catch (err) {
      console.error("Erro ao carregar fontes:", err);
      toast.error("Erro ao carregar fontes de noticia");
    }
  };

  const loadStats = async () => {
    if (!token) return;
    try {
      const stats = await getNewsStats(token);
      setNewsStats(stats);
    } catch (err) {
      console.error("Erro ao carregar stats de noticias:", err);
    }
  };

  const handleForceLoad = async (fonteChave?: string) => {
    if (!token) return;

    if (fonteChave) {
      setLoadingHealthcheck((prev) => ({ ...prev, [fonteChave]: true }));
    } else {
      setLoadingAllHealthcheck(true);
    }

    try {
      const result = await forceLoadNews(token, fonteChave);
      await loadStats();

      const total = result.total;

      if (total === 0) {
        toast.info("Nenhuma notícia nova encontrada");
      } else if (fonteChave) {
        const count = result.fontesCarregadas[fonteChave] || 0;
        const fonte = newsSources.find((s) => s.chave === fonteChave);
        toast.success(
          `${count} notícia${count !== 1 ? "s" : ""} nova${count !== 1 ? "s" : ""} carregada${count !== 1 ? "s" : ""} de ${fonte?.nome || fonteChave}`,
        );
      } else {
        const detalhes = Object.entries(result.fontesCarregadas)
          .filter(([, count]) => count > 0)
          .map(([fonte, count]) => `${fonte}: ${count}`)
          .join(", ");

        toast.success(
          `${total} notícia${total !== 1 ? "s" : ""} nova${total !== 1 ? "s" : ""} carregada${total !== 1 ? "s" : ""}${detalhes ? ` (${detalhes})` : ""}`,
        );
      }
    } catch (err) {
      console.error("Erro ao forçar carregamento:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Erro ao forçar carregamento: ${errorMessage}`);
    } finally {
      if (fonteChave) {
        setLoadingHealthcheck((prev) => ({ ...prev, [fonteChave]: false }));
      } else {
        setLoadingAllHealthcheck(false);
      }
    }
  };

  const handleToggleSource = async (id: number) => {
    const updated = newsSources.map((source) =>
      source.id === id
        ? { ...source, habilitado: !source.habilitado }
        : source,
    );

    if (updated.filter((s) => s.habilitado).length === 0) {
      toast.error("É necessário manter pelo menos uma fonte ativa!");
      return;
    }

    setNewsSources(updated);
    try {
      await updatePreferenciasNoticia(
        slug,
        token,
        updated.map((s) => ({ chave: s.chave, habilitado: s.habilitado })),
      );
      const source = updated.find((s) => s.id === id);
      toast.success(
        `${source?.nome} ${source?.habilitado ? "ativado" : "desativado"}`,
      );
    } catch (err) {
      console.error("Erro ao atualizar fontes:", err);
      toast.error("Erro ao salvar preferencia de fonte");
      await loadFontes();
    }
  };

  return (
    <GlassCard spacing="sm">
      <CardHeader className="flex-row flex-wrap items-center justify-between py-2 sm:py-3 px-3 sm:px-4 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <CardTitle className="text-white flex items-center gap-2 text-sm">
            <Newspaper className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Fontes de Notícias</span>
          </CardTitle>
          <span className="text-white/40 text-xs flex-shrink-0">
            {newsSources.filter((s) => s.habilitado).length}/
            {newsSources.length}
          </span>
        </div>
        {isDeveloper && (
          <Button
            onClick={() => handleForceLoad()}
            size="sm"
            variant="outline"
            disabled={loadingAllHealthcheck}
            className="h-7 text-xs bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw
              className={`w-3 h-3 mr-1 ${loadingAllHealthcheck ? "animate-spin" : ""}`}
            />
            Atualizar Todas
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
        <p className="text-white/50 text-xs mb-3 hidden sm:block">
          Selecione as fontes de notícias que serão exibidas no elevador. As
          notícias alternarão entre as fontes ativas.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
          {newsSources.map((source) => (
            <div
              key={source.id}
              className={`flex flex-col p-3 rounded-lg border transition-all ${
                source.habilitado
                  ? "border-green-500/30 bg-green-500/10"
                  : "border-white/10 bg-white/5 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`p-2 rounded-lg ${
                      source.habilitado ? "bg-green-500/20" : "bg-white/10"
                    }`}
                  >
                    <Rss
                      className={`w-4 h-4 ${
                        source.habilitado ? "text-green-400" : "text-white/40"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-medium text-sm truncate ${
                        source.habilitado ? "text-white" : "text-white/50"
                      }`}
                    >
                      {source.nome}
                    </p>
                    <p className="text-white/30 text-[10px] truncate">
                      {source.urlBase
                        .replace("https://", "")
                        .replace("http://", "")
                        .slice(0, 40)}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={source.habilitado}
                  onCheckedChange={() => handleToggleSource(source.id)}
                />
              </div>

              <div className="flex items-center justify-between gap-2 mt-1 pt-2 border-t border-white/10">
                <span className="text-white/40 text-[10px]">
                  {newsStats[source.chave] !== undefined
                    ? `${newsStats[source.chave]} notícia${newsStats[source.chave] !== 1 ? "s" : ""}`
                    : "Carregando..."}
                </span>
                {isDeveloper && (
                  <Button
                    onClick={() => handleForceLoad(source.chave)}
                    size="sm"
                    variant="ghost"
                    disabled={loadingHealthcheck[source.chave]}
                    className="h-6 px-2 text-[10px] text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <RefreshCw
                      className={`w-3 h-3 mr-1 ${loadingHealthcheck[source.chave] ? "animate-spin" : ""}`}
                    />
                    Forçar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </GlassCard>
  );
}
