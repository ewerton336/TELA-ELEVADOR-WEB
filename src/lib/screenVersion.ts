/**
 * Lógica de "versão da tela" usada pelo Monitor de Telas (painel master).
 *
 * A versão de cada tela é o timestamp ISO do build do frontend (__APP_VERSION__,
 * gerado em build-time pelo Vite). Uma tela está "desatualizada" quando roda um
 * build estritamente mais antigo que o build mais recente conhecido.
 *
 * IMPORTANTE: a referência de "mais recente" NÃO é apenas o build da aba do
 * master. A aba do master pode ficar aberta por dias e estar num build antigo,
 * enquanto as telas recarregam e passam a rodar um build mais novo. Por isso o
 * "mais recente" é o maior timestamp entre o build do próprio master e o de
 * todas as telas conectadas. Assim, uma tela recém-atualizada nunca aparece
 * como desatualizada só porque a aba do master está velha.
 */

function toTime(version: string | null | undefined): number | null {
  if (!version) return null;
  const t = Date.parse(version);
  return Number.isNaN(t) ? null : t;
}

/**
 * Retorna a versão (timestamp ISO) mais recente entre as informadas,
 * ignorando valores vazios ou inválidos. Retorna null se nenhuma for válida.
 */
export function computeLatestVersion(
  versions: Array<string | null | undefined>,
): string | null {
  let latest: string | null = null;
  let latestTime = -Infinity;
  for (const v of versions) {
    const t = toTime(v);
    if (t !== null && t > latestTime) {
      latestTime = t;
      latest = v as string;
    }
  }
  return latest;
}

/**
 * True se a tela roda um build estritamente mais antigo que o mais recente
 * conhecido. Versão ausente/ inválida é tratada como desconhecida (desatualizada).
 * Sem referência válida de "mais recente", não marca como desatualizada.
 */
export function isScreenOutdated(
  screenVersion: string | null | undefined,
  latestVersion: string | null | undefined,
): boolean {
  const screenTime = toTime(screenVersion);
  if (screenTime === null) return true;
  const latestTime = toTime(latestVersion);
  if (latestTime === null) return false;
  return screenTime < latestTime;
}
