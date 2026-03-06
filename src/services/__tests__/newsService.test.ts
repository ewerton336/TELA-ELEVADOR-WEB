import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Tipos reproduzidos para testes unitários puros ──

interface NewsItem {
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

interface NewsData {
  items: NewsItem[];
  lastUpdated: string;
  enabledSourceIds?: string[];
}

// ── Helpers de cache (reproduzidos do cache.ts) ──

const CACHE_PREFIX = "elevator_";
const CACHE_KEY = "news:v2";
const CACHE_TTL_MINUTES = 30;

function getCacheKey(slug: string): string {
  return `${CACHE_KEY}:${slug}`;
}

function setCache<T>(key: string, data: T, ttlMinutes: number): void {
  const item = {
    data,
    timestamp: Date.now(),
    ttl: ttlMinutes * 60 * 1000,
  };
  localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
}

function getCache<T>(key: string): T | null {
  const raw = localStorage.getItem(CACHE_PREFIX + key);
  if (!raw) return null;
  try {
    const item = JSON.parse(raw);
    return item.data as T;
  } catch {
    return null;
  }
}

function isCacheExpired(key: string): boolean {
  const raw = localStorage.getItem(CACHE_PREFIX + key);
  if (!raw) return true;
  try {
    const item = JSON.parse(raw);
    return Date.now() - item.timestamp > item.ttl;
  } catch {
    return true;
  }
}

// ── Reprodução da lógica de fetchNews para testes puros ──
// Isso testa a LÓGICA de decisão cache vs fetch, sem depender de fetch real

type FetchFn = (slug: string, take: number) => Promise<NewsData>;

async function fetchNewsLogic(
  slug: string,
  take: number,
  remoteFetch: FetchFn,
): Promise<NewsData> {
  const cacheKey = getCacheKey(slug);
  const cached = getCache<NewsData>(cacheKey);

  // Só usar cache se NÃO estiver expirado
  if (cached && !isCacheExpired(cacheKey)) {
    return cached;
  }

  try {
    const data = await remoteFetch(slug, take);
    setCache(cacheKey, data, CACHE_TTL_MINUTES);
    return data;
  } catch (error) {
    // Fallback: usar cache expirado se requisição falhar
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// ── Fixtures ──

function makeNewsData(overrides: Partial<NewsData> = {}): NewsData {
  return {
    items: [
      {
        id: "1",
        title: "Notícia de hoje",
        description: "Descrição.",
        link: "https://example.com/1",
        thumbnail: "https://example.com/img.jpg",
        pubDate: new Date().toISOString(),
        pubDateFormatted: "Agora",
        source: "G1",
      },
    ],
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

function makeOldNewsData(): NewsData {
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 10);
  return {
    items: [
      {
        id: "old-1",
        title: "Notícia antiga de 10 dias atrás",
        description: "Descrição antiga.",
        link: "https://example.com/old",
        thumbnail: "https://example.com/old.jpg",
        pubDate: oldDate.toISOString(),
        pubDateFormatted: "10 dias atras",
        source: "DiarioDoLitoral",
      },
    ],
    lastUpdated: oldDate.toISOString(),
  };
}

// ── Testes ──

describe("newsService - lógica de cache", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deve buscar do servidor quando não há cache", async () => {
    const freshData = makeNewsData();
    const remoteFetch = vi.fn<FetchFn>().mockResolvedValue(freshData);

    const result = await fetchNewsLogic("gramado", 6, remoteFetch);

    expect(remoteFetch).toHaveBeenCalledOnce();
    expect(result.items[0].title).toBe("Notícia de hoje");
  });

  it("deve retornar cache válido sem chamar o servidor", async () => {
    const cachedData = makeNewsData();
    setCache(getCacheKey("gramado"), cachedData, CACHE_TTL_MINUTES);

    const remoteFetch = vi.fn<FetchFn>();

    const result = await fetchNewsLogic("gramado", 6, remoteFetch);

    expect(remoteFetch).not.toHaveBeenCalled();
    expect(result.items[0].title).toBe("Notícia de hoje");
  });

  it("NÃO deve retornar cache expirado — deve buscar do servidor", async () => {
    vi.useFakeTimers();

    // Salvar cache
    const oldData = makeOldNewsData();
    setCache(getCacheKey("gramado"), oldData, CACHE_TTL_MINUTES);

    // Avançar tempo além do TTL (31 minutos)
    vi.advanceTimersByTime(31 * 60 * 1000);

    const freshData = makeNewsData();
    const remoteFetch = vi.fn<FetchFn>().mockResolvedValue(freshData);

    const result = await fetchNewsLogic("gramado", 6, remoteFetch);

    expect(remoteFetch).toHaveBeenCalledOnce();
    expect(result.items[0].title).toBe("Notícia de hoje");
    expect(result.items[0].title).not.toBe("Notícia antiga de 10 dias atrás");
  });

  it("deve usar cache expirado como fallback se o servidor falhar", async () => {
    vi.useFakeTimers();

    const oldData = makeOldNewsData();
    setCache(getCacheKey("gramado"), oldData, CACHE_TTL_MINUTES);

    // Expirar o cache
    vi.advanceTimersByTime(31 * 60 * 1000);

    const remoteFetch = vi
      .fn<FetchFn>()
      .mockRejectedValue(new Error("Network error"));

    const result = await fetchNewsLogic("gramado", 6, remoteFetch);

    expect(remoteFetch).toHaveBeenCalledOnce();
    // Deve ter usado o cache expirado como fallback
    expect(result.items[0].title).toBe("Notícia antiga de 10 dias atrás");
  });

  it("deve lançar erro se não houver cache e o servidor falhar", async () => {
    const remoteFetch = vi
      .fn<FetchFn>()
      .mockRejectedValue(new Error("Network error"));

    await expect(
      fetchNewsLogic("gramado", 6, remoteFetch),
    ).rejects.toThrow("Network error");
  });

  it("deve atualizar o cache após buscar do servidor com sucesso", async () => {
    const freshData = makeNewsData();
    const remoteFetch = vi.fn<FetchFn>().mockResolvedValue(freshData);

    await fetchNewsLogic("gramado", 6, remoteFetch);

    // Verificar que o cache foi salvo
    const cached = getCache<NewsData>(getCacheKey("gramado"));
    expect(cached).not.toBeNull();
    expect(cached!.items[0].title).toBe("Notícia de hoje");
  });

  it("cache de slugs diferentes deve ser independente", async () => {
    const dataGramado = makeNewsData({ lastUpdated: "gramado" });
    const dataCanela = makeNewsData({
      items: [
        {
          id: "2",
          title: "Notícia de Canela",
          description: "Desc.",
          link: "https://example.com/2",
          thumbnail: "",
          pubDate: new Date().toISOString(),
          pubDateFormatted: "Agora",
          source: "G1",
        },
      ],
      lastUpdated: "canela",
    });

    setCache(getCacheKey("gramado"), dataGramado, CACHE_TTL_MINUTES);
    setCache(getCacheKey("canela"), dataCanela, CACHE_TTL_MINUTES);

    const remoteFetch = vi.fn<FetchFn>();

    const resultGramado = await fetchNewsLogic("gramado", 6, remoteFetch);
    const resultCanela = await fetchNewsLogic("canela", 6, remoteFetch);

    expect(remoteFetch).not.toHaveBeenCalled();
    expect(resultGramado.items[0].title).toBe("Notícia de hoje");
    expect(resultCanela.items[0].title).toBe("Notícia de Canela");
  });
});

describe("cache - isCacheExpired", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deve retornar true quando não existe cache", () => {
    expect(isCacheExpired("inexistente")).toBe(true);
  });

  it("deve retornar false para cache recém-criado", () => {
    setCache("test-key", { foo: "bar" }, 30);
    expect(isCacheExpired("test-key")).toBe(false);
  });

  it("deve retornar true após o TTL expirar", () => {
    vi.useFakeTimers();
    setCache("test-key", { foo: "bar" }, 30);

    vi.advanceTimersByTime(31 * 60 * 1000);

    expect(isCacheExpired("test-key")).toBe(true);
  });

  it("deve retornar false antes do TTL expirar", () => {
    vi.useFakeTimers();
    setCache("test-key", { foo: "bar" }, 30);

    vi.advanceTimersByTime(29 * 60 * 1000);

    expect(isCacheExpired("test-key")).toBe(false);
  });
});
