import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModuleToggleCard } from "../ModuleToggleCard";
import { Cloud } from "lucide-react";

describe("ModuleToggleCard", () => {
  const baseProps = {
    icon: Cloud,
    title: "Previsão do tempo",
    description: "Clima atual",
    enabled: true,
    onToggle: vi.fn(),
  };

  it("renderiza título e descrição", () => {
    render(<ModuleToggleCard {...baseProps} />);
    expect(screen.getByText("Previsão do tempo")).toBeInTheDocument();
    expect(screen.getByText("Clima atual")).toBeInTheDocument();
  });

  it("exibe badge 'Ativado' quando habilitado", () => {
    render(<ModuleToggleCard {...baseProps} enabled={true} />);
    expect(screen.getByText("Ativado")).toBeInTheDocument();
  });

  it("exibe badge 'Desativado' quando desabilitado", () => {
    render(<ModuleToggleCard {...baseProps} enabled={false} />);
    expect(screen.getByText("Desativado")).toBeInTheDocument();
  });

  it("aplica estilo verde quando habilitado", () => {
    const { container } = render(<ModuleToggleCard {...baseProps} enabled={true} />);
    const wrapper = container.firstElementChild!;
    expect(wrapper.className).toContain("border-green-500/30");
    expect(wrapper.className).toContain("bg-green-500/10");
  });

  it("aplica estilo opaco quando desabilitado", () => {
    const { container } = render(<ModuleToggleCard {...baseProps} enabled={false} />);
    const wrapper = container.firstElementChild!;
    expect(wrapper.className).toContain("opacity-60");
    expect(wrapper.className).toContain("border-white/10");
  });

  it("chama onToggle ao clicar no switch", async () => {
    const user = userEvent.setup();
    const toggle = vi.fn();
    render(<ModuleToggleCard {...baseProps} onToggle={toggle} />);
    const switchEl = screen.getByRole("switch");
    await user.click(switchEl);
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it("renderiza children adicionais", () => {
    render(
      <ModuleToggleCard {...baseProps}>
        <span>Extra info</span>
      </ModuleToggleCard>,
    );
    expect(screen.getByText("Extra info")).toBeInTheDocument();
  });

  it("renderiza o ícone fornecido", () => {
    const { container } = render(<ModuleToggleCard {...baseProps} />);
    const svgs = container.querySelectorAll("svg");
    // Deve ter pelo menos 1 SVG (o ícone Cloud)
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });
});
