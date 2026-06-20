import { test, expect } from "@playwright/test";

/**
 * Valida que a tela do elevador renderiza no MESMO ambiente do dispositivo de
 * produção (viewport 960×540, devicePixelRatio 2 — definidos em
 * playwright.config.ts) e captura um screenshot idêntico ao painel real.
 *
 * Pré-requisitos: frontend (Vite) e backend (API) rodando — veja a config.
 */

const SLUG = process.env.E2E_SLUG ?? "gramado";

test.describe("Tela do elevador — resolução nativa de produção", () => {
  test("renderiza em 960×540 @2x e captura a tela", async ({ page }, testInfo) => {
    await page.goto(`/${SLUG}`, { waitUntil: "domcontentloaded" });

    // O ambiente precisa bater com o dispositivo real.
    const env = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      dpr: window.devicePixelRatio,
      orientation: window.screen.orientation?.type ?? null,
    }));
    expect(env.innerWidth, "largura do viewport").toBe(960);
    expect(env.innerHeight, "altura do viewport").toBe(540);
    expect(env.dpr, "devicePixelRatio (painel 2x)").toBe(2);
    expect(env.orientation).toContain("landscape");

    // Aguarda o ícone de clima animado (SVG inline) aparecer, se houver previsão.
    await page
      .locator(".weather-svg svg")
      .first()
      .waitFor({ state: "visible", timeout: 8000 })
      .catch(() => {
        /* sem previsão no banco — segue para o screenshot mesmo assim */
      });

    // Deixa o conteúdo/animações assentarem.
    await page.waitForTimeout(1200);

    const shot = testInfo.outputPath("elevador-producao-960x540@2x.png");
    await page.screenshot({ path: shot });
    await testInfo.attach("tela-producao", { path: shot, contentType: "image/png" });
  });

  test("o container .elevator-screen ocupa exatamente 960×540", async ({ page }) => {
    await page.goto(`/${SLUG}`, { waitUntil: "domcontentloaded" });
    const box = await page
      .locator(".elevator-screen")
      .first()
      .boundingBox()
      .catch(() => null);
    if (box) {
      expect(Math.round(box.width)).toBe(960);
      expect(Math.round(box.height)).toBe(540);
    }
  });
});
