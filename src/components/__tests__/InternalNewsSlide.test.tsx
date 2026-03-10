import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InternalNewsSlide } from "../NewsCarousel";
import type { NoticiaInterna } from "@/services/noticiaInternaService";

function makeItem(overrides: Partial<NoticiaInterna> = {}): NoticiaInterna {
  return {
    id: 1,
    titulo: "Título de teste",
    subtitulo: "Subtítulo de teste",
    tipoMidia: "imagem",
    mediaUrl: "https://example.com/image.jpg",
    ativo: true,
    criadoEm: new Date().toISOString(),
    ...overrides,
  };
}

const defaultProps = {
  isActive: true,
  onVideoEnded: vi.fn(),
};

describe("InternalNewsSlide", () => {
  // ── Título ──

  it("renderiza o título quando presente", () => {
    render(<InternalNewsSlide item={makeItem()} {...defaultProps} />);
    expect(screen.getByText("Título de teste")).toBeInTheDocument();
  });

  it("não renderiza heading quando título é null", () => {
    render(
      <InternalNewsSlide
        item={makeItem({ titulo: null })}
        {...defaultProps}
      />,
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("não renderiza heading quando título é undefined", () => {
    render(
      <InternalNewsSlide
        item={makeItem({ titulo: undefined })}
        {...defaultProps}
      />,
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  // ── Imagem ──

  it("renderiza a imagem quando mediaUrl está presente", () => {
    render(<InternalNewsSlide item={makeItem()} {...defaultProps} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/image.jpg");
  });

  it("usa loading='lazy' e decoding='async' na imagem", () => {
    render(<InternalNewsSlide item={makeItem()} {...defaultProps} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });

  // ── Fallback sem imagem ──

  it("exibe fallback quando mediaUrl é vazio", () => {
    render(
      <InternalNewsSlide
        item={makeItem({ mediaUrl: "" })}
        {...defaultProps}
      />,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByTestId("fallback-bg")).toBeInTheDocument();
  });

  it("exibe fallback quando a imagem falha ao carregar", () => {
    render(<InternalNewsSlide item={makeItem()} {...defaultProps} />);
    const img = screen.getByRole("img");
    fireEvent.error(img);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByTestId("fallback-bg")).toBeInTheDocument();
  });

  // ── Subtítulo ──

  it("renderiza o subtítulo quando presente", () => {
    render(<InternalNewsSlide item={makeItem()} {...defaultProps} />);
    expect(screen.getByText("Subtítulo de teste")).toBeInTheDocument();
  });

  it("não renderiza subtítulo quando é null", () => {
    render(
      <InternalNewsSlide
        item={makeItem({ subtitulo: null })}
        {...defaultProps}
      />,
    );
    expect(screen.queryByText("Subtítulo de teste")).not.toBeInTheDocument();
  });

  it("não renderiza subtítulo quando é undefined", () => {
    render(
      <InternalNewsSlide
        item={makeItem({ subtitulo: undefined })}
        {...defaultProps}
      />,
    );
    expect(screen.queryByText("Subtítulo de teste")).not.toBeInTheDocument();
  });

  // ── Badge ──

  it("renderiza badge 'Condomínio'", () => {
    render(<InternalNewsSlide item={makeItem()} {...defaultProps} />);
    expect(screen.getByText(/Condomínio/)).toBeInTheDocument();
  });

  // ── Combinações ──

  it("funciona com imagem presente e sem subtítulo", () => {
    render(
      <InternalNewsSlide
        item={makeItem({ subtitulo: null })}
        {...defaultProps}
      />,
    );
    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(screen.getByText("Título de teste")).toBeInTheDocument();
    expect(screen.queryByText("Subtítulo de teste")).not.toBeInTheDocument();
  });

  it("funciona sem imagem e sem subtítulo", () => {
    render(
      <InternalNewsSlide
        item={makeItem({ mediaUrl: "", subtitulo: null })}
        {...defaultProps}
      />,
    );
    expect(screen.getByTestId("fallback-bg")).toBeInTheDocument();
    expect(screen.getByText("Título de teste")).toBeInTheDocument();
  });

  it("funciona sem imagem mas com subtítulo", () => {
    render(
      <InternalNewsSlide
        item={makeItem({ mediaUrl: "" })}
        {...defaultProps}
      />,
    );
    expect(screen.getByTestId("fallback-bg")).toBeInTheDocument();
    expect(screen.getByText("Título de teste")).toBeInTheDocument();
    expect(screen.getByText("Subtítulo de teste")).toBeInTheDocument();
  });
});
