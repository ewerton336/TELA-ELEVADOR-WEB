import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { NewsTicker } from "../NewsTicker";
import type { NewsItem } from "@/services/newsService";

// ── Helper ──

function makeItem(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: "1",
    title: "Previsão indica chuva forte no litoral",
    description: "Defesa Civil emitiu alerta para cidades da Baixada Santista.",
    link: "https://example.com/noticia-1",
    thumbnail: "",
    pubDate: "2026-03-10T08:00:00Z",
    pubDateFormatted: "10/03/2026",
    source: "G1",
    ...overrides,
  };
}

// ── Renderização ──

describe("NewsTicker — renderização", () => {
  it("deve renderizar o ticker quando visível e com itens", () => {
    const { container } = render(
      <NewsTicker items={[makeItem()]} visible={true} />,
    );
    expect(container.querySelector(".news-ticker")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Previsão indica chuva forte no litoral/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("deve ter role marquee para acessibilidade", () => {
    render(<NewsTicker items={[makeItem()]} visible={true} />);
    expect(screen.getByRole("marquee")).toBeInTheDocument();
  });

  it("deve exibir múltiplas notícias separadas por bullet", () => {
    const items = [
      makeItem({ id: "1", title: "Notícia A" }),
      makeItem({ id: "2", title: "Notícia B" }),
      makeItem({ id: "3", title: "Notícia C" }),
    ];
    render(<NewsTicker items={items} visible={true} />);
    // O texto concatenado deve conter todas as notícias
    const ticker = screen.getByRole("marquee");
    expect(ticker.textContent).toContain("Notícia A");
    expect(ticker.textContent).toContain("Notícia B");
    expect(ticker.textContent).toContain("Notícia C");
    // Separador bullet
    expect(ticker.textContent).toContain("•");
  });
});

// ── Ausência quando desativado ──

describe("NewsTicker — desativado", () => {
  it("não deve renderizar quando visible=false", () => {
    const { container } = render(
      <NewsTicker items={[makeItem()]} visible={false} />,
    );
    expect(container.querySelector(".news-ticker")).not.toBeInTheDocument();
  });

  it("não deve renderizar quando items está vazio", () => {
    const { container } = render(
      <NewsTicker items={[]} visible={true} />,
    );
    expect(container.querySelector(".news-ticker")).not.toBeInTheDocument();
  });

  it("não deve ocupar espaço no DOM quando oculto", () => {
    const { container } = render(
      <NewsTicker items={[makeItem()]} visible={false} />,
    );
    expect(container.children[0]?.children.length ?? 0).toBe(0);
  });
});

// ── Atualização de conteúdo ──

describe("NewsTicker — atualização de conteúdo", () => {
  it("deve atualizar o texto quando os itens mudam", () => {
    const { rerender } = render(
      <NewsTicker
        items={[makeItem({ title: "Texto original" })]}
        visible={true}
      />,
    );
    const ticker = screen.getByRole("marquee");
    expect(ticker.textContent).toContain("Texto original");

    rerender(
      <NewsTicker
        items={[makeItem({ title: "Texto atualizado" })]}
        visible={true}
      />,
    );
    expect(ticker.textContent).toContain("Texto atualizado");
    expect(ticker.textContent).not.toContain("Texto original");
  });

  it("deve desaparecer quando itens são removidos", () => {
    const { container, rerender } = render(
      <NewsTicker items={[makeItem()]} visible={true} />,
    );
    expect(container.querySelector(".news-ticker")).toBeInTheDocument();

    rerender(<NewsTicker items={[]} visible={true} />);
    expect(container.querySelector(".news-ticker")).not.toBeInTheDocument();
  });

  it("deve desaparecer quando visibilidade muda para false", () => {
    const { container, rerender } = render(
      <NewsTicker items={[makeItem()]} visible={true} />,
    );
    expect(container.querySelector(".news-ticker")).toBeInTheDocument();

    rerender(<NewsTicker items={[makeItem()]} visible={false} />);
    expect(container.querySelector(".news-ticker")).not.toBeInTheDocument();
  });
});

// ── Estabilidade do layout ──

describe("NewsTicker — estabilidade do layout", () => {
  it("deve duplicar o conteúdo para loop contínuo", () => {
    render(
      <NewsTicker items={[makeItem({ title: "Loop test" })]} visible={true} />,
    );
    const ticker = screen.getByRole("marquee");
    const contents = within(ticker).getAllByText(/Loop test/);
    // Precisa de pelo menos 2 cópias (loop CSS)
    expect(contents.length).toBeGreaterThanOrEqual(2);
  });

  it("deve manter a mesma estrutura DOM após re-render com mesmos dados", () => {
    const items = [makeItem()];
    const { container, rerender } = render(
      <NewsTicker items={items} visible={true} />,
    );
    const htmlBefore = container.innerHTML;

    rerender(<NewsTicker items={items} visible={true} />);
    expect(container.innerHTML).toBe(htmlBefore);
  });

  it("deve renderizar a track de animação dentro do ticker", () => {
    const { container } = render(
      <NewsTicker items={[makeItem()]} visible={true} />,
    );
    expect(container.querySelector(".news-ticker-track")).toBeInTheDocument();
    expect(container.querySelector(".news-ticker-content")).toBeInTheDocument();
  });
});
