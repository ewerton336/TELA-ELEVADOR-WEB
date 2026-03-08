import { describe, it, expect } from "vitest";

// -------------------------------------------------------
// Reimplementação da função pura extraída de Admin.tsx
// (testando a lógica pura sem depender de React)
// -------------------------------------------------------

function getRoleFromToken(token: string | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload + "===".slice((payload.length + 3) % 4);

  try {
    const json = atob(padded);
    const data = JSON.parse(json) as Record<string, unknown>;

    const role =
      data.role ||
      data["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
    return typeof role === "string" ? role : null;
  } catch {
    return null;
  }
}

// Helper: cria um JWT fake com payload customizado
function makeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesignature`;
}

// -------------------------------------------------------
// Testes
// -------------------------------------------------------

describe("getRoleFromToken", () => {
  it("deve retornar null para token null", () => {
    expect(getRoleFromToken(null)).toBeNull();
  });

  it("deve retornar null para string vazia", () => {
    expect(getRoleFromToken("")).toBeNull();
  });

  it("deve retornar null para token sem partes suficientes", () => {
    expect(getRoleFromToken("parte-unica")).toBeNull();
  });

  it("deve retornar null para token com payload inválido (não JSON)", () => {
    expect(getRoleFromToken("header.!!!invalid!!!.sig")).toBeNull();
  });

  it("deve extrair role do campo 'role'", () => {
    const token = makeToken({ sub: "1", role: "Admin" });
    expect(getRoleFromToken(token)).toBe("Admin");
  });

  it("deve extrair role do ClaimTypes.Role URI", () => {
    const token = makeToken({
      sub: "1",
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role":
        "Developer",
    });
    expect(getRoleFromToken(token)).toBe("Developer");
  });

  it("deve preferir 'role' sobre ClaimTypes.Role quando ambos existem", () => {
    const token = makeToken({
      role: "Admin",
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role":
        "Developer",
    });
    expect(getRoleFromToken(token)).toBe("Admin");
  });

  it("deve retornar null quando role não é string (número)", () => {
    const token = makeToken({ role: 42 });
    expect(getRoleFromToken(token)).toBeNull();
  });

  it("deve retornar null quando role não é string (array)", () => {
    const token = makeToken({ role: ["Admin", "User"] });
    expect(getRoleFromToken(token)).toBeNull();
  });

  it("deve retornar null quando payload não contém role", () => {
    const token = makeToken({ sub: "1", name: "Test" });
    expect(getRoleFromToken(token)).toBeNull();
  });

  it("deve lidar com padding base64 corretamente", () => {
    // Payload com tamanho que necessita padding
    const token = makeToken({ role: "developer", x: "ab" });
    expect(getRoleFromToken(token)).toBe("developer");
  });
});
