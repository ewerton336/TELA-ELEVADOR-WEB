import { useState, useEffect } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as predioAdminService from "@/services/predioAdminService";
import type { OrientationMode } from "@/services/predioService";
import { toast } from "sonner";

interface OrientationModeCardProps {
  slug: string;
  token: string | null;
}

export function OrientationModeCard({ slug, token }: OrientationModeCardProps) {
  const [orientationMode, setOrientationMode] =
    useState<OrientationMode>("auto");

  useEffect(() => {
    if (!token) return;

    const loadOrientation = async () => {
      try {
        const data = await predioAdminService.getPredioOrientation(slug, token);
        setOrientationMode(data.orientationMode ?? "auto");
      } catch (err) {
        console.error("Erro ao carregar orientacao:", err);
      }
    };

    loadOrientation();
  }, [slug, token]);

  const handleOrientationChange = async (value: OrientationMode) => {
    if (!token) return;
    try {
      await predioAdminService.updatePredioOrientation(slug, token, value);
      setOrientationMode(value);
      toast.success(
        value === "auto"
          ? "Orientacao automatica ativada"
          : `Modo ${value === "portrait" ? "retrato" : "paisagem"} forcado`,
      );
    } catch (err) {
      console.error("Erro ao atualizar orientacao:", err);
      toast.error("Erro ao salvar orientacao da tela");
    }
  };

  return (
    <GlassCard spacing="sm">
      <CardHeader className="flex-row items-center justify-between py-2 sm:py-3 px-3 sm:px-4 gap-2">
        <CardTitle className="text-white flex items-center gap-2 text-sm">
          Modo de exibicao da tela
        </CardTitle>
        <span className="text-white/40 text-xs flex-shrink-0">
          {orientationMode === "auto"
            ? "Automatico"
            : orientationMode === "portrait"
              ? "Retrato"
              : "Paisagem"}
        </span>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
        <p className="text-white/50 text-xs mb-3">
          Forca o modo retrato ou paisagem, mesmo se a tela estiver em outra
          orientacao.
        </p>
        <div className="max-w-xs">
          <Select
            value={orientationMode}
            onValueChange={handleOrientationChange as (value: string) => void}
          >
            <SelectTrigger className="bg-white/10 border-white/20 text-white h-8 text-sm">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automatico (dispositivo)</SelectItem>
              <SelectItem value="portrait">Forcar Retrato</SelectItem>
              <SelectItem value="landscape">Forcar Paisagem</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </GlassCard>
  );
}
