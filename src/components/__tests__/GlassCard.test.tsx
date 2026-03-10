import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GlassCard, CardHeader, CardTitle, CardContent } from "../ui/GlassCard";

describe("GlassCard", () => {
  it("renderiza children", () => {
    render(<GlassCard>Conteúdo</GlassCard>);
    expect(screen.getByText("Conteúdo")).toBeInTheDocument();
  });

  it("aplica classes glass-card e border", () => {
    const { container } = render(<GlassCard>Test</GlassCard>);
    const card = container.firstElementChild!;
    expect(card.className).toContain("glass-card");
    expect(card.className).toContain("border-white/10");
  });

  it("aplica spacing='sm' com margin-bottom", () => {
    const { container } = render(<GlassCard spacing="sm">Test</GlassCard>);
    const card = container.firstElementChild!;
    expect(card.className).toContain("mb-3");
  });

  it("aplica spacing='md' com margin-bottom maior", () => {
    const { container } = render(<GlassCard spacing="md">Test</GlassCard>);
    const card = container.firstElementChild!;
    expect(card.className).toContain("mb-4");
  });

  it("não aplica margin com spacing='none' (default)", () => {
    const { container } = render(<GlassCard>Test</GlassCard>);
    const card = container.firstElementChild!;
    expect(card.className).not.toContain("mb-3");
    expect(card.className).not.toContain("mb-4");
  });

  it("aceita className adicional", () => {
    const { container } = render(<GlassCard className="w-full">Test</GlassCard>);
    const card = container.firstElementChild!;
    expect(card.className).toContain("w-full");
    expect(card.className).toContain("glass-card");
  });

  it("re-exporta CardHeader, CardTitle, CardContent", () => {
    render(
      <GlassCard>
        <CardHeader>
          <CardTitle>Título</CardTitle>
        </CardHeader>
        <CardContent>Corpo</CardContent>
      </GlassCard>,
    );
    expect(screen.getByText("Título")).toBeInTheDocument();
    expect(screen.getByText("Corpo")).toBeInTheDocument();
  });
});
