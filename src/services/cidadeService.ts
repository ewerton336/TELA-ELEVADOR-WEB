export interface Cidade {
  id: number;
  nome: string;
  nomeExibicao: string;
  latitude: number;
  longitude: number;
  criadoEm: string;
}

let cachedCidades: Cidade[] | null = null;

/**
 * Lista todas as cidades de São Paulo
 * Resultado é cacheado em memória para evitar múltiplas requisições
 */
export async function listarCidades(): Promise<Cidade[]> {
  // Retornar do cache se já foi carregado
  if (cachedCidades && cachedCidades.length > 0) {
    return cachedCidades;
  }

  try {
    const response = await fetch("/api/admin/cidades", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Falha ao listar cidades`);
    }

    const cidades: Cidade[] = await response.json();
    cachedCidades = cidades;
    return cidades;
  } catch (error) {
    console.error("[cidadeService] Erro ao listar cidades:", error);
    throw error;
  }
}

/**
 * Busca uma cidade pelo ID
 */
export function encontrarCidadeById(
  cidades: Cidade[],
  id: number,
): Cidade | undefined {
  return cidades.find((c) => c.id === id);
}

/**
 * Busca cidades pelo nome (busca case-insensitive)
 */
export function buscarCidadesPorNome(
  cidades: Cidade[],
  termo: string,
): Cidade[] {
  const termoLower = termo.toLowerCase();
  return cidades.filter(
    (c) =>
      c.nome.toLowerCase().includes(termoLower) ||
      c.nomeExibicao.toLowerCase().includes(termoLower),
  );
}
