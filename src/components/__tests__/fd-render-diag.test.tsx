import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/ui/dialog", async () => {
  const React = await import("react");
  return {
    Dialog: ({ children, open }: any) =>
      open ? React.createElement("div", { role: "dialog" }, children) : null,
    DialogContent: ({ children }: any) =>
      React.createElement("div", null, children),
    DialogHeader: ({ children }: any) =>
      React.createElement("div", null, children),
    DialogTitle: ({ children }: any) =>
      React.createElement("h2", null, children),
  };
});

import { FormDialog } from "../FormDialog";

describe("FormDialog render diagnostic", () => {
  it("renders with open=false (should be instant)", () => {
    render(
      <FormDialog
        open={false}
        onOpenChange={() => {}}
        title="Test"
        fields={[]}
        onSubmit={async () => {}}
      />,
    );
    expect(true).toBe(true);
  });

  it("renders with open=true and stable initialValues", () => {
    const stableInit = { nome: "" };
    render(
      <FormDialog
        open={true}
        onOpenChange={() => {}}
        title="Test"
        fields={[{ name: "nome", label: "Nome" }]}
        onSubmit={async () => {}}
        initialValues={stableInit}
      />,
    );
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("renders with open=true WITHOUT initialValues (default={})", () => {
    render(
      <FormDialog
        open={true}
        onOpenChange={() => {}}
        title="Test2"
        fields={[{ name: "nome", label: "Nome" }]}
        onSubmit={async () => {}}
      />,
    );
    expect(screen.getByText("Test2")).toBeInTheDocument();
  });
});
