const DEFAULT_BACKEND_PORT = "3003";

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function getConfiguredBackendOrigin(): string | null {
  const configuredOrigin = import.meta.env.VITE_BACKEND_ORIGIN?.trim();
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, "");
  }

  if (!import.meta.env.DEV || typeof window === "undefined") {
    return null;
  }

  const { protocol, hostname } = window.location;
  if (isLoopbackHost(hostname)) {
    return null;
  }

  const configuredPort = import.meta.env.VITE_BACKEND_PORT?.trim() || DEFAULT_BACKEND_PORT;
  return `${protocol}//${hostname}:${configuredPort}`;
}

export function buildBackendUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin = getConfiguredBackendOrigin();
  return origin ? `${origin}${normalizedPath}` : normalizedPath;
}

export function getPredioHubUrl(): string {
  return buildBackendUrl("/hub/predio");
}