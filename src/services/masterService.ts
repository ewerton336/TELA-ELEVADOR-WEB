import { requestAdminJson } from "@/services/apiClient";

export type Predio = {
  id: number;
  slug: string;
  nome: string;
  cidade: string;
  criadoEm: string;
};

export type Sindico = {
  id: number;
  predioId: number | null;
  usuario: string;
  role: string;
  criadoEm: string;
};

export async function getPredios(token: string | null): Promise<Predio[]> {
  return await requestAdminJson<Predio[]>(
    "/predio",
    {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    "getPredios",
  );
}

export async function createPredio(
  token: string | null,
  data: { slug: string; nome: string; cidade: string },
): Promise<Predio> {
  return await requestAdminJson<Predio>(
    "/predio",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    },
    "createPredio",
  );
}

export async function updatePredio(
  token: string | null,
  id: number,
  data: { slug: string; nome: string; cidade: string },
): Promise<void> {
  await requestAdminJson<void>(
    `/predio/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    },
    "updatePredio",
  );
}

export async function deletePredio(
  token: string | null,
  id: number,
): Promise<void> {
  await requestAdminJson<void>(
    `/predio/${id}`,
    {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    "deletePredio",
  );
}

export async function getSindicos(
  token: string | null,
  predioId?: number,
): Promise<Sindico[]> {
  const query = predioId ? `?predioId=${predioId}` : "";
  return await requestAdminJson<Sindico[]>(
    `/sindico${query}`,
    {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    "getSindicos",
  );
}

export async function createSindico(
  token: string | null,
  data: { predioId: number; usuario: string; senha: string },
): Promise<Sindico> {
  return await requestAdminJson<Sindico>(
    "/sindico",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    },
    "createSindico",
  );
}

export async function updateSindico(
  token: string | null,
  id: number,
  data: { usuario?: string; senha?: string },
): Promise<void> {
  await requestAdminJson<void>(
    `/sindico/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    },
    "updateSindico",
  );
}

export async function deleteSindico(
  token: string | null,
  id: number,
): Promise<void> {
  await requestAdminJson<void>(
    `/sindico/${id}`,
    {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    "deleteSindico",
  );
}
