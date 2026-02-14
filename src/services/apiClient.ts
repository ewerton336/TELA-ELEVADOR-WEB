type ApiErrorDetails = {
  status: number;
  statusText: string;
  url: string;
  body: unknown;
  requestId?: string;
};

function buildBaseUrl(slug: string): string {
  return `/api/${encodeURIComponent(slug)}`;
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
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
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
    console.error(`[apiClient] ${label} failed:`, details);
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
  const url = `/api/admin${path}`;
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
    console.error(`[apiClient] ${label} failed:`, details);
    (error as Error & { details?: ApiErrorDetails }).details = details;
    throw error;
  }

  return parsed as T;
}
