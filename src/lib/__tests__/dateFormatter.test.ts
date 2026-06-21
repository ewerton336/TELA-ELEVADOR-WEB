import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatDate,
  formatTime,
  formatDateShort,
  formatTimeAgo,
} from "../dateFormatter";

describe("formatDate", () => {
  it("formata com dia e mês abreviado em pt-BR", () => {
    const result = formatDate("2026-03-10T14:30:00");
    // pt-BR: "10 de mar." (pode variar por runtime)
    expect(result).toMatch(/10/);
    expect(result).toMatch(/mar/i);
  });

  it("formata outro mês corretamente", () => {
    const result = formatDate("2025-12-25T10:00:00");
    expect(result).toMatch(/25/);
    expect(result).toMatch(/dez/i);
  });
});

describe("formatTime", () => {
  it("retorna hora:minuto em formato 24h", () => {
    const result = formatTime("2026-03-10T14:05:00");
    expect(result).toBe("14:05");
  });

  it("retorna meia-noite corretamente", () => {
    const result = formatTime("2026-01-01T00:00:00");
    expect(result).toBe("00:00");
  });

  it("nunca inclui segundos, mesmo se o Intl do ambiente os incluir (WebView Android)", () => {
    const spy = vi
      .spyOn(Date.prototype, "toLocaleTimeString")
      .mockReturnValue("11:39:52");
    expect(formatTime("2026-03-10T11:39:52")).toBe("11:39");
    spy.mockRestore();
  });
});

describe("formatDateShort", () => {
  it("retorna data no formato curto pt-BR", () => {
    const result = formatDateShort("2026-03-10T00:00:00");
    expect(result).toBe("10/03/2026");
  });
});

describe("formatTimeAgo", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna 'agora' para datas no futuro", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    expect(formatTimeAgo("2026-03-10T00:00:00")).toBe("agora");
  });

  it("retorna 'agora' para menos de 10 segundos", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const fiveSecsAgo = new Date(now - 5_000).toISOString();
    expect(formatTimeAgo(fiveSecsAgo)).toBe("agora");
  });

  it("retorna segundos para 10-59s", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const thirtySecsAgo = new Date(now - 30_000).toISOString();
    expect(formatTimeAgo(thirtySecsAgo)).toBe("30s atrás");
  });

  it("retorna minutos para 1-59min", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const fiveMinAgo = new Date(now - 5 * 60_000).toISOString();
    expect(formatTimeAgo(fiveMinAgo)).toBe("5m atrás");
  });

  it("retorna horas para 1h+", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const twoHoursAgo = new Date(now - 2 * 3600_000).toISOString();
    expect(formatTimeAgo(twoHoursAgo)).toBe("2h atrás");
  });
});
