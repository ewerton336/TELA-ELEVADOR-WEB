import { getCache, setCache } from "@/lib/cache";

const API_BASE = "/api/messages";
const CACHE_KEY = "messages";
const CACHE_TTL_MINUTES = 24 * 60;

export type MessagePriority = "normal" | "urgent";

export interface Message {
  id: string;
  title: string;
  content: string;
  priority: MessagePriority;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

type ApiErrorDetails = {
  status: number;
  statusText: string;
  url: string;
  body: unknown;
  requestId?: string;
};

async function requestJson<T>(
  input: RequestInfo,
  init: RequestInit,
  label: string,
): Promise<T> {
  const res = await fetch(input, init);
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
    console.error(`[messageService] ${label} failed:`, details);
    (error as Error & { details?: ApiErrorDetails }).details = details;
    throw error;
  }

  return parsed as T;
}

export async function getMessages(): Promise<Message[] | null> {
  try {
    const data = await requestJson<Message[]>(
      API_BASE,
      { method: "GET" },
      "getMessages",
    );
    const list = Array.isArray(data) ? data : [];
    setCache(CACHE_KEY, list, CACHE_TTL_MINUTES);
    return list;
  } catch (err) {
    console.error("[messageService] getMessages failed:", err);
    const cached = getCache<Message[]>(CACHE_KEY);
    if (cached) return cached;
    return null;
  }
}

export async function getMessage(id: string): Promise<Message | null> {
  const messages = await getMessages();
  return messages?.find((m) => m.id === id) || null;
}

export async function addMessage(
  data: Omit<Message, "id" | "createdAt" | "updatedAt" | "active"> & {
    active?: boolean;
  },
): Promise<Message> {
  return await requestJson<Message>(
    API_BASE,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    "addMessage",
  );
}

export async function updateMessage(
  id: string,
  data: Partial<Omit<Message, "id" | "createdAt">>,
): Promise<Message | null> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (res.status === 404) return null;

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
    console.error("[messageService] updateMessage failed:", details);
    (error as Error & { details?: ApiErrorDetails }).details = details;
    throw error;
  }

  return parsed as Message;
}

export async function deleteMessage(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (res.status === 404) return false;

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
    console.error("[messageService] deleteMessage failed:", details);
    (error as Error & { details?: ApiErrorDetails }).details = details;
    throw error;
  }

  return true;
}
