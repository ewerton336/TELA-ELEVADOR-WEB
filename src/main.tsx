import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applyPerfMode } from "./lib/perfMode";
import { startPerfProbe } from "./lib/perfProbe";
import "./index.css";

// Ativa o modo de desempenho ANTES do primeiro paint em hardware fraco
// (media players de elevador), evitando flash de efeitos pesados.
applyPerfMode();

// Sonda de FPS/long-tasks: mede a saúde da renderização (invisível ao heap JS)
// e reporta junto dos detalhes da tela, para diagnosticar a queda de fps 24/7.
startPerfProbe();

if ("serviceWorker" in navigator) {
  setInterval(
    () => {
      navigator.serviceWorker
        .getRegistration()
        .then((r) => r?.update())
        .catch(() => void 0);
    },
    15 * 60 * 1000,
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
