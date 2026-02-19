import { getCache, setCache } from "@/lib/cache";
import { requestJson } from "@/services/apiClient";

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

type AvisoDto = {
  id: number;
  titulo: string;
  mensagem: string;
  inicioEm?: string | null;
  fimEm?: string | null;
  ativo: boolean;
  prioridade?: string;
  criadoEm: string;
};

function mapAvisoToMessage(aviso: AvisoDto): Message {
  return {
    id: String(aviso.id),
    title: aviso.titulo,
    content: aviso.mensagem,
    priority: (aviso.prioridade === "urgent" ? "urgent" : "normal") as MessagePriority,
    active: aviso.ativo,
    createdAt: aviso.criadoEm,
    updatedAt: aviso.criadoEm,
  };
}

function getCacheKey(slug: string): string {
  return `${CACHE_KEY}:${slug}`;
}

export async function getMessages(slug: string): Promise<Message[] | null> {
  try {
    const data = await requestJson<AvisoDto[]>(
      slug,
      "/aviso",
      { method: "GET" },
      "getMessages",
    );
    const list = Array.isArray(data) ? data.map(mapAvisoToMessage) : [];
    setCache(getCacheKey(slug), list, CACHE_TTL_MINUTES);
    return list;
  } catch (err) {
    console.error("[messageService] getMessages failed:", err);
    const cached = getCache<Message[]>(getCacheKey(slug));
    if (cached) return cached;
    return null;
  }
}

export async function getMessage(
  slug: string,
  id: string,
): Promise<Message | null> {
  const messages = await getMessages(slug);
  return messages?.find((m) => m.id === id) || null;
}

export async function addMessage(
  slug: string,
  token: string | null,
  data: Omit<Message, "id" | "createdAt" | "updatedAt" | "active"> & {
    active?: boolean;
  },
): Promise<Message> {
  const payload = {
    titulo: data.title,
    mensagem: data.content,
    inicioEm: null,
    fimEm: null,
    ativo: data.active ?? true,
    prioridade: data.priority,
  };

  const created = await requestJson<AvisoDto>(
    slug,
    "/admin/aviso",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    },
    "addMessage",
  );

  return mapAvisoToMessage(created);
}

export async function updateMessage(
  slug: string,
  token: string | null,
  id: string,
  data: Partial<Omit<Message, "id" | "createdAt">>,
): Promise<Message | null> {
  const payload = {
    titulo: data.title ?? "",
    mensagem: data.content ?? "",
    inicioEm: null,
    fimEm: null,
    ativo: data.active ?? true,
    prioridade: data.priority,
  };

  const updated = await requestJson<AvisoDto>(
    slug,
    `/admin/aviso/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    },
    "updateMessage",
  );

  return mapAvisoToMessage(updated);
}

export async function deleteMessage(
  slug: string,
  token: string | null,
  id: string,
): Promise<boolean> {
  await requestJson<void>(
    slug,
    `/admin/aviso/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    "deleteMessage",
  );

  return true;
}

export type LoginResponse = {
  token: string;
};

export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  // Use 'gramado' slug since the developer login works from any slug
  return await requestJson<LoginResponse>(
    "gramado",
    "/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ usuario: username, senha: password }),
    },
    "login",
  );
}

// Default export for backward compatibility
export const messageService = {
  getMessages,
  getMessage,
  addMessage,
  updateMessage,
  deleteMessage,
  login,
};
