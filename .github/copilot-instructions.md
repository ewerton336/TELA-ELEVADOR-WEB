# Instruções para agentes de IA — TELA-ELEVADOR-WEB

## ⚠️ CONTEXTO CRÍTICO DE PERFORMANCE

Este app roda em **dispositivos de baixa performance** (MiBox S, TV sticks, Android boxes com 2GB RAM, GPU fraca, CPU ARM quad-core de baixo consumo). Ele é exibido **24/7 em modo kiosk** no navegador Chrome.

Qualquer alteração deve respeitar as regras abaixo para evitar travamentos.

---

## Regras para alterações em JavaScript / React

- **NUNCA** usar `setInterval` ou `requestAnimationFrame` com frequência < 200ms para atualizar estado React (`useState`). Isso causa re-renders excessivos que travam o dispositivo.
- Preferir **CSS animations puras** (`@keyframes` + `animation`) em vez de animações controladas por `useState`/`setInterval`.
- Usar `React.memo()` em componentes com props estáveis que re-renderizam por cascata do pai.
- Renderizar apenas elementos visíveis no DOM (ex: carrossel renderiza só 2 slides, não todos os N).
- Evitar `ResizeObserver` a não ser que seja estritamente necessário.
- Minimizar número de `useEffect` com intervalos — cada timer ativo consome CPU.

## Regras para CSS / Visual

- O app possui um **modo de desempenho** (`perf-mode`) que desliga efeitos visuais pesados. A classe `.perf-mode` é adicionada ao `<html>`.
- **Todo efeito visual novo** (blur, sombra, gradiente, animação CSS) **deve ter um override no perf-mode** dentro de `src/index.css`.
- Evitar `backdrop-filter` (blur) — extremamente pesado em GPU fraca.
- Preferir cores sólidas a gradientes quando possível.
- Usar `loading="lazy"` e `decoding="async"` em todas as tags `<img>`.

## Regras para Rede

- Heartbeat SignalR está em **60 segundos** — não reduzir.
- O app usa cache agressivo via `localStorage` para clima e notícias — respeitar TTLs existentes em `src/lib/cache.ts`.
- Polling de fallback (quando SignalR desconecta) está em 10s — não reduzir.

## Auto-detecção de hardware

- O app detecta automaticamente hardware fraco (`navigator.hardwareConcurrency <= 4` ou `navigator.deviceMemory <= 2`) e ativa o perf-mode sem intervenção do usuário (`src/App.tsx`).
- Pode ser forçado via URL: `?perf=1` (ativa) ou `?perf=0` (desativa).

## Arquitetura resumida

- **React 18** + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **SignalR** para comunicação em tempo real (avisos, orientação de tela)
- **React Query** para dados (clima, notícias)
- **localStorage** como cache offline-first
- Deploy via Docker + nginx (produção) ou Vite dev server (desenvolvimento)
