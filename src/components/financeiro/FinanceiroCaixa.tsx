import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Lock, Unlock, Trash2 } from "lucide-react";
import {
  useMovimentacoes, useCaixa, useFaturas, useEmpresasFinanceiro, formatBRL, labelMes,
} from "@/hooks/useFinanceiro";

const FinanceiroCaixa = ({ mes }: { mes: string }) => {
  const { data: movs = [] } = useMovimentacoes(mes);
  const { data: caixa } = useCaixa(mes);
  const { data: faturas = [] } = useFaturas(mes);
  const { data: empresas = [] } = useEmpresasFinanceiro();
  const queryClient = useQueryClient();
  const fechado = caixa?.status === "fechado";

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tipo: "recebimento", categoria: "", descricao: "", valor: "", empresa_id: "", data: new Date().toISOString().slice(0, 10) });

  const totais = useMemo(() => {
    const rec = movs.filter((m: any) => m.tipo === "recebimento").reduce((s: number, m: any) => s + Number(m.valor), 0);
    const pag = movs.filter((m: any) => m.tipo === "pagamento").reduce((s: number, m: any) => s + Number(m.valor), 0);
    const faturado = faturas.reduce((s: number, f: any) => s + Number(f.valor_total), 0);
    const inad = faturas.filter((f: any) => f.status !== "paga").reduce((s: number, f: any) => s + (Number(f.valor_total) - Number(f.valor_pago)), 0);
    return { rec, pag, saldo: rec - pag, faturado, inad };
  }, [movs, faturas]);

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("movimentacoes_financeiras").insert({
        mes,
        data: form.data,
        tipo: form.tipo,
        categoria: form.categoria || null,
        descricao: form.descricao,
        valor: Number(form.valor),
        empresa_id: form.empresa_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento registrado");
      setOpen(false);
      setForm({ ...form, categoria: "", descricao: "", valor: "", empresa_id: "" });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes", mes] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("movimentacoes_financeiras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento removido");
      queryClient.invalidateQueries({ queryKey: ["movimentacoes", mes] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const fecharCaixa = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("fechar_caixa", { _mes: mes });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Caixa fechado. Relatório liberado para as empresas.");
      queryClient.invalidateQueries({ queryKey: ["caixa", mes] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reabrir = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("reabrir_caixa", { _mes: mes });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Caixa reaberto");
      queryClient.invalidateQueries({ queryKey: ["caixa", mes] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Faturado", valor: formatBRL(totais.faturado) },
          { label: "Recebimentos", valor: formatBRL(totais.rec) },
          { label: "Pagamentos", valor: formatBRL(totais.pag) },
          { label: "Saldo do mês", valor: formatBRL(totais.saldo) },
          { label: "Inadimplência", valor: formatBRL(totais.inad) },
        ].map((k) => (
          <Card key={k.label} className="bg-card/60">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{k.label}</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-semibold">{k.valor}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Fluxo de caixa — {labelMes(mes)}</CardTitle>
            <Badge variant="outline" className={fechado ? "bg-emerald-600/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}>
              {fechado ? "fechado" : "aberto"}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={fechado}><Plus className="h-4 w-4 mr-2" /> Lançamento</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recebimento">Recebimento</SelectItem>
                          <SelectItem value="pagamento">Pagamento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Data</Label>
                      <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ex.: prêmios, evento" />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor</Label>
                      <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Empresa (opcional)</Label>
                    <Select value={form.empresa_id || "none"} onValueChange={(v) => setForm({ ...form, empresa_id: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {empresas.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button disabled={!form.descricao || !Number(form.valor) || salvar.isPending} onClick={() => salvar.mutate()}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {fechado ? (
              <Button size="sm" variant="outline" onClick={() => reabrir.mutate()}>
                <Unlock className="h-4 w-4 mr-2" /> Reabrir caixa
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => fecharCaixa.mutate()}>
                <Lock className="h-4 w-4 mr-2" /> Fechar caixa
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {movs.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhuma movimentação neste mês.</TableCell></TableRow>
              )}
              {movs.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>{new Date(m.data + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={m.tipo === "recebimento" ? "bg-emerald-600/15 text-emerald-700" : "bg-destructive/15 text-destructive"}>
                      {m.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>{m.descricao}</TableCell>
                  <TableCell>{m.empresas?.nome ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatBRL(Number(m.valor))}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" disabled={fechado} onClick={() => excluir.mutate(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceiroCaixa;
