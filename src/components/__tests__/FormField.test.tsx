import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormField } from "../ui/FormField";

describe("FormField", () => {
  it("renderiza label e input", () => {
    render(<FormField label="Nome" value="" onValueChange={() => {}} />);
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
  });

  it("gera id a partir do label automaticamente", () => {
    render(<FormField label="Meu Campo" value="abc" onValueChange={() => {}} />);
    const input = screen.getByLabelText("Meu Campo");
    expect(input.id).toBe("meu-campo");
  });

  it("usa id customizado quando fornecido", () => {
    render(<FormField id="custom-id" label="Campo" value="" onValueChange={() => {}} />);
    const input = screen.getByLabelText("Campo");
    expect(input.id).toBe("custom-id");
  });

  it("exibe hint quando fornecido", () => {
    render(<FormField label="Email" value="" onValueChange={() => {}} hint="Seu melhor email" />);
    expect(screen.getByText("Seu melhor email")).toBeInTheDocument();
  });

  it("não renderiza hint quando não fornecido", () => {
    const { container } = render(<FormField label="Email" value="" onValueChange={() => {}} />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("chama onValueChange ao digitar", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<FormField label="Nome" value="" onValueChange={handler} />);
    await user.type(screen.getByLabelText("Nome"), "a");
    expect(handler).toHaveBeenCalledWith("a");
  });

  it("aplica classes dark quando dark=true", () => {
    render(<FormField label="Campo" value="" onValueChange={() => {}} dark />);
    const input = screen.getByLabelText("Campo");
    expect(input.className).toContain("bg-white/10");
    expect(input.className).toContain("text-white");
  });

  it("não aplica classes dark por padrão", () => {
    render(<FormField label="Campo" value="" onValueChange={() => {}} />);
    const input = screen.getByLabelText("Campo");
    expect(input.className).not.toContain("bg-white/10");
  });

  it("repassa placeholder ao input", () => {
    render(<FormField label="Nome" value="" onValueChange={() => {}} placeholder="Digite aqui" />);
    expect(screen.getByPlaceholderText("Digite aqui")).toBeInTheDocument();
  });

  it("repassa type ao input", () => {
    render(<FormField label="Senha" value="" onValueChange={() => {}} type="password" />);
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
  });
});
