import { requestJson } from "@/services/apiClient";

export type Predio = {
  id: number;
  slug: string;
  nome: string;
  cidade: string;
  criadoEm: string;
  orientationMode?: OrientationMode;
};

export type OrientationMode = "auto" | "portrait" | "landscape";

export async function getPredio(slug: string): Promise<Predio> {
  return await requestJson<Predio>(
    slug,
    "/predio",
    { method: "GET" },
    "getPredio",
  );
}
