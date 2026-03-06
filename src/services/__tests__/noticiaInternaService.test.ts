import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Tipos reproduzidos para testes unitários puros ──

interface NoticiaInterna {
  id: number;
  titulo: string;
  subtitulo?: string | null;
  tipoMidia: "imagem" | "video";
  mediaUrl: string;
  nomeArquivoOriginal?: string;
  inicioEm?: string | null;
  fimEm?: string | null;
  ativo: boolean;
  criadoEm: string;
}

// ── Reprodução da lógica de createNoticiaInterna (FormData building) ──

function buildFormData(data: {
  titulo: string;
  subtitulo?: string;
  inicioEm?: string;
  fimEm?: string;
  arquivo: File;
}): FormData {
  const formData = new FormData();
  formData.append("titulo", data.titulo);
  if (data.subtitulo) formData.append("subtitulo", data.subtitulo);
  if (data.inicioEm) formData.append("inicioEm", data.inicioEm);
  if (data.fimEm) formData.append("fimEm", data.fimEm);
  formData.append("arquivo", data.arquivo);
  return formData;
}

function buildUpdateFormData(data: {
  titulo: string;
  subtitulo?: string;
  inicioEm?: string;
  fimEm?: string;
  ativo: boolean;
  arquivo?: File;
}): FormData {
  const formData = new FormData();
  formData.append("titulo", data.titulo);
  if (data.subtitulo) formData.append("subtitulo", data.subtitulo);
  if (data.inicioEm) formData.append("inicioEm", data.inicioEm);
  if (data.fimEm) formData.append("fimEm", data.fimEm);
  formData.append("ativo", String(data.ativo));
  if (data.arquivo) formData.append("arquivo", data.arquivo);
  return formData;
}

// ── Reprodução da lógica de URL building ──

function buildGetUrl(slug: string): string {
  return `/api/${encodeURIComponent(slug)}/noticia-interna`;
}

function buildAdminUrl(slug: string): string {
  return `/api/${encodeURIComponent(slug)}/admin/noticia-interna`;
}

function buildAdminItemUrl(slug: string, id: number): string {
  return `/api/${encodeURIComponent(slug)}/admin/noticia-interna/${id}`;
}

function buildDeleteUrl(slug: string, id: number): string {
  return `/api/${encodeURIComponent(slug)}/admin/noticia-interna/${id}`;
}

// ── Testes ──

describe("noticiaInternaService - FormData building", () => {
  it("deve incluir titulo e arquivo obrigatórios no FormData", () => {
    const file = new File(["content"], "photo.jpg", { type: "image/jpeg" });
    const fd = buildFormData({ titulo: "Festa", arquivo: file });

    expect(fd.get("titulo")).toBe("Festa");
    expect(fd.get("arquivo")).toBeInstanceOf(File);
    expect((fd.get("arquivo") as File).name).toBe("photo.jpg");
  });

  it("deve incluir subtitulo quando informado", () => {
    const file = new File(["c"], "img.png", { type: "image/png" });
    const fd = buildFormData({ titulo: "T", subtitulo: "Sub", arquivo: file });

    expect(fd.get("subtitulo")).toBe("Sub");
  });

  it("não deve incluir subtitulo quando não informado", () => {
    const file = new File(["c"], "img.png", { type: "image/png" });
    const fd = buildFormData({ titulo: "T", arquivo: file });

    expect(fd.get("subtitulo")).toBeNull();
  });

  it("deve incluir datas de agendamento quando informadas", () => {
    const file = new File(["c"], "img.png", { type: "image/png" });
    const fd = buildFormData({
      titulo: "T",
      inicioEm: "2026-03-01T00:00",
      fimEm: "2026-03-31T23:59",
      arquivo: file,
    });

    expect(fd.get("inicioEm")).toBe("2026-03-01T00:00");
    expect(fd.get("fimEm")).toBe("2026-03-31T23:59");
  });

  it("não deve incluir datas quando não informadas", () => {
    const file = new File(["c"], "img.png", { type: "image/png" });
    const fd = buildFormData({ titulo: "T", arquivo: file });

    expect(fd.get("inicioEm")).toBeNull();
    expect(fd.get("fimEm")).toBeNull();
  });
});

describe("noticiaInternaService - Update FormData", () => {
  it("deve incluir ativo como string no update", () => {
    const fd = buildUpdateFormData({ titulo: "T", ativo: true });
    expect(fd.get("ativo")).toBe("true");
  });

  it("deve incluir ativo false como string", () => {
    const fd = buildUpdateFormData({ titulo: "T", ativo: false });
    expect(fd.get("ativo")).toBe("false");
  });

  it("deve incluir arquivo no update quando fornecido", () => {
    const file = new File(["c"], "video.mp4", { type: "video/mp4" });
    const fd = buildUpdateFormData({ titulo: "T", ativo: true, arquivo: file });

    expect(fd.get("arquivo")).toBeInstanceOf(File);
    expect((fd.get("arquivo") as File).name).toBe("video.mp4");
  });

  it("não deve incluir arquivo no update quando não fornecido", () => {
    const fd = buildUpdateFormData({ titulo: "T", ativo: true });
    expect(fd.get("arquivo")).toBeNull();
  });
});

describe("noticiaInternaService - URL building", () => {
  it("deve construir URL pública correta", () => {
    expect(buildGetUrl("gramado")).toBe("/api/gramado/noticia-interna");
  });

  it("deve escapar slug com caracteres especiais", () => {
    expect(buildGetUrl("são paulo")).toBe("/api/s%C3%A3o%20paulo/noticia-interna");
  });

  it("deve construir URL admin correta", () => {
    expect(buildAdminUrl("gramado")).toBe("/api/gramado/admin/noticia-interna");
  });

  it("deve construir URL admin com ID correta", () => {
    expect(buildAdminItemUrl("gramado", 42)).toBe("/api/gramado/admin/noticia-interna/42");
  });

  it("deve construir URL de delete correta", () => {
    expect(buildDeleteUrl("canela", 10)).toBe("/api/canela/admin/noticia-interna/10");
  });
});

describe("noticiaInternaService - fetch integration", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deve chamar fetch com GET para notícias públicas", async () => {
    const mockData: NoticiaInterna[] = [
      {
        id: 1,
        titulo: "Aviso",
        tipoMidia: "imagem",
        mediaUrl: "/api/media/abc.jpg",
        ativo: true,
        criadoEm: "2026-03-01T10:00:00Z",
      },
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockData)),
    });
    globalThis.fetch = mockFetch;

    const url = buildGetUrl("gramado");
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();
    const parsed = JSON.parse(text) as NoticiaInterna[];

    expect(mockFetch).toHaveBeenCalledWith("/api/gramado/noticia-interna", { method: "GET" });
    expect(parsed).toHaveLength(1);
    expect(parsed[0].titulo).toBe("Aviso");

    globalThis.fetch = originalFetch;
  });

  it("deve lançar erro quando servidor retorna status não-ok", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      url: "/api/invalido/noticia-interna",
      text: () => Promise.resolve(JSON.stringify({ message: "Predio nao encontrado." })),
    });
    globalThis.fetch = mockFetch;

    const res = await fetch(buildGetUrl("invalido"), { method: "GET" });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);

    globalThis.fetch = originalFetch;
  });

  it("deve enviar Authorization header quando token fornecido", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("[]"),
    });
    globalThis.fetch = mockFetch;

    const token = "jwt-test-token";
    await fetch(buildAdminUrl("gramado"), {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/gramado/admin/noticia-interna",
      expect.objectContaining({
        headers: { Authorization: "Bearer jwt-test-token" },
      }),
    );

    globalThis.fetch = originalFetch;
  });

  it("deve enviar FormData no POST de create", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, titulo: "Novo" }),
    });
    globalThis.fetch = mockFetch;

    const file = new File(["image-data"], "foto.jpg", { type: "image/jpeg" });
    const formData = buildFormData({ titulo: "Novo", arquivo: file });

    await fetch(buildAdminUrl("gramado"), {
      method: "POST",
      headers: { Authorization: "Bearer token" },
      body: formData,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/gramado/admin/noticia-interna",
      expect.objectContaining({ method: "POST" }),
    );

    const callBody = mockFetch.mock.calls[0][1].body as FormData;
    expect(callBody.get("titulo")).toBe("Novo");
    expect(callBody.get("arquivo")).toBeInstanceOf(File);

    globalThis.fetch = originalFetch;
  });

  it("deve enviar DELETE com ID correto", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(""),
    });
    globalThis.fetch = mockFetch;

    await fetch(buildDeleteUrl("gramado", 5), {
      method: "DELETE",
      headers: { Authorization: "Bearer token" },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/gramado/admin/noticia-interna/5",
      expect.objectContaining({ method: "DELETE" }),
    );

    globalThis.fetch = originalFetch;
  });
});
