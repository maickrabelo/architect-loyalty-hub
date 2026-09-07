import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useConfigFinanceira, formatBRL } from "@/hooks/useFinanceiro";

const FinanceiroConfig = () => {
  const { data: cfg } = useConfigFinanceira();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const [premios, setPremios] = useState<Record<string, string>>({});

  useEffect(() => {
    if (cfg) setForm(cfg);
  }, [cfg]);

  const { data: premiacoes = [] } = useQuery({
    queryKey: ["premiacoes-valores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("premiacoes")
        .select("*")
        .order("pontos_necessarios");
      if (error) throw error;
      return data || [];
    },
  });

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("configuracoes_financeiras")
        .update({
          salario_minimo: Number(form.salario_minimo),
          valor_ponto: Number(form.valor_ponto),
          percentual_mensal: Number(form.percentual_mensal),
          dia_vencimento: Number(form.dia_vencimento),
          dia_vencimento_mensalidade: form.dia_vencimento_mensalidade ? Number(form.dia_vencimento_mensalidade) : null,
          dia_vencimento_extras: form.dia_vencimento_extras ? Number(form.dia_vencimento_extras) : null,
          dias_atraso_bloqueio: Number(form.dias_atraso_bloqueio ?? 0),
          campanha_inicio: form.campanha_inicio,
          campanha_fim: form.campanha_fim,
          vencimento_saldo: form.vencimento_saldo,
        } as any)
        .eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      queryClient.invalidateQueries({ queryKey: ["config-financeira"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const salvarPremio = useMutation({
    mutationFn: async ({ id, valor }: { id: string; valor: number }) => {
      const { error } = await supabase.from("premiacoes").update({ valor_premio: valor } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Valor da premiação atualizado");
      queryClient.invalidateQueries({ queryKey: ["premiacoes-valores"] });
      queryClient.invalidateQueries({ queryKey: ["rateio-premiacao"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!form) return null;

  const campo = (key: string, label: string, type = "number", step?: string, hint?: string) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        step={step}
        value={form[key] ?? ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">Parâmetros financeiros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {campo("salario_minimo", "Mensalidade (salário mínimo)", "number", "0.01")}
            {campo("valor_ponto", "Valor por ponto (R$)", "number", "0.01")}
            {campo("percentual_mensal", "% cobrado no mês", "number", "0.01")}
            {campo("dia_vencimento", "Dia de fechamento dos pontos do mês", "number", undefined, "Vencimento da parte proporcional aos pontos lançados")}
            {campo("dia_vencimento_mensalidade", "Dia de fechamento da mensalidade", "number", undefined, "Deixe em branco para usar o mesmo dia dos pontos")}
            {campo("dia_vencimento_extras", "Dia de faturamento das taxas extras", "number", undefined, "Permite cobrar as taxas extras em data diferente da mensalidade")}
            {campo("dias_atraso_bloqueio", "Bloquear empresa após quantos dias de atraso", "number", undefined, "0 bloqueia no dia seguinte ao vencimento")}
            {campo("campanha_inicio", "Início da campanha", "date")}
            {campo("campanha_fim", "Fim da campanha", "date")}
            {campo("vencimento_saldo", "Vencimento do saldo final", "date")}
          </div>
          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>Salvar configurações</Button>
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">Valor de cada premiação</CardTitle>
          <p className="text-sm text-muted-foreground">
            Usado no rateio proporcional entre as lojas no fechamento da campanha.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destino</TableHead>
                <TableHead className="text-right">Pontos</TableHead>
                <TableHead className="text-right">Valor atual</TableHead>
                <TableHead className="w-56">Novo valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {premiacoes.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell className="text-right">{Number(p.pontos_necessarios).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(p.valor_premio ?? 0))}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={premios[p.id] ?? ""}
                        placeholder={String(p.valor_premio ?? 0)}
                        onChange={(e) => setPremios({ ...premios, [p.id]: e.target.value })}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!premios[p.id] || salvarPremio.isPending}
                        onClick={() => salvarPremio.mutate({ id: p.id, valor: Number(premios[p.id]) })}
                      >
                        Salvar
                      </Button>
                    </div>
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

export default FinanceiroConfig;
