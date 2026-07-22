import { useLayoutEffect, useRef } from "react";

export function useFitText(dep: unknown, min = 12) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return;

    let raf = 0;
    let lastW = -1;
    let lastH = -1;

    const fit = () => {
      raf = 0;
      el.style.fontSize = "";
      const initial = parseFloat(getComputedStyle(el).fontSize) || 22;
      // Se já cabe no tamanho natural, não mexe (0 leitura de layout extra).
      if (el.scrollHeight <= box.clientHeight) return;

      // Busca binária pelo maior fontSize que cabe. O laço linear anterior
      // (size -= 1) forçava até 120 layouts síncronos por frame — um travão de
      // ~400ms num media player fraco a cada texto que montava. A binária faz
      // ~8 leituras (log2), reduzindo o pico de layout em ~15x.
      let lo = min;
      let hi = initial;
      while (hi - lo > 0.5) {
        const mid = (lo + hi) / 2;
        el.style.fontSize = `${mid}px`;
        if (el.scrollHeight > box.clientHeight) {
          hi = mid;
        } else {
          lo = mid;
        }
      }
      el.style.fontSize = `${Math.floor(lo)}px`;
    };

    const schedule = () => {
      const w = box.offsetWidth;
      const h = box.offsetHeight;
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      if (!raf) raf = requestAnimationFrame(fit);
    };

    lastW = box.offsetWidth;
    lastH = box.offsetHeight;
    raf = requestAnimationFrame(fit);

    const ro = new ResizeObserver(schedule);
    ro.observe(box, { box: "border-box" });

    if (document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          if (!raf) raf = requestAnimationFrame(fit);
        })
        .catch(() => void 0);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [dep]);
  return ref;
}
