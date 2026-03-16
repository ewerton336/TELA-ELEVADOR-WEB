const STORAGE_KEY = "screenDeviceId";

function createDeviceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `screen-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getScreenDeviceId(): string {
  if (typeof window === "undefined") {
    return "server-render";
  }

  const storedId = window.localStorage.getItem(STORAGE_KEY);
  if (storedId) {
    return storedId;
  }

  const newId = createDeviceId();
  window.localStorage.setItem(STORAGE_KEY, newId);
  return newId;
}