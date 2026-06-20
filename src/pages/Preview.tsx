import { useState } from "react";
import { useParams } from "react-router-dom";

/**
 * Pré-visualização da tela do elevador na MESMA resolução do dispositivo de
 * produção (960×540 CSS px), independente do tamanho do monitor do dev.
 *
 * A tela é renderizada dentro de um <iframe> de 960×540 — assim o app enxerga
 * window.innerWidth/innerHeight = 960×540 (igual ao elevador), e podemos
 * escalar visualmente (1× / 1.5× / 2×) para imitar o painel físico 1920×1080
 * (que roda com devicePixelRatio 2).
 */
const BASE_W = 960;
const BASE_H = 540;

export default function Preview() {
  const { slug = "gramado" } = useParams();
  const [scale, setScale] = useState(1);
  const [slugInput, setSlugInput] = useState(slug);
  const [currentSlug, setCurrentSlug] = useState(slug);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1020",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: 16,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ color: "#cbd5e1", fontSize: 13, textAlign: "center" }}>
        <strong>Pré-visualização — resolução do elevador</strong>
        <div style={{ color: "#7c8aa5", marginTop: 2 }}>
          {BASE_W}×{BASE_H} CSS px · escala {scale}× (painel físico{" "}
          {BASE_W * scale}×{BASE_H * scale}) · slug: <code>{currentSlug}</code>
        </div>
      </div>

      {/* Controles */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        {[1, 1.5, 2].map((s) => (
          <button
            key={s}
            onClick={() => setScale(s)}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: "1px solid #334155",
              background: scale === s ? "#2563eb" : "#1e293b",
              color: "#e2e8f0",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {s}×
          </button>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCurrentSlug(slugInput.trim() || "gramado");
          }}
          style={{ display: "flex", gap: 6 }}
        >
          <input
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            placeholder="slug do prédio"
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#e2e8f0",
              fontSize: 12,
              width: 140,
            }}
          />
          <button
            type="submit"
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: "1px solid #334155",
              background: "#1e293b",
              color: "#e2e8f0",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Abrir
          </button>
        </form>
      </div>

      {/* "Painel" do elevador em 960×540, escalado */}
      <div
        style={{
          width: BASE_W * scale,
          height: BASE_H * scale,
          maxWidth: "100%",
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 0 0 8px #111827, 0 20px 60px rgba(0,0,0,0.6)",
          background: "#0f172a",
        }}
      >
        <iframe
          key={`${currentSlug}-${scale}`}
          title="Tela do elevador (preview)"
          src={`/${currentSlug}`}
          style={{
            width: BASE_W,
            height: BASE_H,
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}
