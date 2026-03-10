import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NewsCarousel } from "../NewsCarousel";
import type { NoticiaInterna } from "@/services/noticiaInternaService";
import type { NewsData } from "@/services/newsService";

// ── Helpers ──

function makeInternal(overrides: Partial<NoticiaInterna> = {}): NoticiaInterna {
  return {
    id: 1,
    titulo: "Aviso importante",
    subtitulo: "Leia com atenção",
    tipoMidia: "imagem",
    mediaUrl: "/api/media/1.jpg",
    ativo: true,
    criadoEm: new Date().toISOString(),
    ...overrides,
  };
}

function makeNewsData(overrides: Partial<NewsData> = {}): NewsData {
  return {
    items: [],
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

// Render only internal slides (no external news) so the first slide is always InternalNewsSlide
function renderInternal(item: NoticiaInterna) {
  return render(
    <NewsCarousel
      data={makeNewsData()}
      noticiasInternas={[item]}
    />,
  );
}

// ── Título ──

describe("InternalNewsSlide — título", () => {
  it("deve renderizar o título quando presente", () => {
    renderInternal(makeInternal({ titulo: "Manutenção na piscina" }));
    expect(screen.getByText("Manutenção na piscina")).toBeInTheDocument();
  });

  it("deve renderizar como heading (h3)", () => {
    renderInternal(makeInternal({ titulo: "Reunião de condomínio" }));
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("Reunião de condomínio");
  });

  it("não deve renderizar heading quando título é undefined", () => {
    renderInternal(makeInternal({ titulo: undefined }));
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  it("não deve renderizar heading quando título é null", () => {
    renderInternal(makeInternal({ titulo: null }));
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  it("não deve renderizar heading quando título é string vazia", () => {
    renderInternal(makeInternal({ titulo: "" }));
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });
});

// ── Subtítulo ──

describe("InternalNewsSlide — subtítulo", () => {
  it("deve renderizar o subtítulo quando presente", () => {
    renderInternal(makeInternal({ subtitulo: "Detalhes adicionais" }));
    expect(screen.getByText("Detalhes adicionais")).toBeInTheDocument();
  });

  it("não deve renderizar subtítulo quando é undefined", () => {
    renderInternal(makeInternal({ subtitulo: undefined }));
    expect(screen.queryByText("Leia com atenção")).not.toBeInTheDocument();
  });

  it("não deve renderizar subtítulo quando é null", () => {
    renderInternal(makeInternal({ subtitulo: null }));
    expect(screen.queryByText("Leia com atenção")).not.toBeInTheDocument();
  });

  it("não deve renderizar subtítulo quando é string vazia", () => {
    renderInternal(makeInternal({ subtitulo: "" }));
    // The paragraph element should not exist
    const slide = screen.getByTestId("internal-news-slide");
    const paragraphs = slide.querySelectorAll("p");
    expect(paragraphs).toHaveLength(0);
  });
});

// ── Imagem ──

describe("InternalNewsSlide — imagem", () => {
  it("deve renderizar a imagem quando mediaUrl está presente", () => {
    renderInternal(makeInternal({ mediaUrl: "/api/media/photo.jpg" }));
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/api/media/photo.jpg");
  });

  it("deve usar título como alt text da imagem", () => {
    renderInternal(
      makeInternal({ titulo: "Foto do evento", mediaUrl: "/api/media/photo.jpg" }),
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", "Foto do evento");
  });

  it("deve usar alt text padrão quando título está ausente", () => {
    renderInternal(
      makeInternal({ titulo: undefined, mediaUrl: "/api/media/photo.jpg" }),
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", "Notícia do condomínio");
  });

  it("deve ter atributos lazy e async na imagem", () => {
    renderInternal(makeInternal({ mediaUrl: "/api/media/photo.jpg" }));
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });
});

// ── Fallback quando não há imagem ──

describe("InternalNewsSlide — fallback sem imagem", () => {
  it("deve exibir fallback background quando mediaUrl está vazia", () => {
    renderInternal(makeInternal({ mediaUrl: "" }));
    expect(screen.getByTestId("fallback-bg")).toBeInTheDocument();
  });

  it("não deve renderizar <img> quando mediaUrl está vazia", () => {
    renderInternal(makeInternal({ mediaUrl: "" }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("deve exibir fallback background quando imagem falha ao carregar", () => {
    renderInternal(makeInternal({ mediaUrl: "/api/media/broken.jpg" }));
    const img = screen.getByRole("img");
    fireEvent.error(img);
    expect(screen.getByTestId("fallback-bg")).toBeInTheDocument();
    // Image should be removed from DOM after error
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("deve continuar exibindo título e subtítulo mesmo com fallback", () => {
    renderInternal(
      makeInternal({
        titulo: "Título sem imagem",
        subtitulo: "Subtítulo sem imagem",
        mediaUrl: "",
      }),
    );
    expect(screen.getByText("Título sem imagem")).toBeInTheDocument();
    expect(screen.getByText("Subtítulo sem imagem")).toBeInTheDocument();
  });
});

// ── Badge do condomínio ──

describe("InternalNewsSlide — badge", () => {
  it("deve exibir badge 'Condomínio'", () => {
    renderInternal(makeInternal());
    expect(screen.getByText(/Condomínio/)).toBeInTheDocument();
  });
});

// ── Combinações de campos opcionais ──

describe("InternalNewsSlide — combinações", () => {
  it("deve funcionar com título presente e subtítulo ausente", () => {
    renderInternal(makeInternal({ titulo: "Só título", subtitulo: undefined }));
    expect(screen.getByText("Só título")).toBeInTheDocument();
  });

  it("deve funcionar com subtítulo presente e título ausente", () => {
    renderInternal(makeInternal({ titulo: undefined, subtitulo: "Só subtítulo" }));
    expect(screen.getByText("Só subtítulo")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  it("deve funcionar sem título, sem subtítulo e sem imagem", () => {
    renderInternal(
      makeInternal({ titulo: undefined, subtitulo: undefined, mediaUrl: "" }),
    );
    // Should still render the badge
    expect(screen.getByText(/Condomínio/)).toBeInTheDocument();
    // No heading, no paragraph
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
    expect(screen.getByTestId("fallback-bg")).toBeInTheDocument();
  });

  it("deve funcionar com todos os campos presentes", () => {
    renderInternal(
      makeInternal({
        titulo: "Título completo",
        subtitulo: "Subtítulo completo",
        mediaUrl: "/api/media/full.jpg",
      }),
    );
    expect(screen.getByText("Título completo")).toBeInTheDocument();
    expect(screen.getByText("Subtítulo completo")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("src", "/api/media/full.jpg");
  });
});
