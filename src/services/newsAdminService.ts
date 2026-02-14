import { requestJson } from "@/services/apiClient";

export type FonteNoticiaAdmin = {
  id: number;
  chave: string;
  nome: string;
  urlBase: string;
  ativo: boolean;
  criadoEm: string;
  habilitado: boolean;
};

export async function getFontesNoticia(
  slug: string,
  token: string | null,
): Promise<FonteNoticiaAdmin[]> {
  return await requestJson<FonteNoticiaAdmin[]>(
    slug,
    "/admin/fonte-noticia",
    {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    "getFontesNoticia",
  );
}

export async function updatePreferenciasNoticia(
  slug: string,
  token: string | null,
  fontes: Array<{ chave: string; habilitado: boolean }>,
): Promise<void> {
  await requestJson<void>(
    slug,
    "/admin/preferencia-noticia",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ fontes }),
    },
    "updatePreferenciasNoticia",
  );
}
