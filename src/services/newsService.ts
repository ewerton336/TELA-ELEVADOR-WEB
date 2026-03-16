import { getCache, setCache, isCacheExpired } from "@/lib/cache";
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

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>?/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
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
  const safeItems = Array.isArray(data?.items) ? data.items : [];
  return {
    ...data,
    items: safeItems.map((item) => ({
      ...item,
      description: stripHtml(trimToNextPunctuation(item.description ?? "", 200)),
    })),
  };
}

function getCacheKey(slug: string): string {
  return `${CACHE_KEY}:${slug}`;
}

export async function fetchNews(slug: string, take = 10): Promise<NewsData> {
  const cacheKey = getCacheKey(slug);
  const cached = getCache<NewsData>(cacheKey);

  // Só usar cache se não estiver expirado
  if (cached && !isCacheExpired(cacheKey)) {
    return normalizeNewsData(cached);
  }

  try {
    const data = await requestJson<NewsData>(
      slug,
      `/noticia?take=${encodeURIComponent(String(take))}`,
      { method: "GET" },
      "fetchNews",
    );

    const normalized = normalizeNewsData(data);
    setCache(cacheKey, normalized, CACHE_TTL_MINUTES);
    return normalized;
  } catch (error) {
    // Se falhar a requisição e houver cache (mesmo expirado), usar como fallback
    if (cached) {
      return normalizeNewsData(cached);
    }
    throw error;
  }
}

export function getCachedNews(slug: string): NewsData | null {
  const cached = getCache<NewsData>(getCacheKey(slug));
  return cached ? normalizeNewsData(cached) : null;
}
