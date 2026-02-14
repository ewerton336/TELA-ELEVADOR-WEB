const CACHE_PREFIX = "elevator_";

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export function setCache<T>(key: string, data: T, ttlMinutes: number): void {
  const item: CacheItem<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttlMinutes * 60 * 1000,
  };
  localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
}

export function getCache<T>(key: string): T | null {
  const raw = localStorage.getItem(CACHE_PREFIX + key);
  if (!raw) return null;

  try {
    const item: CacheItem<T> = JSON.parse(raw);
    const isExpired = Date.now() - item.timestamp > item.ttl;
    
    // Retorna dados mesmo se expirados (offline-first)
    // O chamador pode verificar se está expirado com isCacheExpired
    return item.data;
  } catch {
    return null;
  }
}

export function isCacheExpired(key: string): boolean {
  const raw = localStorage.getItem(CACHE_PREFIX + key);
  if (!raw) return true;

  try {
    const item = JSON.parse(raw);
    return Date.now() - item.timestamp > item.ttl;
  } catch {
    return true;
  }
}

export function clearCache(key: string): void {
  localStorage.removeItem(CACHE_PREFIX + key);
}

export function getCacheAge(key: string): number | null {
  const raw = localStorage.getItem(CACHE_PREFIX + key);
  if (!raw) return null;

  try {
    const item = JSON.parse(raw);
    return Math.floor((Date.now() - item.timestamp) / 1000 / 60); // minutos
  } catch {
    return null;
  }
}
