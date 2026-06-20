import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/GlassCard";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertTriangle,
  Eye,
  EyeOff,
  Bold,
  Italic,
  Underline,
  Clock,
} from "lucide-react";
import {
  type Message,
  type MessagePriority,
  getMessages,
  addMessage,
  updateMessage,
  deleteMessage,
} from "@/services/messageService";
import { toast } from "sonner";

interface MessagesSectionProps {
  slug: string;
  token: string | null;
}

export function MessagesSection({ slug, token }: MessagesSectionProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPriority, setFormPriority] = useState<MessagePriority>("normal");
  const [formActive, setFormActive] = useState(true);

  useEffect(() => {
    loadMessages();
  }, [slug]);

  const loadMessages = async () => {
    try {
      const msgs = await getMessages(slug);
      if (!msgs) {
        toast.error("Erro ao carregar mensagens do servidor");
        return;
      }
      setMessages(msgs);
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
      toast.error("Erro ao carregar mensagens do servidor");
    }
  };

  const applyFormatting = (tag: string) => {
    const textarea = document.getElementById("content") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formContent.substring(start, end);

    let formattedText = "";
    if (tag === "b") {
      formattedText = `<b>${selectedText}</b>`;
    } else if (tag === "i") {
      formattedText = `<i>${selectedText}</i>`;
    } else if (tag === "u") {
      formattedText = `<u>${selectedText}</u>`;
    }

    const newContent =
      formContent.substring(0, start) +
      formattedText +
      formContent.substring(end);
    setFormContent(newContent);
  };

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormPriority("normal");
    setFormActive(true);
    setEditingId(null);
    setIsAdding(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleStartEdit = (message: Message) => {
    setFormTitle(message.title);
    setFormContent(message.content);
    setFormPriority(message.priority);
    setFormActive(message.active ?? true);
    setEditingId(message.id);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error("Preencha todos os campos!");
      return;
    }

    try {
      if (isAdding) {
        const created = await addMessage(slug, token, {
          title: formTitle.trim(),
          content: formContent.trim(),
          priority: formPriority,
          active: formActive,
        });
        if (created && created.active !== formActive) {
          await updateMessage(slug, token, created.id, {
            active: formActive,
          });
        }
        toast.success("Recado adicionado!");
      } else if (editingId) {
        await updateMessage(slug, token, editingId, {
          title: formTitle.trim(),
          content: formContent.trim(),
          priority: formPriority,
          active: formActive,
        });
        toast.success("Recado atualizado!");
      }

      resetForm();
      await loadMessages();
    } catch (err) {
      console.error("Erro ao salvar mensagem:", err);
      toast.error("Erro ao salvar mensagem no servidor");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este recado?")) {
      try {
        await deleteMessage(slug, token, id);
        toast.success("Recado excluído!");
        await loadMessages();
        if (editingId === id) {
          resetForm();
        }
      } catch (err) {
        console.error("Erro ao excluir mensagem:", err);
        toast.error("Erro ao excluir mensagem do servidor");
      }
    }
  };

  return (
    <div>
      <MessageList
        messages={messages}
        editingId={editingId}
        onStartAdd={handleStartAdd}
        onStartEdit={handleStartEdit}
        onDelete={handleDelete}
      />

      <Dialog
        open={isAdding || editingId !== null}
        onOpenChange={(open) => {
          if (!open) resetForm();
        }}
      >
        <DialogContent className="glass-card border-white/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-sm">
              {isAdding ? "Novo Recado" : "Editar Recado"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <MessageForm
              isAdding={isAdding}
              editingId={editingId}
              formTitle={formTitle}
              setFormTitle={setFormTitle}
              formContent={formContent}
              setFormContent={setFormContent}
              formPriority={formPriority}
              setFormPriority={setFormPriority}
              formActive={formActive}
              setFormActive={setFormActive}
              onSave={handleSave}
              onCancel={resetForm}
              onApplyFormatting={applyFormatting}
            />

            <MessagePreview
              isAdding={isAdding}
              editingId={editingId}
              formTitle={formTitle}
              formContent={formContent}
              formPriority={formPriority}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** List of existing messages */
function MessageList({
  messages,
  editingId,
  onStartAdd,
  onStartEdit,
  onDelete,
}: {
  messages: Message[];
  editingId: string | null;
  onStartAdd: () => void;
  onStartEdit: (m: Message) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <GlassCard>
      <CardHeader className="flex-row items-center justify-between py-2 sm:py-3 px-3 sm:px-4 gap-2">
        <CardTitle className="text-white flex items-center gap-2 text-sm">
          <MessageSquare className="w-4 h-4" />
          Recados ({messages.length})
        </CardTitle>
        <Button
          onClick={onStartAdd}
          size="sm"
          className="h-7 text-xs flex-shrink-0"
        >
          <Plus className="w-3 h-3 mr-1" />
          Novo
        </Button>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
        <ScrollArea className="h-[250px] sm:h-[400px] pr-3">
          <div className="space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  editingId === message.id
                    ? "border-blue-500 bg-blue-500/10"
                    : message.active === false
                      ? "border-white/5 bg-white/5 opacity-50"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
                onClick={() => onStartEdit(message)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {message.active === false ? (
                        <EyeOff className="w-4 h-4 text-white/40" />
                      ) : message.priority === "urgent" ? (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-green-400" />
                      )}
                      <h3
                        className={`font-semibold ${message.active === false ? "text-white/50" : "text-white"}`}
                      >
                        {message.title}
                      </h3>
                      {message.priority === "urgent" &&
                        message.active !== false && (
                          <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                            Urgente
                          </span>
                        )}
                      {message.active === false && (
                        <span className="text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-white/60 text-sm line-clamp-2">
                      {message.content}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white/50 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartEdit(message);
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
                        onDelete(message.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {messages.length === 0 && (
              <div className="text-center py-12 text-white/40">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum recado ainda</p>
                <p className="text-sm">Clique em "Novo" para adicionar</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </GlassCard>
  );
}

/** Form for editing/adding a message */
function MessageForm({
  formTitle,
  setFormTitle,
  formContent,
  setFormContent,
  formPriority,
  setFormPriority,
  formActive,
  setFormActive,
  onSave,
  onCancel,
  onApplyFormatting,
}: {
  isAdding: boolean;
  editingId: string | null;
  formTitle: string;
  setFormTitle: (v: string) => void;
  formContent: string;
  setFormContent: (v: string) => void;
  formPriority: MessagePriority;
  setFormPriority: (v: MessagePriority) => void;
  formActive: boolean;
  setFormActive: (v: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  onApplyFormatting: (tag: string) => void;
}) {
  return (
    <div className="space-y-3">
            <FormField
              id="title"
              label="Título"
              dark
              value={formTitle}
              onValueChange={setFormTitle}
              placeholder="Digite o título do recado"
            />

            <div className="space-y-1">
              <Label htmlFor="content" className="text-white text-xs">
                Conteúdo
              </Label>
              <div className="flex gap-1 mb-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onApplyFormatting("b")}
                  className="h-6 w-6 p-0 bg-transparent border-white/20 text-white hover:bg-white/10"
                  title="Negrito"
                >
                  <Bold className="w-3 h-3" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onApplyFormatting("i")}
                  className="h-6 w-6 p-0 bg-transparent border-white/20 text-white hover:bg-white/10"
                  title="Itálico"
                >
                  <Italic className="w-3 h-3" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onApplyFormatting("u")}
                  className="h-6 w-6 p-0 bg-transparent border-white/20 text-white hover:bg-white/10"
                  title="Sublinhado"
                >
                  <Underline className="w-3 h-3" />
                </Button>
              </div>
              <Textarea
                id="content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Digite o conteúdo do recado"
                rows={5}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="priority" className="text-white text-xs">
                Prioridade
              </Label>
              <Select
                value={formPriority}
                onValueChange={(value: MessagePriority) =>
                  setFormPriority(value)
                }
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
              </label>
              <Label className="text-white flex items-center gap-1 text-xs">
                {formActive ? (
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
              <Button onClick={onSave} className="flex-1 h-8 text-sm">
                <Save className="w-3 h-3 mr-1" />
                Salvar
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                className="bg-transparent border-white/20 text-white hover:bg-white/10 h-8 text-sm"
              >
                <X className="w-3 h-3 mr-1" />
                Cancelar
              </Button>
            </div>
    </div>
  );
}

/** Live preview of the message being edited */
function MessagePreview({
  formTitle,
  formContent,
  formPriority,
}: {
  isAdding: boolean;
  editingId: string | null;
  formTitle: string;
  formContent: string;
  formPriority: MessagePriority;
}) {
  return (
    <div className="space-y-2">
      <div className="text-white flex items-center gap-2 text-sm font-semibold">
        <Eye className="w-4 h-4" />
        Pré-visualização
      </div>
      <div>
        {formTitle || formContent ? (
          <div
            className={`h-[250px] sm:h-[400px] rounded-lg overflow-hidden ${
              formPriority === "urgent"
                ? "bg-gradient-to-br from-red-700 to-orange-600"
                : "bg-white/5 border border-white/15"
            }`}
          >
            <div className="h-full p-4 flex flex-col text-white">
              <div className="flex items-center gap-2 flex-shrink-0">
                {formPriority === "urgent" ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-white" />
                    <span className="text-[10px] bg-black/30 text-white px-2 py-0.5 rounded-full font-semibold">
                      URGENTE
                    </span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 text-orange-300" />
                    <span className="text-[10px] bg-white/10 text-orange-100 px-2 py-0.5 rounded-full font-medium border border-white/20">
                      Aviso do condomínio
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-base text-white mt-3 leading-tight font-semibold flex-shrink-0 line-clamp-2">
                {formTitle || "Título do aviso"}
              </h2>
              <div className="flex-1 overflow-hidden mt-3">
                <div
                  className="text-white/90 text-sm leading-relaxed line-clamp-[12]"
                  dangerouslySetInnerHTML={{
                    __html:
                      formContent ||
                      "O conteúdo do aviso aparecerá aqui...",
                  }}
                />
              </div>
              <div className="flex items-center gap-2 text-white/60 flex-shrink-0 mt-3">
                <Clock className="w-3 h-3" />
                <span className="text-xs">Agora</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[250px] sm:h-[400px] flex items-center justify-center text-white/40 border border-dashed border-white/20 rounded-lg">
            <div className="text-center">
              <Eye className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Preencha o formulário</p>
              <p className="text-xs">para ver a pré-visualização</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
