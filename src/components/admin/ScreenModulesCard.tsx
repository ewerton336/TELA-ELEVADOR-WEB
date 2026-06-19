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
          className="h-11 sm:h-8 text-xs sm:text-xs px-3 bg-transparent border-white/20 text-white hover:bg-white/10"
        >
          <RotateCcw className="w-4 h-4 sm:w-3 sm:h-3 mr-1.5" />
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
      </CardContent>
    </GlassCard>
  );
}
