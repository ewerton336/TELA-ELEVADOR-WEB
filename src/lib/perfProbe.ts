/**
 * Sonda leve de desempenho de renderização para a tela do elevador (24/7).
 *
 * A métrica de heap JS (`performance.memory`) NÃO enxerga o custo do
 * compositor/GPU. Quando a tela "fica a 10fps" com o heap estável, o gargalo
 * está na renderização, não na memória JS. Esta sonda mede exatamente o que o
 * usuário percebe:
 *
 *  - FPS das animações (contagem real de quadros por segundo);
 *  - pior FPS e pior intervalo entre quadros nos últimos 60s (picos de travão);
 *  - "long tasks" (>50ms) que bloqueiam a main thread.
 *
 * Os valores entram nos detalhes da tela (ver `collectScreenDetails`) para que o
 * master consiga correlacionar lentidão × tempo de execução (uptime) e provar,
 * com dados, se e quando a renderização degrada.
 *
 * Overhead: um único loop de `requestAnimationFrame` (que o navegador já roda
 * para as animações) + um `PerformanceObserver` de longtask. Custo desprezível.
 */

export interface PerfSnapshot {
  /** FPS do último segundo fechado (quadros contados). `null` até haver dado. */
  fps: number | null;
  /** Menor FPS (pior segundo) observado na janela dos últimos 60s. */
  fpsMin: number | null;
  /** Maior intervalo entre quadros (ms) na janela dos últimos 60s. */
  worstFrameMs: number | null;
  /** Quantidade de long tasks (>50ms) nos últimos 60s. */
  longTasks: number;
  /** Duração da maior long task (ms) nos últimos 60s. */
  longTaskMaxMs: number;
}

const WINDOW = 60; // segundos de janela deslizante

let started = false;

// Baldes circulares por segundo (índice = segundoAbsoluto % WINDOW).
const frameCount: number[] = new Array(WINDOW).fill(0);
const worstDelta: number[] = new Array(WINDOW).fill(0);

let currentSec = 0; // segundo absoluto do balde sendo preenchido
let startSec = 0; // primeiro segundo observado (evita contar janela vazia)
let lastFrameTs = 0;

interface LongTaskRec {
  t: number;
  d: number;
}
let longTaskRecs: LongTaskRec[] = [];

function secOf(ts: number): number {
  return Math.floor(ts / 1000);
}

/** Avança os baldes até o segundo `sec`, zerando os que ficaram para trás. */
function advanceTo(sec: number): void {
  if (sec <= currentSec) return;
  const gap = Math.min(sec - currentSec, WINDOW);
  for (let s = 1; s <= gap; s++) {
    const idx = (currentSec + s) % WINDOW;
    frameCount[idx] = 0;
    worstDelta[idx] = 0;
  }
  currentSec = sec;
}

export function startPerfProbe(): void {
  if (
    started ||
    typeof window === "undefined" ||
    typeof requestAnimationFrame === "undefined"
  ) {
    return;
  }
  started = true;

  const t0 = performance.now();
  currentSec = secOf(t0);
  startSec = currentSec;
  lastFrameTs = t0;

  const onFrame = (ts: number) => {
    const delta = ts - lastFrameTs;
    lastFrameTs = ts;

    const sec = secOf(ts);
    advanceTo(sec);

    const idx = sec % WINDOW;
    frameCount[idx] += 1;
    if (delta > worstDelta[idx]) worstDelta[idx] = delta;

    requestAnimationFrame(onFrame);
  };
  requestAnimationFrame(onFrame);

  // Long tasks (>50ms bloqueando a main thread). Nem todo browser suporta.
  try {
    const obs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        longTaskRecs.push({ t: e.startTime, d: e.duration });
      }
      const cutoff = performance.now() - WINDOW * 1000;
      longTaskRecs = longTaskRecs.filter((r) => r.t >= cutoff);
    });
    obs.observe({ entryTypes: ["longtask"] });
  } catch {
    // Sem suporte a longtask — segue só com FPS.
  }
}

export function getPerfSnapshot(): PerfSnapshot {
  if (!started) {
    return {
      fps: null,
      fpsMin: null,
      worstFrameMs: null,
      longTasks: 0,
      longTaskMaxMs: 0,
    };
  }

  advanceTo(secOf(performance.now()));

  // Segundos já fechados dentro da janela: de (currentSec-1) para trás.
  const lastClosed = currentSec - 1;
  const from = Math.max(startSec, currentSec - (WINDOW - 1));

  let fps: number | null = null;
  let fpsMin: number | null = null;
  let worst = 0;

  for (let s = from; s <= lastClosed; s++) {
    const idx = s % WINDOW;
    const c = frameCount[idx];
    if (fpsMin === null || c < fpsMin) fpsMin = c;
    if (s === lastClosed) fps = c;
    if (worstDelta[idx] > worst) worst = worstDelta[idx];
  }

  let longMax = 0;
  const cutoff = performance.now() - WINDOW * 1000;
  const recent = longTaskRecs.filter((r) => r.t >= cutoff);
  for (const r of recent) if (r.d > longMax) longMax = r.d;

  return {
    fps,
    fpsMin,
    worstFrameMs: worst > 0 ? Math.round(worst) : null,
    longTasks: recent.length,
    longTaskMaxMs: Math.round(longMax),
  };
}
