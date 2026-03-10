import "@testing-library/jest-dom/vitest";

/* ── jsdom polyfills for Radix UI primitives (Dialog, AlertDialog, etc.) ── */
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

HTMLElement.prototype.scrollIntoView ??= function () {};
HTMLElement.prototype.hasPointerCapture ??= function () {
  return false;
} as any;
HTMLElement.prototype.setPointerCapture ??= function () {} as any;
HTMLElement.prototype.releasePointerCapture ??= function () {} as any;
HTMLElement.prototype.getAnimations ??= function () {
  return [];
} as any;

window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as any;
