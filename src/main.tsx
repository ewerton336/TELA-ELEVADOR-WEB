import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applyPerfMode } from "./lib/perfMode";
import "./index.css";

// Ativa o modo de desempenho ANTES do primeiro paint em hardware fraco
// (media players de elevador), evitando flash de efeitos pesados.
applyPerfMode();

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
