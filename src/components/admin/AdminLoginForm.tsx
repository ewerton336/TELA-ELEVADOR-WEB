import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ArrowLeft } from "lucide-react";
import { requestJson } from "@/services/apiClient";
import { toast } from "sonner";

interface AdminLoginFormProps {
  slug: string;
  onLogin: (token: string) => void;
}

export function AdminLoginForm({ slug, onLogin }: AdminLoginFormProps) {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("admin");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await requestJson<{ token: string }>(
        slug,
        "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario, senha: password }),
        },
        "login",
      );
      onLogin(data.token);
      toast.success("Login realizado com sucesso!");
    } catch (err) {
      console.error("Erro ao autenticar:", err);
      toast.error("Credenciais invalidas");
    }
  };

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
              onClick={() => navigate(`/${slug}`)}
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
