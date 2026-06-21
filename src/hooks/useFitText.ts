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
      let size = parseFloat(getComputedStyle(el).fontSize) || 22;
      let guard = 0;
      while (size > min && el.scrollHeight > box.clientHeight && guard < 120) {
        size -= 1;
        el.style.fontSize = `${size}px`;
        guard += 1;
      }
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
