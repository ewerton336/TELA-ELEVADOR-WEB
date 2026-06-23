/**
 * useDateFormatter — centralises the 3+ different date formatting approaches
 * found in MessageBoard, ScreenMonitor, Admin.tsx and UnifiedCarousel.
 *
 * Pure functions (no hooks/state), so they can also be called outside components.
 */

const MESES_ABREV = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

const p2 = (n: number) => String(n).padStart(2, "0");

/** "JUN" — mês abreviado em pt-BR maiúsculo (sem depender de Intl) */
export function monthShortUpper(date: Date): string {
  return MESES_ABREV[date.getMonth()].toUpperCase();
}

/** "10 de mar." */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${p2(d.getDate())} de ${MESES_ABREV[d.getMonth()]}.`;
}

/** "14:05" */
export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/** "10/03/2026" */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** "agora", "30s atrás", "5m atrás", "2h atrás" */
export function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return "agora";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return "agora";
  if (seconds < 60) return `${seconds}s atrás`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m atrás`;
  return `${Math.floor(seconds / 3600)}h atrás`;
}
