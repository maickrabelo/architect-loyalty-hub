import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const TrocaSenhaObrigatoria = () => {
  const { user } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setAberto(false);
      return;
    }
    let cancelado = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("senha_alterada")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelado && data && (data as any).senha_alterada === false) {
        setAberto(true);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [user?.id]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 8) {
      toast.error("A nova senha precisa ter pelo menos 8 caracteres");
      return;
    }
    if (senha !== confirmacao) {
      toast.error("As senhas não conferem");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      toast.error("Não foi possível alterar a senha: " + error.message);
      setSalvando(false);
      return;
    }
    await supabase
      .from("profiles")
      .update({ senha_alterada: true } as any)
      .eq("id", user!.id);
    toast.success("Senha alterada com sucesso!");
    setSalvando(false);
    setAberto(false);
  };

  return (
    <Dialog open={aberto}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Crie sua nova senha</DialogTitle>
          <DialogDescription>
            Por segurança, no primeiro acesso você precisa substituir a senha inicial.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nova-senha">Nova senha</Label>
            <Input
              id="nova-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo de 8 caracteres"
              disabled={salvando}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirma-senha">Confirme a nova senha</Label>
            <Input
              id="confirma-senha"
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              disabled={salvando}
            />
          </div>
          <Button type="submit" className="w-full" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
