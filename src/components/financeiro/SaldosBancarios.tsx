import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Landmark, Pencil, Check, X } from "lucide-react";
import { formatBRL } from "@/hooks/useFinanceiro";
import { toast } from "sonner";

const parse = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;
const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SaldosBancarios = ({ podeEditar = true }: { podeEditar?: boolean }) => {
  const qc = useQueryClient();
  const { data: contas = [] } = useQuery({
    queryKey: ["contas-bancarias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contas_bancarias").select("*").order("conta");
      if (error) throw error;
      return data;
    },
  });
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState({ conta: "", aplicado: "" });

  const salvar = async (id: string) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("contas_bancarias").update({
      saldo_conta: parse(form.conta), saldo_aplicado: parse(form.aplicado),
      atualizado_em: new Date().toISOString(), atualizado_por: u.user?.id,
    }).eq("id", id);
    if (error) return toast.error("Não foi possível salvar");
    toast.success("Saldo atualizado");
    setEditando(null);
    qc.invalidateQueries({ queryKey: ["contas-bancarias"] });
  };

  const total = contas.reduce((s, c) => s + Number(c.saldo_conta) + Number(c.saldo_aplicado), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="font-serif text-lg flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /> Saldo Banco do Brasil</CardTitle>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total geral</p>
          <p className="text-xl font-bold text-primary">{formatBRL(total)}</p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {contas.map((c) => {
          const ed = editando === c.id;
          return (
            <div key={c.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">Conta {c.conta}</p>
                {podeEditar && !ed && (
                  <Button size="sm" variant="ghost" onClick={() => { setEditando(c.id); setForm({ conta: fmt(Number(c.saldo_conta)), aplicado: fmt(Number(c.saldo_aplicado)) }); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {ed && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => salvar(c.id)}><Check className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditando(null)}><X className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-sm items-center gap-2">
                <span className="text-muted-foreground">Valor em conta</span>
                {ed ? <Input className="w-36 h-8 text-right" value={form.conta} onChange={(e) => setForm({ ...form, conta: e.target.value })} /> : <span>{formatBRL(Number(c.saldo_conta))}</span>}
              </div>
              <div className="flex justify-between text-sm items-center gap-2">
                <span className="text-muted-foreground">Valor aplicado</span>
                {ed ? <Input className="w-36 h-8 text-right" value={form.aplicado} onChange={(e) => setForm({ ...form, aplicado: e.target.value })} /> : <span>{formatBRL(Number(c.saldo_aplicado))}</span>}
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total</span><span>{formatBRL(Number(c.saldo_conta) + Number(c.saldo_aplicado))}</span>
              </div>
              <p className="text-xs text-muted-foreground">Atualizado em {new Date(c.atualizado_em).toLocaleString("pt-BR")}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default SaldosBancarios;
