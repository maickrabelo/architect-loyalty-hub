import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SectionLabel } from "@/components/brand/SectionLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

const ExcluirConta = () => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [tipo, setTipo] = useState("exclusao_total");
  const [motivo, setMotivo] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        setEmail((atual) => atual || data.user!.email || "");
      }
    });
  }, []);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmado) {
      toast.error("É necessário confirmar que você entende os efeitos da exclusão.");
      return;
    }
    setEnviando(true);
    const { error } = await supabase.from("solicitacoes_exclusao").insert({
      user_id: userId,
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      cpf_cnpj: cpfCnpj.trim() || null,
      tipo,
      motivo: motivo.trim() || null,
    });
    setEnviando(false);

    if (error) {
      toast.error("Não foi possível registrar sua solicitação. Tente novamente.");
      return;
    }
    setEnviado(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 pt-32 pb-16">
        <div className="max-w-2xl mx-auto">
          <SectionLabel className="mb-4">Seus direitos · LGPD</SectionLabel>
          <h1 className="text-display text-4xl md:text-5xl text-foreground mb-4">
            Excluir conta e dados
          </h1>
          <p className="text-muted-foreground mb-10 leading-relaxed">
            Você pode pedir a exclusão da sua conta e dos seus dados pessoais a qualquer momento.
            Confirmamos o recebimento e concluímos o pedido em até 15 dias. Alguns registros podem
            ser mantidos por obrigação legal ou fiscal, de forma limitada, conforme descrito na{" "}
            <Link to="/privacidade" className="text-primary-deep underline">
              Política de Privacidade
            </Link>
            .
          </p>

          {enviado ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-primary-deep mx-auto mb-4" />
              <h2 className="text-display text-2xl text-foreground mb-2">Solicitação registrada</h2>
              <p className="text-muted-foreground">
                Recebemos seu pedido e entraremos em contato pelo e-mail informado em até 15 dias.
              </p>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-6 rounded-lg border border-border bg-card p-6 md:p-8">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail cadastrado</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF ou CNPJ (para confirmarmos sua identidade)</Label>
                <Input id="cpf" value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>O que você deseja</Label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 text-sm text-muted-foreground">
                    <input
                      type="radio"
                      name="tipo"
                      className="mt-1"
                      checked={tipo === "exclusao_total"}
                      onChange={() => setTipo("exclusao_total")}
                    />
                    <span>
                      <strong className="text-foreground">Excluir minha conta e meus dados</strong> —
                      encerramento definitivo da participação no programa, com perda dos pontos
                      acumulados.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 text-sm text-muted-foreground">
                    <input
                      type="radio"
                      name="tipo"
                      className="mt-1"
                      checked={tipo === "anonimizacao"}
                      onChange={() => setTipo("anonimizacao")}
                    />
                    <span>
                      <strong className="text-foreground">Anonimizar meus dados</strong> — manter
                      apenas registros sem identificação, exigidos por lei.
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo (opcional)</Label>
                <Textarea
                  id="motivo"
                  rows={4}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>

              <label className="flex items-start gap-3 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={confirmado}
                  onChange={(e) => setConfirmado(e.target.checked)}
                />
                <span>
                  Entendo que a exclusão é definitiva, que perderei o acesso à plataforma e os
                  pontos acumulados, e que alguns registros podem ser mantidos apenas pelo prazo
                  exigido por lei.
                </span>
              </label>

              <Button type="submit" size="lg" className="w-full" disabled={enviando}>
                {enviando ? "Enviando..." : "Enviar solicitação"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Prefere por e-mail? Escreva para privacidade@grupoconexao.com.br
              </p>
            </form>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ExcluirConta;
