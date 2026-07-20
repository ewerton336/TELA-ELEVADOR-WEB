import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ADMIN_UNAUTHORIZED_EVENT } from "@/services/apiClient";
import {
  AdminLoginForm,
  AdminHeader,
  OrientationModeCard,
  ScreenModulesCard,
  NewsSourcesCard,
  NoticiaInternaCard,
  MessagesSection,
  TickerSection,
} from "@/components/admin";
import { useScrollablePage } from "@/hooks/useScrollablePage";

function getRoleFromToken(token: string | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload + "===".slice((payload.length + 3) % 4);

  try {
    const json = atob(padded);
    const data = JSON.parse(json) as Record<string, unknown>;

    const role =
      data.role ||
      data["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
    return typeof role === "string" ? role : null;
  } catch {
    return null;
  }
}

export function Admin() {
  useScrollablePage();
  const navigate = useNavigate();
  const { slug } = useParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isDeveloper, setIsDeveloper] = useState(false);

  const resolvedSlug = slug ?? "gramado";

  useEffect(() => {
    if (!slug) {
      navigate("/gramado", { replace: true });
    }
  }, [slug, navigate]);

  useEffect(() => {
    const role = getRoleFromToken(token);
    setIsDeveloper(role?.toLowerCase() === "developer");
  }, [token]);

  // Sessão expirada (401): volta ao login em vez de estourar erro em tudo
  const authedRef = useRef(isAuthenticated);
  authedRef.current = isAuthenticated;
  useEffect(() => {
    const handleUnauthorized = () => {
      if (!authedRef.current) return;
      authedRef.current = false;
      setIsAuthenticated(false);
      setToken(null);
      setIsDeveloper(false);
      toast.error("Sessão expirada. Faça login novamente.");
    };
    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () =>
      window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const handleLogin = (newToken: string) => {
    setToken(newToken);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken(null);
    setIsDeveloper(false);
  };

  if (!isAuthenticated) {
    return <AdminLoginForm slug={resolvedSlug} onLogin={handleLogin} />;
  }

  return (
    <div
      className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 pb-24 sm:p-4"
      style={{ minHeight: "100dvh" }}
    >
      <AdminHeader slug={resolvedSlug} onLogout={handleLogout} />
      <OrientationModeCard slug={resolvedSlug} token={token} />
      <ScreenModulesCard slug={resolvedSlug} token={token} />
      <NewsSourcesCard slug={resolvedSlug} token={token} isDeveloper={isDeveloper} />
      <NoticiaInternaCard slug={resolvedSlug} token={token} />
      <MessagesSection slug={resolvedSlug} token={token} />
      <TickerSection slug={resolvedSlug} token={token} />
    </div>
  );
}
