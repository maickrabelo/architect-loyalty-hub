import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfigFinanceira } from "@/hooks/useFinanceiro";

const FinanceiroConfig = () => {
  const { data: cfg } = useConfigFinanceira();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (cfg) setForm(cfg);
  }, [cfg]);

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("configuracoes_financeiras")
        .update({
          salario_minimo: Number(form.salario_minimo),
          valor_ponto: Number(form.valor_ponto),
          percentual_mensal: Number(form.percentual_mensal),
          dia_vencimento: Number(form.dia_vencimento),
          campanha_inicio: form.campanha_inicio,
          campanha_fim: form.campanha_fim,
          vencimento_saldo: form.vencimento_saldo,
        })
        .eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      queryClient.invalidateQueries({ queryKey: ["config-financeira"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!form) return null;

  const campo = (key: string, label: string, type = "number", step?: string) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} step={step} value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="text-base">Parâmetros financeiros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {campo("salario_minimo", "Mensalidade (salário mínimo)", "number", "0.01")}
          {campo("valor_ponto", "Valor por ponto (R$)", "number", "0.01")}
          {campo("percentual_mensal", "% cobrado no mês", "number", "0.01")}
          {campo("dia_vencimento", "Dia de vencimento da fatura")}
          {campo("campanha_inicio", "Início da campanha", "date")}
          {campo("campanha_fim", "Fim da campanha", "date")}
          {campo("vencimento_saldo", "Vencimento do saldo final", "date")}
        </div>
        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>Salvar configurações</Button>
      </CardContent>
    </Card>
  );
};

export default FinanceiroConfig;
