import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import About from "./pages/About";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import ArquitetoDashboard from "./pages/dashboard/ArquitetoDashboard";
import PontuacaoDetalhada from "./pages/dashboard/PontuacaoDetalhada";
import EmpresaDashboard from "./pages/dashboard/EmpresaDashboard";
import GestorDashboard from "./pages/dashboard/GestorDashboard";
import FinanceiroDashboard from "./pages/dashboard/FinanceiroDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const PushRouteBridge = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handlePushRoute = (event: Event) => {
      const route = (event as CustomEvent<{ route?: unknown }>).detail?.route;
      if (typeof route === "string" && route.startsWith("/")) {
        navigate(route);
      }
    };

    window.addEventListener("grupo-conexao:push-route", handlePushRoute);
    return () => window.removeEventListener("grupo-conexao:push-route", handlePushRoute);
  }, [navigate]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PushRouteBridge />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sobre" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/dashboard/arquiteto" element={<ArquitetoDashboard />} />
            <Route path="/dashboard/arquiteto/pontuacao" element={<PontuacaoDetalhada />} />
            <Route path="/dashboard/empresa" element={<EmpresaDashboard />} />
            <Route path="/dashboard/gestor" element={<GestorDashboard />} />
            <Route path="/dashboard/financeiro" element={<FinanceiroDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
