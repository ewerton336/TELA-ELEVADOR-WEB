import { requestJson } from "@/services/apiClient";
import type { OrientationMode } from "@/services/predioService";

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
