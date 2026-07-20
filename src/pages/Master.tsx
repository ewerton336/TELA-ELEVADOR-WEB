import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ADMIN_UNAUTHORIZED_EVENT } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as masterService from "@/services/masterService";
import { messageService } from "@/services/messageService";
import { CidadeSelector } from "@/components/CidadeSelector";
import { ScreenMonitor } from "@/components/ScreenMonitor";
import { FormDialog } from "@/components/FormDialog";
import { CrudList } from "@/components/CrudList";

export default function Master() {
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Predios state
  const [predios, setPredios] = useState<masterService.Predio[]>([]);
  const [predioLoading, setPredioLoading] = useState(false);
  const [showPredioDialog, setShowPredioDialog] = useState(false);
  const [predioForm, setPredioForm] = useState({
    slug: "",
    nome: "",
    cidade: "",
  });
  const [editingPredioId, setEditingPredioId] = useState<number | null>(null);

  // Sindicos state
  const [sindicos, setSindicos] = useState<masterService.Sindico[]>([]);
  const [sindicoLoading, setSindicoLoading] = useState(false);
  const [showSindicoDialog, setShowSindicoDialog] = useState(false);
  const [selectedPredioForSindicos, setSelectedPredioForSindicos] = useState<
    number | null
  >(null);
  const [sindicoForm, setSindicoForm] = useState({
    usuario: "",
    senha: "",
  });
  const [editingSindicoId, setEditingSindicoId] = useState<number | null>(null);

  // Mantém o token atual acessível dentro de listeners sem recriá-los
  const tokenRef = useRef<string | null>(token);
  tokenRef.current = token;

  // Check for stored token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("developerToken");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  // Sessão expirada (401 em qualquer requisição admin): volta ao login
  useEffect(() => {
    const handleUnauthorized = () => {
      if (!tokenRef.current) return; // já deslogado
      tokenRef.current = null; // dedupe se vários 401 dispararem juntos
      localStorage.removeItem("developerToken");
      setToken(null);
      setPredios([]);
      setSindicos([]);
      toast.error("Sessão expirada. Faça login novamente.");
    };
    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () =>
      window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  // Load predios when token is set
  useEffect(() => {
    if (token) {
      loadPredios();
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log("Tentando login com:", { loginUsername, loginPassword });
      const response = await messageService.login(loginUsername, loginPassword);
      console.log("Login response:", response);
      const newToken = response.token;
      console.log("Token recebido:", newToken);
      setToken(newToken);
      localStorage.setItem("developerToken", newToken);
      setLoginUsername("");
      setLoginPassword("");
      toast.success("Login realizado com sucesso");
    } catch (error) {
      console.error("Erro no login:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao fazer login",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("developerToken");
    setPredios([]);
    setSindicos([]);
    toast.success("Desconectado");
  };

  const loadPredios = async () => {
    setPredioLoading(true);
    try {
      console.log("Carregando prédios com token:", token);
      const data = await masterService.getPredios(token);
      console.log("Prédios carregados:", data);
      setPredios(data);
    } catch (error) {
      console.error("Erro ao carregar prédios:", error);
      toast.error("Erro ao carregar predios");
    } finally {
      setPredioLoading(false);
    }
  };

  const handleEditPredio = (predio: masterService.Predio) => {
    setPredioForm({
      slug: predio.slug,
      nome: predio.nome,
      cidade: predio.cidade,
    });
    setEditingPredioId(predio.id);
    setShowPredioDialog(true);
  };

  const handleDeletePredio = async (predio: masterService.Predio) => {
    setPredioLoading(true);
    try {
      await masterService.deletePredio(token, predio.id);
      toast.success("Prédio deletado com sucesso");
      await loadPredios();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao deletar prédio",
      );
    } finally {
      setPredioLoading(false);
    }
  };

  const loadSindicos = async (predioId: number) => {
    setSindicoLoading(true);
    try {
      const data = await masterService.getSindicos(token, predioId);
      setSindicos(data);
      setSelectedPredioForSindicos(predioId);
    } catch (error) {
      toast.error("Erro ao carregar sindicos");
    } finally {
      setSindicoLoading(false);
    }
  };

  const handleEditSindico = (sindico: masterService.Sindico) => {
    setSindicoForm({
      usuario: sindico.usuario,
      senha: "",
    });
    setEditingSindicoId(sindico.id);
    setShowSindicoDialog(true);
  };

  const handleDeleteSindico = async (sindico: masterService.Sindico) => {
    if (!selectedPredioForSindicos) return;

    setSindicoLoading(true);
    try {
      await masterService.deleteSindico(token, sindico.id);
      toast.success("Sindico deletado com sucesso");
      await loadSindicos(selectedPredioForSindicos);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao deletar sindico",
      );
    } finally {
      setSindicoLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso de Desenvolvedor</CardTitle>
            <CardDescription>
              Faça login com suas credenciais de desenvolvedor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="ewerton"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Conectando..." : "Conectar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="overflow-y-auto overscroll-contain bg-slate-50 p-4 pb-24 sm:p-8"
      style={{ height: "100dvh" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Painel Master</h1>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="h-11 sm:h-10"
          >
            Desconectar
          </Button>
        </div>

        <Tabs defaultValue="predios" className="w-full">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:grid-cols-4 sm:inline-flex h-auto sm:h-10 p-1">
            <TabsTrigger value="predios" className="h-11 sm:h-8 text-sm">
              Prédios
            </TabsTrigger>
            <TabsTrigger value="sindicos" className="h-11 sm:h-8 text-sm">
              Síndicos
            </TabsTrigger>
            <TabsTrigger value="monitor" className="h-11 sm:h-8 text-sm">
              Monitor
            </TabsTrigger>
            <TabsTrigger value="preview" className="h-11 sm:h-8 text-sm">
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="predios">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>Gerenciar Prédios</CardTitle>
                  <CardDescription>
                    Crie, edite ou delete prédios
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setPredioForm({ slug: "", nome: "", cidade: "" });
                    setEditingPredioId(null);
                    setShowPredioDialog(true);
                  }}
                  className="h-11 sm:h-10 w-full sm:w-auto"
                >
                  + Novo Prédio
                </Button>
              </CardHeader>
              <CardContent>
                <CrudList
                  items={predios}
                  getKey={(p) => p.id}
                  loading={predioLoading}
                  emptyMessage="Nenhum prédio cadastrado"
                  deleteConfirmMessage="Tem certeza que deseja deletar este prédio? Esta ação não pode ser desfeita."
                  renderItem={(predio) => (
                    <div>
                      <p className="font-semibold">{predio.nome}</p>
                      <p className="text-sm text-slate-500">
                        {predio.slug} • {predio.cidade}
                      </p>
                    </div>
                  )}
                  onEdit={handleEditPredio}
                  onDelete={handleDeletePredio}
                />
              </CardContent>
            </Card>

            <FormDialog
              open={showPredioDialog}
              onOpenChange={setShowPredioDialog}
              title={editingPredioId ? "Editar Prédio" : "Novo Prédio"}
              initialValues={predioForm}
              loading={predioLoading}
              fields={[
                {
                  name: "slug",
                  label: "Slug",
                  placeholder: "ex: gramado",
                  required: true,
                  disabled: editingPredioId !== null,
                },
                {
                  name: "nome",
                  label: "Nome",
                  placeholder: "ex: Edificio Central",
                  required: true,
                },
                {
                  name: "cidade",
                  label: "Cidade",
                  render: (value, onChange) => (
                    <CidadeSelector
                      value={value}
                      onChange={onChange}
                      required={true}
                      disabled={false}
                    />
                  ),
                },
              ]}
              onSubmit={async (data) => {
                if (!data.slug || !data.nome || !data.cidade) {
                  toast.error("Preencha todos os campos");
                  return;
                }
                const payload = { slug: data.slug, nome: data.nome, cidade: data.cidade };
                if (editingPredioId) {
                  await masterService.updatePredio(token, editingPredioId, payload);
                  toast.success("Prédio atualizado com sucesso");
                } else {
                  await masterService.createPredio(token, payload);
                  toast.success("Prédio criado com sucesso");
                }
                setPredioForm({ slug: "", nome: "", cidade: "" });
                setEditingPredioId(null);
                setShowPredioDialog(false);
                await loadPredios();
              }}
            />
          </TabsContent>

          <TabsContent value="sindicos">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Sindicos</CardTitle>
                <CardDescription>
                  Crie, edite ou delete sindicos por prédio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Selecione um Prédio</Label>
                    <Select
                      value={selectedPredioForSindicos?.toString() || "default"}
                      onValueChange={(value) => {
                        if (value !== "default") {
                          loadSindicos(parseInt(value));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um prédio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">
                          Escolha um prédio
                        </SelectItem>
                        {predios.map((predio) => (
                          <SelectItem
                            key={predio.id}
                            value={predio.id.toString()}
                          >
                            {predio.nome} ({predio.slug})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedPredioForSindicos && (
                    <>
                      <div className="flex justify-end">
                        <Button
                          onClick={() => {
                            setSindicoForm({ usuario: "", senha: "" });
                            setEditingSindicoId(null);
                            setShowSindicoDialog(true);
                          }}
                          className="h-11 sm:h-10 w-full sm:w-auto"
                        >
                          + Novo Síndico
                        </Button>
                      </div>

                      <CrudList
                        items={sindicos}
                        getKey={(s) => s.id}
                        loading={sindicoLoading}
                        emptyMessage="Nenhum sindico cadastrado para este prédio"
                        deleteConfirmMessage="Tem certeza que deseja deletar este sindico? Esta ação não pode ser desfeita."
                        renderItem={(sindico) => (
                          <div>
                            <p className="font-semibold">
                              {sindico.usuario}
                            </p>
                            <p className="text-sm text-slate-500">
                              {sindico.role}
                            </p>
                          </div>
                        )}
                        onEdit={handleEditSindico}
                        onDelete={handleDeleteSindico}
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <FormDialog
              open={showSindicoDialog}
              onOpenChange={setShowSindicoDialog}
              title={editingSindicoId ? "Editar Sindico" : "Novo Sindico"}
              initialValues={sindicoForm}
              loading={sindicoLoading}
              fields={[
                {
                  name: "usuario",
                  label: "Usuário",
                  placeholder: "ex: admin@edificio.com",
                  required: true,
                },
                {
                  name: "senha",
                  label: "Senha",
                  type: "password",
                  placeholder: "ex: senha123",
                  required: !editingSindicoId,
                  hint: editingSindicoId ? "(deixe em branco para não alterar)" : undefined,
                },
              ]}
              onSubmit={async (data) => {
                if (!selectedPredioForSindicos) {
                  toast.error("Selecione um prédio");
                  return;
                }
                if (!data.usuario || (!editingSindicoId && !data.senha)) {
                  toast.error("Preencha todos os campos");
                  return;
                }
                if (editingSindicoId) {
                  const updateData: { usuario?: string; senha?: string } = {};
                  if (data.usuario !== sindicos.find((s) => s.id === editingSindicoId)?.usuario) {
                    updateData.usuario = data.usuario;
                  }
                  if (data.senha) {
                    updateData.senha = data.senha;
                  }
                  await masterService.updateSindico(token, editingSindicoId, updateData);
                  toast.success("Sindico atualizado com sucesso");
                } else {
                  await masterService.createSindico(token, {
                    predioId: selectedPredioForSindicos,
                    usuario: data.usuario,
                    senha: data.senha,
                  });
                  toast.success("Sindico criado com sucesso");
                }
                setSindicoForm({ usuario: "", senha: "" });
                setEditingSindicoId(null);
                setShowSindicoDialog(false);
                await loadSindicos(selectedPredioForSindicos);
              }}
            />
          </TabsContent>

          <TabsContent value="monitor">
            <ScreenMonitor token={token} />
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Pré-visualização das telas</CardTitle>
                <CardDescription>
                  Abre a tela do elevador na resolução de produção (960×540).
                  Dentro da página há os botões de escala (1×/1.5×/2×) para
                  imitar o painel físico 1920×1080.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <a
                  href="/preview/gramado"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 text-white px-4 h-10 text-sm font-medium hover:bg-blue-700"
                >
                  Abrir preview (gramado)
                </a>

                {predios.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Por prédio
                    </p>
                    {predios.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.nome}</p>
                          <p className="text-sm text-slate-500 truncate">
                            {p.slug}
                          </p>
                        </div>
                        <a
                          href={`/preview/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border bg-white px-3 h-9 text-sm font-medium hover:bg-slate-100 flex-shrink-0"
                        >
                          Abrir preview
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>


    </div>
  );
}
