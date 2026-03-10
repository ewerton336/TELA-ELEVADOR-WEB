import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
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
  RefreshCw,
  Image,
  Video,
  Upload,
  Cloud,
  RotateCcw,
  MonitorSmartphone,
} from "lucide-react";
import { ModuleToggleCard } from "@/components/ModuleToggleCard";
import { formatDateShort } from "@/lib/dateFormatter";
import { toast } from "sonner";
import * as predioAdminService from "@/services/predioAdminService";
import type { OrientationMode, ScreenModules } from "@/services/predioService";
import { DEFAULT_MODULES } from "@/services/predioService";
import {
  forceLoadNews,
  getNewsStats,
  type NewsStatsResponse,
} from "@/services/newsHealthCheckService";
import {
  type NoticiaInterna,
  getNoticiasInternasAdmin,
  createNoticiaInterna,
  updateNoticiaInterna,
  deleteNoticiaInterna,
} from "@/services/noticiaInternaService";

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
  const [newsStats, setNewsStats] = useState<NewsStatsResponse>({});
  const [loadingHealthcheck, setLoadingHealthcheck] = useState<
    Record<string, boolean>
  >({});
  const [loadingAllHealthcheck, setLoadingAllHealthcheck] = useState(false);
  const [orientationMode, setOrientationMode] =
    useState<OrientationMode>("auto");
  const [isDeveloper, setIsDeveloper] = useState(false);

  // Screen modules state
  const [screenModules, setScreenModules] = useState<ScreenModules>(DEFAULT_MODULES);

  // Internal news state
  const [noticiasInternas, setNoticiasInternas] = useState<NoticiaInterna[]>([]);
  const [niEditingId, setNiEditingId] = useState<number | null>(null);
  const [niIsAdding, setNiIsAdding] = useState(false);
  const [niTitulo, setNiTitulo] = useState("");
  const [niSubtitulo, setNiSubtitulo] = useState("");
  const [niArquivo, setNiArquivo] = useState<File | null>(null);
  const [niPreviewUrl, setNiPreviewUrl] = useState<string | null>(null);
  const [niInicioEm, setNiInicioEm] = useState("");
  const [niFimEm, setNiFimEm] = useState("");
  const [niAtivo, setNiAtivo] = useState(true);
  const [niSaving, setNiSaving] = useState(false);

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
      loadStats();
      loadNoticiasInternas();
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
    if (!token) {
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
      }
    };

    loadOrientation();
  }, [slug, token]);

  useEffect(() => {
    if (!token) return;
    const loadModules = async () => {
      try {
        const data = await predioAdminService.getScreenModules(slug ?? "gramado", token);
        setScreenModules(data);
      } catch (err) {
        console.error("Erro ao carregar módulos:", err);
      }
    };
    loadModules();
  }, [slug, token]);

  const handleToggleModule = async (key: keyof ScreenModules) => {
    const updated = { ...screenModules, [key]: !screenModules[key] };
    setScreenModules(updated);
    try {
      await predioAdminService.updateScreenModules(slug ?? "gramado", token, updated);
      const labels: Record<keyof ScreenModules, string> = {
        buildingNotice: "Aviso do prédio",
        weather: "Previsão do tempo",
        headlineNews: "Notícia do dia",
        newsTicker: "Ticker de notícias",
      };
      toast.success(`${labels[key]} ${updated[key] ? "ativado" : "desativado"}`);
    } catch (err) {
      console.error("Erro ao atualizar módulos:", err);
      toast.error("Erro ao salvar configuração de módulos");
      setScreenModules(screenModules); // rollback
    }
  };

  const handleResetModules = async () => {
    setScreenModules(DEFAULT_MODULES);
    try {
      await predioAdminService.updateScreenModules(slug ?? "gramado", token, DEFAULT_MODULES);
      toast.success("Layout restaurado ao padrão");
    } catch (err) {
      console.error("Erro ao restaurar módulos:", err);
      toast.error("Erro ao restaurar layout padrão");
    }
  };

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

  const loadStats = async () => {
    if (!token) return;

    try {
      const stats = await getNewsStats(token);
      setNewsStats(stats);
    } catch (err) {
      console.error("Erro ao carregar stats de noticias:", err);
    }
  };

  const loadNoticiasInternas = async () => {
    if (!token) return;
    try {
      const list = await getNoticiasInternasAdmin(slug ?? "gramado", token);
      setNoticiasInternas(list);
    } catch (err) {
      console.error("Erro ao carregar noticias internas:", err);
      toast.error("Erro ao carregar notícias do condomínio");
    }
  };

  const niResetForm = () => {
    setNiTitulo("");
    setNiSubtitulo("");
    setNiArquivo(null);
    setNiPreviewUrl(null);
    setNiInicioEm("");
    setNiFimEm("");
    setNiAtivo(true);
    setNiEditingId(null);
    setNiIsAdding(false);
  };

  const niHandleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setNiArquivo(file);
    if (niPreviewUrl) URL.revokeObjectURL(niPreviewUrl);
    setNiPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const niHandleStartAdd = () => {
    niResetForm();
    setNiIsAdding(true);
  };

  const niHandleStartEdit = (ni: NoticiaInterna) => {
    setNiTitulo(ni.titulo ?? "");
    setNiSubtitulo(ni.subtitulo ?? "");
    setNiArquivo(null);
    if (niPreviewUrl) URL.revokeObjectURL(niPreviewUrl);
    setNiPreviewUrl(null);
    setNiInicioEm(ni.inicioEm ? ni.inicioEm.slice(0, 16) : "");
    setNiFimEm(ni.fimEm ? ni.fimEm.slice(0, 16) : "");
    setNiAtivo(ni.ativo);
    setNiEditingId(ni.id);
    setNiIsAdding(false);
  };

  const niHandleSave = async () => {
    if (niIsAdding && !niArquivo) {
      toast.error("Selecione um arquivo (imagem ou vídeo)!");
      return;
    }

    setNiSaving(true);
    try {
      if (niIsAdding && niArquivo) {
        await createNoticiaInterna(slug ?? "gramado", token, {
          titulo: niTitulo.trim() || undefined,
          subtitulo: niSubtitulo.trim() || undefined,
          inicioEm: niInicioEm || undefined,
          fimEm: niFimEm || undefined,
          arquivo: niArquivo,
        });
        toast.success("Notícia do condomínio adicionada!");
      } else if (niEditingId !== null) {
        await updateNoticiaInterna(slug ?? "gramado", token, niEditingId, {
          titulo: niTitulo.trim() || undefined,
          subtitulo: niSubtitulo.trim() || undefined,
          inicioEm: niInicioEm || undefined,
          fimEm: niFimEm || undefined,
          ativo: niAtivo,
          arquivo: niArquivo ?? undefined,
        });
        toast.success("Notícia do condomínio atualizada!");
      }
      niResetForm();
      await loadNoticiasInternas();
    } catch (err) {
      console.error("Erro ao salvar noticia interna:", err);
      toast.error("Erro ao salvar notícia do condomínio");
    } finally {
      setNiSaving(false);
    }
  };

  const niHandleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta notícia?")) return;
    try {
      await deleteNoticiaInterna(slug ?? "gramado", token, id);
      toast.success("Notícia excluída!");
      await loadNoticiasInternas();
      if (niEditingId === id) niResetForm();
    } catch (err) {
      console.error("Erro ao excluir noticia interna:", err);
      toast.error("Erro ao excluir notícia");
    }
  };

  const handleForceLoad = async (fonteChave?: string) => {
    if (!token) return;

    if (fonteChave) {
      setLoadingHealthcheck((prev) => ({ ...prev, [fonteChave]: true }));
    } else {
      setLoadingAllHealthcheck(true);
    }

    try {
      const result = await forceLoadNews(token, fonteChave);

      // Recarregar stats após healthcheck
      await loadStats();

      const total = result.total;

      if (total === 0) {
        toast.info("Nenhuma notícia nova encontrada");
      } else if (fonteChave) {
        const count = result.fontesCarregadas[fonteChave] || 0;
        const fonte = newsSources.find((s) => s.chave === fonteChave);
        toast.success(
          `${count} notícia${count !== 1 ? "s" : ""} nova${count !== 1 ? "s" : ""} carregada${count !== 1 ? "s" : ""} de ${fonte?.nome || fonteChave}`,
        );
      } else {
        const detalhes = Object.entries(result.fontesCarregadas)
          .filter(([_, count]) => count > 0)
          .map(([fonte, count]) => `${fonte}: ${count}`)
          .join(", ");

        toast.success(
          `${total} notícia${total !== 1 ? "s" : ""} nova${total !== 1 ? "s" : ""} carregada${total !== 1 ? "s" : ""}${detalhes ? ` (${detalhes})` : ""}`,
        );
      }
    } catch (err) {
      console.error("Erro ao forçar carregamento:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Erro ao forçar carregamento: ${errorMessage}`);
    } finally {
      if (fonteChave) {
        setLoadingHealthcheck((prev) => ({ ...prev, [fonteChave]: false }));
      } else {
        setLoadingAllHealthcheck(false);
      }
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 sm:p-6">
        <GlassCard className="w-full max-w-md">
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
        </GlassCard>
      </div>
    );
  }

  // Painel admin
  return (
    <div className="min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 sm:p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/${slug ?? "gramado"}`)}
            className="text-white/60 hover:text-white h-8 w-8 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-display font-bold text-white truncate">
              Painel do Síndico
            </h1>
            <p className="text-white/50 text-xs hidden sm:block">
              Gerencie os recados do elevador
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="bg-transparent border-white/20 text-white hover:bg-white/10 flex-shrink-0"
        >
          <LogOut className="w-3 h-3 mr-1" />
          Sair
        </Button>
      </header>

      <GlassCard spacing="sm">
          <CardHeader className="flex-row items-center justify-between py-2 sm:py-3 px-3 sm:px-4 gap-2">
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              Modo de exibicao da tela
            </CardTitle>
            <span className="text-white/40 text-xs flex-shrink-0">
              {orientationMode === "auto"
                ? "Automatico"
                : orientationMode === "portrait"
                  ? "Retrato"
                  : "Paisagem"}
            </span>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
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
        </GlassCard>

      {/* Módulos da Tela */}
      <GlassCard spacing="sm">
        <CardHeader className="flex-row items-center justify-between py-2 sm:py-3 px-3 sm:px-4 gap-2">
          <CardTitle className="text-white flex items-center gap-2 text-sm">
            <MonitorSmartphone className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Módulos da Tela</span>
          </CardTitle>
          <Button
            onClick={handleResetModules}
            size="sm"
            variant="outline"
            className="h-7 text-xs bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Restaurar padrão
          </Button>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
          <p className="text-white/50 text-xs mb-3 hidden sm:block">
            Ative ou desative os módulos exibidos na tela do elevador. Os elementos fixos estão sempre visíveis.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 mb-4">
            <ModuleToggleCard
              icon={MessageSquare}
              title="Aviso do prédio"
              description="Comunicados do condomínio"
              enabled={screenModules.buildingNotice}
              onToggle={() => handleToggleModule("buildingNotice")}
            />
            <ModuleToggleCard
              icon={Cloud}
              title="Previsão do tempo"
              description="Clima atual e previsão resumida"
              enabled={screenModules.weather}
              onToggle={() => handleToggleModule("weather")}
            />
            <ModuleToggleCard
              icon={Newspaper}
              title="Notícia do dia"
              description="Destaque principal com imagem e título"
              enabled={screenModules.headlineNews}
              onToggle={() => handleToggleModule("headlineNews")}
            />
            <ModuleToggleCard
              icon={Rss}
              title="Ticker de notícias"
              description="Faixa com notícias em rolagem no rodapé"
              enabled={screenModules.newsTicker}
              onToggle={() => handleToggleModule("newsTicker")}
            />

            {/* Card fixo: Identidade e Conexão */}
            <div className="flex flex-col p-3 rounded-lg border border-blue-500/30 bg-blue-500/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Lock className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-white">Identidade e Conexão</p>
                    <p className="text-white/30 text-[10px]">Nome do prédio e status da conexão</p>
                  </div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full w-fit bg-blue-500/20 text-blue-300">
                Sempre visível
              </span>
            </div>
          </div>

          {/* Pré-visualização da tela */}
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Pré-visualização da tela
            </h3>
            <div className="flex justify-center">
              <div
                className="relative rounded-lg border border-white/20 bg-slate-950 overflow-hidden"
                style={{ width: "270px", height: "480px" }}
              >
                {/* Header fixo */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-[8px] text-white/70 font-medium">Edifício Exemplo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] text-white/50">12:00</span>
                    {screenModules.weather && (
                      <span className="text-[8px] text-yellow-300">☀️ 24°</span>
                    )}
                  </div>
                </div>

                {/* Corpo */}
                <div className={`flex-1 ${screenModules.buildingNotice && screenModules.headlineNews ? "grid grid-cols-[38%_1fr]" : ""} gap-1 p-1.5`}
                  style={{ height: `calc(100% - ${32 + (screenModules.newsTicker ? 24 : 0)}px)` }}>
                  {/* Avisos */}
                  {screenModules.buildingNotice && (
                    <div className="rounded bg-purple-900/60 border border-white/10 p-1.5 flex flex-col gap-1 overflow-hidden">
                      <span className="text-[7px] text-white/60 font-semibold">AVISOS</span>
                      <div className="rounded bg-white/5 p-1 flex-1">
                        <div className="w-full h-1.5 bg-white/20 rounded mb-1" />
                        <div className="w-3/4 h-1 bg-white/10 rounded mb-0.5" />
                        <div className="w-full h-1 bg-white/10 rounded mb-0.5" />
                        <div className="w-2/3 h-1 bg-white/10 rounded" />
                      </div>
                    </div>
                  )}

                  {/* Notícias */}
                  {screenModules.headlineNews && (
                    <div className="rounded bg-black/40 border border-white/10 p-1.5 flex flex-col gap-1 overflow-hidden">
                      <span className="text-[7px] text-white/60 font-semibold">NOTÍCIAS</span>
                      <div className="rounded bg-gradient-to-b from-white/10 to-transparent flex-1 flex items-center justify-center">
                        <Newspaper className="w-5 h-5 text-white/20" />
                      </div>
                      <div className="w-full h-1.5 bg-white/15 rounded" />
                      <div className="w-2/3 h-1 bg-white/10 rounded" />
                    </div>
                  )}

                  {/* Quando nenhum módulo variável está ativo */}
                  {!screenModules.buildingNotice && !screenModules.headlineNews && (
                    <div className="flex items-center justify-center h-full text-white/20">
                      <div className="text-center">
                        <MonitorSmartphone className="w-6 h-6 mx-auto mb-1 opacity-50" />
                        <p className="text-[8px]">Sem módulos ativos</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ticker rodapé */}
                {screenModules.newsTicker && (
                  <div className="absolute bottom-0 left-0 right-0 h-6 bg-slate-900 border-t border-white/10 flex items-center px-2 overflow-hidden">
                    <span className="text-[7px] text-yellow-400 font-medium mr-2 flex-shrink-0">LAST NEWS</span>
                    <div className="flex gap-3 animate-pulse">
                      <span className="text-[7px] text-white/50">Notícia em destaque passa aqui...</span>
                    </div>
                  </div>
                )}

                {/* Status de conexão fixo */}
                <div className="absolute top-2 right-2">
                  <div className="flex items-center gap-1 bg-black/60 rounded-full px-1.5 py-0.5">
                    <div className="w-1 h-1 rounded-full bg-green-400" />
                    <span className="text-[6px] text-green-300">Online</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </GlassCard>

      {/* Fontes de Notícias */}
      <GlassCard spacing="sm">
        <CardHeader className="flex-row flex-wrap items-center justify-between py-2 sm:py-3 px-3 sm:px-4 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <Newspaper className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Fontes de Notícias</span>
            </CardTitle>
            <span className="text-white/40 text-xs flex-shrink-0">
              {newsSources.filter((s) => s.habilitado).length}/{newsSources.length}
            </span>
          </div>
          {isDeveloper && (
            <Button
              onClick={() => handleForceLoad()}
              size="sm"
              variant="outline"
              disabled={loadingAllHealthcheck}
              className="h-7 text-xs bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw
                className={`w-3 h-3 mr-1 ${loadingAllHealthcheck ? "animate-spin" : ""}`}
              />
              Atualizar Todas
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
          <p className="text-white/50 text-xs mb-3 hidden sm:block">
            Selecione as fontes de notícias que serão exibidas no elevador. As
            notícias alternarão entre as fontes ativas.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            {newsSources.map((source) => (
              <div
                key={source.id}
                className={`flex flex-col p-3 rounded-lg border transition-all ${
                  source.habilitado
                    ? "border-green-500/30 bg-green-500/10"
                    : "border-white/10 bg-white/5 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
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
                    <div className="min-w-0 flex-1">
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

                <div className="flex items-center justify-between gap-2 mt-1 pt-2 border-t border-white/10">
                  <span className="text-white/40 text-[10px]">
                    {newsStats[source.chave] !== undefined
                      ? `${newsStats[source.chave]} notícia${newsStats[source.chave] !== 1 ? "s" : ""}`
                      : "Carregando..."}
                  </span>
                  {isDeveloper && (
                    <Button
                      onClick={() => handleForceLoad(source.chave)}
                      size="sm"
                      variant="ghost"
                      disabled={loadingHealthcheck[source.chave]}
                      className="h-6 px-2 text-[10px] text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <RefreshCw
                        className={`w-3 h-3 mr-1 ${loadingHealthcheck[source.chave] ? "animate-spin" : ""}`}
                      />
                      Forçar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </GlassCard>

      {/* Notícias do Condomínio */}
      <GlassCard spacing="sm">
        <CardHeader className="flex-row items-center justify-between py-2 sm:py-3 px-3 sm:px-4 gap-2">
          <CardTitle className="text-white flex items-center gap-2 text-sm">
            <Image className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Notícias do Condomínio ({noticiasInternas.length})</span>
          </CardTitle>
          <Button onClick={niHandleStartAdd} size="sm" className="h-7 text-xs flex-shrink-0">
            <Plus className="w-3 h-3 mr-1" />
            Nova
          </Button>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
          <p className="text-white/50 text-xs mb-3 hidden sm:block">
            Cadastre notícias com imagem ou vídeo que serão intercaladas com as notícias externas no carrossel.
          </p>

          {/* Form to add/edit internal news */}
          {(niIsAdding || niEditingId !== null) && (
            <div className="border border-white/20 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 bg-white/5">
              <h3 className="text-white text-sm font-semibold mb-3">
                {niIsAdding ? "Nova Notícia" : "Editar Notícia"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-3">
                  <FormField
                    id="ni-titulo"
                    label="Título"
                    dark
                    value={niTitulo}
                    onValueChange={setNiTitulo}
                    placeholder="Título da notícia"
                  />
                  <FormField
                    id="ni-subtitulo"
                    label="Subtítulo"
                    dark
                    value={niSubtitulo}
                    onValueChange={setNiSubtitulo}
                    placeholder="Subtítulo (opcional)"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="ni-arquivo" className="text-white text-xs">
                      {niIsAdding ? "Arquivo (imagem ou vídeo) *" : "Substituir arquivo (opcional)"}
                    </Label>
                    <Input
                      id="ni-arquivo"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                      onChange={niHandleFileChange}
                      className="bg-white/10 border-white/20 text-white h-8 text-sm file:bg-white/10 file:text-white file:border-0 file:mr-2 file:px-2 file:rounded"
                    />
                    <p className="text-white/30 text-[10px]">Máx 25 MB. Formatos: JPEG, PNG, GIF, WebP, MP4, WebM</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      id="ni-inicio"
                      label="Início em"
                      dark
                      type="datetime-local"
                      value={niInicioEm}
                      onValueChange={setNiInicioEm}
                      className="text-xs"
                    />
                    <FormField
                      id="ni-fim"
                      label="Fim em"
                      dark
                      type="datetime-local"
                      value={niFimEm}
                      onValueChange={setNiFimEm}
                      className="text-xs"
                    />
                  </div>
                  {niEditingId !== null && (
                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={niAtivo}
                          onChange={(e) => setNiAtivo(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                      <Label className="text-white flex items-center gap-1 text-xs">
                        {niAtivo ? (
                          <><Eye className="w-3 h-3 text-green-400" /> Ativo</>
                        ) : (
                          <><EyeOff className="w-3 h-3 text-white/50" /> Inativo</>
                        )}
                      </Label>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button onClick={niHandleSave} disabled={niSaving} className="flex-1 h-8 text-sm">
                      <Save className="w-3 h-3 mr-1" />
                      {niSaving ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={niResetForm}
                      className="bg-transparent border-white/20 text-white hover:bg-white/10 h-8 text-sm"
                    >
                      <X className="w-3 h-3 mr-1" /> Cancelar
                    </Button>
                  </div>
                </div>
                {/* Preview */}
                <div className="flex items-center justify-center">
                  {niPreviewUrl ? (
                    niArquivo?.type.startsWith("video/") ? (
                      <video
                        src={niPreviewUrl}
                        controls
                        className="max-h-[240px] rounded-lg w-full object-contain bg-black"
                      />
                    ) : (
                      <img
                        src={niPreviewUrl}
                        alt="Preview"
                        className="max-h-[240px] rounded-lg object-contain"
                      />
                    )
                  ) : niEditingId !== null ? (
                    (() => {
                      const editing = noticiasInternas.find(n => n.id === niEditingId);
                      if (!editing) return null;
                      return editing.tipoMidia === "video" ? (
                        <video
                          src={editing.mediaUrl}
                          controls
                          className="max-h-[240px] rounded-lg w-full object-contain bg-black"
                        />
                      ) : (
                        <img
                          src={editing.mediaUrl}
                          alt="Atual"
                          className="max-h-[240px] rounded-lg object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      );
                    })()
                  ) : (
                    <div className="text-white/30 text-center p-8">
                      <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Selecione um arquivo para preview</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* List of internal news */}
          {noticiasInternas.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {noticiasInternas.map((ni) => (
                <div
                  key={ni.id}
                  className={`rounded-lg border overflow-hidden transition-all ${
                    niEditingId === ni.id
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
                          onClick={() => niHandleStartEdit(ni)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-400 hover:text-red-300"
                          onClick={() => niHandleDelete(ni.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !niIsAdding && (
              <div className="text-center py-8 text-white/40">
                <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma notícia do condomínio</p>
                <p className="text-xs">Clique em "Nova" para adicionar</p>
              </div>
            )
          )}
        </CardContent>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Lista de mensagens */}
        <GlassCard>
          <CardHeader className="flex-row items-center justify-between py-2 sm:py-3 px-3 sm:px-4 gap-2">
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4" />
              Recados ({messages.length})
            </CardTitle>
            <Button onClick={handleStartAdd} size="sm" className="h-7 text-xs flex-shrink-0">
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
        </GlassCard>

        {/* Formulário de edição */}
        <GlassCard>
          <CardHeader className="py-2 sm:py-3 px-3 sm:px-4">
            <CardTitle className="text-white text-sm">
              {isAdding
                ? "Novo Recado"
                : editingId
                  ? "Editar Recado"
                  : "Selecione um Recado"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            {isAdding || editingId ? (
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
        </GlassCard>

        {/* Pré-visualização */}
        <GlassCard>
          <CardHeader className="py-2 sm:py-3 px-3 sm:px-4">
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4" />
              Pré-visualização
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            {(isAdding || editingId) && (formTitle || formContent) ? (
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
          </CardContent>
        </GlassCard>
      </div>
    </div>
  );
}
