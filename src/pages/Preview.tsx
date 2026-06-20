import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

/**
 * Pré-visualização da tela do elevador na MESMA resolução do dispositivo de
 * produção (960×540 CSS px), independente do tamanho do monitor do dev.
 *
 * A tela é renderizada dentro de um <iframe> de 960×540 — assim o app enxerga
 * window.innerWidth/innerHeight = 960×540 (igual ao elevador), e podemos
 * escalar visualmente (1× / 1.5× / 2×) para imitar o painel físico 1920×1080
 * (que roda com devicePixelRatio 2).
 *
 * - Quando a escala deixa o conteúdo maior que a janela, a página rola.
 * - "Tela cheia" usa a Fullscreen API e escala o iframe para preencher o
 *   monitor (num Full HD = 2×, ficando 1920×1080, idêntico ao painel real).
 */
const BASE_W = 960;
const BASE_H = 540;
const DEFAULT_SLUG = "gramado";

export default function Preview() {
  const { slug = DEFAULT_SLUG } = useParams();
  const [scale, setScale] = useState(1);
  const [slugInput, setSlugInput] = useState(slug);
  const [currentSlug, setCurrentSlug] = useState(slug);

  const frameRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fsScale, setFsScale] = useState(2);

  // Mantém o estado/escala de tela cheia sincronizados com a Fullscreen API.
  useEffect(() => {
    const recompute = () => {
      const active = document.fullscreenElement === frameRef.current;
      setIsFullscreen(active);
      if (active) {
        // Em tela cheia a janela cobre o monitor: escala para preencher
        // mantendo 16:9 (FHD → 2×, sem barras).
        setFsScale(
          Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H),
        );
      }
    };
    document.addEventListener("fullscreenchange", recompute);
    window.addEventListener("resize", recompute);
    return () => {
      document.removeEventListener("fullscreenchange", recompute);
      window.removeEventListener("resize", recompute);
    };
  }, []);

  const enterFullscreen = () => {
    frameRef.current?.requestFullscreen?.().catch(() => {});
  };
  const exitFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };

  const effectiveScale = isFullscreen ? fsScale : scale;

  return (
    // Container rolável: usar overflow:auto + margin:auto no conteúdo (em vez de
    // flex center, que cortaria o topo/esquerda sem permitir scroll).
    <div
      style={{
        height: "100vh",
        overflow: "auto",
        background: "#0b1020",
        display: "flex",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          margin: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
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
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
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
          <button
            onClick={enterFullscreen}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: "1px solid #2563eb",
              background: "#1e293b",
              color: "#93c5fd",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            ⛶ Tela cheia
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setCurrentSlug(slugInput.trim() || DEFAULT_SLUG);
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

        {/* "Painel" do elevador. Em tela cheia, vira o elemento fullscreen e
            preenche o monitor; fora dela, é a caixa 960×540 escalada (sem
            maxWidth, para que ao escalar possa exceder a janela e rolar). */}
        <div
          ref={frameRef}
          style={
            isFullscreen
              ? {
                  width: "100vw",
                  height: "100vh",
                  background: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }
              : {
                  width: BASE_W * scale,
                  height: BASE_H * scale,
                  flexShrink: 0,
                  borderRadius: 10,
                  overflow: "hidden",
                  boxShadow: "0 0 0 8px #111827, 0 20px 60px rgba(0,0,0,0.6)",
                  background: "#0f172a",
                }
          }
        >
          <iframe
            key={`${currentSlug}`}
            title="Tela do elevador (preview)"
            src={`/${currentSlug}`}
            style={{
              width: BASE_W,
              height: BASE_H,
              border: 0,
              transform: `scale(${effectiveScale})`,
              transformOrigin: isFullscreen ? "center center" : "top left",
              display: "block",
              flexShrink: 0,
            }}
          />

          {isFullscreen && (
            <button
              onClick={exitFullscreen}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(0,0,0,0.55)",
                color: "#fff",
                cursor: "pointer",
                fontSize: 12,
                zIndex: 10,
              }}
            >
              ✕ Sair (Esc)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
