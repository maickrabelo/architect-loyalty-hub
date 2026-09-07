import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/hooks/useFinanceiro";

type Linha = {
  arquiteto_id: string;
  nome: string;
  pontos_totais: number;
  pontos_empresa: number;
  percentual: number;
  premio_nome: string | null;
  premio_pontos: number;
  premio_valor: number;
  pontos_excedentes: number;
  custo_proporcional: number;
  ja_adiantado: number;
  saldo_final: number;
};

const EmpresaRateio = ({ empresaId }: { empresaId: string }) => {
  const { data } = useQuery({
    queryKey: ["rateio-premiacao", empresaId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_rateio_premiacao_empresa", {
        _empresa_id: empresaId,
      });
      if (error) throw error;
      return data as { valor_ponto: number; percentual_mensal: number; linhas: Linha[] };
    },
    enabled: !!empresaId,
  });

  const linhas = data?.linhas ?? [];
  const totalProporcional = linhas.reduce((s, l) => s + Number(l.custo_proporcional || 0), 0);
  const totalAdiantado = linhas.reduce((s, l) => s + Number(l.ja_adiantado || 0), 0);
  const totalFinal = linhas.reduce((s, l) => s + Number(l.saldo_final || 0), 0);

  return (
    <Card className="mb-8 bg-card border-border">
      <CardHeader>
        <CardTitle>Custo proporcional da premiação</CardTitle>
        <CardDescription>
          Quanto esta loja desembolsa pela viagem de cada profissional, na proporção dos pontos que ela lançou
          sobre o total pontuado pelo profissional em todas as lojas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-secondary/50 p-4">
            <p className="text-xs text-muted-foreground">Custo proporcional total</p>
            <p className="text-2xl font-bold text-primary">{formatBRL(totalProporcional)}</p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/50 p-4">
            <p className="text-xs text-muted-foreground">Já adiantado (pagamento mensal dos pontos)</p>
            <p className="text-2xl font-bold">{formatBRL(totalAdiantado)}</p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/50 p-4">
            <p className="text-xs text-muted-foreground">A pagar no fim da campanha</p>
            <p className="text-2xl font-bold bg-gradient-gold bg-clip-text text-transparent">
              {formatBRL(totalFinal)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead className="text-right">Pontos nesta loja</TableHead>
                <TableHead className="text-right">Pontos totais</TableHead>
                <TableHead className="text-right">Participação</TableHead>
                <TableHead>Premiação atingida</TableHead>
                <TableHead className="text-right">Pontos excedentes</TableHead>
                <TableHead className="text-right">Custo proporcional</TableHead>
                <TableHead className="text-right">Já adiantado</TableHead>
                <TableHead className="text-right">A pagar no fim</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Nenhum profissional pontuado por esta loja ainda.
                  </TableCell>
                </TableRow>
              )}
              {linhas.map((l) => (
                <TableRow key={l.arquiteto_id}>
                  <TableCell className="font-medium">{l.nome}</TableCell>
                  <TableCell className="text-right">{Number(l.pontos_empresa).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{Number(l.pontos_totais).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {Number(l.percentual ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%
                  </TableCell>
                  <TableCell>
                    {l.premio_nome ? (
                      <Badge variant="outline">
                        {l.premio_nome} · {Number(l.premio_pontos).toLocaleString("pt-BR")} pts
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Nenhuma ainda</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{Number(l.pontos_excedentes).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(l.custo_proporcional))}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(l.ja_adiantado))}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    {formatBRL(Number(l.saldo_final))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          Os pontos excedentes são os que ultrapassaram a faixa de premiação atingida e não geram viagem — por isso a
          loja pode ter menos a pagar no fechamento do que o adiantado mensal.
        </p>
      </CardContent>
    </Card>
  );
};

export default EmpresaRateio;
