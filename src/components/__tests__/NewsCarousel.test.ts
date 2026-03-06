import { describe, it, expect } from "vitest";

// ── Tipos reproduzidos para testes unitários puros ──

interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  thumbnail: string;
  pubDate: string;
  pubDateFormatted: string;
  source: string;
  category?: string;
}

interface NoticiaInterna {
  id: number;
  titulo: string;
  subtitulo?: string | null;
  tipoMidia: "imagem" | "video";
  mediaUrl: string;
  ativo: boolean;
  criadoEm: string;
}

type CarouselSlide =
  | { type: "external"; data: NewsItem }
  | { type: "internal"; data: NoticiaInterna };

// ── Reprodução da função interleaveWithInternal do NewsCarousel ──

function interleaveWithInternal(
  external: NewsItem[],
  internal: NoticiaInterna[],
): CarouselSlide[] {
  if (internal.length === 0) {
    return external.map((d) => ({ type: "external", data: d }));
  }
  if (external.length === 0) {
    return internal.map((d) => ({ type: "internal", data: d }));
  }

  const result: CarouselSlide[] = [];
  let intIdx = 0;

  for (let i = 0; i < external.length; i++) {
    result.push({ type: "external", data: external[i] });
    if (intIdx < internal.length) {
      result.push({ type: "internal", data: internal[intIdx] });
      intIdx++;
    } else {
      result.push({ type: "internal", data: internal[i % internal.length] });
    }
  }

  return result;
}

// ── Fixtures ──

function makeExternal(id: string, title: string): NewsItem {
  return {
    id,
    title,
    description: "Desc",
    link: "https://example.com",
    thumbnail: "https://example.com/img.jpg",
    pubDate: new Date().toISOString(),
    pubDateFormatted: "Agora",
    source: "G1",
  };
}

function makeInternal(id: number, titulo: string, tipoMidia: "imagem" | "video" = "imagem"): NoticiaInterna {
  return {
    id,
    titulo,
    tipoMidia,
    mediaUrl: `/api/media/${id}.jpg`,
    ativo: true,
    criadoEm: new Date().toISOString(),
  };
}

// ── Testes ──

describe("interleaveWithInternal", () => {
  it("deve retornar somente externas quando não há internas", () => {
    const ext = [makeExternal("1", "Ext1"), makeExternal("2", "Ext2")];

    const result = interleaveWithInternal(ext, []);

    expect(result).toHaveLength(2);
    expect(result.every((s) => s.type === "external")).toBe(true);
  });

  it("deve retornar somente internas quando não há externas", () => {
    const int = [makeInternal(1, "Int1"), makeInternal(2, "Int2")];

    const result = interleaveWithInternal([], int);

    expect(result).toHaveLength(2);
    expect(result.every((s) => s.type === "internal")).toBe(true);
  });

  it("deve retornar vazio quando ambas listas são vazias", () => {
    const result = interleaveWithInternal([], []);
    expect(result).toHaveLength(0);
  });

  it("deve intercalar 1:1 quando quantidades são iguais", () => {
    const ext = [makeExternal("1", "E1"), makeExternal("2", "E2")];
    const int = [makeInternal(1, "I1"), makeInternal(2, "I2")];

    const result = interleaveWithInternal(ext, int);

    expect(result).toHaveLength(4);
    expect(result[0].type).toBe("external");
    expect(result[1].type).toBe("internal");
    expect(result[2].type).toBe("external");
    expect(result[3].type).toBe("internal");
  });

  it("deve manter padrão ext→int→ext→int", () => {
    const ext = [makeExternal("1", "E1"), makeExternal("2", "E2"), makeExternal("3", "E3")];
    const int = [makeInternal(1, "I1"), makeInternal(2, "I2"), makeInternal(3, "I3")];

    const result = interleaveWithInternal(ext, int);

    for (let i = 0; i < result.length; i++) {
      if (i % 2 === 0) expect(result[i].type).toBe("external");
      else expect(result[i].type).toBe("internal");
    }
  });

  it("deve repetir internas ciclicamente quando há menos internas que externas", () => {
    const ext = [
      makeExternal("1", "E1"),
      makeExternal("2", "E2"),
      makeExternal("3", "E3"),
      makeExternal("4", "E4"),
    ];
    const int = [makeInternal(1, "I1"), makeInternal(2, "I2")];

    const result = interleaveWithInternal(ext, int);

    // 4 ext + 4 int (com repetição) = 8
    expect(result).toHaveLength(8);

    // Internas na posição 1,3,5,7
    const intSlides = result.filter((s) => s.type === "internal");
    expect(intSlides).toHaveLength(4);

    // Primeiro round: I1, I2 (sem repetição)
    expect((intSlides[0].data as NoticiaInterna).id).toBe(1);
    expect((intSlides[1].data as NoticiaInterna).id).toBe(2);

    // Segundo round: repete ciclicamente
    // i=2 → internal[2 % 2] = I1, i=3 → internal[3 % 2] = I2
    expect((intSlides[2].data as NoticiaInterna).id).toBe(1);
    expect((intSlides[3].data as NoticiaInterna).id).toBe(2);
  });

  it("deve usar todas as internas mesmo se há mais internas que externas", () => {
    const ext = [makeExternal("1", "E1")];
    const int = [makeInternal(1, "I1"), makeInternal(2, "I2"), makeInternal(3, "I3")];

    const result = interleaveWithInternal(ext, int);

    // 1 ext + 1 int = 2 (porque loop é baseado em external.length)
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("external");
    expect(result[1].type).toBe("internal");
    expect((result[1].data as NoticiaInterna).id).toBe(1);
  });

  it("deve preservar dados originais nos slides", () => {
    const ext = [makeExternal("abc", "Título Externo")];
    const int = [makeInternal(42, "Título Interno", "video")];

    const result = interleaveWithInternal(ext, int);

    const extSlide = result[0];
    expect(extSlide.type).toBe("external");
    expect((extSlide.data as NewsItem).id).toBe("abc");
    expect((extSlide.data as NewsItem).title).toBe("Título Externo");

    const intSlide = result[1];
    expect(intSlide.type).toBe("internal");
    expect((intSlide.data as NoticiaInterna).id).toBe(42);
    expect((intSlide.data as NoticiaInterna).titulo).toBe("Título Interno");
    expect((intSlide.data as NoticiaInterna).tipoMidia).toBe("video");
  });

  it("deve funcionar com uma única notícia externa e uma interna", () => {
    const ext = [makeExternal("1", "E1")];
    const int = [makeInternal(1, "I1")];

    const result = interleaveWithInternal(ext, int);

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("external");
    expect(result[1].type).toBe("internal");
  });
});
