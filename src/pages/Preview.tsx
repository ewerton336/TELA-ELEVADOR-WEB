import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

/**
 * Pré-visualização da tela do elevador na MESMA resolução do dispositivo de
 * produção (960×540 CSS px), independente do tamanho do monitor do dev.
 *
 * A tela roda dentro de um <iframe> de 960×540 e usamos a propriedade CSS
 * `zoom` (não `transform: scale`) para ampliar. O `zoom` RE-RASTERIZA o
 * conteúdo (fica nítido) e, dentro do iframe, mantém window.innerWidth=960,
 * innerHeight=540 e devicePixelRatio=2 — emulando exatamente o dispositivo do
 * elevador (960 CSS @ 2×). O `transform: scale` apenas esticava o raster
 * (borrado).
 *
 * - Botões 1× / 1.5× / 2× mudam o tamanho exibido.
 * - Quando o conteúdo passa da janela, a página rola.
 * - "Tela cheia" preenche o monitor (num Full HD = 2× = 1920×1080).
 */
const BASE_W = 960;
const BASE_H = 540;
const DEFAULT_SLUG = "gramado";

export default function Preview() {
  const { slug = DEFAULT_SLUG } = useParams();
  const [scale, setScale] = useState(1);
  const [orientation, setOrientation] = useState<"auto" | "portrait" | "landscape">("auto");
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
  const dispW = Math.round(BASE_W * effectiveScale);
  const dispH = Math.round(BASE_H * effectiveScale);

  const iframe = (
    <iframe
      key={`${currentSlug}-${orientation}`}
      title="Tela do elevador (preview)"
      src={orientation === "auto" ? `/${currentSlug}` : `/${currentSlug}?orientation=${orientation}`}
      style={{
        width: BASE_W,
        height: BASE_H,
        // `zoom` (não `transform`) re-rasteriza nítido E mantém innerWidth=960
        // + devicePixelRatio=2 dentro do iframe, emulando o dispositivo.
        zoom: effectiveScale,
        border: 0,
        display: "block",
      }}
    />
  );

  return (
    // Container rolável: overflow:auto + margin:auto no conteúdo (em vez de flex
    // center, que cortaria o topo/esquerda sem permitir scroll).
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
            {BASE_W}×{BASE_H} CSS px · escala {scale}× ({dispW}×{dispH}) ·
            orientação {orientation} · slug: <code>{currentSlug}</code>
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
          {[
            { v: "auto", label: "Auto" },
            { v: "portrait", label: "Retrato" },
            { v: "landscape", label: "Paisagem" },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setOrientation(o.v as "auto" | "portrait" | "landscape")}
              style={{
                padding: "4px 12px",
                borderRadius: 6,
                border: "1px solid #334155",
                background: orientation === o.v ? "#2563eb" : "#1e293b",
                color: "#e2e8f0",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {o.label}
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: "#334155", margin: "0 4px" }} />
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
            preenche o monitor; fora dela, é a caixa do tamanho exibido. */}
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
                  position: "relative",
                }
              : {
                  width: dispW,
                  height: dispH,
                  flexShrink: 0,
                  borderRadius: 10,
                  overflow: "hidden",
                  boxShadow: "0 0 0 8px #111827, 0 20px 60px rgba(0,0,0,0.6)",
                  background: "#0f172a",
                }
          }
        >
          {iframe}

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
