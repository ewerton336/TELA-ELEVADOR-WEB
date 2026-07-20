import { getCache, setCache } from "@/lib/cache";
import { requestJson } from "@/services/apiClient";
import { logger } from "@/lib/logger";

const CACHE_TTL_MINUTES = 60 * 24;

export type ScreenModules = {
  buildingNotice: boolean;
  weather: boolean;
  headlineNews: boolean;
  newsTicker: boolean;
};

export const DEFAULT_MODULES: ScreenModules = {
  buildingNotice: true,
  weather: true,
  headlineNews: true,
  newsTicker: true,
};

export type Predio = {
  id: number;
  slug: string;
  nome: string;
  cidade: string;
  criadoEm: string;
  orientationMode?: OrientationMode;
  modules?: ScreenModules;
};

export type OrientationMode = "auto" | "portrait" | "landscape";

function getCacheKeyForSlug(slug: string): string {
  return `predio_${slug}`;
}

export async function getPredio(slug: string): Promise<Predio> {
  const cacheKey = getCacheKeyForSlug(slug);
  try {
    const predio = await requestJson<Predio>(
      slug,
      "/predio",
      { method: "GET" },
      "getPredio",
    );
    setCache(cacheKey, predio, CACHE_TTL_MINUTES);
    return predio;
  } catch (error) {
    const cached = getCache<Predio>(cacheKey);
    if (cached) {
      logger.warn(`Usando predio em cache para ${slug}:`, error);
      return cached;
    }
    throw error;
  }
}

export function getCachedPredio(slug: string): Predio | null {
  return getCache<Predio>(getCacheKeyForSlug(slug));
}
