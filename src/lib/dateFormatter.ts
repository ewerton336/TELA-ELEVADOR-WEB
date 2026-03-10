/**
 * useDateFormatter — centralises the 3+ different date formatting approaches
 * found in MessageBoard, ScreenMonitor, Admin.tsx and UnifiedCarousel.
 *
 * Pure functions (no hooks/state), so they can also be called outside components.
 */

const locale = "pt-BR";

/** "10 de mar." */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
  });
}

/** "14:05" */
export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "10/03/2026" */
export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(locale);
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
