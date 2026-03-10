import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const src = fs.readFileSync(
  path.resolve(__dirname, "../MessageBoard.tsx"),
  "utf-8",
);

describe("MessageBoard — consistência de espaçamento", () => {
  it("NormalCard e UrgentCard usam px-6 no bloco principal", () => {
    // Ambos devem ter "px-6 pt-6 pb-4" no bloco superior
    const matches = src.match(/px-6 pt-6 pb-4/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(2); // NormalCard + UrgentCard
  });

  it("conteúdo usa px-6 pb-6 em ambos os cards", () => {
    const matches = src.match(/px-6 pb-6/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(2);
  });

  it("separadores usam mx-6 consistentemente", () => {
    const matches = src.match(/mx-6 h-px/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(2); // NormalCard + UrgentCard
  });

  it("MetaBlock usa mx-6 com padding aumentado py-2.5", () => {
    expect(src).toContain("py-2.5 mx-6");
  });

  it("títulos usam px-6 em ambos os cards", () => {
    const matches = src.match(/leading-tight text-white px-6 pt-4/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(2);
  });
});
