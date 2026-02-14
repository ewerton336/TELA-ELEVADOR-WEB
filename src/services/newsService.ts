import { getCache, setCache } from "@/lib/cache";
import { requestJson } from "@/services/apiClient";

const CACHE_KEY = "news";
const CACHE_TTL_MINUTES = 30;

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  thumbnail: string;
  pubDate: string;
  pubDateFormatted: string;
  source: string;
  category?: string;
}

export interface NewsData {
  items: NewsItem[];
  lastUpdated: string;
  enabledSourceIds?: string[];
}

function getCacheKey(slug: string): string {
  return `${CACHE_KEY}:${slug}`;
}

export async function fetchNews(slug: string, take = 6): Promise<NewsData> {
  const cacheKey = getCacheKey(slug);
  const cached = getCache<NewsData>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await requestJson<NewsData>(
    slug,
    `/noticia?take=${encodeURIComponent(String(take))}`,
    { method: "GET" },
    "fetchNews",
  );

  setCache(cacheKey, data, CACHE_TTL_MINUTES);
  return data;
}

export function getCachedNews(slug: string): NewsData | null {
  return getCache<NewsData>(getCacheKey(slug));
}
