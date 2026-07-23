import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/GlassCard";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  MessageSquare,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  type TickerMensagem,
  getAdminTickerMensagens,
  addTickerMensagem,
  updateTickerMensagem,
  deleteTickerMensagem,
} from "@/services/tickerService";
import { toast } from "sonner";

interface TickerSectionProps {
  slug: string;
  token: string | null;
}

export function TickerSection({ slug, token }: TickerSectionProps) {
  const [mensagens, setMensagens] = useState<TickerMensagem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [formTexto, setFormTexto] = useState("");
  const [formAtivo, setFormAtivo] = useState(true);
  const [formOrdem, setFormOrdem] = useState(0);

  useEffect(() => {
    loadMensagens();
  }, [slug, token]);

  const loadMensagens = async () => {
    try {
      const list = await getAdminTickerMensagens(slug, token);
      setMensagens(list);
    } catch (err) {
      console.error("Erro ao carregar mensagens do ticker:", err);
      toast.error("Erro ao carregar mensagens do ticker");
    }
  };

  const resetForm = () => {
    setFormTexto("");
    setFormAtivo(true);
    setFormOrdem(0);
    setEditingId(null);
    setIsAdding(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setFormOrdem(mensagens.length);
    setIsAdding(true);
  };

  const handleStartEdit = (m: TickerMensagem) => {
    setFormTexto(m.texto);
    setFormAtivo(m.ativo);
    setFormOrdem(m.ordem);
    setEditingId(m.id);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!formTexto.trim()) {
      toast.error("Preencha o texto da mensagem!");
      return;
    }

    try {
      if (isAdding) {
        await addTickerMensagem(slug, token, {
          texto: formTexto.trim(),
          ativo: formAtivo,
          ordem: formOrdem,
        });
        toast.success("Mensagem adicionada!");
      } else if (editingId !== null) {
        await updateTickerMensagem(slug, token, editingId, {
          texto: formTexto.trim(),
          ativo: formAtivo,
          ordem: formOrdem,
        });
        toast.success("Mensagem atualizada!");
      }

      resetForm();
      await loadMensagens();
    } catch (err) {
      console.error("Erro ao salvar mensagem do ticker:", err);
      toast.error("Erro ao salvar mensagem do ticker");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta mensagem?")) {
      try {
        await deleteTickerMensagem(slug, token, id);
        toast.success("Mensagem excluída!");
        await loadMensagens();
        if (editingId === id) {
          resetForm();
        }
      } catch (err) {
        console.error("Erro ao excluir mensagem do ticker:", err);
        toast.error("Erro ao excluir mensagem do ticker");
      }
    }
  };

  return (
    <div>
      <GlassCard>
        <CardHeader className="flex-row items-center justify-between py-2 sm:py-3 px-3 sm:px-4 gap-2">
          <CardTitle className="text-white flex items-center gap-2 text-sm">
            <MessageSquare className="w-4 h-4" />
            Mensagens do Ticker ({mensagens.length})
          </CardTitle>
          <Button
            onClick={handleStartAdd}
            size="sm"
            className="h-9 sm:h-7 px-3 text-xs flex-shrink-0"
          >
            <Plus className="w-3 h-3 mr-1" />
            Novo
          </Button>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
          <ScrollArea className="h-[250px] sm:h-[400px] pr-3">
            <div className="space-y-2">
              {mensagens.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    editingId === m.id
                      ? "border-blue-500 bg-blue-500/10"
                      : m.ativo === false
                        ? "border-white/5 bg-white/5 opacity-50"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                  onClick={() => handleStartEdit(m)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {m.ativo === false ? (
                          <EyeOff className="w-4 h-4 text-white/40" />
                        ) : (
                          <Eye className="w-4 h-4 text-green-400" />
                        )}
                        {m.ativo === false && (
                          <span className="text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
                            Inativo
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm line-clamp-2 ${m.ativo === false ? "text-white/40" : "text-white/80"}`}
                      >
                        {m.texto}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/50 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(m);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(m.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {mensagens.length === 0 && (
                <div className="text-center py-12 text-white/40">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma mensagem ainda</p>
                  <p className="text-sm">Clique em "Novo" para adicionar</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </GlassCard>

      <Dialog
        open={isAdding || editingId !== null}
        onOpenChange={(open) => {
          if (!open) resetForm();
        }}
      >
        <DialogContent className="glass-card border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white text-sm">
              {isAdding ? "Nova Mensagem" : "Editar Mensagem"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="ticker-texto" className="text-white text-xs">
                  Texto
                </Label>
                <Textarea
                  id="ticker-texto"
                  value={formTexto}
                  onChange={(e) => setFormTexto(e.target.value)}
                  placeholder="Digite o texto da mensagem"
                  rows={4}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAtivo}
                    onChange={(e) => setFormAtivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                </label>
                <Label className="text-white flex items-center gap-1 text-xs">
                  {formAtivo ? (
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

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} className="flex-1 h-11 sm:h-9 text-sm">
                  <Save className="w-3 h-3 mr-1" />
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="bg-transparent border-white/20 text-white hover:bg-white/10 h-11 sm:h-9 px-4 text-sm"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancelar
                </Button>
              </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
