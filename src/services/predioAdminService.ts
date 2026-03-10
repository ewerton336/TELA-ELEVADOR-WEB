import { requestJson } from "@/services/apiClient";
import type { OrientationMode, ScreenModules } from "@/services/predioService";

type PredioOrientationResponse = {
  orientationMode: OrientationMode;
};

export async function getPredioOrientation(
  slug: string,
  token: string | null,
): Promise<PredioOrientationResponse> {
  return await requestJson<PredioOrientationResponse>(
    slug,
    "/admin/predio",
    {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    "getPredioOrientation",
  );
}

export async function updatePredioOrientation(
  slug: string,
  token: string | null,
  orientationMode: OrientationMode,
): Promise<void> {
  await requestJson<void>(
    slug,
    "/admin/predio",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ orientationMode }),
    },
    "updatePredioOrientation",
  );
}

export async function getScreenModules(
  slug: string,
  token: string | null,
): Promise<ScreenModules> {
  return await requestJson<ScreenModules>(
    slug,
    "/admin/predio/modulos",
    {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    "getScreenModules",
  );
}

export async function updateScreenModules(
  slug: string,
  token: string | null,
  modules: ScreenModules,
): Promise<ScreenModules> {
  return await requestJson<ScreenModules>(
    slug,
    "/admin/predio/modulos",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(modules),
    },
    "updateScreenModules",
  );
}
