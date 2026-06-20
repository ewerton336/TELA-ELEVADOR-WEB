import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

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
