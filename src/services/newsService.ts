import { getCache, setCache, isCacheExpired } from "@/lib/cache";
import {
  getEnabledSources,
  type NewsSource,
} from "@/services/newsSourcesService";

const CACHE_KEY = "news";
const CACHE_TTL_MINUTES = 30;
const API_NEWS_ENDPOINT = "/api/news";
const FORCE_SERVER_NEWS = (() => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("kiosk") === "1";
})();

// Múltiplos proxies CORS para fallback
const CORS_PROXIES = [
  // Proxy local (nginx reverse proxy no próprio servidor)
  (url: string) => `/api/rss-proxy?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) =>
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) =>
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

// URL de fallback para G1 (Google News RSS) quando o feed direto é bloqueado
const G1_GOOGLE_NEWS_FALLBACK =
  "https://news.google.com/rss/search?q=santos+OR+baixada+santista+site:g1.globo.com&hl=pt-BR&gl=BR&ceid=BR:pt-419";

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

function generateId(title: string): string {
  try {
    return btoa(unescape(encodeURIComponent(title.slice(0, 30))))
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 16);
  } catch {
    return Math.random().toString(36).slice(2, 18);
  }
}

// Formata data relativa (Hoje, Ontem, etc)
function formatRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Agora";
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `${diffDays} dias atrás`;

    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "Hoje";
  }
}

// Limpa HTML de uma string
function cleanHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFirstParagraph(html: string): string {
  if (!html) return "";
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (match && match[1]) {
    return cleanHtml(match[1]);
  }
  return cleanHtml(html);
}

// ==========================================
// PARSER: G1
// ==========================================

function extractCategoryFromUrl(url: string): string {
  const urlLower = url.toLowerCase();

  if (urlLower.includes("/praia-grande/")) return "Praia Grande";
  if (urlLower.includes("/santos/")) return "Santos";
  if (urlLower.includes("/guaruja/")) return "Guarujá";
  if (urlLower.includes("/cubatao/")) return "Cubatão";
  if (urlLower.includes("/sao-vicente/")) return "São Vicente";
  if (urlLower.includes("/bertioga/")) return "Bertioga";
  if (urlLower.includes("/mongagua/")) return "Mongaguá";
  if (urlLower.includes("/itanhaem/")) return "Itanhaém";
  if (urlLower.includes("/peruibe/")) return "Peruíbe";

  if (urlLower.includes("/policia/") || urlLower.includes("/crime/"))
    return "Polícia";
  if (urlLower.includes("/transito/") || urlLower.includes("/trânsito/"))
    return "Trânsito";
  if (urlLower.includes("/economia/")) return "Economia";
  if (urlLower.includes("/saude/")) return "Saúde";
  if (urlLower.includes("/educacao/")) return "Educação";
  if (urlLower.includes("/esporte/")) return "Esportes";
  if (urlLower.includes("/politica/")) return "Política";

  return "Baixada Santista";
}

function parseG1RSS(xmlText: string): NewsItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const items = doc.querySelectorAll("item");
  const newsItems: NewsItem[] = [];

  items.forEach((item, index) => {
    if (index >= 15) return;

    const title = item.querySelector("title")?.textContent?.trim() || "";
    const link = item.querySelector("link")?.textContent?.trim() || "";
    const description =
      item.querySelector("description")?.textContent?.trim() || "";
    const pubDate = item.querySelector("pubDate")?.textContent?.trim() || "";

    if (!title || !link) return;

    let thumbnail = "";
    const enclosure = item.querySelector("enclosure");
    if (enclosure) {
      thumbnail = enclosure.getAttribute("url") || "";
    }
    if (!thumbnail) {
      const mediaContent = item.querySelector("content");
      if (mediaContent) {
        thumbnail = mediaContent.getAttribute("url") || "";
      }
    }
    if (!thumbnail && description) {
      const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) {
        thumbnail = imgMatch[1];
      }
    }
    if (!thumbnail || thumbnail.length < 10) {
      thumbnail = "https://placehold.co/800x450/c4170c/ffffff?text=G1+Santos";
    }

    const cleanDescription = extractFirstParagraph(description);
    const category = extractCategoryFromUrl(link);

    newsItems.push({
      id: generateId(title),
      title,
      description: cleanDescription,
      link,
      thumbnail,
      pubDate,
      pubDateFormatted: formatRelativeDate(pubDate),
      source: "G1",
      category,
    });
  });

  return newsItems;
}

// ==========================================
// PARSER: Santa Portal
// ==========================================

function parseSantaPortalRSS(xmlText: string): NewsItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const items = doc.querySelectorAll("item");
  const newsItems: NewsItem[] = [];

  items.forEach((item, index) => {
    if (index >= 15) return;

    const title = item.querySelector("title")?.textContent?.trim() || "";
    const link = item.querySelector("link")?.textContent?.trim() || "";
    const description =
      item.querySelector("description")?.textContent?.trim() || "";
    const pubDate = item.querySelector("pubDate")?.textContent?.trim() || "";
    const category = item.querySelector("category")?.textContent?.trim() || "";

    if (!title || !link) return;

    // Santa Portal usa content:encoded com imagens dentro do HTML
    let thumbnail = "";

    // Método 1: getElementsByTagNameNS (mais confiável para namespace XML)
    let contentEncoded = "";
    try {
      const nsElements = item.getElementsByTagNameNS(
        "http://purl.org/rss/1.0/modules/content/",
        "encoded",
      );
      if (nsElements.length > 0) {
        contentEncoded = nsElements[0].textContent || "";
      }
    } catch {
      // fallback abaixo
    }

    // Método 2: getElementsByTagName com prefixo (fallback)
    if (!contentEncoded) {
      try {
        contentEncoded =
          item.getElementsByTagName("content:encoded")[0]?.textContent || "";
      } catch {
        // fallback abaixo
      }
    }

    // Método 3: Regex no XML serializado do item
    if (!contentEncoded) {
      try {
        const itemXml = new XMLSerializer().serializeToString(item);
        const cdataMatch = itemXml.match(
          /<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i,
        );
        if (cdataMatch) {
          contentEncoded = cdataMatch[1];
        }
      } catch {
        // sem conteúdo disponível
      }
    }

    if (contentEncoded) {
      // Busca primeira imagem no conteúdo HTML
      const imgMatch = contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) {
        thumbnail = imgMatch[1];
      }
    }

    if (!thumbnail && description) {
      const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) {
        thumbnail = imgMatch[1];
      }
    }

    // Placeholder temporário — será substituído por og:image quando possível
    if (!thumbnail || thumbnail.length < 10) {
      thumbnail =
        "https://placehold.co/800x450/1a6b3c/ffffff?text=Santa+Portal";
    }

    const cleanDescription = extractFirstParagraph(description);

    newsItems.push({
      id: generateId(title),
      title: cleanHtml(title),
      description: cleanDescription,
      link,
      thumbnail,
      pubDate,
      pubDateFormatted: formatRelativeDate(pubDate),
      source: "Santa Portal",
      category: category || "Regional",
    });
  });

  return newsItems;
}

// ==========================================
// PARSER: Diário do Litoral
// ==========================================

function parseDiarioLitoralRSS(xmlText: string): NewsItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const items = doc.querySelectorAll("item");
  const newsItems: NewsItem[] = [];

  items.forEach((item, index) => {
    if (index >= 15) return;

    const title = item.querySelector("title")?.textContent?.trim() || "";
    const link = item.querySelector("link")?.textContent?.trim() || "";
    const description =
      item.querySelector("description")?.textContent?.trim() || "";
    const pubDate = item.querySelector("pubDate")?.textContent?.trim() || "";
    const category = item.querySelector("category")?.textContent?.trim() || "";

    if (!title || !link) return;

    // Diário do Litoral usa media:content com url e medium="image"
    let thumbnail = "";
    const mediaContent = item.querySelector("content");
    if (mediaContent) {
      thumbnail = mediaContent.getAttribute("url") || "";
    }

    if (!thumbnail && description) {
      const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) {
        thumbnail = imgMatch[1];
      }
    }

    if (!thumbnail || thumbnail.length < 10) {
      thumbnail =
        "https://placehold.co/800x450/0066cc/ffffff?text=Diario+Litoral";
    }

    const cleanDescription = extractFirstParagraph(description);

    newsItems.push({
      id: generateId(title),
      title: cleanHtml(title),
      description: cleanDescription,
      link,
      thumbnail,
      pubDate,
      pubDateFormatted: formatRelativeDate(pubDate),
      source: "Diário do Litoral",
      category: category || "Praia Grande",
    });
  });

  return newsItems;
}

// ==========================================
// PARSER: Google News RSS (fallback para G1)
// ==========================================

function parseGoogleNewsG1RSS(xmlText: string): NewsItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const items = doc.querySelectorAll("item");
  const newsItems: NewsItem[] = [];

  items.forEach((item, index) => {
    if (index >= 15) return;

    let title = item.querySelector("title")?.textContent?.trim() || "";
    const link = item.querySelector("link")?.textContent?.trim() || "";
    const pubDate = item.querySelector("pubDate")?.textContent?.trim() || "";
    const source = item.querySelector("source")?.textContent?.trim() || "";

    if (!title) return;
    // Só aceita notícias do G1
    if (source && !source.toLowerCase().includes("g1")) return;

    // Remove sufixo "- G1" do título
    title = title.replace(/\s*-\s*G1\s*$/, "").trim();

    const category = link ? extractCategoryFromUrl(link) : "Baixada Santista";

    newsItems.push({
      id: generateId(title),
      title,
      description: "",
      link,
      thumbnail: "https://placehold.co/800x450/c4170c/ffffff?text=G1+Santos",
      pubDate,
      pubDateFormatted: formatRelativeDate(pubDate),
      source: "G1",
      category,
    });
  });

  return newsItems;
}

// ==========================================
// Seletor de parser por tipo de fonte
// ==========================================

function parseRSS(xmlText: string, sourceType: NewsSource["type"]): NewsItem[] {
  switch (sourceType) {
    case "g1":
      return parseG1RSS(xmlText);
    case "santa-portal":
      return parseSantaPortalRSS(xmlText);
    case "diario-litoral":
      return parseDiarioLitoralRSS(xmlText);
    default:
      return [];
  }
}

// ==========================================
// Busca og:image da página do artigo (fallback para RSS sem imagem)
// ==========================================

async function fetchOgImage(articleUrl: string): Promise<string> {
  // Para URLs do Google News ou G1, pula o proxy local (index 0) pois o IP do servidor é bloqueado pelo G1
  const isBlockedDomain = articleUrl.includes("g1.globo.com") || articleUrl.includes("news.google.com");
  const startProxy = isBlockedDomain ? 1 : 0;

  for (let i = startProxy; i < CORS_PROXIES.length; i++) {
    try {
      const proxyUrl = CORS_PROXIES[i](articleUrl);
      const response = await fetch(proxyUrl, {
        headers: { Accept: "text/html, */*" },
      });

      if (!response.ok) continue;

      const html = await response.text();

      // Busca og:image (property antes de content)
      const ogMatch = html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      );
      if (ogMatch && ogMatch[1].length > 10) {
        return ogMatch[1];
      }

      // Tenta formato invertido (content antes de property)
      const ogMatch2 = html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      );
      if (ogMatch2 && ogMatch2[1].length > 10) {
        return ogMatch2[1];
      }

      break; // HTML obtido mas sem og:image
    } catch {
      continue;
    }
  }
  return "";
}

async function enrichWithOgImages(items: NewsItem[]): Promise<NewsItem[]> {
  const needsImage = items.filter((item) =>
    item.thumbnail.includes("placehold.co"),
  );

  if (needsImage.length === 0) return items;

  console.log(
    `🖼️ Buscando og:image para ${needsImage.length} notícias sem imagem...`,
  );

  // Busca em lotes de 5 para não sobrecarregar
  const batchSize = 5;
  for (let i = 0; i < needsImage.length; i += batchSize) {
    const batch = needsImage.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (item) => ({
        id: item.id,
        ogImage: await fetchOgImage(item.link),
      })),
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value.ogImage) {
        const item = items.find((it) => it.id === result.value.id);
        if (item) {
          item.thumbnail = result.value.ogImage;
        }
      }
    }
  }

  return items;
}

// ==========================================
// Fetch genérico via proxy CORS
// ==========================================

async function fetchRSSViaProxy(
  feedUrl: string,
  sourceType: NewsSource["type"],
): Promise<NewsItem[]> {
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    try {
      const proxyUrl = CORS_PROXIES[i](feedUrl);
      const response = await fetch(proxyUrl, {
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
      });

      if (!response.ok) throw new Error(`Proxy retornou ${response.status}`);

      const xmlText = await response.text();

      if (!xmlText.includes("<rss") && !xmlText.includes("<channel")) {
        throw new Error("Resposta não é um RSS válido");
      }

      let items = parseRSS(xmlText, sourceType);

      if (items.length > 0) {
        console.log(
          `✅ Proxy ${i + 1}: ${items.length} notícias de ${sourceType}`,
        );

        // Enriquece com og:image artigos que ficaram sem imagem
        items = await enrichWithOgImages(items);

        return items;
      }

      throw new Error("Nenhuma notícia encontrada no RSS");
    } catch (error) {
      console.warn(`⚠️ Proxy ${i + 1} falhou para ${sourceType}:`, error);
    }
  }

  // Fallback: se o G1 falhou com todos os proxies, tenta via Google News RSS
  if (sourceType === "g1") {
    console.log("📰 Tentando fallback via Google News RSS para G1...");
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      try {
        const proxyUrl = CORS_PROXIES[i](G1_GOOGLE_NEWS_FALLBACK);
        const response = await fetch(proxyUrl, {
          headers: {
            Accept: "application/rss+xml, application/xml, text/xml, */*",
          },
        });

        if (!response.ok) throw new Error(`Fallback proxy retornou ${response.status}`);

        const xmlText = await response.text();

        if (!xmlText.includes("<rss") && !xmlText.includes("<channel")) {
          throw new Error("Fallback: resposta não é RSS válido");
        }

        let items = parseGoogleNewsG1RSS(xmlText);
        if (items.length > 0) {
          console.log(`✅ Fallback Google News: ${items.length} notícias do G1`);
          // Busca og:image para itens do G1 (sempre placeholder no Google News)
          items = await enrichWithOgImages(items);
          return items;
        }
      } catch (error) {
        console.warn(`⚠️ Fallback proxy ${i + 1} falhou:`, error);
      }
    }
  }

  return [];
}

async function fetchNewsFromServer(
  enabledSources: NewsSource[],
): Promise<NewsData | null> {
  try {
    const ids = enabledSources.map((s) => s.id).join(",");
    const url = ids
      ? `${API_NEWS_ENDPOINT}?sources=${encodeURIComponent(ids)}`
      : API_NEWS_ENDPOINT;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as NewsData;
    if (!data || !Array.isArray(data.items)) return null;
    return data;
  } catch (error) {
    console.warn("⚠️ API de noticias falhou, usando fallback cliente:", error);
    return null;
  }
}

// ==========================================
// Intercalação round-robin entre fontes
// ==========================================

function interleaveNewsBySource(
  newsPerSource: Map<string, NewsItem[]>,
): NewsItem[] {
  const sources = Array.from(newsPerSource.keys());
  if (sources.length === 0) return [];
  if (sources.length === 1) return newsPerSource.get(sources[0]) || [];

  const result: NewsItem[] = [];
  const iterators = sources.map((s) => ({
    source: s,
    items: newsPerSource.get(s) || [],
    index: 0,
  }));

  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (const iter of iterators) {
      if (iter.index < iter.items.length) {
        result.push(iter.items[iter.index]);
        iter.index++;
        hasMore = true;
      }
    }
  }

  return result;
}

// ==========================================
// Função principal de busca
// ==========================================

export async function fetchNews(): Promise<NewsData> {
  const enabledSources = getEnabledSources();
  const enabledIds = enabledSources
    .map((s) => s.id)
    .sort()
    .join(",");

  // Verifica cache e se as fontes não mudaram
  if (!isCacheExpired(CACHE_KEY)) {
    const cached = getCache<NewsData>(CACHE_KEY);
    if (cached && cached.items.length > 0) {
      const cachedIds = (cached.enabledSourceIds || ["g1"]).sort().join(",");
      if (cachedIds === enabledIds) {
        console.log("📰 Notícias carregadas do cache");
        return cached;
      }
    }
  }

  const serverData = await fetchNewsFromServer(enabledSources);
  if (serverData && serverData.items.length > 0) {
    const newsData: NewsData = {
      items: serverData.items,
      lastUpdated: serverData.lastUpdated || new Date().toISOString(),
      enabledSourceIds: enabledSources.map((s) => s.id),
    };
    setCache(CACHE_KEY, newsData, CACHE_TTL_MINUTES);
    return newsData;
  }

  if (FORCE_SERVER_NEWS) {
    const cached = getCache<NewsData>(CACHE_KEY);
    if (cached && cached.items.length > 0) {
      return cached;
    }
    throw new Error("Kiosk mode: API news unavailable");
  }

  console.log(
    `📰 Buscando notícias de ${enabledSources.length} fonte(s): ${enabledSources.map((s) => s.name).join(", ")}`,
  );

  // Busca em paralelo de todas as fontes habilitadas
  const results = await Promise.allSettled(
    enabledSources.map(async (source) => ({
      sourceId: source.id,
      sourceName: source.name,
      items: await fetchRSSViaProxy(source.feedUrl, source.type),
    })),
  );

  const newsPerSource = new Map<string, NewsItem[]>();

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.items.length > 0) {
      const sorted = result.value.items.sort(
        (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
      );
      newsPerSource.set(result.value.sourceId, sorted);
      console.log(`✅ ${result.value.sourceName}: ${sorted.length} notícias`);
    } else if (result.status === "rejected") {
      console.warn("❌ Fonte falhou:", result.reason);
    }
  }

  // Intercala as notícias em round-robin
  const allItems = interleaveNewsBySource(newsPerSource);

  if (allItems.length > 0) {
    const newsData: NewsData = {
      items: allItems,
      lastUpdated: new Date().toISOString(),
      enabledSourceIds: enabledSources.map((s) => s.id),
    };
    setCache(CACHE_KEY, newsData, CACHE_TTL_MINUTES);
    return newsData;
  }

  // Se tudo falhou, tenta retornar cache expirado
  const cached = getCache<NewsData>(CACHE_KEY);
  if (cached && cached.items.length > 0) {
    console.log("📰 Usando cache expirado como fallback");
    return cached;
  }

  throw new Error("Falha ao carregar notícias de todas as fontes");
}

export function getCachedNews(): NewsData | null {
  return getCache<NewsData>(CACHE_KEY);
}

export function isNewsCacheExpired(): boolean {
  return isCacheExpired(CACHE_KEY);
}
