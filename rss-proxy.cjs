const http = require("http");
const https = require("https");
const url = require("url");
const path = require("path");
const Parser = require("rss-parser");

const PORT = 3001;
const NEWS_FETCH_INTERVAL_MS = 60 * 60 * 1000;
const IMAGE_PROXY_PREFIX = process.env.IMAGE_PROXY_PREFIX || "/api/image-proxy";

const NEWS_SOURCES = [
  {
    id: "g1",
    name: "G1 Santos e Regiao",
    type: "g1",
    feedUrl: "https://g1.globo.com/rss/g1/sp/santos-regiao/",
  },
  {
    id: "santa-portal",
    name: "Santa Portal",
    type: "santa-portal",
    feedUrl: "https://santaportal.com.br/feed/",
  },
  {
    id: "diario-litoral",
    name: "Diario do Litoral",
    type: "diario-litoral",
    feedUrl: "https://www.diariodolitoral.com.br/praia-grande/rss/",
  },
];

const G1_GOOGLE_NEWS_FALLBACK =
  "https://news.google.com/rss/search?q=santos+OR+baixada+santista+site:g1.globo.com&hl=pt-BR&gl=BR&ceid=BR:pt-419";

const IMAGE_PROXY_ALLOWED_HOSTS = [
  "g1.globo.com",
  "globo.com",
  "glbimg.com",
  "santaportal.com.br",
  "diariodolitoral.com.br",
  "news.google.com",
  "googleusercontent.com",
  "ggpht.com",
  "placehold.co",
];

const newsCache = {
  lastUpdated: null,
  perSource: new Map(),
};

let newsRefreshInFlight = null;

const rssParser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  },
});

function cleanHtml(html) {
  if (!html) return "";
  return String(html)
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

function extractFirstParagraph(html) {
  if (!html) return "";
  const match = String(html).match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (match && match[1]) {
    return cleanHtml(match[1]);
  }
  return cleanHtml(html);
}

function formatRelativeDate(dateStr) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Agora";
    if (diffHours < 24) return `${diffHours}h atras`;
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `${diffDays} dias atras`;

    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "Hoje";
  }
}

function extractCategoryFromUrl(linkUrl) {
  const urlLower = String(linkUrl || "").toLowerCase();

  if (urlLower.includes("/praia-grande/")) return "Praia Grande";
  if (urlLower.includes("/santos/")) return "Santos";
  if (urlLower.includes("/guaruja/")) return "Guaruja";
  if (urlLower.includes("/cubatao/")) return "Cubatao";
  if (urlLower.includes("/sao-vicente/")) return "Sao Vicente";
  if (urlLower.includes("/bertioga/")) return "Bertioga";
  if (urlLower.includes("/mongagua/")) return "Mongagua";
  if (urlLower.includes("/itanhaem/")) return "Itanhaem";
  if (urlLower.includes("/peruibe/")) return "Peruibe";

  if (urlLower.includes("/policia/") || urlLower.includes("/crime/"))
    return "Policia";
  if (urlLower.includes("/transito/") || urlLower.includes("/transito/"))
    return "Transito";
  if (urlLower.includes("/economia/")) return "Economia";
  if (urlLower.includes("/saude/")) return "Saude";
  if (urlLower.includes("/educacao/")) return "Educacao";
  if (urlLower.includes("/esporte/")) return "Esportes";
  if (urlLower.includes("/politica/")) return "Politica";

  return "Baixada Santista";
}

function generateId(title) {
  try {
    return Buffer.from(encodeURIComponent(String(title).slice(0, 30)))
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 16);
  } catch {
    return Math.random().toString(36).slice(2, 18);
  }
}

function extractFirstImageFromHtml(html) {
  if (!html) return "";
  const match = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : "";
}

function getMediaUrl(item) {
  if (!item) return "";
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  const mediaContent = item["media:content"];
  if (Array.isArray(mediaContent) && mediaContent[0]?.$?.url) {
    return mediaContent[0].$.url;
  }
  if (mediaContent?.$?.url) return mediaContent.$.url;
  return "";
}

function placeholderForSource(sourceType) {
  if (sourceType === "g1") {
    return "https://placehold.co/800x450/c4170c/ffffff?text=G1+Santos";
  }
  if (sourceType === "santa-portal") {
    return "https://placehold.co/800x450/1a6b3c/ffffff?text=Santa+Portal";
  }
  return "https://placehold.co/800x450/0066cc/ffffff?text=Diario+Litoral";
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function isAllowedHost(targetUrl, allowedHosts) {
  try {
    const targetHost = new url.URL(targetUrl).hostname.toLowerCase();
    return allowedHosts.some(
      (host) => targetHost === host || targetHost.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

function upgradeImageUrl(thumbnailUrl) {
  if (!isHttpUrl(thumbnailUrl)) return thumbnailUrl;

  try {
    let upgraded = thumbnailUrl;
    const parsed = new url.URL(upgraded);

    // WordPress usually embeds size as -300x200 in the filename. Remove it to get original.
    const cleanedPath = parsed.pathname.replace(
      /-\d{2,4}x\d{2,4}(?=\.[a-zA-Z0-9]+$)/,
      "",
    );
    if (cleanedPath !== parsed.pathname) {
      parsed.pathname = cleanedPath;
      upgraded = parsed.toString();
    }

    const params = parsed.searchParams;
    let changed = false;

    if (params.has("w")) {
      params.set("w", "1600");
      changed = true;
    }
    if (params.has("width")) {
      params.set("width", "1600");
      changed = true;
    }
    if (params.has("h")) {
      params.set("h", "900");
      changed = true;
    }
    if (params.has("height")) {
      params.set("height", "900");
      changed = true;
    }
    if (params.has("resize")) {
      params.set("resize", "1600,900");
      changed = true;
    }
    if (params.has("fit")) {
      params.set("fit", "1600,900");
      changed = true;
    }

    if (changed) {
      upgraded = parsed.toString();
    }

    return upgraded;
  } catch {
    return thumbnailUrl;
  }
}

function toProxiedImageUrl(thumbnailUrl) {
  if (!isHttpUrl(thumbnailUrl)) return thumbnailUrl;
  if (thumbnailUrl.startsWith(IMAGE_PROXY_PREFIX)) return thumbnailUrl;
  return `${IMAGE_PROXY_PREFIX}?url=${encodeURIComponent(thumbnailUrl)}`;
}

function mapItemToNewsItem(item, source) {
  const title = (item.title || "").trim();
  const link = (item.link || item.guid || "").trim();
  const pubDate = item.pubDate || item.isoDate || new Date().toISOString();
  const descriptionRaw =
    item["content:encoded"] ||
    item.content ||
    item.summary ||
    item.contentSnippet ||
    item.description ||
    "";

  let thumbnail = getMediaUrl(item);
  if (!thumbnail) {
    thumbnail = extractFirstImageFromHtml(descriptionRaw);
  }
  if (thumbnail && thumbnail.length >= 10) {
    thumbnail = upgradeImageUrl(thumbnail);
  }
  if (!thumbnail || thumbnail.length < 10) {
    thumbnail = placeholderForSource(source.type);
  }

  let category = "Regional";
  if (source.type === "g1") {
    category = extractCategoryFromUrl(link);
  } else if (Array.isArray(item.categories) && item.categories.length > 0) {
    category = item.categories[0];
  } else if (item.category) {
    category = item.category;
  }

  return {
    id: generateId(title),
    title: cleanHtml(title),
    description: extractFirstParagraph(descriptionRaw),
    link,
    thumbnail,
    pubDate,
    pubDateFormatted: formatRelativeDate(pubDate),
    source: source.name,
    category,
  };
}

async function fetchNewsSource(source) {
  try {
    const feed = await rssParser.parseURL(source.feedUrl);
    const items = (feed.items || [])
      .slice(0, 15)
      .map((item) => mapItemToNewsItem(item, source))
      .filter((item) => item.title && item.link);
    return items;
  } catch (err) {
    if (source.type === "g1") {
      try {
        const feed = await rssParser.parseURL(G1_GOOGLE_NEWS_FALLBACK);
        const items = (feed.items || [])
          .slice(0, 15)
          .map((item) => mapItemToNewsItem(item, source))
          .filter((item) => item.title && item.link);
        return items;
      } catch {
        return [];
      }
    }
    return [];
  }
}

function interleaveNewsBySource(newsPerSource) {
  const sources = Array.from(newsPerSource.keys());
  if (sources.length === 0) return [];
  if (sources.length === 1) return newsPerSource.get(sources[0]) || [];

  const result = [];
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

async function refreshAllNews() {
  if (newsRefreshInFlight) return newsRefreshInFlight;

  newsRefreshInFlight = (async () => {
    const results = await Promise.allSettled(
      NEWS_SOURCES.map(async (source) => ({
        id: source.id,
        items: await fetchNewsSource(source),
      })),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        newsCache.perSource.set(result.value.id, result.value.items || []);
      }
    }

    newsCache.lastUpdated = new Date().toISOString();
    newsRefreshInFlight = null;
  })();

  return newsRefreshInFlight;
}

async function ensureNewsCache() {
  const lastUpdated = newsCache.lastUpdated
    ? new Date(newsCache.lastUpdated).getTime()
    : 0;
  const isStale = Date.now() - lastUpdated > NEWS_FETCH_INTERVAL_MS;

  if (!newsCache.lastUpdated || isStale) {
    await refreshAllNews();
  }
}

async function buildNewsResponse(sourceIds) {
  await ensureNewsCache();

  const ids =
    Array.isArray(sourceIds) && sourceIds.length > 0
      ? sourceIds
      : NEWS_SOURCES.map((s) => s.id);

  const newsPerSource = new Map();
  for (const id of ids) {
    const items = newsCache.perSource.get(id) || [];
    newsPerSource.set(id, items);
  }

  const allItems = interleaveNewsBySource(newsPerSource);
  return {
    items: allItems,
    lastUpdated: newsCache.lastUpdated || new Date().toISOString(),
    enabledSourceIds: ids,
  };
}

// ─── SQLite Setup ────────────────────────────────────────────────────────────
let Database;
try {
  Database = require("better-sqlite3");
} catch {
  console.warn(
    "[api] better-sqlite3 not available – messages API will use in-memory fallback",
  );
  Database = null;
}

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "data", "elevator.db");

let db = null;

function initDatabase() {
  if (!Database) {
    // In-memory fallback when better-sqlite3 is not installed (dev without native deps)
    const messages = [];
    db = {
      _messages: messages,
      prepare: () => null,
      pragma: () => {},
    };
    // We'll handle this with a simple array-based fallback
    console.log("[api] Using in-memory message store (no SQLite)");
    return;
  }

  // Ensure data directory exists
  const fs = require("fs");
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal',
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Seed initial messages if table is empty
  const count = db.prepare("SELECT COUNT(*) as cnt FROM messages").get();
  if (count.cnt === 0) {
    console.log("[api] Seeding initial messages...");
    const insert = db.prepare(
      "INSERT INTO messages (id, title, content, priority, active, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, ?, ?)",
    );
    const now = new Date().toISOString();
    const seedData = [
      {
        title: "Bem-vindos!",
        content:
          "Este é o novo painel informativo do elevador. Aqui você encontrará avisos importantes da administração.",
        priority: "normal",
      },
      {
        title: "Manutenção Programada",
        content:
          "No próximo sábado, dia 01/02, haverá manutenção preventiva do elevador das 8h às 12h. Pedimos desculpas pelo transtorno.",
        priority: "urgent",
      },
      {
        title: "Reunião de Condomínio",
        content:
          "Lembramos a todos que a próxima reunião ordinária será no dia 05/02 às 19h no salão de festas. Pauta: prestação de contas 2025.",
        priority: "normal",
      },
    ];
    for (const msg of seedData) {
      const id =
        Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      insert.run(id, msg.title, msg.content, msg.priority, now, now);
    }
  }

  console.log(`[api] Database ready at ${DB_PATH}`);
}

// ─── Messages CRUD (SQLite) ─────────────────────────────────────────────────

function getAllMessages() {
  if (!Database) return db._messages;
  const rows = db
    .prepare("SELECT * FROM messages ORDER BY createdAt DESC")
    .all();
  return rows.map((r) => ({ ...r, active: r.active === 1 }));
}

function getMessageById(id) {
  if (!Database) return db._messages.find((m) => m.id === id) || null;
  const row = db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
  if (!row) return null;
  return { ...row, active: row.active === 1 };
}

function createMessage(data) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  const now = new Date().toISOString();
  const msg = {
    id,
    title: data.title,
    content: data.content,
    priority: data.priority || "normal",
    active: data.active !== undefined ? data.active : true,
    createdAt: now,
    updatedAt: now,
  };

  if (!Database) {
    db._messages.unshift(msg);
    return msg;
  }

  db.prepare(
    "INSERT INTO messages (id, title, content, priority, active, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(id, msg.title, msg.content, msg.priority, msg.active ? 1 : 0, now, now);

  return msg;
}

function updateMessageById(id, data) {
  if (!Database) {
    const idx = db._messages.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    db._messages[idx] = { ...db._messages[idx], ...data, updatedAt: now };
    return db._messages[idx];
  }

  const existing = db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated = {
    title: data.title !== undefined ? data.title : existing.title,
    content: data.content !== undefined ? data.content : existing.content,
    priority: data.priority !== undefined ? data.priority : existing.priority,
    active: data.active !== undefined ? (data.active ? 1 : 0) : existing.active,
  };

  db.prepare(
    "UPDATE messages SET title = ?, content = ?, priority = ?, active = ?, updatedAt = ? WHERE id = ?",
  ).run(
    updated.title,
    updated.content,
    updated.priority,
    updated.active,
    now,
    id,
  );

  return getMessageById(id);
}

function deleteMessageById(id) {
  if (!Database) {
    const idx = db._messages.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    db._messages.splice(idx, 1);
    return true;
  }

  const result = db.prepare("DELETE FROM messages WHERE id = ?").run(id);
  return result.changes > 0;
}

// ─── HTTP Helpers ────────────────────────────────────────────────────────────

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function jsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function buildErrorPayload(err, context) {
  return {
    error: "Internal Server Error",
    message: err && err.message ? err.message : String(err),
    stack: err && err.stack ? err.stack : null,
    requestId: context.requestId,
    method: context.method,
    path: context.path,
  };
}

function logApiError(label, err, context) {
  const base = `[api] ${label} ${context.method} ${context.path} (${context.requestId})`;
  if (err && err.stack) {
    console.error(`${base} error:`, err.stack);
  } else {
    console.error(`${base} error:`, err && err.message ? err.message : err);
  }
}

// ─── RSS Proxy (unchanged) ──────────────────────────────────────────────────

function proxyFetch(targetUrl) {
  return new Promise((resolve, reject) => {
    const opts = url.parse(targetUrl);
    opts.headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "identity",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
    };
    opts.timeout = 15000;

    const protocol = targetUrl.startsWith("https") ? https : http;

    const req = protocol.get(opts, (res) => {
      // Follow redirects
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        proxyFetch(res.headers.location).then(resolve).catch(reject);
        return;
      }

      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ statusCode: res.statusCode, body: data }));
      res.on("error", reject);
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
  });
}

function streamProxy(targetUrl, res) {
  return new Promise((resolve, reject) => {
    const resolvedUrl = new url.URL(targetUrl);
    const opts = {
      protocol: resolvedUrl.protocol,
      hostname: resolvedUrl.hostname,
      port: resolvedUrl.port,
      path: resolvedUrl.pathname + resolvedUrl.search,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "image/*,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "identity",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
      },
      timeout: 15000,
    };

    const protocol = resolvedUrl.protocol === "https:" ? https : http;

    const req = protocol.get(opts, (upstream) => {
      if (
        upstream.statusCode >= 300 &&
        upstream.statusCode < 400 &&
        upstream.headers.location
      ) {
        const redirected = new url.URL(
          upstream.headers.location,
          resolvedUrl,
        ).toString();
        upstream.resume();
        streamProxy(redirected, res).then(resolve).catch(reject);
        return;
      }

      const contentType =
        upstream.headers["content-type"] || "application/octet-stream";
      res.writeHead(upstream.statusCode || 200, {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      });
      upstream.pipe(res);
      upstream.on("end", resolve);
      upstream.on("error", reject);
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
  });
}

// ─── Main HTTP Server ───────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const requestId = Math.random().toString(36).slice(2, 10);
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const errorContext = {
    requestId,
    method: req.method,
    path: pathname,
  };

  // ─── Health ──────────────────────────────────────────────────────────
  if (pathname === "/health") {
    jsonResponse(res, 200, { status: "ok" });
    return;
  }

  // ─── Messages API ────────────────────────────────────────────────────

  // GET /messages — list all
  if (pathname === "/messages" && req.method === "GET") {
    try {
      const messages = getAllMessages();
      jsonResponse(res, 200, messages);
    } catch (err) {
      logApiError("GET /messages", err, errorContext);
      jsonResponse(res, 500, buildErrorPayload(err, errorContext));
    }
    return;
  }

  // POST /messages — create
  if (pathname === "/messages" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      if (!body.title || !body.content) {
        jsonResponse(res, 400, { error: "title and content are required" });
        return;
      }
      const msg = createMessage(body);
      jsonResponse(res, 201, msg);
    } catch (err) {
      logApiError("POST /messages", err, errorContext);
      jsonResponse(res, 500, buildErrorPayload(err, errorContext));
    }
    return;
  }

  // PUT /messages/:id — update
  const putMatch = pathname.match(/^\/messages\/(.+)$/);
  if (putMatch && req.method === "PUT") {
    try {
      const id = decodeURIComponent(putMatch[1]);
      const body = await parseBody(req);
      const updated = updateMessageById(id, body);
      if (!updated) {
        jsonResponse(res, 404, { error: "Message not found" });
        return;
      }
      jsonResponse(res, 200, updated);
    } catch (err) {
      logApiError("PUT /messages", err, errorContext);
      jsonResponse(res, 500, buildErrorPayload(err, errorContext));
    }
    return;
  }

  // DELETE /messages/:id — delete
  const deleteMatch = pathname.match(/^\/messages\/(.+)$/);
  if (deleteMatch && req.method === "DELETE") {
    try {
      const id = decodeURIComponent(deleteMatch[1]);
      const success = deleteMessageById(id);
      if (!success) {
        jsonResponse(res, 404, { error: "Message not found" });
        return;
      }
      jsonResponse(res, 200, { success: true });
    } catch (err) {
      logApiError("DELETE /messages", err, errorContext);
      jsonResponse(res, 500, buildErrorPayload(err, errorContext));
    }
    return;
  }

  // ─── News API ───────────────────────────────────────────────────────
  if (pathname === "/news" && req.method === "GET") {
    try {
      const sourcesParam = parsed.query.sources;
      const sourceIds =
        typeof sourcesParam === "string"
          ? sourcesParam
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
      const data = await buildNewsResponse(sourceIds);
      const proxied = {
        ...data,
        items: (data.items || []).map((item) => ({
          ...item,
          thumbnail: toProxiedImageUrl(item.thumbnail),
        })),
      };
      jsonResponse(res, 200, proxied);
    } catch (err) {
      logApiError("GET /news", err, errorContext);
      jsonResponse(res, 500, buildErrorPayload(err, errorContext));
    }
    return;
  }

  // ─── Image Proxy ───────────────────────────────────────────────────
  if (pathname === "/image-proxy" && req.method === "GET") {
    const targetUrl = parsed.query.url;
    if (!targetUrl) {
      jsonResponse(res, 400, { error: "Missing url parameter" });
      return;
    }

    if (!isAllowedHost(targetUrl, IMAGE_PROXY_ALLOWED_HOSTS)) {
      jsonResponse(res, 403, { error: "Domain not allowed" });
      return;
    }

    try {
      await streamProxy(targetUrl, res);
    } catch (err) {
      logApiError("GET /image-proxy", err, errorContext);
      jsonResponse(res, 502, {
        error: "Bad Gateway",
        message: err && err.message ? err.message : String(err),
        requestId,
      });
    }
    return;
  }

  // ─── RSS Proxy ───────────────────────────────────────────────────────
  if (pathname === "/rss-proxy") {
    const targetUrl = parsed.query.url;
    if (!targetUrl) {
      jsonResponse(res, 400, { error: "Missing url parameter" });
      return;
    }

    // Whitelist de domínios permitidos
    const allowed = [
      "g1.globo.com",
      "santaportal.com.br",
      "diariodolitoral.com.br",
      "news.google.com",
    ];
    try {
      const targetHost = new url.URL(targetUrl).hostname;
      if (!allowed.some((d) => targetHost.endsWith(d))) {
        jsonResponse(res, 403, { error: "Domain not allowed" });
        return;
      }
    } catch {
      jsonResponse(res, 400, { error: "Invalid URL" });
      return;
    }

    try {
      console.log(`[proxy] Fetching: ${targetUrl}`);
      const result = await proxyFetch(targetUrl);

      if (result.statusCode !== 200) {
        console.log(`[proxy] Upstream returned ${result.statusCode}`);
        res.writeHead(result.statusCode, { "Content-Type": "text/plain" });
        res.end(result.body);
        return;
      }

      const contentType =
        result.body.includes("<rss") || result.body.includes("<channel")
          ? "application/rss+xml; charset=utf-8"
          : "text/html; charset=utf-8";

      res.writeHead(200, { "Content-Type": contentType });
      res.end(result.body);
    } catch (err) {
      logApiError("GET /rss-proxy", err, errorContext);
      jsonResponse(res, 502, {
        error: "Bad Gateway",
        message: err && err.message ? err.message : String(err),
        requestId,
      });
    }
    return;
  }

  // ─── 404 ─────────────────────────────────────────────────────────────
  res.writeHead(404);
  res.end("Not found");
});

// ─── Start ──────────────────────────────────────────────────────────────────

initDatabase();
refreshAllNews().catch((err) => {
  console.error("[api] Initial news refresh failed:", err.message);
});

setInterval(() => {
  refreshAllNews().catch((err) => {
    console.error("[api] Scheduled news refresh failed:", err.message);
  });
}, NEWS_FETCH_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`[api] Server listening on port ${PORT}`);
  console.log(`[api] Messages API: http://localhost:${PORT}/messages`);
  console.log(
    `[api] News API:     http://localhost:${PORT}/news?sources=g1,santa-portal`,
  );
  console.log(`[api] RSS Proxy:    http://localhost:${PORT}/rss-proxy?url=...`);
  console.log(
    `[api] Image Proxy:  http://localhost:${PORT}/image-proxy?url=...`,
  );
  console.log(`[api] Health:       http://localhost:${PORT}/health`);
});
