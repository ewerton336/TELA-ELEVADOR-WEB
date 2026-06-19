import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBoard } from "../MessageBoard";
import type { Message } from "@/services/messageService";

// ── Helpers ──

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "1",
    title: "Manutenção do elevador",
    content: "<p>O elevador estará em manutenção amanhã.</p>",
    priority: "normal",
    active: true,
    createdAt: "2026-03-10T14:30:00.000Z",
    updatedAt: "2026-03-10T14:30:00.000Z",
    ...overrides,
  };
}

// ── Renderização do título ──

describe("MessageBoard — título", () => {
  it("deve renderizar o título da mensagem normal", () => {
    render(<MessageBoard messages={[makeMessage()]} />);
    expect(screen.getByText("Manutenção do elevador")).toBeInTheDocument();
  });

  it("deve renderizar o título da mensagem urgente", () => {
    render(
      <MessageBoard
        messages={[makeMessage({ priority: "urgent", title: "Falta de água" })]}
      />,
    );
    expect(screen.getByText("Falta de água")).toBeInTheDocument();
  });

  it("não deve renderizar heading quando título está vazio", () => {
    render(<MessageBoard messages={[makeMessage({ title: "" })]} />);
    const headings = screen.queryAllByRole("heading");
    expect(headings).toHaveLength(0);
  });
});

// ── Renderização de data/hora ──

describe("MessageBoard — data/hora", () => {
  it("deve exibir a data formatada", () => {
    render(<MessageBoard messages={[makeMessage()]} />);
    // formatDate retorna "10 de mar." ou similar em pt-BR
    expect(screen.getByText(/mar/i)).toBeInTheDocument();
  });

  it("deve exibir o horário formatado", () => {
    render(<MessageBoard messages={[makeMessage()]} />);
    // formatTime retorna algo como "11:30" ou "14:30" dependendo do timezone
    expect(screen.getByText(/:\d{2}/)).toBeInTheDocument();
  });

  it("deve agrupar data e hora no cabeçalho", () => {
    render(<MessageBoard messages={[makeMessage()]} />);
    // HeaderDateTime renderiza data e hora juntas no cabeçalho do card
    const dateEl = screen.getByText(/mar/i);
    const timeEl = screen.getByText(/:\d{2}/);
    // Ambos devem existir no DOM
    expect(dateEl).toBeInTheDocument();
    expect(timeEl).toBeInTheDocument();
  });

  it("não deve renderizar bloco de data quando createdAt está vazio", () => {
    render(<MessageBoard messages={[makeMessage({ createdAt: "" })]} />);
    expect(screen.queryByText(/mar/i)).not.toBeInTheDocument();
  });
});

// ── Renderização de tipo/badge ──

describe("MessageBoard — tipo de aviso", () => {
  it("deve exibir badge 'Aviso do síndico' para mensagem normal", () => {
    render(<MessageBoard messages={[makeMessage()]} />);
    expect(screen.getByText(/aviso do síndico/i)).toBeInTheDocument();
  });

  it("deve exibir badge 'Urgente' para mensagem urgente", () => {
    render(
      <MessageBoard messages={[makeMessage({ priority: "urgent" })]} />,
    );
    expect(screen.getByText(/urgente/i)).toBeInTheDocument();
  });

  it("não deve exibir badge 'Urgente' para mensagem normal", () => {
    render(<MessageBoard messages={[makeMessage({ priority: "normal" })]} />);
    expect(screen.queryByText(/urgente/i)).not.toBeInTheDocument();
  });

  it("não deve exibir badge 'Aviso do síndico' para mensagem urgente", () => {
    render(<MessageBoard messages={[makeMessage({ priority: "urgent" })]} />);
    expect(screen.queryByText(/aviso do síndico/i)).not.toBeInTheDocument();
  });
});

// ── Renderização de blocos visuais ──

describe("MessageBoard — blocos de informação", () => {
  it("deve renderizar todos os blocos: tipo, título, data/hora e conteúdo", () => {
    render(<MessageBoard messages={[makeMessage()]} />);
    // Tipo
    expect(screen.getByText(/aviso do síndico/i)).toBeInTheDocument();
    // Título
    expect(screen.getByText("Manutenção do elevador")).toBeInTheDocument();
    // Data
    expect(screen.getByText(/mar/i)).toBeInTheDocument();
    // Conteúdo
    expect(
      screen.getByText("O elevador estará em manutenção amanhã."),
    ).toBeInTheDocument();
  });

  it("deve renderizar conteúdo mesmo sem título", () => {
    render(
      <MessageBoard
        messages={[makeMessage({ title: "", content: "<p>Aviso importante</p>" })]}
      />,
    );
    expect(screen.queryAllByRole("heading")).toHaveLength(0);
    expect(screen.getByText("Aviso importante")).toBeInTheDocument();
  });

  it("deve renderizar título e conteúdo sem data quando createdAt ausente", () => {
    render(
      <MessageBoard messages={[makeMessage({ createdAt: "" })]} />,
    );
    expect(screen.getByText("Manutenção do elevador")).toBeInTheDocument();
    expect(
      screen.getByText("O elevador estará em manutenção amanhã."),
    ).toBeInTheDocument();
  });
});

// ── Comportamento com dados incompletos ──

describe("MessageBoard — dados incompletos", () => {
  it("deve renderizar mensagem sem título (só conteúdo)", () => {
    render(
      <MessageBoard
        messages={[makeMessage({ title: "", content: "<p>Conteúdo sem título</p>" })]}
      />,
    );
    expect(screen.getByText("Conteúdo sem título")).toBeInTheDocument();
  });

  it("deve renderizar placeholder quando não há mensagens", () => {
    render(<MessageBoard messages={[]} />);
    expect(screen.getByText(/nenhum aviso/i)).toBeInTheDocument();
  });

  it("deve renderizar placeholder quando todas as mensagens estão inativas", () => {
    render(
      <MessageBoard
        messages={[makeMessage({ active: false }), makeMessage({ id: "2", active: false })]}
      />,
    );
    expect(screen.getByText(/nenhum aviso/i)).toBeInTheDocument();
  });

  it("deve ignorar mensagens inativas e mostrar apenas ativas", () => {
    render(
      <MessageBoard
        messages={[
          makeMessage({ id: "1", active: false, title: "Inativo" }),
          makeMessage({ id: "2", active: true, title: "Ativo" }),
        ]}
      />,
    );
    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.queryByText("Inativo")).not.toBeInTheDocument();
  });

  it("deve renderizar aviso curto (só título, sem conteúdo longo)", () => {
    render(
      <MessageBoard
        messages={[makeMessage({ title: "Breve", content: "<p>Ok</p>" })]}
      />,
    );
    expect(screen.getByText("Breve")).toBeInTheDocument();
    expect(screen.getByText("Ok")).toBeInTheDocument();
  });

  it("deve renderizar aviso com conteúdo HTML complexo", () => {
    render(
      <MessageBoard
        messages={[
          makeMessage({
            content:
              "<p><strong>Atenção:</strong> limpeza no <em>hall</em> amanhã.</p>",
          }),
        ]}
      />,
    );
    expect(screen.getByText(/atenção/i)).toBeInTheDocument();
    expect(screen.getByText(/hall/i)).toBeInTheDocument();
  });
});

// ── Comportamento quando módulo está desativado (sem mensagens) ──

describe("MessageBoard — módulo desativado (lista vazia)", () => {
  it("deve exibir estado vazio quando passa array vazio", () => {
    render(<MessageBoard messages={[]} />);
    expect(screen.getByText(/nenhum aviso/i)).toBeInTheDocument();
  });

  it("não deve exibir nenhum card quando não há mensagens", () => {
    render(<MessageBoard messages={[]} />);
    expect(screen.queryByText(/aviso do síndico/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/urgente/i)).not.toBeInTheDocument();
  });

  it("não deve exibir título nem data no estado vazio", () => {
    render(<MessageBoard messages={[]} />);
    expect(screen.queryAllByRole("heading")).toHaveLength(0);
    expect(screen.queryByText(/mar/i)).not.toBeInTheDocument();
  });
});

// ── Prioridade urgente sobrepõe normal ──

describe("MessageBoard — priorização", () => {
  it("deve mostrar mensagem urgente quando há urgentes e normais", () => {
    render(
      <MessageBoard
        messages={[
          makeMessage({ id: "1", priority: "normal", title: "Normal" }),
          makeMessage({ id: "2", priority: "urgent", title: "Urgência" }),
        ]}
      />,
    );
    expect(screen.getByText("Urgência")).toBeInTheDocument();
    expect(screen.queryByText("Normal")).not.toBeInTheDocument();
  });

  it("deve exibir badge Urgente ao priorizar mensagem urgente", () => {
    render(
      <MessageBoard
        messages={[
          makeMessage({ id: "1", priority: "normal", title: "Normal" }),
          makeMessage({ id: "2", priority: "urgent", title: "Urgência" }),
        ]}
      />,
    );
    expect(screen.getByText(/urgente/i)).toBeInTheDocument();
    expect(screen.queryByText(/aviso do síndico/i)).not.toBeInTheDocument();
  });
});

// ── Contador de mensagens ──

describe("MessageBoard — contador", () => {
  it("não deve mostrar contador quando há apenas uma mensagem", () => {
    render(<MessageBoard messages={[makeMessage()]} />);
    expect(screen.queryByText(/1\/1/)).not.toBeInTheDocument();
  });

  it("deve mostrar contador quando há mais de uma mensagem", () => {
    render(
      <MessageBoard
        messages={[
          makeMessage({ id: "1", title: "Aviso 1" }),
          makeMessage({ id: "2", title: "Aviso 2" }),
        ]}
      />,
    );
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });
});
