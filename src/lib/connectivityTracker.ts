/**
 * Rastreador de conectividade da tela do elevador.
 *
 * O elevador perde WiFi com frequência (quando se move / porta fecha). Quando
 * está offline, o master NÃO consegue pedir detalhes (o aparelho não responde).
 * Então a tela registra localmente o histórico de quedas e, assim que volta,
 * reporta nos detalhes — permitindo correlacionar lentidão × tempo offline.
 *
 * A fonte de verdade é o estado da conexão SignalR (conectado ao backend), que
 * é o que realmente importa para a aplicação. O hook useSignalR chama
 * `markOnline()` / `markOffline()` nas transições de conexão.
 *
 * Durações usam performance.now() (monotônico). O horário da última queda usa
 * relógio de parede só para exibição amigável no master.
 */

export interface ConnectivitySnapshot {
  online: boolean;
  /** Quantas vezes ficou offline desde o carregamento da página. */
  offlineCount: number;
  /** Tempo total acumulado offline (ms), incluindo o episódio em curso. */
  totalOfflineMs: number;
  /** Maior período contínuo offline (ms). */
  longestOfflineMs: number;
  /** Se offline agora, há quanto tempo (ms); senão 0. */
  currentOfflineMs: number;
  /** ISO do início da última queda (relógio de parede), ou null. */
  lastOfflineAt: string | null;
  /** ISO da última reconexão (relógio de parede), ou null. */
  lastOnlineAt: string | null;
}

let online = true;
let initialized = false;
let offlineSincePerf = 0;
let offlineCount = 0;
let totalOfflineMs = 0;
let longestOfflineMs = 0;
let lastOfflineAt: string | null = null;
let lastOnlineAt: string | null = null;

function nowPerf(): number {
  return typeof performance !== "undefined" ? performance.now() : 0;
}
function nowIso(): string {
  try {
    return new Date().toISOString();
  } catch {
    return "";
  }
}

export function markOnline(): void {
  if (online && initialized) return;
  const t = nowPerf();
  if (offlineSincePerf) {
    const dur = t - offlineSincePerf;
    totalOfflineMs += dur;
    if (dur > longestOfflineMs) longestOfflineMs = dur;
    offlineSincePerf = 0;
  }
  online = true;
  initialized = true;
  lastOnlineAt = nowIso();
}

export function markOffline(): void {
  if (!online && initialized) return; // já offline
  online = false;
  initialized = true;
  offlineCount += 1;
  offlineSincePerf = nowPerf();
  lastOfflineAt = nowIso();
}

export function getConnectivitySnapshot(): ConnectivitySnapshot {
  const t = nowPerf();
  const currentOfflineMs =
    !online && offlineSincePerf ? t - offlineSincePerf : 0;
  return {
    online,
    offlineCount,
    totalOfflineMs: Math.round(totalOfflineMs + currentOfflineMs),
    longestOfflineMs: Math.round(Math.max(longestOfflineMs, currentOfflineMs)),
    currentOfflineMs: Math.round(currentOfflineMs),
    lastOfflineAt,
    lastOnlineAt,
  };
}
