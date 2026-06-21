import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const src = fs.readFileSync(
  path.resolve(__dirname, "../MessageBoard.tsx"),
  "utf-8",
);

describe("MessageBoard — consistência de espaçamento", () => {
  it("NormalCard e UrgentCard usam px-6 no bloco principal", () => {
    const matches = src.match(/px-6 pt-4 pb-2/g);
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

  it("data/hora de publicação fica inline no cabeçalho (HeaderDateTime) em ambos os cards", () => {
    const matches = src.match(/<HeaderDateTime createdAt=/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(2); // NormalCard + UrgentCard
  });

  it("títulos usam px-6 em ambos os cards", () => {
    const matches = src.match(/msg-title px-6 pt-5 pb-3/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(2);
  });
});
