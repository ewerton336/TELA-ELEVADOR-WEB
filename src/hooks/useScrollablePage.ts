import { useEffect } from "react";

/**
 * Libera o scroll nativo do documento nesta página.
 *
 * Globalmente `html, body, #root` têm `overflow: hidden` (necessário para a
 * tela do elevador, um kiosk que não deve rolar). As páginas administrativas
 * (master/admin) precisam rolar — inclusive no mobile, onde a barra do
 * navegador aparece/some conforme o scroll. Prender o scroll num container
 * interno de altura fixa quebra no iOS Safari (o fim do conteúdo fica atrás da
 * barra e vira inacessível). Aqui voltamos ao scroll nativo do documento, que
 * o navegador trata corretamente em qualquer modo (mobile e desktop).
 *
 * A classe é adicionada ao `<html>` na montagem e removida na desmontagem,
 * restaurando o travamento do kiosk ao sair da página.
 */
export function useScrollablePage(): void {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("allow-scroll");
    return () => {
      root.classList.remove("allow-scroll");
    };
  }, []);
}
