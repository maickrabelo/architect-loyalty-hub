import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/brand/SectionLabel";
import { Logo } from "@/components/brand/Logo";
import { WavePattern } from "@/components/brand/WavePattern";

const Login = () => {
  const navigate = useNavigate();
  const { signIn, user, userRole, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && userRole) {
      switch (userRole) {
        case "arquiteto": navigate("/dashboard/arquiteto"); break;
        case "empresa": navigate("/dashboard/empresa"); break;
        case "gestor": navigate("/dashboard/gestor"); break;
      }
    }
  }, [user, userRole, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error("Email ou senha incorretos");
      } else {
        toast.error("Erro ao fazer login: " + error.message);
      }
      setIsSubmitting(false);
      return;
    }
    toast.success("Login realizado com sucesso!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="flex items-center justify-center min-h-screen pt-24 px-4 pb-12">
        <Card className="w-full max-w-md bg-card border border-border rounded-[1.25rem] shadow-[var(--shadow-soft)] animate-fade-in overflow-hidden">
          <WavePattern className="h-6" opacity={0.4} />
          <CardHeader className="text-center pt-8">
            <div className="flex justify-center mb-6">
              <Logo size="lg" />
            </div>
            <SectionLabel className="mb-3">Acesso ao Programa</SectionLabel>
            <CardTitle className="text-display text-3xl">Bem-vindo de volta</CardTitle>
            <CardDescription className="text-base mt-2">
              Acesse sua conta para acompanhar suas conquistas
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleLogin} className="space-y-5 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="label-tag-muted">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background border-border h-11"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="label-tag-muted">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background border-border h-11"
                  disabled={isSubmitting}
                />
              </div>

              <Button
                type="submit"
                variant="premium"
                className="w-full h-11"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Entrando..." : "Entrar"}
              </Button>

              <div className="text-center mt-6">
                <p className="text-sm text-muted-foreground">
                  Não tem uma conta?{" "}
                  <a href="/cadastro" className="text-primary-deep hover:underline font-medium">
                    Cadastre-se
                  </a>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
