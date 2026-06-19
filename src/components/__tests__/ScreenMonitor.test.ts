import { describe, it, expect } from "vitest";
import { computeLatestVersion, isScreenOutdated } from "@/lib/screenVersion";

// -------------------------------------------------------
// Reimplementação das funções puras extraídas do ScreenMonitor
// (testando a lógica pura sem depender de React)
// -------------------------------------------------------

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return "agora";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return "agora";
  if (seconds < 60) return `${seconds}s atrás`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m atrás`;
  return `${Math.floor(seconds / 3600)}h atrás`;
}

interface ScreenInfo {
  connectionId: string;
  slug: string;
  connectedAt: string;
  lastHeartbeat: string;
  uptime: number;
  isVisible: boolean;
}

function isScreenAlive(screen: ScreenInfo): boolean {
  const diff = Date.now() - new Date(screen.lastHeartbeat).getTime();
  return diff < 120_000;
}

// -------------------------------------------------------
// Testes
// -------------------------------------------------------

describe("formatUptime", () => {
  it("deve formatar segundos abaixo de 60", () => {
    expect(formatUptime(0)).toBe("0s");
    expect(formatUptime(30)).toBe("30s");
    expect(formatUptime(59.9)).toBe("59s");
  });

  it("deve formatar minutos", () => {
    expect(formatUptime(60)).toBe("1m");
    expect(formatUptime(120)).toBe("2m");
    expect(formatUptime(3599)).toBe("59m");
  });

  it("deve formatar horas e minutos", () => {
    expect(formatUptime(3600)).toBe("1h 0m");
    expect(formatUptime(3660)).toBe("1h 1m");
    expect(formatUptime(7200)).toBe("2h 0m");
    expect(formatUptime(7350)).toBe("2h 2m");
    expect(formatUptime(86400)).toBe("24h 0m");
  });

  it("não deve retornar NaN para valores válidos", () => {
    const result = formatUptime(120.5);
    expect(result).not.toContain("NaN");
    expect(result).toBe("2m");
  });

  it("deve lidar com zero corretamente", () => {
    expect(formatUptime(0)).toBe("0s");
  });
});

describe("formatTimeAgo", () => {
  it("deve retornar 'agora' para timestamps futuros", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(formatTimeAgo(future)).toBe("agora");
  });

  it("deve retornar 'agora' para timestamps recentes (<10s)", () => {
    const recent = new Date(Date.now() - 5_000).toISOString();
    expect(formatTimeAgo(recent)).toBe("agora");
  });

  it("deve retornar segundos atrás para 10-59s", () => {
    const past = new Date(Date.now() - 30_000).toISOString();
    const result = formatTimeAgo(past);
    expect(result).toMatch(/^\d+s atrás$/);
  });

  it("deve retornar minutos para 60s-3599s", () => {
    const past = new Date(Date.now() - 120_000).toISOString();
    expect(formatTimeAgo(past)).toBe("2m atrás");
  });

  it("deve retornar horas para >= 3600s", () => {
    const past = new Date(Date.now() - 7_200_000).toISOString();
    expect(formatTimeAgo(past)).toBe("2h atrás");
  });
});

describe("isScreenAlive", () => {
  const makeScreen = (lastHeartbeatMs: number): ScreenInfo => ({
    connectionId: "test",
    slug: "gramado",
    connectedAt: new Date().toISOString(),
    lastHeartbeat: new Date(Date.now() - lastHeartbeatMs).toISOString(),
    uptime: 100,
    isVisible: true,
  });

  it("deve retornar true para heartbeat recente (<2min)", () => {
    expect(isScreenAlive(makeScreen(0))).toBe(true);
    expect(isScreenAlive(makeScreen(30_000))).toBe(true);
    expect(isScreenAlive(makeScreen(119_000))).toBe(true);
  });

  it("deve retornar false para heartbeat antigo (>=2min)", () => {
    expect(isScreenAlive(makeScreen(120_001))).toBe(false);
    expect(isScreenAlive(makeScreen(300_000))).toBe(false);
  });
});

describe("computeLatestVersion", () => {
  const vOld = "2026-03-05T10:00:00.000Z";
  const vNew = "2026-06-18T22:00:00.000Z";

  it("retorna a versão mais recente entre as informadas", () => {
    expect(computeLatestVersion([vOld, vNew])).toBe(vNew);
    expect(computeLatestVersion([vNew, vOld])).toBe(vNew);
  });

  it("ignora versões nulas/vazias/inválidas", () => {
    expect(computeLatestVersion([null, vOld, "", undefined, "lixo"])).toBe(vOld);
  });

  it("retorna null quando não há nenhuma versão válida", () => {
    expect(computeLatestVersion([null, undefined, "", "abc"])).toBeNull();
  });
});

describe("isScreenOutdated", () => {
  const vOld = "2026-03-05T10:00:00.000Z";
  const vNew = "2026-06-18T22:00:00.000Z";

  it("marca como desatualizada quando a tela é mais antiga que a referência", () => {
    expect(isScreenOutdated(vOld, vNew)).toBe(true);
  });

  it("NÃO marca como desatualizada quando a tela está na versão mais recente", () => {
    expect(isScreenOutdated(vNew, vNew)).toBe(false);
  });

  it("NÃO marca tela nova como desatualizada quando o master está num build antigo (regressão do bug)", () => {
    // master antigo (vOld) + tela nova (vNew); a referência (latest) é vNew
    const latest = computeLatestVersion([vOld, vNew]);
    expect(isScreenOutdated(vNew, latest)).toBe(false);
    // a tela antiga, essa sim, fica desatualizada
    expect(isScreenOutdated(vOld, latest)).toBe(true);
  });

  it("trata versão ausente como desatualizada (desconhecida)", () => {
    expect(isScreenOutdated(null, vNew)).toBe(true);
    expect(isScreenOutdated(undefined, vNew)).toBe(true);
    expect(isScreenOutdated("", vNew)).toBe(true);
  });

  it("não marca como desatualizada quando não há referência válida", () => {
    expect(isScreenOutdated(vOld, null)).toBe(false);
  });
});
