import { requestJson } from "@/services/apiClient";

export type Predio = {
  id: number;
  slug: string;
  nome: string;
  cidade: string;
  criadoEm: string;
};

export async function getPredio(slug: string): Promise<Predio> {
  return await requestJson<Predio>(
    slug,
    "/predio",
    { method: "GET" },
    "getPredio",
  );
}
