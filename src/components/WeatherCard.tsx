import { memo, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { WeatherData, WeatherDay } from "@/services/weatherService";
import { WeatherIcon } from "@/components/WeatherIcon";
import { useDaytime } from "@/hooks/useDaytime";
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
  isDay,
}: {
  day: WeatherDay;
  label: string;
  highlight?: boolean;
  isDay: boolean;
}) {
  return (
    <div
      className={`weather-row flex items-center gap-3 px-3 py-2 ${highlight ? "bg-white/5" : ""}`}
    >
      <WeatherIcon
        weatherCode={day.weatherCode}
        isDay={isDay}
        fallbackEmoji={day.weatherIcon}
        alt={day.weatherDescription}
        sizePx={44}
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

const COMPACT_ICON_PX = 48;

function CompactBlock({
  label,
  weatherCode,
  isDay,
  fallbackEmoji,
  description,
  divider,
  dim,
  className = "",
  children,
}: {
  label: string;
  weatherCode: number;
  isDay: boolean;
  fallbackEmoji: string;
  description: string;
  divider?: boolean;
  dim?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-0 ${divider ? "border-l border-white/10 pl-2" : ""} ${className}`}
    >
      <span
        className={`${dim ? "text-white/40" : "text-white/55"} text-[9px] font-semibold uppercase tracking-wide leading-none`}
      >
        {label}
      </span>
      <WeatherIcon
        weatherCode={weatherCode}
        isDay={isDay}
        fallbackEmoji={fallbackEmoji}
        alt={description}
        sizePx={COMPACT_ICON_PX}
        className="weather-icon -my-1.5"
      />
      <div className="flex items-baseline gap-1 leading-none">{children}</div>
    </div>
  );
}

export const WeatherCard = memo(function WeatherCard({
  data,
  isLoading,
  compact = false,
}: WeatherCardProps) {
  const isDay = useDaytime();

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
    const tomorrow = data.days[1];

    return (
      <div className="glass-card rounded-lg px-2.5 py-1 weather-compact">
        <div className="flex flex-row items-center gap-2">
          {data.current && (
            <CompactBlock
              label="Agora"
              isDay={isDay}
              weatherCode={data.current.weatherCode}
              fallbackEmoji={data.current.weatherIcon}
              description={data.current.weatherDescription}
            >
              <span className="text-white font-bold text-sm tabular-nums">
                {data.current.temperature}°
              </span>
            </CompactBlock>
          )}

          <CompactBlock
            label="Hoje"
            isDay={isDay}
            weatherCode={today.weatherCode}
            fallbackEmoji={today.weatherIcon}
            description={today.weatherDescription}
            divider={!!data.current}
          >
            <span className="text-white font-bold text-sm tabular-nums">
              {today.temperatureMax}°
            </span>
            <span className="text-white/45 text-[11px] tabular-nums">
              {today.temperatureMin}°
            </span>
          </CompactBlock>

          {tomorrow && (
            <CompactBlock
              className="weather-amanha"
              label="Amanhã"
              dim
              isDay={isDay}
              weatherCode={tomorrow.weatherCode}
              fallbackEmoji={tomorrow.weatherIcon}
              description={tomorrow.weatherDescription}
              divider
            >
              <span className="text-white/75 font-semibold text-sm tabular-nums">
                {tomorrow.temperatureMax}°
              </span>
              <span className="text-white/40 text-[11px] tabular-nums">
                {tomorrow.temperatureMin}°
              </span>
            </CompactBlock>
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
              isDay={isDay}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
