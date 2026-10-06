import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const RedefinirSenha = () => {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 6) return toast.error("A senha precisa ter ao menos 6 caracteres");
    if (senha !== confirma) return toast.error("As senhas não conferem");
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) return toast.error("Link expirado ou inválido. Peça um novo na tela de login.");
    toast.success("Senha alterada com sucesso!");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center min-h-screen pt-24 px-4 pb-12">
        <Card className="w-full max-w-md rounded-[1.25rem]">
          <CardHeader className="text-center"><CardTitle className="font-serif text-3xl">Criar nova senha</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={salvar} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="s">Nova senha</Label><Input id="s" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="c">Confirmar senha</Label><Input id="c" type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} /></div>
              <Button type="submit" variant="premium" className="w-full h-11" disabled={salvando}>{salvando ? "Salvando..." : "Salvar nova senha"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RedefinirSenha;
