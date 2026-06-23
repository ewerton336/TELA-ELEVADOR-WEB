import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/apiClient", () => ({
  requestJson: vi.fn(),
}));

import { requestJson } from "@/services/apiClient";
import { fetchWeatherBySlug, WeatherData } from "@/services/weatherService";
import { setCache } from "@/lib/cache";

const mockRequestJson = vi.mocked(requestJson);

function makeWeather(code: number, desc: string): WeatherData {
  return {
    location: "Praia Grande, SP",
    days: [
      {
        date: "2026-06-23",
        dateFormatted: "23/06/2026",
        dayName: "Terça",
        temperatureMax: 22,
        temperatureMin: 17,
        weatherCode: code,
        weatherDescription: desc,
        weatherIcon: "x",
      },
    ],
    lastUpdated: "2026-06-23T22:00:00Z",
  };
}

describe("weatherService.fetchWeatherBySlug", () => {
  beforeEach(() => {
    localStorage.clear();
    mockRequestJson.mockReset();
  });

  it("com cache válido e API online, deve retornar os dados frescos da API", async () => {
    setCache("weather_gramado", makeWeather(2, "Parcialmente nublado"), 120);
    mockRequestJson.mockResolvedValue(makeWeather(81, "Pancadas de chuva moderada"));

    const result = await fetchWeatherBySlug("gramado");

    expect(mockRequestJson).toHaveBeenCalledOnce();
    expect(result.days[0].weatherCode).toBe(81);
  });

  it("quando a API falha, deve usar o cache como fallback offline", async () => {
    setCache("weather_gramado", makeWeather(2, "Parcialmente nublado"), 120);
    mockRequestJson.mockRejectedValue(new Error("Network error"));

    const result = await fetchWeatherBySlug("gramado");

    expect(result.days[0].weatherCode).toBe(2);
  });

  it("ao buscar com sucesso, deve atualizar o cache", async () => {
    mockRequestJson.mockResolvedValue(makeWeather(81, "Pancadas de chuva moderada"));

    await fetchWeatherBySlug("gramado");
    mockRequestJson.mockRejectedValue(new Error("Network error"));
    const segundo = await fetchWeatherBySlug("gramado");

    expect(segundo.days[0].weatherCode).toBe(81);
  });
});
