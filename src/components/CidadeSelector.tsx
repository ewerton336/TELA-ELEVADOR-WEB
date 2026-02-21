import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listarCidades, type Cidade } from "@/services/cidadeService";

interface CidadeSelectorProps {
  value: string; // O valor será o nome de exibição (ex: "São Paulo, SP")
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
}

export function CidadeSelector({
  value,
  onChange,
  disabled = false,
  required = false,
  label = "Cidade",
}: CidadeSelectorProps) {
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCidades = async () => {
      try {
        setLoading(true);
        const data = await listarCidades();
        setCidades(data);
        setError(null);
      } catch (err) {
        console.error("Erro ao carregar cidades:", err);
        setError("Erro ao carregar lista de cidades");
      } finally {
        setLoading(false);
      }
    };

    loadCidades();
  }, []);

  if (error) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="text-sm text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Carregando cidades..." : "Selecione uma cidade"} />
        </SelectTrigger>
        <SelectContent>
          {cidades.map((cidade) => (
            <SelectItem key={cidade.id} value={cidade.nomeExibicao}>
              {cidade.nomeExibicao}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
