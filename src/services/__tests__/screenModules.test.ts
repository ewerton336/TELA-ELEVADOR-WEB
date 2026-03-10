import { describe, it, expect } from "vitest";

// ── Reprodução da lógica e tipos de predioService.ts ──

type ScreenModules = {
  buildingNotice: boolean;
  weather: boolean;
  headlineNews: boolean;
  newsTicker: boolean;
};

const DEFAULT_MODULES: ScreenModules = {
  buildingNotice: true,
  weather: true,
  headlineNews: true,
  newsTicker: true,
};

// ── Reprodução da lógica de URL building do apiClient ──

function buildBaseUrl(slug: string): string {
  return `/api/${encodeURIComponent(slug)}`;
}

function buildModulesUrl(slug: string): string {
  return `${buildBaseUrl(slug)}/admin/predio/modulos`;
}

// ── Reprodução da lógica de toggle do Admin.tsx ──

function toggleModule(
  current: ScreenModules,
  key: keyof ScreenModules,
): ScreenModules {
  return { ...current, [key]: !current[key] };
}

function deriveVisibility(modules: ScreenModules) {
  return {
    showAvisos: modules.buildingNotice,
    showWeather: modules.weather,
    showNews: modules.headlineNews,
  };
}

// ── Testes: DEFAULT_MODULES ──

describe("DEFAULT_MODULES", () => {
  it("deve ter todos os módulos ativados por padrão", () => {
    expect(DEFAULT_MODULES.buildingNotice).toBe(true);
    expect(DEFAULT_MODULES.weather).toBe(true);
    expect(DEFAULT_MODULES.headlineNews).toBe(true);
    expect(DEFAULT_MODULES.newsTicker).toBe(true);
  });

  it("deve ter exatamente 4 propriedades", () => {
    expect(Object.keys(DEFAULT_MODULES)).toHaveLength(4);
  });
});

// ── Testes: URL building para módulos ──

describe("buildModulesUrl", () => {
  it("deve construir URL correta para slug simples", () => {
    expect(buildModulesUrl("gramado")).toBe(
      "/api/gramado/admin/predio/modulos",
    );
  });

  it("deve codificar slug com caracteres especiais", () => {
    expect(buildModulesUrl("meu prédio")).toBe(
      "/api/meu%20pr%C3%A9dio/admin/predio/modulos",
    );
  });

  it("deve codificar slug com barra", () => {
    expect(buildModulesUrl("a/b")).toBe("/api/a%2Fb/admin/predio/modulos");
  });
});

// ── Testes: toggleModule ──

describe("toggleModule", () => {
  it("deve desativar módulo que estava ativo", () => {
    const result = toggleModule(DEFAULT_MODULES, "weather");
    expect(result.weather).toBe(false);
    expect(result.buildingNotice).toBe(true);
    expect(result.headlineNews).toBe(true);
    expect(result.newsTicker).toBe(true);
  });

  it("deve ativar módulo que estava desativado", () => {
    const current: ScreenModules = { ...DEFAULT_MODULES, headlineNews: false };
    const result = toggleModule(current, "headlineNews");
    expect(result.headlineNews).toBe(true);
  });

  it("não deve mutar o objeto original", () => {
    const original = { ...DEFAULT_MODULES };
    const result = toggleModule(original, "buildingNotice");
    expect(original.buildingNotice).toBe(true);
    expect(result.buildingNotice).toBe(false);
  });

  it("deve funcionar para cada chave de módulo", () => {
    const keys: (keyof ScreenModules)[] = [
      "buildingNotice",
      "weather",
      "headlineNews",
      "newsTicker",
    ];
    for (const key of keys) {
      const result = toggleModule(DEFAULT_MODULES, key);
      expect(result[key]).toBe(false);
      for (const other of keys) {
        if (other !== key) {
          expect(result[other]).toBe(true);
        }
      }
    }
  });
});

// ── Testes: deriveVisibility (lógica do Dashboard.tsx) ──

describe("deriveVisibility", () => {
  it("todos ativados → tudo visível", () => {
    const v = deriveVisibility(DEFAULT_MODULES);
    expect(v.showAvisos).toBe(true);
    expect(v.showWeather).toBe(true);
    expect(v.showNews).toBe(true);
  });

  it("buildingNotice desativado → showAvisos false", () => {
    const v = deriveVisibility({ ...DEFAULT_MODULES, buildingNotice: false });
    expect(v.showAvisos).toBe(false);
    expect(v.showWeather).toBe(true);
    expect(v.showNews).toBe(true);
  });

  it("weather desativado → showWeather false", () => {
    const v = deriveVisibility({ ...DEFAULT_MODULES, weather: false });
    expect(v.showWeather).toBe(false);
  });

  it("headlineNews desativado → showNews false", () => {
    const v = deriveVisibility({ ...DEFAULT_MODULES, headlineNews: false });
    expect(v.showNews).toBe(false);
  });

  it("newsTicker desativado mas headlineNews ativado → showNews true", () => {
    const v = deriveVisibility({ ...DEFAULT_MODULES, newsTicker: false });
    expect(v.showNews).toBe(true);
  });

  it("headlineNews E newsTicker desativados → showNews false", () => {
    const v = deriveVisibility({
      ...DEFAULT_MODULES,
      headlineNews: false,
      newsTicker: false,
    });
    expect(v.showNews).toBe(false);
  });

  it("todos desativados → nada visível", () => {
    const v = deriveVisibility({
      buildingNotice: false,
      weather: false,
      headlineNews: false,
      newsTicker: false,
    });
    expect(v.showAvisos).toBe(false);
    expect(v.showWeather).toBe(false);
    expect(v.showNews).toBe(false);
  });
});

// ── Testes: reset para padrão ──

describe("reset modules", () => {
  it("restaurar padrão deve retornar todos ativados", () => {
    const modified: ScreenModules = {
      buildingNotice: false,
      weather: false,
      headlineNews: false,
      newsTicker: false,
    };
    const restored = { ...DEFAULT_MODULES };

    expect(restored).toEqual({
      buildingNotice: true,
      weather: true,
      headlineNews: true,
      newsTicker: true,
    });
    expect(restored).not.toBe(modified);
  });
});

// ── Testes: serialização JSON (contrato com backend) ──

describe("serialização JSON do ScreenModules", () => {
  it("deve serializar com nomes camelCase", () => {
    const json = JSON.stringify(DEFAULT_MODULES);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveProperty("buildingNotice");
    expect(parsed).toHaveProperty("weather");
    expect(parsed).toHaveProperty("headlineNews");
    expect(parsed).toHaveProperty("newsTicker");
  });

  it("deve manter valores boolean após round-trip", () => {
    const modules: ScreenModules = {
      buildingNotice: false,
      weather: true,
      headlineNews: false,
      newsTicker: true,
    };
    const roundTrip = JSON.parse(JSON.stringify(modules)) as ScreenModules;

    expect(roundTrip.buildingNotice).toBe(false);
    expect(roundTrip.weather).toBe(true);
    expect(roundTrip.headlineNews).toBe(false);
    expect(roundTrip.newsTicker).toBe(true);
  });
});
