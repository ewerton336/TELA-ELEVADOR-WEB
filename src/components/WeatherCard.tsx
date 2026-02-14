import { Card, CardContent } from "@/components/ui/card";
import { WeatherData } from "@/services/weatherService";
import { MapPin, Thermometer } from "lucide-react";

interface WeatherCardProps {
  data: WeatherData | null;
  isLoading?: boolean;
  compact?: boolean;
}

export function WeatherCard({
  data,
  isLoading,
  compact = false,
}: WeatherCardProps) {
  // Modo compacto para o header
  if (compact) {
    if (isLoading && !data) {
      return (
        <div className="glass-card rounded-xl px-4 py-2">
          <div className="animate-pulse flex items-center gap-4">
            <div className="h-8 w-8 bg-white/10 rounded" />
            <div className="h-4 bg-white/10 rounded w-20" />
          </div>
        </div>
      );
    }

    if (!data || !data.days || data.days.length === 0) {
      return (
        <div className="glass-card rounded-xl px-4 py-2">
          <div className="flex items-center gap-2 text-white/40">
            <Thermometer className="w-5 h-5" />
            <span className="text-sm">Carregando...</span>
          </div>
        </div>
      );
    }

    const today = data.days[0];

    return (
      <div className="glass-card rounded-lg px-3 py-1.5">
        <div className="flex items-center gap-3">
          {/* Clima de hoje */}
          <div className="flex items-center gap-2">
            <span className="text-xl">{today.weatherIcon}</span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-white font-bold text-sm">
                  {today.temperatureMax}°
                </span>
                <span className="text-white/50 text-xs">
                  {today.temperatureMin}°
                </span>
              </div>
              <span className="text-white/60 text-[10px] leading-tight">
                Hoje
              </span>
            </div>
          </div>

          {/* Amanhã */}
          {data.days[1] && (
            <div className="flex items-center gap-2 text-white/50 border-l border-white/10 pl-3">
              <span className="text-xl">{data.days[1].weatherIcon}</span>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-white/80 font-semibold text-sm">
                    {data.days[1].temperatureMax}°
                  </span>
                  <span className="text-white/40 text-xs">
                    {data.days[1].temperatureMin}°
                  </span>
                </div>
                <span className="text-white/50 text-[10px] leading-tight">
                  Amanhã
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Modo padrão (original)
  if (isLoading && !data) {
    return (
      <Card className="glass-card border-white/10">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-white/10 rounded w-1/2" />
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 bg-white/10 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="glass-card border-white/10">
        <CardContent className="p-4">
          <div className="text-center text-white/40 py-4">
            <Thermometer className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Carregando clima...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-white/10 overflow-hidden">
      <CardContent className="p-0">
        {/* Header compacto */}
        <div className="bg-gradient-to-r from-blue-600/30 to-cyan-600/30 px-4 py-2 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <MapPin className="w-3.5 h-3.5" />
              <span className="font-semibold text-sm">{data.location}</span>
            </div>
            <div className="flex items-center gap-1 text-white/60 text-xs">
              <Thermometer className="w-3 h-3" />
              <span>Previsão</span>
            </div>
          </div>
        </div>

        {/* Dias - apenas hoje e amanhã */}
        <div className="divide-y divide-white/10">
          {data.days.slice(0, 2).map((day, index) => (
            <div
              key={day.date}
              className={`px-4 py-3 flex items-center justify-between transition-all ${
                index === 0 ? "bg-white/5" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Ícone do tempo */}
                <span className="text-3xl weather-icon">{day.weatherIcon}</span>

                {/* Info do dia */}
                <div>
                  <p className="text-white font-semibold text-sm">
                    {day.dayName}
                  </p>
                  <p className="text-white/60 text-xs">
                    {day.weatherDescription}
                  </p>
                </div>
              </div>

              {/* Temperaturas */}
              <div className="text-right">
                <p className="text-white text-xl font-bold">
                  {day.temperatureMax}°
                </p>
                <p className="text-white/50 text-xs">
                  min {day.temperatureMin}°
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
