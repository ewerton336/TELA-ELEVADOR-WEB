import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { Dashboard } from "@/pages/Dashboard";
import { Admin } from "@/pages/Admin";
import Master from "@/pages/Master";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const perfParam = params.get("perf");

    if (perfParam === "1") {
      localStorage.setItem("perf", "1");
    }

    if (perfParam === "0") {
      localStorage.removeItem("perf");
    }

    const enablePerf =
      perfParam === "1" ||
      params.get("kiosk") === "1" ||
      localStorage.getItem("perf") === "1";

    document.documentElement.classList.toggle("perf-mode", enablePerf);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/gramado" replace />} />
          <Route path="/:slug" element={<Dashboard />} />
          <Route path="/:slug/admin" element={<Admin />} />
          <Route path="/master" element={<Master />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
