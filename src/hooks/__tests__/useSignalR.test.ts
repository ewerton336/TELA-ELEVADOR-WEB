import { describe, it, expect } from "vitest";

// Reimplementação da função mapAvisosToMessages do useSignalR
// (testando a lógica pura sem hooks do React)

interface AvisoDto {
  id: number;
  titulo: string;
  mensagem: string;
  inicioEm?: string | null;
  fimEm?: string | null;
  ativo: boolean;
  prioridade?: string;
  criadoEm: string;
}

interface Message {
  id: string;
  title: string;
  content: string;
  priority: "urgent" | "normal";
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapAvisosToMessages(avisos: AvisoDto[]): Message[] {
  return avisos.map((a) => ({
    id: String(a.id),
    title: a.titulo,
    content: a.mensagem,
    priority: a.prioridade === "urgent" ? "urgent" : "normal",
    active: a.ativo,
    createdAt: a.criadoEm,
    updatedAt: a.criadoEm,
  }));
}

describe("mapAvisosToMessages", () => {
  it("deve mapear aviso DTO para Message", () => {
    const avisos: AvisoDto[] = [
      {
        id: 1,
        titulo: "Manutenção",
        mensagem: "Elevador em manutenção amanhã",
        inicioEm: null,
        fimEm: null,
        ativo: true,
        prioridade: "normal",
        criadoEm: "2026-03-01T10:00:00Z",
      },
    ];

    const result = mapAvisosToMessages(avisos);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "1",
      title: "Manutenção",
      content: "Elevador em manutenção amanhã",
      priority: "normal",
      active: true,
      createdAt: "2026-03-01T10:00:00Z",
      updatedAt: "2026-03-01T10:00:00Z",
    });
  });

  it("deve mapear prioridade urgent corretamente", () => {
    const avisos: AvisoDto[] = [
      {
        id: 2,
        titulo: "Urgente",
        mensagem: "Falta de água",
        ativo: true,
        prioridade: "urgent",
        criadoEm: "2026-03-01T10:00:00Z",
      },
    ];

    const result = mapAvisosToMessages(avisos);
    expect(result[0].priority).toBe("urgent");
  });

  it("deve tratar prioridade ausente como normal", () => {
    const avisos: AvisoDto[] = [
      {
        id: 3,
        titulo: "Sem prioridade",
        mensagem: "Teste",
        ativo: true,
        criadoEm: "2026-03-01T10:00:00Z",
      },
    ];

    const result = mapAvisosToMessages(avisos);
    expect(result[0].priority).toBe("normal");
  });

  it("deve tratar prioridade desconhecida como normal", () => {
    const avisos: AvisoDto[] = [
      {
        id: 4,
        titulo: "Outro",
        mensagem: "Teste",
        ativo: false,
        prioridade: "high",
        criadoEm: "2026-03-01T10:00:00Z",
      },
    ];

    const result = mapAvisosToMessages(avisos);
    expect(result[0].priority).toBe("normal");
    expect(result[0].active).toBe(false);
  });

  it("deve converter id numérico para string", () => {
    const avisos: AvisoDto[] = [
      {
        id: 42,
        titulo: "T",
        mensagem: "M",
        ativo: true,
        criadoEm: "2026-03-01T10:00:00Z",
      },
    ];

    expect(mapAvisosToMessages(avisos)[0].id).toBe("42");
  });

  it("deve lidar com lista vazia", () => {
    expect(mapAvisosToMessages([])).toEqual([]);
  });

  it("deve mapear múltiplos avisos", () => {
    const avisos: AvisoDto[] = [
      {
        id: 1,
        titulo: "A",
        mensagem: "M1",
        ativo: true,
        criadoEm: "2026-03-01T10:00:00Z",
      },
      {
        id: 2,
        titulo: "B",
        mensagem: "M2",
        ativo: false,
        prioridade: "urgent",
        criadoEm: "2026-03-02T10:00:00Z",
      },
    ];

    const result = mapAvisosToMessages(avisos);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("A");
    expect(result[1].title).toBe("B");
    expect(result[1].priority).toBe("urgent");
  });
});
