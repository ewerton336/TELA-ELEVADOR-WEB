import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { getWeatherIconUrl } from "../weatherIcons";

/**
 * Todos os códigos WMO (World Meteorological Organization) que a Open-Meteo
 * pode retornar no campo `weather_code`. Cada um precisa ter uma animação.
 */
const ALL_WMO_CODES = [
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77,
  80, 81, 82, 85, 86, 95, 96, 99,
];

describe("weatherIcons — cobertura de condições de clima", () => {
  it.each(ALL_WMO_CODES)(
    "código WMO %i deve ter um ícone animado mapeado",
    (code) => {
      expect(getWeatherIconUrl(code)).not.toBeNull();
    },
  );

  it.each(ALL_WMO_CODES)(
    "o SVG do código WMO %i deve existir em public/weather",
    (code) => {
      const url = getWeatherIconUrl(code);
      expect(url).not.toBeNull();
      const filePath = resolve(process.cwd(), "public", url!.replace(/^\//, ""));
      expect(existsSync(filePath), `${url} não encontrado no disco`).toBe(true);
    },
  );

  it("retorna null para código desconhecido ou nulo", () => {
    expect(getWeatherIconUrl(12345)).toBeNull();
    expect(getWeatherIconUrl(null)).toBeNull();
    expect(getWeatherIconUrl(undefined)).toBeNull();
  });
});

const DAY_NIGHT_CODES = [0, 1, 2, 3, 45, 80, 81, 82, 85, 95, 96];
const NEUTRAL_CODES = [48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 86, 99];

describe("weatherIcons — variante noturna", () => {
  it.each(DAY_NIGHT_CODES)(
    "código WMO %i com isDay=false usa ícone -night existente no disco",
    (code) => {
      const url = getWeatherIconUrl(code, false);
      expect(url).not.toBeNull();
      expect(url).toContain("-night");
      const filePath = resolve(process.cwd(), "public", url!.replace(/^\//, ""));
      expect(existsSync(filePath), `${url} não encontrado no disco`).toBe(true);
    },
  );

  it.each(NEUTRAL_CODES)(
    "condição neutra WMO %i não muda entre dia e noite",
    (code) => {
      expect(getWeatherIconUrl(code, false)).toBe(getWeatherIconUrl(code, true));
    },
  );
});
