/**
 * Modo de desempenho ("perf-mode").
 *
 * Desliga efeitos visuais pesados (blur, sombras, gradientes e animações
 * contínuas) em hardware fraco — o caso típico dos media players de elevador
 * (ARM com poucos núcleos e pouca RAM). Os overrides ficam em `html.perf-mode`
 * no `src/index.css`.
 *
 * Deve ser chamado ANTES do primeiro paint (em `main.tsx`) para não haver
 * flash de efeitos pesados antes da classe ser aplicada.
 *
 * Ativação:
 *  - `?perf=1` na URL força ligado; `?perf=0` força desligado (útil para
 *    testar/comparar no mesmo aparelho);
 *  - sem override, auto-detecta hardware fraco:
 *    `hardwareConcurrency <= 4` OU `deviceMemory <= 2`.
 */
export function applyPerfMode(): void {
  if (typeof document === "undefined") return;

  try {
    const root = document.documentElement;
    const override = new URLSearchParams(window.location.search).get("perf");

    let enabled: boolean;
    if (override === "1" || override === "0") {
      enabled = override === "1";
    } else {
      const nav = navigator as Navigator & { deviceMemory?: number };
      const cores = nav.hardwareConcurrency ?? 8;
      const memory = nav.deviceMemory ?? 8;
      enabled = cores <= 4 || memory <= 2;
    }

    root.classList.toggle("perf-mode", enabled);
  } catch {
    // A detecção nunca deve quebrar a inicialização da tela.
  }
}
