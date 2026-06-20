import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeatherCard } from "../WeatherCard";
import type { WeatherData, WeatherDay } from "@/services/weatherService";

// ── Helpers ──

function makeDay(overrides: Partial<WeatherDay> = {}): WeatherDay {
  return {
    date: "2026-03-10",
    dateFormatted: "10/03",
    dayName: "Terça",
    temperatureMax: 28,
    temperatureMin: 18,
    weatherCode: 0,
    weatherDescription: "Céu limpo",
    weatherIcon: "☀️",
    ...overrides,
  };
}

function makeWeatherData(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    location: "Gramado",
    lastUpdated: "2026-03-10T12:00:00.000Z",
    days: [
      makeDay(),
      makeDay({
        date: "2026-03-11",
        dateFormatted: "11/03",
        dayName: "Quarta",
        temperatureMax: 24,
        temperatureMin: 16,
        weatherCode: 2,
        weatherDescription: "Parcialmente nublado",
        weatherIcon: "⛅",
      }),
    ],
    ...overrides,
  };
}

// ── Renderização do clima atual (modo padrão) ──

describe("WeatherCard — clima atual (modo padrão)", () => {
  it("deve renderizar localização", () => {
    render(<WeatherCard data={makeWeatherData()} />);
    expect(screen.getByText("Gramado")).toBeInTheDocument();
  });

  it("deve renderizar rótulo 'Previsão'", () => {
    render(<WeatherCard data={makeWeatherData()} />);
    expect(screen.getByText("Previsão")).toBeInTheDocument();
  });

  it("deve renderizar temperatura máxima do dia atual", () => {
    render(<WeatherCard data={makeWeatherData()} />);
    expect(screen.getByText("28°")).toBeInTheDocument();
  });

  it("deve renderizar temperatura mínima do dia atual", () => {
    render(<WeatherCard data={makeWeatherData()} />);
    expect(screen.getByText("18°")).toBeInTheDocument();
  });

  it("deve renderizar ícone animado do tempo de hoje", () => {
    render(<WeatherCard data={makeWeatherData()} />);
    // O ícone agora é um SVG animado (img) com a descrição como alt.
    const icon = screen.getByAltText("Céu limpo");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("src", "/weather/clear-day.svg");
  });

  it("deve renderizar descrição do tempo de hoje", () => {
    render(<WeatherCard data={makeWeatherData()} />);
    expect(screen.getByText("Céu limpo")).toBeInTheDocument();
  });

  it("deve renderizar rótulo 'Hoje' para o primeiro dia", () => {
    render(<WeatherCard data={makeWeatherData()} />);
    expect(screen.getByText("Hoje")).toBeInTheDocument();
  });
});

// ── Renderização da lista de dias ──

describe("WeatherCard — lista de dias", () => {
  it("deve renderizar rótulo 'Amanhã' para o segundo dia", () => {
    render(<WeatherCard data={makeWeatherData()} />);
    expect(screen.getByText("Amanhã")).toBeInTheDocument();
  });

  it("deve renderizar ícone animado e temperaturas do segundo dia", () => {
    render(<WeatherCard data={makeWeatherData()} />);
    const icon = screen.getByAltText("Parcialmente nublado");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("src", "/weather/partly-cloudy-day.svg");
    expect(screen.getByText("24°")).toBeInTheDocument();
    expect(screen.getByText("16°")).toBeInTheDocument();
  });

  it("deve renderizar descrição do segundo dia", () => {
    render(<WeatherCard data={makeWeatherData()} />);
    expect(screen.getByText("Parcialmente nublado")).toBeInTheDocument();
  });

  it("deve limitar exibição a no máximo 2 dias", () => {
    const data = makeWeatherData({
      days: [
        makeDay({ date: "2026-03-10", dayName: "Terça" }),
        makeDay({ date: "2026-03-11", dayName: "Quarta" }),
        makeDay({ date: "2026-03-12", dayName: "Quinta" }),
      ],
    });
    render(<WeatherCard data={data} />);
    // Dia extra não deve aparecer como label de dia
    expect(screen.queryByText("Quinta")).not.toBeInTheDocument();
  });
});

// ── Modo compacto (header) ──

describe("WeatherCard — modo compacto", () => {
  it("deve renderizar os rótulos 'Hoje' e 'Amanhã' em modo compacto", () => {
    render(<WeatherCard data={makeWeatherData()} compact />);
    expect(screen.getByText("Hoje")).toBeInTheDocument();
    expect(screen.getByText("Amanhã")).toBeInTheDocument();
  });

  it("deve renderizar temperaturas de hoje em modo compacto", () => {
    render(<WeatherCard data={makeWeatherData()} compact />);
    expect(screen.getByText("28°")).toBeInTheDocument();
    expect(screen.getByText("18°")).toBeInTheDocument();
  });

  it("deve renderizar temperaturas de amanhã em modo compacto", () => {
    render(<WeatherCard data={makeWeatherData()} compact />);
    expect(screen.getByText("24°")).toBeInTheDocument();
  });

  it("deve exibir 'Sem previsão' quando data é null e não está carregando", () => {
    render(<WeatherCard data={null} compact />);
    expect(screen.getByText("Sem previsão")).toBeInTheDocument();
  });

  it("deve exibir skeleton quando está carregando sem dados", () => {
    const { container } = render(
      <WeatherCard data={null} isLoading compact />,
    );
    // Mostra skeleton pulsante, não texto
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByText("Sem previsão")).not.toBeInTheDocument();
  });
});

// ── Comportamento com dados incompletos ──

describe("WeatherCard — dados incompletos", () => {
  it("deve exibir 'Sem previsão disponível' quando data é null (modo padrão)", () => {
    render(<WeatherCard data={null} />);
    expect(screen.getByText("Sem previsão disponível")).toBeInTheDocument();
  });

  it("deve exibir skeleton quando está carregando sem dados (modo padrão)", () => {
    const { container } = render(<WeatherCard data={null} isLoading />);
    // Mostra skeleton pulsante, não texto de "Sem previsão"
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(
      screen.queryByText("Sem previsão disponível"),
    ).not.toBeInTheDocument();
  });

  it("deve exibir 'Sem previsão disponível' quando days está vazio", () => {
    render(<WeatherCard data={makeWeatherData({ days: [] })} />);
    expect(screen.getByText("Sem previsão disponível")).toBeInTheDocument();
  });

  it("deve renderizar apenas hoje quando há só 1 dia", () => {
    const data = makeWeatherData({ days: [makeDay()] });
    render(<WeatherCard data={data} />);
    expect(screen.getByText("Hoje")).toBeInTheDocument();
    expect(screen.queryByText("Amanhã")).not.toBeInTheDocument();
  });

  it("deve renderizar apenas hoje em modo compacto quando há só 1 dia", () => {
    const data = makeWeatherData({ days: [makeDay()] });
    render(<WeatherCard data={data} compact />);
    expect(screen.getByText("Hoje")).toBeInTheDocument();
    expect(screen.queryByText("Amanhã")).not.toBeInTheDocument();
    expect(screen.getByText("28°")).toBeInTheDocument();
    // Não deve haver segundo bloco de temperatura
    expect(screen.queryByText("24°")).not.toBeInTheDocument();
  });
});

// ── Módulo desativado ──

describe("WeatherCard — módulo desativado (data null)", () => {
  it("não deve renderizar dados de previsão quando data é null", () => {
    render(<WeatherCard data={null} />);
    expect(screen.queryByText("Gramado")).not.toBeInTheDocument();
    expect(screen.queryByText("☀️")).not.toBeInTheDocument();
  });

  it("não deve renderizar dados de previsão em modo compacto quando data é null", () => {
    render(<WeatherCard data={null} compact />);
    expect(screen.queryByText("28°")).not.toBeInTheDocument();
    expect(screen.queryByText("☀️")).not.toBeInTheDocument();
  });
});
