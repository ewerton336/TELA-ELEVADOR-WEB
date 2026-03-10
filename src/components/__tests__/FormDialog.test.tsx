import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormDialog } from "../FormDialog";

describe("FormDialog", () => {
  const baseFields = [
    { name: "nome", label: "Nome", placeholder: "Digite o nome", required: true },
    { name: "email", label: "Email", placeholder: "email@ex.com" },
  ];

  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: "Novo Item",
    fields: baseFields,
    onSubmit: vi.fn().mockResolvedValue(undefined),
  };

  it("renderiza título do dialog", () => {
    render(<FormDialog {...baseProps} />);
    expect(screen.getByText("Novo Item")).toBeInTheDocument();
  });

  it("renderiza labels dos campos", () => {
    render(<FormDialog {...baseProps} />);
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renderiza placeholders", () => {
    render(<FormDialog {...baseProps} />);
    expect(screen.getByPlaceholderText("Digite o nome")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("email@ex.com")).toBeInTheDocument();
  });

  it("preenche initialValues nos campos", () => {
    render(
      <FormDialog
        {...baseProps}
        initialValues={{ nome: "João", email: "joao@test.com" }}
      />,
    );
    expect(screen.getByLabelText("Nome")).toHaveValue("João");
    expect(screen.getByLabelText("Email")).toHaveValue("joao@test.com");
  });

  it("exibe hint no campo quando fornecido", () => {
    const fields = [
      { name: "senha", label: "Senha", hint: "(deixe em branco para não alterar)" },
    ];
    render(<FormDialog {...baseProps} fields={fields} />);
    expect(screen.getByText("(deixe em branco para não alterar)")).toBeInTheDocument();
  });

  it("chama onSubmit com valores ao clicar Salvar", async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValue(undefined);
    render(<FormDialog {...baseProps} onSubmit={submit} />);

    await user.type(screen.getByLabelText("Nome"), "Teste");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(submit).toHaveBeenCalledTimes(1);
    });
    expect(submit.mock.calls[0][0]).toMatchObject({ nome: "Teste" });
  });

  it("exibe 'Salvando...' durante loading", () => {
    render(<FormDialog {...baseProps} loading={true} />);
    expect(screen.getByText("Salvando...")).toBeInTheDocument();
  });

  it("exibe botões Cancelar e Salvar", () => {
    render(<FormDialog {...baseProps} />);
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salvar/i })).toBeInTheDocument();
  });

  it("não renderiza quando open=false", () => {
    render(<FormDialog {...baseProps} open={false} />);
    expect(screen.queryByText("Novo Item")).not.toBeInTheDocument();
  });

  it("usa render custom quando fornecido", () => {
    const fields = [
      {
        name: "custom",
        label: "Custom Field",
        render: (value: string, onChange: (v: string) => void) => (
          <select value={value} onChange={(e) => onChange(e.target.value)} data-testid="custom-select">
            <option value="a">A</option>
            <option value="b">B</option>
          </select>
        ),
      },
    ];
    render(<FormDialog {...baseProps} fields={fields} />);
    expect(screen.getByTestId("custom-select")).toBeInTheDocument();
  });
});
