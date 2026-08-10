import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Ban, Pencil } from "lucide-react";
import { useCobrancasExtras, useEmpresasFinanceiro, formatBRL, labelMes } from "@/hooks/useFinanceiro";

const mesesCobertos = (inicio: string, meses: number) => {
  const out: string[] = [];
  const [a, m] = inicio.split("-").map(Number);
  const d = new Date(a, m - 1, 1);
  for (let i = 0; i < meses; i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() + 1);
  }
  return out;
};

const FinanceiroCobrancas = () => {
  const { data: cobrancas = [] } = useCobrancasExtras();
  const { data: empresas = [] } = useEmpresasFinanceiro();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState({ descricao: "", valor_mensal: "", mes_inicial: new Date().toISOString().slice(0, 7), meses: "1" });
  const [selecionadas, setSelecionadas] = useState<Record<string, { marcada: boolean; valor: string }>>({});

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["cobrancas-extras"] });

  const abrirNova = () => {
    setEditando(null);
    setForm({ descricao: "", valor_mensal: "", mes_inicial: new Date().toISOString().slice(0, 7), meses: "1" });
    setSelecionadas({});
    setOpen(true);
  };

  const abrirEdicao = (c: any) => {
    setEditando(c);
    setForm({ descricao: c.descricao, valor_mensal: String(c.valor_mensal), mes_inicial: c.mes_inicial, meses: String(c.meses) });
    const sel: Record<string, { marcada: boolean; valor: string }> = {};
    (c.cobrancas_extras_empresas ?? []).forEach((v: any) => {
      sel[v.empresa_id] = { marcada: true, valor: v.valor_mensal != null ? String(v.valor_mensal) : "" };
    });
    setSelecionadas(sel);
    setOpen(true);
  };

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = {
        descricao: form.descricao,
        valor_mensal: Number(form.valor_mensal),
        mes_inicial: form.mes_inicial,
        meses: Number(form.meses),
      };
      let cobrancaId = editando?.id as string | undefined;
      if (cobrancaId) {
        const { error } = await supabase.from("cobrancas_extras").update(payload).eq("id", cobrancaId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("cobrancas_extras").insert(payload).select("id").single();
        if (error) throw error;
        cobrancaId = data.id;
      }

      await supabase.from("cobrancas_extras_empresas").delete().eq("cobranca_id", cobrancaId!);
      const vinculos = Object.entries(selecionadas)
        .filter(([, v]) => v.marcada)
        .map(([empresa_id, v]) => ({
          cobranca_id: cobrancaId!,
          empresa_id,
          valor_mensal: v.valor ? Number(v.valor) : null,
        }));
      if (vinculos.length) {
        const { error } = await supabase.from("cobrancas_extras_empresas").insert(vinculos);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Cobrança extra salva. Gere as faturas do mês para aplicá-la.");
      setOpen(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const encerrar = useMutation({
    mutationFn: async (c: any) => {
      const { error } = await supabase.from("cobrancas_extras").update({ ativa: false }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cobrança encerrada. Faturas já geradas não são alteradas.");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const marcarTodas = (valor: boolean) => {
    const sel: Record<string, { marcada: boolean; valor: string }> = {};
    empresas.forEach((e: any) => (sel[e.id] = { marcada: valor, valor: selecionadas[e.id]?.valor ?? "" }));
    setSelecionadas(sel);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Cobranças extras recorrentes</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Ex.: "Realização do evento Y" — R$ 1.500,00/mês durante 3 meses, com valor ajustável por empresa.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={abrirNova}><Plus className="h-4 w-4 mr-2" /> Nova cobrança</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editando ? "Editar cobrança extra" : "Nova cobrança extra"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Realização do evento Y" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Valor mensal padrão</Label>
                  <Input type="number" step="0.01" value={form.valor_mensal} onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })} placeholder="1500" />
                </div>
                <div className="space-y-2">
                  <Label>Mês inicial</Label>
                  <Input type="month" value={form.mes_inicial} onChange={(e) => setForm({ ...form, mes_inicial: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nº de meses</Label>
                  <Input type="number" min="1" value={form.meses} onChange={(e) => setForm({ ...form, meses: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Empresas cobradas</Label>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => marcarTodas(true)}>Marcar todas</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => marcarTodas(false)}>Limpar</Button>
                  </div>
                </div>
                <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                  {empresas.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-3 p-2">
                      <Checkbox
                        checked={!!selecionadas[e.id]?.marcada}
                        onCheckedChange={(v) =>
                          setSelecionadas({ ...selecionadas, [e.id]: { marcada: !!v, valor: selecionadas[e.id]?.valor ?? "" } })
                        }
                      />
                      <span className="flex-1 text-sm">{e.nome}</span>
                      <Input
                        className="w-36"
                        type="number"
                        step="0.01"
                        placeholder="valor padrão"
                        value={selecionadas[e.id]?.valor ?? ""}
                        onChange={(ev) =>
                          setSelecionadas({ ...selecionadas, [e.id]: { marcada: selecionadas[e.id]?.marcada ?? true, valor: ev.target.value } })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button disabled={!form.descricao || salvar.isPending} onClick={() => salvar.mutate()}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor mensal</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Empresas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cobrancas.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhuma cobrança extra cadastrada.</TableCell></TableRow>
            )}
            {cobrancas.map((c: any) => {
              const meses = mesesCobertos(c.mes_inicial, c.meses);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.descricao}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(c.valor_mensal))}</TableCell>
                  <TableCell>{labelMes(meses[0])} → {labelMes(meses[meses.length - 1])} ({c.meses}x)</TableCell>
                  <TableCell className="text-right">{c.cobrancas_extras_empresas?.length ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={c.ativa ? "bg-emerald-600/15 text-emerald-700" : "bg-muted text-muted-foreground"}>
                      {c.ativa ? "ativa" : "encerrada"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => abrirEdicao(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" disabled={!c.ativa} onClick={() => encerrar.mutate(c)}><Ban className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default FinanceiroCobrancas;
