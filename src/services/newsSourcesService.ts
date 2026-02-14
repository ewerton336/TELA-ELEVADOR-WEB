const STORAGE_KEY = "elevator_news_sources";
const DEFAULTS_VERSION_KEY = "elevator_news_sources_version";
const CURRENT_DEFAULTS_VERSION = 2; // Incrementar para forçar reset dos defaults

export interface NewsSource {
  id: string;
  name: string;
  enabled: boolean;
  feedUrl: string;
  type: "g1" | "santa-portal" | "diario-litoral";
}

const DEFAULT_SOURCES: NewsSource[] = [
  {
    id: "g1",
    name: "G1 Santos e Região",
    enabled: false,
    feedUrl: "https://g1.globo.com/rss/g1/sp/santos-regiao/",
    type: "g1",
  },
  {
    id: "santa-portal",
    name: "Santa Portal",
    enabled: true,
    feedUrl: "https://santaportal.com.br/feed/",
    type: "santa-portal",
  },
  {
    id: "diario-litoral",
    name: "Diário do Litoral",
    enabled: true,
    feedUrl: "https://www.diariodolitoral.com.br/praia-grande/rss/",
    type: "diario-litoral",
  },
];

export function initDefaultSources(): void {
  // Verifica se os defaults mudaram (nova versão)
  const savedVersion = localStorage.getItem(DEFAULTS_VERSION_KEY);
  if (!savedVersion || parseInt(savedVersion) < CURRENT_DEFAULTS_VERSION) {
    // Defaults mudaram — reseta para os novos defaults
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SOURCES));
    localStorage.setItem(
      DEFAULTS_VERSION_KEY,
      String(CURRENT_DEFAULTS_VERSION),
    );
    // Limpa cache de notícias para forçar reload com novas fontes
    localStorage.removeItem("news");
    return;
  }

  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SOURCES));
  } else {
    // Garante que novas fontes sejam adicionadas se atualizarmos o app
    try {
      const current: NewsSource[] = JSON.parse(existing);
      const currentIds = new Set(current.map((s) => s.id));
      let updated = false;
      for (const def of DEFAULT_SOURCES) {
        if (!currentIds.has(def.id)) {
          current.push(def);
          updated = true;
        }
      }
      if (updated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      }
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SOURCES));
    }
  }
}

export function getNewsSources(): NewsSource[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    initDefaultSources();
    return DEFAULT_SOURCES;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SOURCES;
  }
}

export function getEnabledSources(): NewsSource[] {
  return getNewsSources().filter((s) => s.enabled);
}

export function getEnabledSourceIds(): string[] {
  return getEnabledSources().map((s) => s.id);
}

/**
 * Alterna o estado de uma fonte de notícias.
 * Retorna false se a operação não foi permitida (ex: tentar desabilitar a última fonte).
 */
export function toggleNewsSource(id: string): boolean {
  const sources = getNewsSources();
  const source = sources.find((s) => s.id === id);
  if (!source) return false;

  // Impede desabilitar a última fonte ativa
  if (source.enabled) {
    const enabledCount = sources.filter((s) => s.enabled).length;
    if (enabledCount <= 1) return false;
  }

  source.enabled = !source.enabled;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  return true;
}
