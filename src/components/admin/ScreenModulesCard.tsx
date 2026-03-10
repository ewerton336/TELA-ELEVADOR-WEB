import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  MonitorSmartphone,
  RotateCcw,
  MessageSquare,
  Cloud,
  Newspaper,
  Rss,
  Lock,
  Eye,
} from "lucide-react";
import { ModuleToggleCard } from "@/components/ModuleToggleCard";
import * as predioAdminService from "@/services/predioAdminService";
import { DEFAULT_MODULES } from "@/services/predioService";
import type { ScreenModules } from "@/services/predioService";
import { toast } from "sonner";

interface ScreenModulesCardProps {
  slug: string;
  token: string | null;
}

export function ScreenModulesCard({ slug, token }: ScreenModulesCardProps) {
  const [screenModules, setScreenModules] =
    useState<ScreenModules>(DEFAULT_MODULES);

  useEffect(() => {
    if (!token) return;
    const loadModules = async () => {
      try {
        const data = await predioAdminService.getScreenModules(slug, token);
        setScreenModules(data);
      } catch (err) {
        console.error("Erro ao carregar módulos:", err);
      }
    };
    loadModules();
  }, [slug, token]);

  const handleToggleModule = async (key: keyof ScreenModules) => {
    const updated = { ...screenModules, [key]: !screenModules[key] };
    setScreenModules(updated);
    try {
      await predioAdminService.updateScreenModules(slug, token, updated);
      const labels: Record<keyof ScreenModules, string> = {
        buildingNotice: "Aviso do prédio",
        weather: "Previsão do tempo",
        headlineNews: "Notícia do dia",
        newsTicker: "Ticker de notícias",
      };
      toast.success(
        `${labels[key]} ${updated[key] ? "ativado" : "desativado"}`,
      );
    } catch (err) {
      console.error("Erro ao atualizar módulos:", err);
      toast.error("Erro ao salvar configuração de módulos");
      setScreenModules(screenModules); // rollback
    }
  };

  const handleResetModules = async () => {
    setScreenModules(DEFAULT_MODULES);
    try {
      await predioAdminService.updateScreenModules(
        slug,
        token,
        DEFAULT_MODULES,
      );
      toast.success("Layout restaurado ao padrão");
    } catch (err) {
      console.error("Erro ao restaurar módulos:", err);
      toast.error("Erro ao restaurar layout padrão");
    }
  };

  return (
    <GlassCard spacing="sm">
      <CardHeader className="flex-row items-center justify-between py-2 sm:py-3 px-3 sm:px-4 gap-2">
        <CardTitle className="text-white flex items-center gap-2 text-sm">
          <MonitorSmartphone className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Módulos da Tela</span>
        </CardTitle>
        <Button
          onClick={handleResetModules}
          size="sm"
          variant="outline"
          className="h-7 text-xs bg-transparent border-white/20 text-white hover:bg-white/10"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Restaurar padrão
        </Button>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
        <p className="text-white/50 text-xs mb-3 hidden sm:block">
          Ative ou desative os módulos exibidos na tela do elevador. Os
          elementos fixos estão sempre visíveis.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 mb-4">
          <ModuleToggleCard
            icon={MessageSquare}
            title="Aviso do prédio"
            description="Comunicados do condomínio"
            enabled={screenModules.buildingNotice}
            onToggle={() => handleToggleModule("buildingNotice")}
          />
          <ModuleToggleCard
            icon={Cloud}
            title="Previsão do tempo"
            description="Clima atual e previsão resumida"
            enabled={screenModules.weather}
            onToggle={() => handleToggleModule("weather")}
          />
          <ModuleToggleCard
            icon={Newspaper}
            title="Notícia do dia"
            description="Destaque principal com imagem e título"
            enabled={screenModules.headlineNews}
            onToggle={() => handleToggleModule("headlineNews")}
          />
          <ModuleToggleCard
            icon={Rss}
            title="Ticker de notícias"
            description="Faixa com notícias em rolagem no rodapé"
            enabled={screenModules.newsTicker}
            onToggle={() => handleToggleModule("newsTicker")}
          />

          {/* Card fixo: Identidade e Conexão */}
          <div className="flex flex-col p-3 rounded-lg border border-blue-500/30 bg-blue-500/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Lock className="w-4 h-4 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-white">
                    Identidade e Conexão
                  </p>
                  <p className="text-white/30 text-[10px]">
                    Nome do prédio e status da conexão
                  </p>
                </div>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full w-fit bg-blue-500/20 text-blue-300">
              Sempre visível
            </span>
          </div>
        </div>

        {/* Pré-visualização da tela */}
        <ScreenPreview screenModules={screenModules} />
      </CardContent>
    </GlassCard>
  );
}

/** Mini preview of the elevator screen layout based on active modules */
function ScreenPreview({ screenModules }: { screenModules: ScreenModules }) {
  return (
    <div className="border-t border-white/10 pt-4">
      <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
        <Eye className="w-4 h-4" />
        Pré-visualização da tela
      </h3>
      <div className="flex justify-center">
        <div
          className="relative rounded-lg border border-white/20 bg-slate-950 overflow-hidden"
          style={{ width: "270px", height: "480px" }}
        >
          {/* Header fixo */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[8px] text-white/70 font-medium">
                Edifício Exemplo
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-white/50">12:00</span>
              {screenModules.weather && (
                <span className="text-[8px] text-yellow-300">☀️ 24°</span>
              )}
            </div>
          </div>

          {/* Corpo */}
          <div
            className={`flex-1 ${screenModules.buildingNotice && screenModules.headlineNews ? "grid grid-cols-[38%_1fr]" : ""} gap-1 p-1.5`}
            style={{
              height: `calc(100% - ${32 + (screenModules.newsTicker ? 24 : 0)}px)`,
            }}
          >
            {/* Avisos */}
            {screenModules.buildingNotice && (
              <div className="rounded bg-purple-900/60 border border-white/10 p-1.5 flex flex-col gap-1 overflow-hidden">
                <span className="text-[7px] text-white/60 font-semibold">
                  AVISOS
                </span>
                <div className="rounded bg-white/5 p-1 flex-1">
                  <div className="w-full h-1.5 bg-white/20 rounded mb-1" />
                  <div className="w-3/4 h-1 bg-white/10 rounded mb-0.5" />
                  <div className="w-full h-1 bg-white/10 rounded mb-0.5" />
                  <div className="w-2/3 h-1 bg-white/10 rounded" />
                </div>
              </div>
            )}

            {/* Notícias */}
            {screenModules.headlineNews && (
              <div className="rounded bg-black/40 border border-white/10 p-1.5 flex flex-col gap-1 overflow-hidden">
                <span className="text-[7px] text-white/60 font-semibold">
                  NOTÍCIAS
                </span>
                <div className="rounded bg-gradient-to-b from-white/10 to-transparent flex-1 flex items-center justify-center">
                  <Newspaper className="w-5 h-5 text-white/20" />
                </div>
                <div className="w-full h-1.5 bg-white/15 rounded" />
                <div className="w-2/3 h-1 bg-white/10 rounded" />
              </div>
            )}

            {/* Quando nenhum módulo variável está ativo */}
            {!screenModules.buildingNotice && !screenModules.headlineNews && (
              <div className="flex items-center justify-center h-full text-white/20">
                <div className="text-center">
                  <MonitorSmartphone className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  <p className="text-[8px]">Sem módulos ativos</p>
                </div>
              </div>
            )}
          </div>

          {/* Ticker rodapé */}
          {screenModules.newsTicker && (
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-slate-900 border-t border-white/10 flex items-center px-2 overflow-hidden">
              <span className="text-[7px] text-yellow-400 font-medium mr-2 flex-shrink-0">
                LAST NEWS
              </span>
              <div className="flex gap-3 animate-pulse">
                <span className="text-[7px] text-white/50">
                  Notícia em destaque passa aqui...
                </span>
              </div>
            </div>
          )}

          {/* Status de conexão fixo */}
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1 bg-black/60 rounded-full px-1.5 py-0.5">
              <div className="w-1 h-1 rounded-full bg-green-400" />
              <span className="text-[6px] text-green-300">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
