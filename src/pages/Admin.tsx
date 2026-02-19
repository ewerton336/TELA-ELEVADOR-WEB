import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Message,
  MessagePriority,
  getMessages,
  addMessage,
  updateMessage,
  deleteMessage,
} from "@/services/messageService";
import { Switch } from "@/components/ui/switch";
import {
  getFontesNoticia,
  updatePreferenciasNoticia,
  type FonteNoticiaAdmin,
} from "@/services/newsAdminService";
import { requestJson } from "@/services/apiClient";
import {
  Lock,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  MessageSquare,
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  Bold,
  Italic,
  Underline,
  Clock,
  Newspaper,
  Rss,
} from "lucide-react";
import { toast } from "sonner";
import * as predioAdminService from "@/services/predioAdminService";
import type { OrientationMode } from "@/services/predioService";

function getRoleFromToken(token: string | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload + "===".slice((payload.length + 3) % 4);

  try {
    const json = atob(padded);
    const data = JSON.parse(json) as Record<string, unknown>;
    console.log("[getRoleFromToken] Decoded payload:", data);

    // Try both "role" and the ClaimTypes.Role URI
    const role =
      data.role ||
      data["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
    return typeof role === "string" ? role : null;
  } catch {
    console.error("[getRoleFromToken] Failed to decode token");
    return null;
  }
}

export function Admin() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuario, setUsuario] = useState("admin");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPriority, setFormPriority] = useState<MessagePriority>("normal");
  const [formActive, setFormActive] = useState(true);

  // News sources state
  const [newsSources, setNewsSources] = useState<FonteNoticiaAdmin[]>([]);
  const [orientationMode, setOrientationMode] =
    useState<OrientationMode>("auto");
  const [isDeveloper, setIsDeveloper] = useState(false);

  // Rich text formatting
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

  useEffect(() => {
    if (isAuthenticated) {
      loadMessages();
      loadFontes();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!slug) {
      navigate("/gramado", { replace: true });
    }
  }, [slug, navigate]);

  useEffect(() => {
    const role = getRoleFromToken(token);
    console.log("[Admin] Token:", token?.substring(0, 50) + "...");
    console.log("[Admin] Role from token:", role);
    console.log("[Admin] isDeveloper:", role?.toLowerCase() === "developer");
    setIsDeveloper(role?.toLowerCase() === "developer");
  }, [token]);

  useEffect(() => {
    if (!token || !isDeveloper) {
      return;
    }

    const loadOrientation = async () => {
      try {
        const data = await predioAdminService.getPredioOrientation(
          slug ?? "gramado",
          token,
        );
        setOrientationMode(data.orientationMode ?? "auto");
      } catch (err) {
        console.error("Erro ao carregar orientacao:", err);
        toast.error("Erro ao carregar orientacao da tela");
      }
    };

    loadOrientation();
  }, [isDeveloper, slug, token]);

  const loadMessages = async () => {
    try {
      const msgs = await getMessages(slug ?? "gramado");
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

  const loadFontes = async () => {
    try {
      const fontes = await getFontesNoticia(slug ?? "gramado", token);
      setNewsSources(fontes);
    } catch (err) {
      console.error("Erro ao carregar fontes:", err);
      toast.error("Erro ao carregar fontes de noticia");
    }
  };

  const handleToggleSource = async (id: number) => {
    const updated = newsSources.map((source) =>
      source.id === id ? { ...source, habilitado: !source.habilitado } : source,
    );

    if (updated.filter((s) => s.habilitado).length === 0) {
      toast.error("É necessário manter pelo menos uma fonte ativa!");
      return;
    }

    setNewsSources(updated);
    try {
      await updatePreferenciasNoticia(
        slug ?? "gramado",
        token,
        updated.map((s) => ({ chave: s.chave, habilitado: s.habilitado })),
      );
      const source = updated.find((s) => s.id === id);
      toast.success(
        `${source?.nome} ${source?.habilitado ? "ativado" : "desativado"}`,
      );
    } catch (err) {
      console.error("Erro ao atualizar fontes:", err);
      toast.error("Erro ao salvar preferencia de fonte");
      await loadFontes();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await requestJson<{ token: string }>(
        slug ?? "gramado",
        "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario, senha: password }),
        },
        "login",
      );
      setToken(data.token);
      setIsAuthenticated(true);
      toast.success("Login realizado com sucesso!");
    } catch (err) {
      console.error("Erro ao autenticar:", err);
      toast.error("Credenciais invalidas");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken(null);
    setPassword("");
    setIsDeveloper(false);
    setOrientationMode("auto");
    toast.info("Logout realizado");
  };

  const handleOrientationChange = async (value: OrientationMode) => {
    if (!token) return;
    try {
      await predioAdminService.updatePredioOrientation(
        slug ?? "gramado",
        token,
        value,
      );
      setOrientationMode(value);
      toast.success(
        value === "auto"
          ? "Orientacao automatica ativada"
          : `Modo ${value === "portrait" ? "retrato" : "paisagem"} forcado`,
      );
    } catch (err) {
      console.error("Erro ao atualizar orientacao:", err);
      toast.error("Erro ao salvar orientacao da tela");
    }
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
        const created = await addMessage(slug ?? "gramado", token, {
          title: formTitle.trim(),
          content: formContent.trim(),
          priority: formPriority,
          active: formActive,
        });
        // Se o active não foi setado corretamente na criação, atualiza
        if (created && created.active !== formActive) {
          await updateMessage(slug ?? "gramado", token, created.id, {
            active: formActive,
          });
        }
        toast.success("Recado adicionado!");
      } else if (editingId) {
        await updateMessage(slug ?? "gramado", token, editingId, {
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
        await deleteMessage(slug ?? "gramado", token, id);
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

  // Tela de login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <Card className="w-full max-w-md glass-card border-white/10">
          <CardHeader className="text-center">
            <div className="mx-auto p-4 rounded-full bg-blue-500/20 w-fit mb-4">
              <Lock className="w-8 h-8 text-blue-400" />
            </div>
            <CardTitle className="text-2xl text-white">
              Painel do Síndico
            </CardTitle>
            <p className="text-white/50 text-sm">Digite a senha para acessar</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="usuario" className="text-white">
                  Usuario
                </Label>
                <Input
                  id="usuario"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Digite o usuario"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>
              <Button type="submit" className="w-full">
                Entrar
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-white/50 hover:text-white"
                onClick={() => navigate(`/${slug ?? "gramado"}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para tela
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Painel admin
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/${slug ?? "gramado"}`)}
            className="text-white/60 hover:text-white h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-display font-bold text-white">
              Painel do Síndico
            </h1>
            <p className="text-white/50 text-xs">
              Gerencie os recados do elevador
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="bg-transparent border-white/20 text-white hover:bg-white/10"
        >
          <LogOut className="w-3 h-3 mr-1" />
          Sair
        </Button>
      </header>

      {isDeveloper && (
        <Card className="glass-card border-white/10 mb-4">
          <CardHeader className="flex-row items-center justify-between py-3 px-4">
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              Modo de exibicao da tela
            </CardTitle>
            <span className="text-white/40 text-xs">
              {orientationMode === "auto"
                ? "Automatico"
                : orientationMode === "portrait"
                  ? "Retrato"
                  : "Paisagem"}
            </span>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-white/50 text-xs mb-3">
              Forca o modo retrato ou paisagem, mesmo se a tela estiver em outra
              orientacao.
            </p>
            <div className="max-w-xs">
              <Select
                value={orientationMode}
                onValueChange={
                  handleOrientationChange as (value: string) => void
                }
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white h-8 text-sm">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatico (dispositivo)</SelectItem>
                  <SelectItem value="portrait">Forcar Retrato</SelectItem>
                  <SelectItem value="landscape">Forcar Paisagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fontes de Notícias */}
      <Card className="glass-card border-white/10 mb-4">
        <CardHeader className="flex-row items-center justify-between py-3 px-4">
          <CardTitle className="text-white flex items-center gap-2 text-sm">
            <Newspaper className="w-4 h-4" />
            Fontes de Notícias
          </CardTitle>
          <span className="text-white/40 text-xs">
            {newsSources.filter((s) => s.habilitado).length} de{" "}
            {newsSources.length} ativas
          </span>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-white/50 text-xs mb-3">
            Selecione as fontes de notícias que serão exibidas no elevador. As
            notícias alternarão entre as fontes ativas.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {newsSources.map((source) => (
              <div
                key={source.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  source.habilitado
                    ? "border-green-500/30 bg-green-500/10"
                    : "border-white/10 bg-white/5 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`p-2 rounded-lg ${
                      source.habilitado ? "bg-green-500/20" : "bg-white/10"
                    }`}
                  >
                    <Rss
                      className={`w-4 h-4 ${
                        source.habilitado ? "text-green-400" : "text-white/40"
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`font-medium text-sm truncate ${
                        source.habilitado ? "text-white" : "text-white/50"
                      }`}
                    >
                      {source.nome}
                    </p>
                    <p className="text-white/30 text-[10px] truncate">
                      {source.urlBase
                        .replace("https://", "")
                        .replace("http://", "")
                        .slice(0, 40)}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={source.habilitado}
                  onCheckedChange={() => handleToggleSource(source.id)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lista de mensagens */}
        <Card className="glass-card border-white/10">
          <CardHeader className="flex-row items-center justify-between py-3 px-4">
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4" />
              Recados ({messages.length})
            </CardTitle>
            <Button onClick={handleStartAdd} size="sm" className="h-7 text-xs">
              <Plus className="w-3 h-3 mr-1" />
              Novo
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="h-[400px] pr-3">
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
                    onClick={() => handleStartEdit(message)}
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
                            handleStartEdit(message);
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
                            handleDelete(message.id);
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
        </Card>

        {/* Formulário de edição */}
        <Card className="glass-card border-white/10">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-white text-sm">
              {isAdding
                ? "Novo Recado"
                : editingId
                  ? "Editar Recado"
                  : "Selecione um Recado"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isAdding || editingId ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="title" className="text-white text-xs">
                    Título
                  </Label>
                  <Input
                    id="title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Digite o título do recado"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="content" className="text-white text-xs">
                    Conteúdo
                  </Label>
                  <div className="flex gap-1 mb-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyFormatting("b")}
                      className="h-6 w-6 p-0 bg-transparent border-white/20 text-white hover:bg-white/10"
                      title="Negrito"
                    >
                      <Bold className="w-3 h-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyFormatting("i")}
                      className="h-6 w-6 p-0 bg-transparent border-white/20 text-white hover:bg-white/10"
                      title="Itálico"
                    >
                      <Italic className="w-3 h-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyFormatting("u")}
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
                  <Button onClick={handleSave} className="flex-1 h-8 text-sm">
                    <Save className="w-3 h-3 mr-1" />
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="bg-transparent border-white/20 text-white hover:bg-white/10 h-8 text-sm"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-white/40">
                <Pencil className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Clique em um recado para editar</p>
                <p className="text-xs">ou adicione um novo</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pré-visualização */}
        <Card className="glass-card border-white/10">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4" />
              Pré-visualização
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {(isAdding || editingId) && (formTitle || formContent) ? (
              <div
                className={`h-[400px] rounded-lg overflow-hidden ${
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
              <div className="h-[400px] flex items-center justify-center text-white/40 border border-dashed border-white/20 rounded-lg">
                <div className="text-center">
                  <Eye className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Preencha o formulário</p>
                  <p className="text-xs">para ver a pré-visualização</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
