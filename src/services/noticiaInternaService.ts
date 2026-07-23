import { requestJson } from "@/services/apiClient";
import { buildBackendUrl } from "@/lib/backendUrl";

/** Extrai a mensagem de erro do backend ({ message }) para exibir ao usuário. */
async function throwWithServerMessage(
  res: Response,
  fallback: string,
  label: string,
): Promise<never> {
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  const serverMessage =
    parsed && typeof parsed === "object" && "message" in parsed
      ? String((parsed as { message?: string }).message ?? "")
      : "";
  console.error(`[noticiaInternaService] ${label} failed:`, parsed);
  throw new Error(serverMessage || fallback);
}

export interface NoticiaInterna {
  id: number;
  titulo?: string | null;
  subtitulo?: string | null;
  tipoMidia: "imagem" | "video";
  mediaUrl: string;
  nomeArquivoOriginal?: string;
  inicioEm?: string | null;
  fimEm?: string | null;
  ativo: boolean;
  criadoEm: string;
}

export async function getNoticiasInternas(
  slug: string,
): Promise<NoticiaInterna[]> {
  return await requestJson<NoticiaInterna[]>(
    slug,
    "/noticia-interna",
    { method: "GET" },
    "getNoticiasInternas",
  );
}

export async function getNoticiasInternasAdmin(
  slug: string,
  token: string | null,
): Promise<NoticiaInterna[]> {
  return await requestJson<NoticiaInterna[]>(
    slug,
    "/admin/noticia-interna",
    {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    "getNoticiasInternasAdmin",
  );
}

export async function createNoticiaInterna(
  slug: string,
  token: string | null,
  data: {
    titulo?: string;
    subtitulo?: string;
    inicioEm?: string;
    fimEm?: string;
    arquivo: File;
  },
): Promise<NoticiaInterna> {
  const formData = new FormData();
  if (data.titulo) formData.append("titulo", data.titulo);
  if (data.subtitulo) formData.append("subtitulo", data.subtitulo);
  if (data.inicioEm) formData.append("inicioEm", data.inicioEm);
  if (data.fimEm) formData.append("fimEm", data.fimEm);
  formData.append("arquivo", data.arquivo);

  const url = buildBackendUrl(
    `/api/${encodeURIComponent(slug)}/admin/noticia-interna`,
  );
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    await throwWithServerMessage(
      res,
      "Erro ao salvar notícia do condomínio",
      "create",
    );
  }

  return (await res.json()) as NoticiaInterna;
}

export async function updateNoticiaInterna(
  slug: string,
  token: string | null,
  id: number,
  data: {
    titulo?: string;
    subtitulo?: string;
    inicioEm?: string;
    fimEm?: string;
    ativo: boolean;
    arquivo?: File;
  },
): Promise<NoticiaInterna> {
  const formData = new FormData();
  if (data.titulo) formData.append("titulo", data.titulo);
  if (data.subtitulo) formData.append("subtitulo", data.subtitulo);
  if (data.inicioEm) formData.append("inicioEm", data.inicioEm);
  if (data.fimEm) formData.append("fimEm", data.fimEm);
  formData.append("ativo", String(data.ativo));
  if (data.arquivo) formData.append("arquivo", data.arquivo);

  const url = buildBackendUrl(
    `/api/${encodeURIComponent(slug)}/admin/noticia-interna/${id}`,
  );
  const res = await fetch(url, {
    method: "PUT",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    await throwWithServerMessage(
      res,
      "Erro ao salvar notícia do condomínio",
      "update",
    );
  }

  return (await res.json()) as NoticiaInterna;
}

export async function deleteNoticiaInterna(
  slug: string,
  token: string | null,
  id: number,
): Promise<void> {
  const url = buildBackendUrl(
    `/api/${encodeURIComponent(slug)}/admin/noticia-interna/${id}`,
  );
  const res = await fetch(url, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[noticiaInternaService] delete failed:", text);
    throw new Error(`HTTP ${res.status}`);
  }
}
