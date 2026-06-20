import { defineConfig } from "@playwright/test";

/**
 * Config de e2e do Playwright.
 *
 * O objetivo principal é renderizar a tela do elevador localmente com a MESMA
 * configuração do dispositivo de produção, para que o que vemos no Playwright
 * seja idêntico ao painel real (e fique fácil detectar divergências de layout).
 *
 * Parâmetros coletados de um dispositivo de produção (via "Detalhes" no monitor):
 *   - viewport CSS: 960 × 540
 *   - devicePixelRatio: 2 (painel físico 1920 × 1080)
 *   - orientação: landscape
 *   - idioma: pt-BR
 *
 * Pré-requisitos para rodar:
 *   - Frontend (Vite) rodando — por padrão http://localhost:3000
 *     (sobrescreva com E2E_BASE_URL, ex.: http://localhost:3001)
 *   - Backend (API) rodando em :3003 (proxied pelo Vite em /api e /hub)
 */

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/** Perfil de dispositivo idêntico ao painel de produção da tela do elevador. */
export const DISPOSITIVO_PRODUCAO = {
  viewport: { width: 960, height: 540 },
  deviceScaleFactor: 2,
  isMobile: false,
  hasTouch: true,
  colorScheme: "dark" as const,
  // navigator.platform real do dispositivo é "Linux armv8l" (ARM). O Playwright
  // não permite forjar navigator.platform (segue o SO do host), mas o que afeta
  // o layout — viewport e devicePixelRatio — é emulado exatamente.
  userAgent:
    "Mozilla/5.0 (X11; Linux armv8l) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  // O perfil do dispositivo é aplicado no `use` GLOBAL — assim qualquer teste,
  // em qualquer projeto, sempre abre na resolução da tela do elevador
  // (960×540 @ devicePixelRatio 2), independente do monitor do dev.
  use: {
    baseURL: BASE_URL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    ...DISPOSITIVO_PRODUCAO,
  },
  projects: [
    {
      name: "elevador-producao",
      use: { ...DISPOSITIVO_PRODUCAO },
    },
  ],
});
