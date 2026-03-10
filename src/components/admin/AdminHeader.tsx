import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import { toast } from "sonner";

interface AdminHeaderProps {
  slug: string;
  onLogout: () => void;
}

export function AdminHeader({ slug, onLogout }: AdminHeaderProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    toast.info("Logout realizado");
  };

  return (
    <header className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/${slug}`)}
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
  );
}
