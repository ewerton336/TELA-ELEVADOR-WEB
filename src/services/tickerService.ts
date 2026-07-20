import { getCache, setCache } from "@/lib/cache";
import { requestJson } from "@/services/apiClient";
import { logger } from "@/lib/logger";

const CACHE_KEY = "ticker";
const CACHE_TTL_MINUTES = 24 * 60;

export type TickerMensagem = {
  id: number;
  texto: string;
  ativo: boolean;
  ordem: number;
  criadoEm: string;
};

function getCacheKey(slug: string): string {
  return `${CACHE_KEY}:${slug}`;
}

export async function getTickerMensagens(
  slug: string,
): Promise<TickerMensagem[]> {
  try {
    const data = await requestJson<TickerMensagem[]>(
      slug,
      "/ticker",
      { method: "GET" },
      "getTickerMensagens",
    );
    const list = Array.isArray(data) ? data : [];
    setCache(getCacheKey(slug), list, CACHE_TTL_MINUTES);
    return list;
  } catch (err) {
    logger.error("[tickerService] getTickerMensagens failed:", err);
    const cached = getCache<TickerMensagem[]>(getCacheKey(slug));
    if (cached) return cached;
    return [];
  }
}

export async function getAdminTickerMensagens(
  slug: string,
  token: string | null,
): Promise<TickerMensagem[]> {
  const data = await requestJson<TickerMensagem[]>(
    slug,
    "/admin/ticker",
    {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    "getAdminTickerMensagens",
  );
  return Array.isArray(data) ? data : [];
}

export async function addTickerMensagem(
  slug: string,
  token: string | null,
  data: { texto: string; ativo: boolean; ordem: number },
): Promise<TickerMensagem> {
  return await requestJson<TickerMensagem>(
    slug,
    "/admin/ticker",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    },
    "addTickerMensagem",
  );
}

export async function updateTickerMensagem(
  slug: string,
  token: string | null,
  id: number,
  data: { texto: string; ativo: boolean; ordem: number },
): Promise<TickerMensagem> {
  return await requestJson<TickerMensagem>(
    slug,
    `/admin/ticker/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    },
    "updateTickerMensagem",
  );
}

export async function deleteTickerMensagem(
  slug: string,
  token: string | null,
  id: number,
): Promise<boolean> {
  await requestJson<void>(
    slug,
    `/admin/ticker/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    "deleteTickerMensagem",
  );
  return true;
}

export const tickerService = {
  getTickerMensagens,
  getAdminTickerMensagens,
  addTickerMensagem,
  updateTickerMensagem,
  deleteTickerMensagem,
};
