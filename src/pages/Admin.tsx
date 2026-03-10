import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AdminLoginForm,
  AdminHeader,
  OrientationModeCard,
  ScreenModulesCard,
  NewsSourcesCard,
  NoticiaInternaCard,
  MessagesSection,
} from "@/components/admin";

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
    <div className="min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 sm:p-4">
      <AdminHeader slug={resolvedSlug} onLogout={handleLogout} />
      <OrientationModeCard slug={resolvedSlug} token={token} />
      <ScreenModulesCard slug={resolvedSlug} token={token} />
      <NewsSourcesCard slug={resolvedSlug} token={token} isDeveloper={isDeveloper} />
      <NoticiaInternaCard slug={resolvedSlug} token={token} />
      <MessagesSection slug={resolvedSlug} token={token} />
    </div>
  );
}
