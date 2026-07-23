import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/FormField";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Eye,
  EyeOff,
  Newspaper,
  Image,
  Video,
  Upload,
} from "lucide-react";
import { formatDateShort } from "@/lib/dateFormatter";
import { InternalNewsSlide } from "@/components/NewsCarousel";
import { toast } from "sonner";
import {
  type NoticiaInterna,
  getNoticiasInternasAdmin,
  createNoticiaInterna,
  updateNoticiaInterna,
  deleteNoticiaInterna,
} from "@/services/noticiaInternaService";

interface NoticiaInternaCardProps {
  slug: string;
  token: string | null;
}

export function NoticiaInternaCard({ slug, token }: NoticiaInternaCardProps) {
  const [noticiasInternas, setNoticiasInternas] = useState<NoticiaInterna[]>(
    [],
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [inicioEm, setInicioEm] = useState("");
  const [fimEm, setFimEm] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (token) loadNoticiasInternas();
  }, [slug, token]);

  const loadNoticiasInternas = async () => {
    if (!token) return;
    try {
      const list = await getNoticiasInternasAdmin(slug, token);
      setNoticiasInternas(list);
    } catch (err) {
      console.error("Erro ao carregar noticias internas:", err);
      toast.error("Erro ao carregar notícias do condomínio");
    }
  };

  const resetForm = () => {
    setTitulo("");
    setSubtitulo("");
    setArquivo(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setInicioEm("");
    setFimEm("");
    setAtivo(true);
    setEditingId(null);
    setIsAdding(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;

    // Barra o arquivo grande já no cliente, evitando um upload longo no 4G
    // que só falharia no servidor (limite de 25 MB).
    if (file && file.size > 25 * 1024 * 1024) {
      toast.error("Arquivo muito grande. O limite é 25 MB.");
      e.target.value = "";
      return;
    }

    setArquivo(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleStartEdit = (ni: NoticiaInterna) => {
    setTitulo(ni.titulo ?? "");
    setSubtitulo(ni.subtitulo ?? "");
    setArquivo(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setInicioEm(ni.inicioEm ? ni.inicioEm.slice(0, 16) : "");
    setFimEm(ni.fimEm ? ni.fimEm.slice(0, 16) : "");
    setAtivo(ni.ativo);
    setEditingId(ni.id);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (isAdding && !arquivo) {
      toast.error("Selecione um arquivo (imagem ou vídeo)!");
      return;
    }

    setSaving(true);
    try {
      if (isAdding && arquivo) {
        await createNoticiaInterna(slug, token, {
          titulo: titulo.trim() || undefined,
          subtitulo: subtitulo.trim() || undefined,
          inicioEm: inicioEm || undefined,
          fimEm: fimEm || undefined,
          arquivo,
        });
        toast.success("Notícia do condomínio adicionada!");
      } else if (editingId !== null) {
        await updateNoticiaInterna(slug, token, editingId, {
          titulo: titulo.trim() || undefined,
          subtitulo: subtitulo.trim() || undefined,
          inicioEm: inicioEm || undefined,
          fimEm: fimEm || undefined,
          ativo,
          arquivo: arquivo ?? undefined,
        });
        toast.success("Notícia do condomínio atualizada!");
      }
      resetForm();
      await loadNoticiasInternas();
    } catch (err) {
      console.error("Erro ao salvar noticia interna:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Erro ao salvar notícia do condomínio",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta notícia?")) return;
    try {
      await deleteNoticiaInterna(slug, token, id);
      toast.success("Notícia excluída!");
      await loadNoticiasInternas();
      if (editingId === id) resetForm();
    } catch (err) {
      console.error("Erro ao excluir noticia interna:", err);
      toast.error("Erro ao excluir notícia");
    }
  };

  return (
    <GlassCard spacing="sm">
      <CardHeader className="flex-row items-center justify-between py-2 sm:py-3 px-3 sm:px-4 gap-2">
        <CardTitle className="text-white flex items-center gap-2 text-sm">
          <Image className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">
            Notícias do Condomínio ({noticiasInternas.length})
          </span>
        </CardTitle>
        <Button
          onClick={handleStartAdd}
          size="sm"
          className="h-9 sm:h-7 px-3 text-xs flex-shrink-0"
        >
          <Plus className="w-3 h-3 mr-1" />
          Nova
        </Button>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
        <p className="text-white/50 text-xs mb-3 hidden sm:block">
          Cadastre notícias com imagem ou vídeo que serão intercaladas com as
          notícias externas no carrossel.
        </p>

        <Dialog
          open={isAdding || editingId !== null}
          onOpenChange={(open) => {
            if (!open) resetForm();
          }}
        >
          <DialogContent className="glass-card border-white/20 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white text-sm">
                {isAdding ? "Nova Notícia" : "Editar Notícia"}
              </DialogTitle>
            </DialogHeader>
            <NoticiaInternaForm
              isAdding={isAdding}
              titulo={titulo}
              setTitulo={setTitulo}
              subtitulo={subtitulo}
              setSubtitulo={setSubtitulo}
              inicioEm={inicioEm}
              setInicioEm={setInicioEm}
              fimEm={fimEm}
              setFimEm={setFimEm}
              ativo={ativo}
              setAtivo={setAtivo}
              saving={saving}
              previewUrl={previewUrl}
              arquivo={arquivo}
              editingId={editingId}
              noticiasInternas={noticiasInternas}
              onFileChange={handleFileChange}
              onSave={handleSave}
              onCancel={resetForm}
            />
          </DialogContent>
        </Dialog>

        {/* List of internal news */}
        {noticiasInternas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {noticiasInternas.map((ni) => (
              <NoticiaInternaItem
                key={ni.id}
                ni={ni}
                isEditing={editingId === ni.id}
                onEdit={() => handleStartEdit(ni)}
                onDelete={() => handleDelete(ni.id)}
              />
            ))}
          </div>
        ) : (
          !isAdding && (
            <div className="text-center py-8 text-white/40">
              <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notícia do condomínio</p>
              <p className="text-xs">Clique em "Nova" para adicionar</p>
            </div>
          )
        )}
      </CardContent>
    </GlassCard>
  );
}

/** Form for adding/editing an internal news item */
function NoticiaInternaForm({
  isAdding,
  titulo,
  setTitulo,
  subtitulo,
  setSubtitulo,
  inicioEm,
  setInicioEm,
  fimEm,
  setFimEm,
  ativo,
  setAtivo,
  saving,
  previewUrl,
  arquivo,
  editingId,
  noticiasInternas,
  onFileChange,
  onSave,
  onCancel,
}: {
  isAdding: boolean;
  titulo: string;
  setTitulo: (v: string) => void;
  subtitulo: string;
  setSubtitulo: (v: string) => void;
  inicioEm: string;
  setInicioEm: (v: string) => void;
  fimEm: string;
  setFimEm: (v: string) => void;
  ativo: boolean;
  setAtivo: (v: boolean) => void;
  saving: boolean;
  previewUrl: string | null;
  arquivo: File | null;
  editingId: number | null;
  noticiasInternas: NoticiaInterna[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-3">
          <FormField
            id="ni-titulo"
            label="Título"
            dark
            value={titulo}
            onValueChange={setTitulo}
            placeholder="Título da notícia"
          />
          <FormField
            id="ni-subtitulo"
            label="Subtítulo"
            dark
            value={subtitulo}
            onValueChange={setSubtitulo}
            placeholder="Subtítulo (opcional)"
          />
          <div className="space-y-1">
            <Label htmlFor="ni-arquivo" className="text-white text-xs">
              {isAdding
                ? "Arquivo (imagem ou vídeo) *"
                : "Substituir arquivo (opcional)"}
            </Label>
            <Input
              id="ni-arquivo"
              type="file"
              accept="image/*,video/mp4,video/webm"
              onChange={onFileChange}
              className="bg-white/10 border-white/20 text-white h-11 sm:h-9 text-sm file:bg-white/10 file:text-white file:border-0 file:mr-2 file:px-2 file:py-1.5 file:rounded"
            />
            <p className="text-white/30 text-[10px]">
              Máx 25 MB. Formatos: JPEG, PNG, GIF, WebP, MP4, WebM
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FormField
              id="ni-inicio"
              label="Início em (opcional)"
              dark
              type="datetime-local"
              value={inicioEm}
              onValueChange={setInicioEm}
              className="text-xs"
            />
            <FormField
              id="ni-fim"
              label="Fim em (opcional)"
              dark
              type="datetime-local"
              value={fimEm}
              onValueChange={setFimEm}
              className="text-xs"
            />
          </div>
          <p className="text-white/30 text-[10px] -mt-1">
            Início em branco: aparece imediatamente. Fim em branco: não expira.
          </p>
          {editingId !== null && (
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
              </label>
              <Label className="text-white flex items-center gap-1 text-xs">
                {ativo ? (
                  <>
                    <Eye className="w-3 h-3 text-green-400" /> Ativo
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 text-white/50" /> Inativo
                  </>
                )}
              </Label>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={onSave}
              disabled={saving}
              className="flex-1 h-11 sm:h-9 text-sm"
            >
              <Save className="w-3 h-3 mr-1" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className="bg-transparent border-white/20 text-white hover:bg-white/10 h-11 sm:h-9 px-4 text-sm"
            >
              <X className="w-3 h-3 mr-1" /> Cancelar
            </Button>
          </div>
        </div>
        {/* Preview — como a notícia aparece na tela do elevador */}
        <div className="flex flex-col">
          <p className="text-white/50 text-[11px] mb-1 flex items-center gap-1">
            <Eye className="w-3 h-3" /> Pré-visualização (como aparece na tela)
          </p>
          {(() => {
            const editing =
              editingId !== null
                ? noticiasInternas.find((n) => n.id === editingId)
                : undefined;
            const mediaUrl = previewUrl ?? editing?.mediaUrl ?? "";
            const tipoMidia: "imagem" | "video" = arquivo
              ? arquivo.type.startsWith("video/")
                ? "video"
                : "imagem"
              : (editing?.tipoMidia ?? "imagem");
            const item: NoticiaInterna = {
              id: editingId ?? -1,
              titulo: titulo.trim() || null,
              subtitulo: subtitulo.trim() || null,
              tipoMidia,
              mediaUrl,
              ativo: true,
              criadoEm: new Date().toISOString(),
            };
            return (
              <div className="aspect-video w-full rounded-lg overflow-hidden border border-white/10 bg-slate-900 shadow-inner">
                <InternalNewsSlide
                  item={item}
                  isActive={false}
                  onVideoEnded={() => {}}
                />
              </div>
            );
          })()}
          {!previewUrl && editingId === null && (
            <p className="text-white/30 text-[10px] mt-1 flex items-center gap-1">
              <Upload className="w-3 h-3" /> Selecione um arquivo para ver a
              mídia no preview.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** A single internal news card in the grid */
function NoticiaInternaItem({
  ni,
  isEditing,
  onEdit,
  onDelete,
}: {
  ni: NoticiaInterna;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`rounded-lg border overflow-hidden transition-all ${
        isEditing
          ? "border-blue-500 bg-blue-500/10"
          : !ni.ativo
            ? "border-white/5 bg-white/5 opacity-50"
            : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
    >
      {/* Thumbnail */}
      <div className="h-32 bg-black/30 relative">
        {ni.tipoMidia === "video" ? (
          <div className="w-full h-full flex items-center justify-center bg-black/50">
            <Video className="w-8 h-8 text-white/50" />
            <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
              Vídeo
            </span>
          </div>
        ) : (
          <img
            src={ni.mediaUrl}
            alt={ni.titulo ?? "Notícia do condomínio"}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
        {!ni.ativo && (
          <span className="absolute top-1 left-1 bg-white/20 text-white/60 text-[10px] px-1.5 py-0.5 rounded">
            Inativo
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="text-white text-sm font-medium truncate">{ni.titulo}</p>
        {ni.subtitulo && (
          <p className="text-white/50 text-xs truncate">{ni.subtitulo}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-white/30 text-[10px]">
            {formatDateShort(ni.criadoEm)}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white/50 hover:text-white"
              onClick={onEdit}
            >
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-400 hover:text-red-300"
              onClick={onDelete}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
