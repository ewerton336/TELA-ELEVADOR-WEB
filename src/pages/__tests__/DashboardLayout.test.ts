import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// Lê o CSS e o Dashboard.tsx para validar tokens e estrutura
const cssContent = fs.readFileSync(
  path.resolve(__dirname, "../../index.css"),
  "utf-8",
);
const dashboardContent = fs.readFileSync(
  path.resolve(__dirname, "../Dashboard.tsx"),
  "utf-8",
);

// ── Design tokens no CSS ──

describe("Dashboard — design tokens (index.css)", () => {
  it("define --dash-gap", () => {
    expect(cssContent).toContain("--dash-gap:");
  });

  it("define --dash-pad", () => {
    expect(cssContent).toContain("--dash-pad:");
  });

  it("define --dash-sidebar-w", () => {
    expect(cssContent).toContain("--dash-sidebar-w:");
  });

  it("define --dash-header-min", () => {
    expect(cssContent).toContain("--dash-header-min:");
  });

  it("define --ticker-h", () => {
    expect(cssContent).toContain("--ticker-h:");
  });

  it("dashboard-grid usa gap via variável CSS", () => {
    expect(cssContent).toContain("gap: var(--dash-gap)");
  });

  it("dashboard-grid usa padding via variável CSS", () => {
    expect(cssContent).toContain("padding: var(--dash-pad)");
  });

  it("dashboard-grid usa header mínimo via variável CSS", () => {
    expect(cssContent).toContain("minmax(var(--dash-header-min)");
  });

  it("ticker usa altura via variável CSS", () => {
    expect(cssContent).toMatch(/\.news-ticker\s*\{[^}]*height:\s*var\(--ticker-h\)/s);
  });

  it("has-ticker padding usa cálculo com variável CSS", () => {
    expect(cssContent).toContain("calc(var(--ticker-h)");
  });
});

// ── Portrait aumenta espaçamentos ──

describe("Dashboard — portrait aumenta espaçamentos", () => {
  it("portrait media query sobrescreve --dash-gap para 1.5rem", () => {
    const portraitBlock = cssContent.match(
      /@media\s*\(orientation:\s*portrait\)\s*\{([\s\S]*?\})\s*\}/,
    );
    expect(portraitBlock).not.toBeNull();
    expect(portraitBlock![1]).toContain("--dash-gap: 1.5rem");
  });

  it("portrait media query sobrescreve --dash-pad para 1.5rem", () => {
    const portraitBlock = cssContent.match(
      /@media\s*\(orientation:\s*portrait\)\s*\{([\s\S]*?\})\s*\}/,
    );
    expect(portraitBlock).not.toBeNull();
    expect(portraitBlock![1]).toContain("--dash-pad: 1.5rem");
  });

  it("force-portrait sobrescreve --dash-gap para 1.5rem", () => {
    expect(cssContent).toMatch(
      /\.force-portrait\s+\.elevator-screen\s*\{[^}]*--dash-gap:\s*1\.5rem/s,
    );
  });
});

// ── Consistência landscape ──

describe("Dashboard — force-landscape usa tokens", () => {
  it("force-landscape referencia --dash-sidebar-w", () => {
    expect(cssContent).toMatch(
      /\.force-landscape\s+\.dashboard-grid\s*\{[^}]*var\(--dash-sidebar-w\)/s,
    );
  });

  it("force-landscape referencia --dash-header-min", () => {
    expect(cssContent).toMatch(
      /\.force-landscape\s+\.dashboard-grid\s*\{[^}]*var\(--dash-header-min\)/s,
    );
  });
});

// ── Dashboard.tsx usa os tokens ──

describe("Dashboard.tsx — referencia tokens CSS", () => {
  it("grid-cols usa var(--dash-sidebar-w)", () => {
    expect(dashboardContent).toContain("var(--dash-sidebar-w)");
  });

  it("não possui gap/padding hardcoded no grid (gap-4 p-4 removidos)", () => {
    // O grid deve usar dashboard-grid (CSS) para gap/padding
    const gridLine = dashboardContent.match(/className=.*dashboard-grid/);
    expect(gridLine).not.toBeNull();
    expect(gridLine![0]).not.toContain("gap-4");
    expect(gridLine![0]).not.toContain("p-4");
  });

  it("possui classe dashboard-grid no grid principal", () => {
    expect(dashboardContent).toContain("dashboard-grid");
  });

  it("possui classe dashboard-avisos no aside", () => {
    expect(dashboardContent).toContain("dashboard-avisos");
  });

  it("possui classe dashboard-header no header", () => {
    expect(dashboardContent).toContain("dashboard-header");
  });

  it("possui classe dashboard-news na seção de notícias", () => {
    expect(dashboardContent).toContain("dashboard-news");
  });
});
