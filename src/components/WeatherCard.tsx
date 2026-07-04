import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { WeatherData, WeatherDay } from "@/services/weatherService";
import { WeatherIcon } from "@/components/WeatherIcon";
import { MapPin, Thermometer } from "lucide-react";

interface WeatherCardProps {
  data: WeatherData | null;
  isLoading?: boolean;
  compact?: boolean;
}

/* ── Linha de previsão reutilizável ── */
function ForecastRow({
  day,
  label,
  highlight,
}: {
  day: WeatherDay;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`weather-row flex items-center gap-3 px-3 py-2 ${highlight ? "bg-white/5" : ""}`}
    >
      <WeatherIcon
        weatherCode={day.weatherCode}
        fallbackEmoji={day.weatherIcon}
        alt={day.weatherDescription}
        sizePx={36}
        className="weather-icon"
      />

      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-white font-semibold text-sm leading-tight truncate">
          {label}
        </span>
        <span className="text-white/50 text-[11px] leading-tight truncate">
          {day.weatherDescription}
        </span>
      </div>

      <div className="text-right shrink-0 ml-2">
        <span className="text-white font-bold text-base leading-none">
          {day.temperatureMax}°
        </span>
        <span className="text-white/40 text-xs ml-1">
          {day.temperatureMin}°
        </span>
      </div>
    </div>
  );
}

export const WeatherCard = memo(function WeatherCard({
  data,
  isLoading,
  compact = false,
}: WeatherCardProps) {
  // ── Modo compacto (header) ──
  if (compact) {
    if (isLoading && !data) {
      return (
        <div className="glass-card rounded-lg px-3 py-1.5">
          <div className="animate-pulse flex items-center gap-3">
            <div className="h-6 w-6 bg-white/10 rounded" />
            <div className="h-3 bg-white/10 rounded w-16" />
          </div>
        </div>
      );
    }

    if (!data || !data.days || data.days.length === 0) {
      return (
        <div className="glass-card rounded-lg px-3 py-1.5">
          <div className="flex items-center gap-2 text-white/40">
            <Thermometer className="w-4 h-4" />
            <span className="text-xs">
              {isLoading ? "Carregando..." : "Sem previsão"}
            </span>
          </div>
        </div>
      );
    }

    const today = data.days[0];

    return (
      <div className="glass-card rounded-lg px-2.5 py-1 weather-compact">
        <div className="flex flex-row items-center gap-2">
          {data.current && (
            <div className="flex items-center gap-1.5">
              <WeatherIcon
                weatherCode={data.current.weatherCode}
                fallbackEmoji={data.current.weatherIcon}
                alt={data.current.weatherDescription}
                sizePx={20}
              />
              <div className="flex flex-col leading-none min-w-0">
                <span className="text-white/50 text-[9px] font-medium uppercase tracking-wide">Agora</span>
                <div className="flex items-baseline gap-1 min-w-0">
                  <span className="text-white font-bold text-sm tabular-nums">
                    {data.current.temperature}°
                  </span>
                  <span className="text-white/50 text-[10px] truncate max-w-[68px]">
                    {data.current.weatherDescription}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Hoje */}
          <div className={`flex items-center gap-1.5 ${data.current ? "border-l border-white/10 pl-2" : ""}`}>
            <WeatherIcon
              weatherCode={today.weatherCode}
              fallbackEmoji={today.weatherIcon}
              alt={today.weatherDescription}
              sizePx={20}
            />
            <div className="flex flex-col leading-none">
              <span className="text-white/50 text-[9px] font-medium uppercase tracking-wide">Hoje</span>
              <div className="flex items-baseline gap-1">
                <span className="text-white font-bold text-sm tabular-nums">
                  {today.temperatureMax}°
                </span>
                <span className="text-white/40 text-[11px] tabular-nums">
                  {today.temperatureMin}°
                </span>
              </div>
            </div>
          </div>

          {/* Amanhã */}
          {data.days[1] && (
            <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
              <WeatherIcon
                weatherCode={data.days[1].weatherCode}
                fallbackEmoji={data.days[1].weatherIcon}
                alt={data.days[1].weatherDescription}
                sizePx={20}
              />
              <div className="flex flex-col leading-none">
                <span className="text-white/40 text-[9px] font-medium uppercase tracking-wide">Amanhã</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-white/70 font-semibold text-sm tabular-nums">
                    {data.days[1].temperatureMax}°
                  </span>
                  <span className="text-white/35 text-[11px] tabular-nums">
                    {data.days[1].temperatureMin}°
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Modo padrão (card completo) ──
  if (isLoading && !data) {
    return (
      <Card className="weather-card glass-card border-white/10">
        <CardContent className="p-3">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-white/10 rounded w-1/2" />
            <div className="h-10 bg-white/10 rounded" />
            <div className="h-10 bg-white/10 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.days || data.days.length === 0) {
    return (
      <Card className="weather-card glass-card border-white/10">
        <CardContent className="p-3">
          <div className="text-center text-white/40 py-3">
            <Thermometer className="w-6 h-6 mx-auto mb-1 opacity-50" />
            <p className="text-xs">
              {isLoading ? "Carregando clima..." : "Sem previsão disponível"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dayLabels = ["Hoje", "Amanhã"];

  return (
    <Card className="weather-card glass-card border-white/10 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="weather-card-header flex items-center justify-between px-3 py-1.5 border-b border-white/10">
          <div className="flex items-center gap-1.5 text-white/80">
            <MapPin className="w-3 h-3" />
            <span className="font-semibold text-xs">{data.location}</span>
          </div>
          <span className="text-white/40 text-[10px]">Previsão</span>
        </div>

        {/* Dias */}
        <div className="divide-y divide-white/5">
          {data.days.slice(0, 2).map((day, i) => (
            <ForecastRow
              key={day.date}
              day={day}
              label={dayLabels[i] ?? day.dayName}
              highlight={i === 0}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
