import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CrudList } from "../CrudList";

interface Item {
  id: number;
  nome: string;
}

const items: Item[] = [
  { id: 1, nome: "Edifício Aurora" },
  { id: 2, nome: "Edifício Sol" },
];

describe("CrudList", () => {
  it("renderiza itens da lista", () => {
    render(
      <CrudList
        items={items}
        getKey={(i) => i.id}
        renderItem={(i) => <span>{i.nome}</span>}
      />,
    );
    expect(screen.getByText("Edifício Aurora")).toBeInTheDocument();
    expect(screen.getByText("Edifício Sol")).toBeInTheDocument();
  });

  it("exibe mensagem vazia quando sem itens", () => {
    render(
      <CrudList
        items={[]}
        getKey={(i: Item) => i.id}
        renderItem={(i) => <span>{i.nome}</span>}
        emptyMessage="Nenhum prédio cadastrado"
      />,
    );
    expect(screen.getByText("Nenhum prédio cadastrado")).toBeInTheDocument();
  });

  it("exibe mensagem padrão quando sem itens e sem emptyMessage", () => {
    render(
      <CrudList
        items={[]}
        getKey={(i: Item) => i.id}
        renderItem={(i) => <span>{i.nome}</span>}
      />,
    );
    expect(screen.getByText("Nenhum item cadastrado")).toBeInTheDocument();
  });

  it("exibe loading quando loading=true", () => {
    render(
      <CrudList
        items={[]}
        getKey={(i: Item) => i.id}
        renderItem={(i) => <span>{i.nome}</span>}
        loading={true}
      />,
    );
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  it("exibe botões Editar quando onEdit fornecido", () => {
    render(
      <CrudList
        items={items}
        getKey={(i) => i.id}
        renderItem={(i) => <span>{i.nome}</span>}
        onEdit={() => {}}
      />,
    );
    const editButtons = screen.getAllByText("Editar");
    expect(editButtons).toHaveLength(2);
  });

  it("exibe botões Deletar quando onDelete fornecido", () => {
    render(
      <CrudList
        items={items}
        getKey={(i) => i.id}
        renderItem={(i) => <span>{i.nome}</span>}
        onDelete={vi.fn()}
      />,
    );
    const deleteButtons = screen.getAllByText("Deletar");
    expect(deleteButtons).toHaveLength(2);
  });

  it("não exibe botões quando onEdit/onDelete não fornecidos", () => {
    render(
      <CrudList
        items={items}
        getKey={(i) => i.id}
        renderItem={(i) => <span>{i.nome}</span>}
      />,
    );
    expect(screen.queryByText("Editar")).not.toBeInTheDocument();
    expect(screen.queryByText("Deletar")).not.toBeInTheDocument();
  });

  it("chama onEdit com item correto ao clicar Editar", async () => {
    const user = userEvent.setup();
    const edit = vi.fn();
    render(
      <CrudList
        items={items}
        getKey={(i) => i.id}
        renderItem={(i) => <span>{i.nome}</span>}
        onEdit={edit}
      />,
    );
    await user.click(screen.getAllByText("Editar")[0]);
    expect(edit).toHaveBeenCalledWith(items[0]);
  });

  it("abre AlertDialog ao clicar Deletar", async () => {
    const user = userEvent.setup();
    render(
      <CrudList
        items={items}
        getKey={(i) => i.id}
        renderItem={(i) => <span>{i.nome}</span>}
        onDelete={vi.fn()}
      />,
    );
    await user.click(screen.getAllByText("Deletar")[0]);
    expect(screen.getByText("Confirmar Deleção")).toBeInTheDocument();
  });

  it("exibe mensagem de confirmação customizada no AlertDialog", async () => {
    const user = userEvent.setup();
    render(
      <CrudList
        items={items}
        getKey={(i) => i.id}
        renderItem={(i) => <span>{i.nome}</span>}
        onDelete={vi.fn()}
        deleteConfirmMessage="Deseja realmente excluir?"
      />,
    );
    await user.click(screen.getAllByText("Deletar")[0]);
    expect(screen.getByText("Deseja realmente excluir?")).toBeInTheDocument();
  });

  it("chama onDelete ao confirmar no AlertDialog", async () => {
    const user = userEvent.setup();
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    render(
      <CrudList
        items={items}
        getKey={(i) => i.id}
        renderItem={(i) => <span>{i.nome}</span>}
        onDelete={deleteFn}
      />,
    );
    // Clicar no primeiro Deletar
    await user.click(screen.getAllByText("Deletar")[0]);
    // Confirmar no AlertDialog
    const confirmBtn = screen.getAllByText("Deletar").find(
      (btn) => btn.closest("[role='alertdialog']") !== null,
    );
    if (confirmBtn) await user.click(confirmBtn);
    expect(deleteFn).toHaveBeenCalledWith(items[0]);
  });
});
