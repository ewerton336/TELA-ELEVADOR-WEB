import { useState, useEffect } from "react";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import * as masterService from "@/services/masterService";
import { messageService } from "@/services/messageService";
import { CidadeSelector } from "@/components/CidadeSelector";

export default function Master() {
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Predios state
  const [predios, setPredios] = useState<masterService.Predio[]>([]);
  const [predioLoading, setPredioLoading] = useState(false);
  const [showPredioDialog, setShowPredioDialog] = useState(false);
  const [predioToDelete, setPredioToDelete] = useState<number | null>(null);
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
  const [sindicoToDelete, setSindicoToDelete] = useState<number | null>(null);
  const [selectedPredioForSindicos, setSelectedPredioForSindicos] = useState<
    number | null
  >(null);
  const [sindicoForm, setSindicoForm] = useState({
    usuario: "",
    senha: "",
  });
  const [editingSindicoId, setEditingSindicoId] = useState<number | null>(null);

  // Check for stored token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("developerToken");
    if (storedToken) {
      setToken(storedToken);
    }
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

  const handleSavePredio = async () => {
    if (!predioForm.slug || !predioForm.nome || !predioForm.cidade) {
      toast.error("Preencha todos os campos");
      return;
    }

    setPredioLoading(true);
    try {
      if (editingPredioId) {
        await masterService.updatePredio(token, editingPredioId, predioForm);
        toast.success("Prédio atualizado com sucesso");
      } else {
        await masterService.createPredio(token, predioForm);
        toast.success("Prédio criado com sucesso");
      }
      setPredioForm({ slug: "", nome: "", cidade: "" });
      setEditingPredioId(null);
      setShowPredioDialog(false);
      await loadPredios();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar prédio",
      );
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

  const handleDeletePredio = async () => {
    if (!predioToDelete) return;

    setPredioLoading(true);
    try {
      await masterService.deletePredio(token, predioToDelete);
      toast.success("Prédio deletado com sucesso");
      setPredioToDelete(null);
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

  const handleSaveSindico = async () => {
    if (!selectedPredioForSindicos) {
      toast.error("Selecione um prédio");
      return;
    }

    if (!sindicoForm.usuario || !sindicoForm.senha) {
      toast.error("Preencha todos os campos");
      return;
    }

    setSindicoLoading(true);
    try {
      if (editingSindicoId) {
        const updateData: { usuario?: string; senha?: string } = {};
        if (
          sindicoForm.usuario !==
          sindicos.find((s) => s.id === editingSindicoId)?.usuario
        ) {
          updateData.usuario = sindicoForm.usuario;
        }
        if (sindicoForm.senha) {
          updateData.senha = sindicoForm.senha;
        }
        await masterService.updateSindico(token, editingSindicoId, updateData);
        toast.success("Sindico atualizado com sucesso");
      } else {
        await masterService.createSindico(token, {
          predioId: selectedPredioForSindicos,
          usuario: sindicoForm.usuario,
          senha: sindicoForm.senha,
        });
        toast.success("Sindico criado com sucesso");
      }
      setSindicoForm({ usuario: "", senha: "" });
      setEditingSindicoId(null);
      setShowSindicoDialog(false);
      await loadSindicos(selectedPredioForSindicos);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar sindico",
      );
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

  const handleDeleteSindico = async () => {
    if (!sindicoToDelete || !selectedPredioForSindicos) return;

    setSindicoLoading(true);
    try {
      await masterService.deleteSindico(token, sindicoToDelete);
      toast.success("Sindico deletado com sucesso");
      setSindicoToDelete(null);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso de Desenvolvedor</CardTitle>
            <CardDescription>
              Faça Login com suas credenciais de desenvolvedor
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="123123"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Conectando..." : "Conectar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Painel Master</h1>
          <Button variant="outline" onClick={handleLogout}>
            Desconectar
          </Button>
        </div>

        <Tabs defaultValue="predios" className="w-full">
          <TabsList>
            <TabsTrigger value="predios">Prédios</TabsTrigger>
            <TabsTrigger value="sindicos">Sindicos</TabsTrigger>
          </TabsList>

          <TabsContent value="predios">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
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
                >
                  + Novo Prédio
                </Button>
              </CardHeader>
              <CardContent>
                {predioLoading ? (
                  <p className="text-center text-slate-500">
                    Carregando prédios...
                  </p>
                ) : (
                  <div className="space-y-2">
                    {predios.length === 0 ? (
                      <p className="text-center text-slate-500">
                        Nenhum prédio cadastrado
                      </p>
                    ) : (
                      predios.map((predio) => (
                        <div
                          key={predio.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                        >
                          <div>
                            <p className="font-semibold">{predio.nome}</p>
                            <p className="text-sm text-slate-500">
                              {predio.slug} • {predio.cidade}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditPredio(predio)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => {
                                setPredioToDelete(predio.id);
                              }}
                            >
                              Deletar
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={showPredioDialog} onOpenChange={setShowPredioDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingPredioId ? "Editar" : "Novo"} Prédio
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={predioForm.slug}
                      onChange={(e) =>
                        setPredioForm({
                          ...predioForm,
                          slug: e.target.value,
                        })
                      }
                      placeholder="ex: gramado"
                      disabled={editingPredioId !== null}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      value={predioForm.nome}
                      onChange={(e) =>
                        setPredioForm({
                          ...predioForm,
                          nome: e.target.value,
                        })
                      }
                      placeholder="ex: Edificio Central"
                    />
                  </div>
                  <CidadeSelector
                    value={predioForm.cidade}
                    onChange={(value) =>
                      setPredioForm({
                        ...predioForm,
                        cidade: value,
                      })
                    }
                    required={true}
                    disabled={false}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowPredioDialog(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSavePredio}
                      disabled={predioLoading}
                    >
                      {predioLoading ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
                      value={
                        selectedPredioForSindicos?.toString() || "default"
                      }
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
                          <SelectItem key={predio.id} value={predio.id.toString()}>
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
                        >
                          + Novo Sindico
                        </Button>
                      </div>

                      {sindicoLoading ? (
                        <p className="text-center text-slate-500">
                          Carregando sindicos...
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {sindicos.length === 0 ? (
                            <p className="text-center text-slate-500">
                              Nenhum sindico cadastrado para este prédio
                            </p>
                          ) : (
                            sindicos.map((sindico) => (
                              <div
                                key={sindico.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                              >
                                <div>
                                  <p className="font-semibold">
                                    {sindico.usuario}
                                  </p>
                                  <p className="text-sm text-slate-500">
                                    {sindico.role}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditSindico(sindico)}
                                  >
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500 hover:text-red-700"
                                    onClick={() => {
                                      setSindicoToDelete(sindico.id);
                                    }}
                                  >
                                    Deletar
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Dialog
              open={showSindicoDialog}
              onOpenChange={setShowSindicoDialog}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingSindicoId ? "Editar" : "Novo"} Sindico
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="usuario">Usuário</Label>
                    <Input
                      id="usuario"
                      value={sindicoForm.usuario}
                      onChange={(e) =>
                        setSindicoForm({
                          ...sindicoForm,
                          usuario: e.target.value,
                        })
                      }
                      placeholder="ex: admin@edificio.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senha">
                      Senha
                      {editingSindicoId && (
                        <span className="text-sm text-slate-500 ml-2">
                          (deixe em branco para não alterar)
                        </span>
                      )}
                    </Label>
                    <Input
                      id="senha"
                      type="password"
                      value={sindicoForm.senha}
                      onChange={(e) =>
                        setSindicoForm({
                          ...sindicoForm,
                          senha: e.target.value,
                        })
                      }
                      placeholder="ex: senha123"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowSindicoDialog(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveSindico}
                      disabled={sindicoLoading}
                    >
                      {sindicoLoading ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={predioToDelete !== null} onOpenChange={(open) => {
        if (!open) setPredioToDelete(null);
      }}>
        <AlertDialogContent>
          <AlertDialogTitle>Confirmar Deleção</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja deletar este prédio? Esta ação não pode ser
            desfeita.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePredio}
              className="bg-red-500 hover:bg-red-600"
            >
              Deletar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={sindicoToDelete !== null} onOpenChange={(open) => {
        if (!open) setSindicoToDelete(null);
      }}>
        <AlertDialogContent>
          <AlertDialogTitle>Confirmar Deleção</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja deletar este sindico? Esta ação não pode ser
            desfeita.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSindico}
              className="bg-red-500 hover:bg-red-600"
            >
              Deletar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
