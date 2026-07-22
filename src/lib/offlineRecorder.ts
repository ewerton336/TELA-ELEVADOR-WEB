import { getPerfSnapshot } from "./perfProbe";
import { getConnectivitySnapshot } from "./connectivityTracker";

export interface HistorySample {
  t: number;
  fps: number | null;
  fpsMin: number | null;
  worstMs: number | null;
  longTasks: number;
  online: boolean;
}

const INTERVAL_MS = 30_000;
const MAX_SAMPLES = 30; // 30 x 30s = 15 min (buffer circular, não acumula)

const buffer: HistorySample[] = [];
let started = false;

export function startOfflineRecorder(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  setInterval(() => {
    const p = getPerfSnapshot();
    const c = getConnectivitySnapshot();
    buffer.push({
      t: Math.round(performance.now() / 1000),
      fps: p.fps,
      fpsMin: p.fpsMin,
      worstMs: p.worstFrameMs,
      longTasks: p.longTasks,
      online: c.online,
    });
    if (buffer.length > MAX_SAMPLES) buffer.shift();
  }, INTERVAL_MS);
}

export function getHistory(): HistorySample[] {
  return buffer.slice();
}
