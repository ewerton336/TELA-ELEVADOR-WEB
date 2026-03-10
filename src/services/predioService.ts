import { requestJson } from "@/services/apiClient";

export type ScreenModules = {
  buildingNotice: boolean;
  weather: boolean;
  headlineNews: boolean;
  newsTicker: boolean;
};

export const DEFAULT_MODULES: ScreenModules = {
  buildingNotice: true,
  weather: true,
  headlineNews: true,
  newsTicker: true,
};

export type Predio = {
  id: number;
  slug: string;
  nome: string;
  cidade: string;
  criadoEm: string;
  orientationMode?: OrientationMode;
  modules?: ScreenModules;
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
