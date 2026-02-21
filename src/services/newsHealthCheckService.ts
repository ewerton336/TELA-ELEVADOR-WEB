const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3003";

export interface HealthCheckResponse {
  success: boolean;
  fontesCarregadas: Record<string, number>;
  total: number;
}

export interface NewsStatsResponse {
  [fonteChave: string]: number;
}

/**
 * Força o carregamento de notícias de uma ou todas as fontes
 * @param token JWT token para autenticação
 * @param fonteChave Chave da fonte específica (G1, SantaPortal, DiarioDoLitoral) ou undefined para todas
 */
export async function forceLoadNews(
  token: string,
  fonteChave?: string,
): Promise<HealthCheckResponse> {
  const body = fonteChave ? JSON.stringify({ fonteChave }) : undefined;

  const response = await fetch(`${API_BASE_URL}/api/admin/noticia/healthcheck`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Erro ao forçar carregamento: ${response.status}`,
    );
  }

  return response.json();
}

/**
 * Busca estatísticas de quantidade de notícias por fonte
 * @param token JWT token para autenticação
 */
export async function getNewsStats(token: string): Promise<NewsStatsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/admin/noticia/stats`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Erro ao buscar estatísticas: ${response.status}`,
    );
  }

  return response.json();
}
