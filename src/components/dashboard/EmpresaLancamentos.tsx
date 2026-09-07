import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { formatBRL } from "@/hooks/useFinanceiro";
import { usePaginacao, PaginacaoControles } from "@/components/Paginacao";

type Venda = {
  id: string;
  data_venda: string;
  valor_venda: number | string;
  arquiteto_id: string;
  observacao?: string | null;
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
};

type Profissional = { id: string; nome: string; vendasTotal: number };

interface Props {
  vendas: Venda[];
  arquitetos: Profissional[];
  nomeEmpresa: string;
}

const nomeCliente = (v: Venda) => v.cliente_nome || v.observacao || "—";

const EmpresaLancamentos = ({ vendas, arquitetos, nomeEmpresa }: Props) => {
  const [selecionado, setSelecionado] = useState("");

  const nomePorId = useMemo(
    () => Object.fromEntries(arquitetos.map((a) => [a.id, a.nome])),
    [arquitetos],
  );

  const pontuados = useMemo(
    () =>
      arquitetos
        .filter((a) => vendas.some((v) => v.arquiteto_id === a.id))
        .sort((a, b) => b.vendasTotal - a.vendasTotal),
    [arquitetos, vendas],
  );

  const pagPontuados = usePaginacao(pontuados);

  const historico = useMemo(
    () =>
      vendas
        .filter((v) => v.arquiteto_id === selecionado)
        .sort((a, b) => (a.data_venda < b.data_venda ? 1 : -1)),
    [vendas, selecionado],
  );

  const totalHistorico = historico.reduce((s, v) => s + Number(v.valor_venda), 0);

  return (
    <>
      <Card className="mb-8 bg-card border-border">
        <CardHeader>
          <CardTitle>Profissionais pontuados</CardTitle>
          <CardDescription>Lançamentos realizados por esta loja, do maior para o menor desempenho</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Loja que pontuou</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone do cliente</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pontuados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhum lançamento registrado ainda.
                  </TableCell>
                </TableRow>
              )}
              {pagPontuados.paginados.map((p) =>
                vendas
                  .filter((v) => v.arquiteto_id === p.id)
                  .sort((a, b) => (a.data_venda < b.data_venda ? 1 : -1))
                  .map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>{nomeEmpresa}</TableCell>
                      <TableCell>{nomeCliente(v)}</TableCell>
                      <TableCell>{v.cliente_telefone || "—"}</TableCell>
                      <TableCell>{format(new Date(v.data_venda + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                    </TableRow>
                  )),
              )}
            </TableBody>
          </Table>
          <PaginacaoControles pagina={pagPontuados.pagina} totalPaginas={pagPontuados.totalPaginas} onChange={pagPontuados.setPagina} />
        </CardContent>
      </Card>

      <Card className="mb-8 bg-card border-border">
        <CardHeader>
          <CardTitle>Histórico por profissional</CardTitle>
          <CardDescription>Selecione um profissional para ver tudo o que esta loja lançou para ele</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selecionado} onValueChange={setSelecionado}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Selecione o profissional" />
            </SelectTrigger>
            <SelectContent>
              {pontuados.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selecionado && (
            <>
              <div className="rounded-lg border border-border bg-secondary/50 p-4">
                <p className="text-sm text-muted-foreground">
                  {nomePorId[selecionado]} · {historico.length} lançamento(s)
                </p>
                <p className="text-2xl font-bold text-primary">{formatBRL(totalHistorico)}</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historico.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          Nenhum lançamento para este profissional.
                        </TableCell>
                      </TableRow>
                    )}
                    {historico.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>{format(new Date(v.data_venda + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{nomeCliente(v)}</TableCell>
                        <TableCell>{v.cliente_telefone || "—"}</TableCell>
                        <TableCell className="text-right font-semibold">{formatBRL(Number(v.valor_venda))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default EmpresaLancamentos;
