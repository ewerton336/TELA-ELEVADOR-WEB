import { describe, it, expect } from "vitest";
import { brasiliaMinutesOfDay, isDaytime } from "../brasiliaTime";

describe("brasiliaTime — isDaytime (06:00–18:00 = dia)", () => {
  it.each([
    [6 * 60, true],
    [12 * 60, true],
    [18 * 60, true],
    [18 * 60 + 1, false],
    [5 * 60 + 59, false],
    [0, false],
    [23 * 60, false],
  ])("minuto %i => dia=%s", (minutes, expected) => {
    expect(isDaytime(minutes as number)).toBe(expected);
  });
});

describe("brasiliaTime — brasiliaMinutesOfDay (fuso America/Sao_Paulo)", () => {
  it("15:00Z vira 12:00 em Brasília (UTC-3)", () => {
    expect(brasiliaMinutesOfDay(Date.parse("2026-07-18T15:00:00Z"))).toBe(
      12 * 60,
    );
  });

  it("00:00Z vira 21:00 do dia anterior em Brasília", () => {
    expect(brasiliaMinutesOfDay(Date.parse("2026-07-18T00:00:00Z"))).toBe(
      21 * 60,
    );
  });
});
