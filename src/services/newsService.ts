import { getCache, setCache } from "@/lib/cache";
import { requestJson } from "@/services/apiClient";

const CACHE_KEY = "news:v2";
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

function trimToNextPunctuation(text: string, minLength: number): string {
  const trimmed = (text ?? "").trim();
  if (trimmed.length <= minLength) return trimmed;

  const punctuations = [".", "!", "?", ";", ":"];
  const index = trimmed
    .slice(minLength)
    .split("")
    .findIndex((char) => punctuations.includes(char));

  if (index < 0) {
    return trimmed.slice(0, minLength).trim();
  }

  return trimmed.slice(0, minLength + index + 1).trim();
}

function normalizeNewsData(data: NewsData): NewsData {
  return {
    ...data,
    items: data.items.map((item) => ({
      ...item,
      description: trimToNextPunctuation(item.description ?? "", 200),
    })),
  };
}

function getCacheKey(slug: string): string {
  return `${CACHE_KEY}:${slug}`;
}

export async function fetchNews(slug: string, take = 6): Promise<NewsData> {
  const cacheKey = getCacheKey(slug);
  const cached = getCache<NewsData>(cacheKey);
  if (cached) {
    return normalizeNewsData(cached);
  }

  const data = await requestJson<NewsData>(
    slug,
    `/noticia?take=${encodeURIComponent(String(take))}`,
    { method: "GET" },
    "fetchNews",
  );

  const normalized = normalizeNewsData(data);
  setCache(cacheKey, normalized, CACHE_TTL_MINUTES);
  return normalized;
}

export function getCachedNews(slug: string): NewsData | null {
  const cached = getCache<NewsData>(getCacheKey(slug));
  return cached ? normalizeNewsData(cached) : null;
}
