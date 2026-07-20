import { buildBackendUrl } from "@/lib/backendUrl";
import { logger } from "@/lib/logger";

/** Evento global emitido quando uma requisição admin retorna 401 (sessão expirada). */
export const ADMIN_UNAUTHORIZED_EVENT = "admin-unauthorized";

function notifyUnauthorized() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ADMIN_UNAUTHORIZED_EVENT));
  }
}

type ApiErrorDetails = {
  status: number;
  statusText: string;
  url: string;
  body: unknown;
  requestId?: string;
};

function buildBaseUrl(slug: string): string {
  return buildBackendUrl(`/api/${encodeURIComponent(slug)}`);
}

export async function requestJson<T>(
  slug: string,
  path: string,
  init: RequestInit,
  label: string,
): Promise<T> {
  const url = `${buildBaseUrl(slug)}${path}`;
  const res = await fetch(url, init);
  const text = await res.text();

  let parsed: unknown = null;
  let parseFailed = false;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
      parseFailed = true;
    }
  }

  if (!res.ok) {
    const details: ApiErrorDetails = {
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      body: parsed,
      requestId:
        typeof parsed === "object" && parsed && "requestId" in parsed
          ? String((parsed as { requestId?: string }).requestId || "")
          : undefined,
    };
    const error = new Error(`HTTP ${res.status}`);
    logger.error(`[apiClient] ${label} failed:`, details);
    (error as Error & { details?: ApiErrorDetails }).details = details;
    throw error;
  }

  if (parseFailed) {
    const details: ApiErrorDetails = {
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      body: text.slice(0, 500),
    };
    const error = new Error("Invalid JSON response");
    logger.error(`[apiClient] ${label} invalid json:`, details);
    (error as Error & { details?: ApiErrorDetails }).details = details;
    throw error;
  }

  return parsed as T;
}

export async function requestAdminJson<T>(
  path: string,
  init: RequestInit,
  label: string,
): Promise<T> {
  const url = buildBackendUrl(`/api/admin${path}`);
  const res = await fetch(url, init);
  const text = await res.text();

  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    // Sessão expirada / token inválido: sinaliza para a UI voltar ao login
    // em vez de cada requisição estourar um erro genérico.
    if (res.status === 401) {
      notifyUnauthorized();
    }

    const details: ApiErrorDetails = {
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      body: parsed,
      requestId:
        typeof parsed === "object" && parsed && "requestId" in parsed
          ? String((parsed as { requestId?: string }).requestId || "")
          : undefined,
    };
    const error = new Error(`HTTP ${res.status}`);
    logger.error(`[apiClient] ${label} failed:`, details);
    (error as Error & { details?: ApiErrorDetails }).details = details;
    throw error;
  }

  return parsed as T;
}
