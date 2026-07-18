import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/apiClient", () => ({
  requestJson: vi.fn(),
}));

import { requestJson } from "@/services/apiClient";
import { getPredio, getCachedPredio, Predio } from "@/services/predioService";
import { setCache } from "@/lib/cache";

const mockRequestJson = vi.mocked(requestJson);

function makePredio(nome: string): Predio {
  return {
    id: 9,
    slug: "gramado",
    nome,
    cidade: "Gramado",
    criadoEm: "2026-01-01T00:00:00Z",
    orientationMode: "auto",
  };
}

describe("predioService.getPredio", () => {
  beforeEach(() => {
    localStorage.clear();
    mockRequestJson.mockReset();
  });

  it("com API online, retorna dados frescos e grava no cache", async () => {
    mockRequestJson.mockResolvedValue(makePredio("Residencial Gramado IX"));

    const result = await getPredio("gramado");

    expect(result.nome).toBe("Residencial Gramado IX");
    expect(getCachedPredio("gramado")?.nome).toBe("Residencial Gramado IX");
  });

  it("quando a API falha, usa o cache como fallback", async () => {
    setCache("predio_gramado", makePredio("Residencial Gramado IX"), 60 * 24);
    mockRequestJson.mockRejectedValue(new Error("Network error"));

    const result = await getPredio("gramado");

    expect(result.nome).toBe("Residencial Gramado IX");
  });

  it("quando a API falha e não há cache, propaga o erro", async () => {
    mockRequestJson.mockRejectedValue(new Error("Network error"));

    await expect(getPredio("gramado")).rejects.toThrow("Network error");
  });
});
