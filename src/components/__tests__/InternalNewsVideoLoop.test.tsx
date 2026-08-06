import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InternalNewsSlide, SLIDE_DURATION_MS } from "../NewsCarousel";
import type { NoticiaInterna } from "@/services/noticiaInternaService";

function makeVideo(overrides: Partial<NoticiaInterna> = {}): NoticiaInterna {
  return {
    id: 1,
    titulo: "Vídeo do condomínio",
    tipoMidia: "video",
    mediaUrl: "/api/media/abc.mp4",
    ativo: true,
    criadoEm: new Date().toISOString(),
    ...overrides,
  };
}

/** jsdom não implementa mídia: define duração/readyState e neutraliza play(). */
function stubVideo(el: HTMLVideoElement, duration: number, readyState = 1) {
  Object.defineProperty(el, "duration", { value: duration, configurable: true });
  Object.defineProperty(el, "readyState", {
    value: readyState,
    configurable: true,
  });
}

beforeEach(() => {
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
});

describe("InternalNewsSlide — vídeo curto em loop", () => {
  it("ativa loop quando o vídeo é mais curto que o tempo padrão do slide", () => {
    const onVideoDurationChange = vi.fn();
    render(
      <InternalNewsSlide
        item={makeVideo()}
        isActive
        onVideoEnded={vi.fn()}
        onVideoDurationChange={onVideoDurationChange}
      />,
    );

    const video = screen.getByTestId("internal-news-video") as HTMLVideoElement;
    stubVideo(video, 3);
    fireEvent.loadedMetadata(video);

    expect(video.loop).toBe(true);
    expect(onVideoDurationChange).toHaveBeenCalledWith(3000);
  });

  it("não ativa loop quando o vídeo dura mais que o tempo padrão do slide", () => {
    const onVideoDurationChange = vi.fn();
    render(
      <InternalNewsSlide
        item={makeVideo()}
        isActive
        onVideoEnded={vi.fn()}
        onVideoDurationChange={onVideoDurationChange}
      />,
    );

    const video = screen.getByTestId("internal-news-video") as HTMLVideoElement;
    stubVideo(video, 30);
    fireEvent.loadedMetadata(video);

    expect(video.loop).toBe(false);
    expect(onVideoDurationChange).toHaveBeenCalledWith(30000);
  });

  it("usa o tempo mínimo informado pelo carrossel", () => {
    render(
      <InternalNewsSlide
        item={makeVideo()}
        isActive
        onVideoEnded={vi.fn()}
        minDurationMs={2000}
      />,
    );

    const video = screen.getByTestId("internal-news-video") as HTMLVideoElement;
    stubVideo(video, 5);
    fireEvent.loadedMetadata(video);

    // 5s > 2s → toca uma vez só, mesmo sendo menor que o padrão de 10s
    expect(SLIDE_DURATION_MS).toBe(10000);
    expect(video.loop).toBe(false);
  });

  it("não quebra com duração desconhecida (Infinity)", () => {
    const onVideoDurationChange = vi.fn();
    render(
      <InternalNewsSlide
        item={makeVideo()}
        isActive
        onVideoEnded={vi.fn()}
        onVideoDurationChange={onVideoDurationChange}
      />,
    );

    const video = screen.getByTestId("internal-news-video") as HTMLVideoElement;
    stubVideo(video, Infinity);
    fireEvent.loadedMetadata(video);

    expect(video.loop).toBe(false);
    expect(onVideoDurationChange).not.toHaveBeenCalled();
  });

  it("reporta a duração ao virar ativo, quando os metadados já vieram no pré-render", () => {
    const onVideoDurationChange = vi.fn();
    const { rerender } = render(
      <InternalNewsSlide
        item={makeVideo()}
        isActive={false}
        onVideoEnded={vi.fn()}
      />,
    );

    const video = screen.getByTestId("internal-news-video") as HTMLVideoElement;
    stubVideo(video, 4);
    fireEvent.loadedMetadata(video);
    expect(onVideoDurationChange).not.toHaveBeenCalled();

    rerender(
      <InternalNewsSlide
        item={makeVideo()}
        isActive
        onVideoEnded={vi.fn()}
        onVideoDurationChange={onVideoDurationChange}
      />,
    );

    expect(onVideoDurationChange).toHaveBeenCalledWith(4000);
    expect(video.loop).toBe(true);
  });
});
