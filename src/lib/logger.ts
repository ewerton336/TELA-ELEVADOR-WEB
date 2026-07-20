/**
 * Logger que só escreve no console em desenvolvimento.
 *
 * A tela do elevador roda 24/7 sem recarregar a página. Cada chamada a
 * `console.*` com objetos (payloads de SignalR, respostas de API, erros de
 * rede) é retida pelo buffer do console do navegador — e as referências aos
 * objetos logados ficam vivas, impedindo o garbage collector de liberá-las.
 * Em quedas de WiFi (frequentes no elevador) os erros são logados a cada
 * poll, então o heap cresce de forma monotônica ao longo de horas/dias e a
 * tela vai ficando lenta.
 *
 * Em produção estes métodos viram no-op; em dev continuam funcionando
 * normalmente para depuração.
 */
const enabled = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]): void => {
    if (enabled) console.log(...args);
  },
  warn: (...args: unknown[]): void => {
    if (enabled) console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    if (enabled) console.error(...args);
  },
};
