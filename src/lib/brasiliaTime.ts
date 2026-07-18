const TIME_ENDPOINT =
  "https://worldtimeapi.org/api/timezone/America/Sao_Paulo";

const DAY_START_MINUTES = 6 * 60;
const DAY_END_MINUTES = 18 * 60;

export async function fetchBrasiliaEpochMs(): Promise<number | null> {
  try {
    const res = await fetch(TIME_ENDPOINT, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      unixtime?: number;
      datetime?: string;
    };
    if (typeof data.unixtime === "number") return data.unixtime * 1000;
    if (data.datetime) {
      const parsed = Date.parse(data.datetime);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function brasiliaMinutesOfDay(epochMs: number): number {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(epochMs));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function isDaytime(minutesOfDay: number): boolean {
  return minutesOfDay >= DAY_START_MINUTES && minutesOfDay <= DAY_END_MINUTES;
}
