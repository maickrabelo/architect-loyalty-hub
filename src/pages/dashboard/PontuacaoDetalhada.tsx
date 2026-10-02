import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Download, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { exportarCSV } from "@/hooks/useFinanceiro";
import { usePaginacao, PaginacaoControles } from "@/components/Paginacao";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Venda = {
  id: string;
  data_venda: string;
  empresa_id: string;
  valor_venda: number;
  pontos_calculados: number;
  descricao: string | null;
  cliente_nome: string | null;
  nota_fiscal: string | null;
  empresas: { nome: string } | null;
};

const dataBR = (data: string) => data.split("-").reverse().join("/");
const brl = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PontuacaoDetalhada = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const { data: vendas = [], isLoading, isError } = useQuery({
    queryKey: ["pontuacao-detalhada", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("vendas")
        .select("id,data_venda,empresa_id,valor_venda,pontos_calculados,descricao,cliente_nome,nota_fiscal,empresas(nome)")
        .eq("arquiteto_id", user.id)
        .order("data_venda", { ascending: false });
      if (error) throw error;
      return (data || []) as Venda[];
    },
  });

  const vendasFiltradas = useMemo(() => vendas.filter((venda) =>
    (!dataInicio || venda.data_venda >= dataInicio) &&
    (!dataFim || venda.data_venda <= dataFim)
  ), [vendas, dataInicio, dataFim]);

  const totaisPorEmpresa = useMemo(() => {
    const totais = new Map<string, { nome: string; pontos: number }>();
    vendasFiltradas.forEach((venda) => {
      const atual = totais.get(venda.empresa_id) || {
        nome: venda.empresas?.nome || "Empresa",
        pontos: 0,
      };
      atual.pontos += Number(venda.pontos_calculados) || 0;
      totais.set(venda.empresa_id, atual);
    });
    return [...totais.values()].sort((a, b) => b.pontos - a.pontos);
  }, [vendasFiltradas]);

  const totalPontos = vendasFiltradas.reduce((soma, venda) => soma + (Number(venda.pontos_calculados) || 0), 0);
  const totalVendido = vendasFiltradas.reduce((soma, venda) => soma + (Number(venda.valor_venda) || 0), 0);
  const paginacao = usePaginacao(vendasFiltradas, 15);

  const handleExportar = () => exportarCSV("minha-pontuacao", vendasFiltradas.map((venda) => ({
    Data: dataBR(venda.data_venda),
    Empresa: venda.empresas?.nome || "",
    Cliente: venda.cliente_nome || "",
    Descricao: venda.descricao || "",
    NotaFiscal: venda.nota_fiscal || "",
    Valor: Number(venda.valor_venda).toFixed(2).replace(".", ","),
    Pontos: Number(venda.pontos_calculados) || 0,
  })));

  return (
    <div className="min-h-screen bg-gradient-dark p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard/arquiteto")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Dashboard
          </Button>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Pontuação Detalhada</h1>
              <p className="text-muted-foreground">Vendas reais registradas pelas empresas parceiras</p>
            </div>
            <Button onClick={handleExportar} variant="outline" disabled={!vendasFiltradas.length}>
              <Download className="mr-2 h-4 w-4" /> Exportar
            </Button>
          </div>
        </div>

        <Card className="mb-8 bg-card border-border">
          <CardHeader>
            <CardTitle>Filtros de Período</CardTitle>
            <CardDescription>Selecione o período das vendas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <div><Label htmlFor="data-inicio">Data inicial</Label><Input id="data-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></div>
              <div><Label htmlFor="data-fim">Data final</Label><Input id="data-fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></div>
              <div className="flex items-end"><Button variant="secondary" onClick={() => { setDataInicio(""); setDataFim(""); }}>Limpar filtros</Button></div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-premium border-primary/20">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Total do período</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-primary">{totalPontos.toLocaleString("pt-BR")}</p><p className="text-xs text-muted-foreground mt-1">pontos gerados em {brl(totalVendido)}</p></CardContent>
          </Card>
          {totaisPorEmpresa.slice(0, 3).map((empresa) => (
            <Card key={empresa.nome} className="bg-card border-border">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />{empresa.nome}</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{empresa.pontos.toLocaleString("pt-BR")}</p><p className="text-xs text-muted-foreground mt-1">pontos</p></CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle>Histórico de vendas</CardTitle><CardDescription>{vendasFiltradas.length} venda(s) encontrada(s)</CardDescription></CardHeader>
          <CardContent>
            {isLoading ? <p className="py-8 text-center text-muted-foreground">Carregando sua pontuação...</p> : isError ? <p className="py-8 text-center text-destructive">Não foi possível carregar sua pontuação.</p> : (
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Empresa</TableHead><TableHead>Cliente / descrição</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Pontos</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {paginacao.paginados.map((venda) => (
                      <TableRow key={venda.id}>
                        <TableCell className="font-medium whitespace-nowrap">{dataBR(venda.data_venda)}</TableCell>
                        <TableCell>{venda.empresas?.nome || "—"}</TableCell>
                        <TableCell className="max-w-md"><span className="block">{venda.cliente_nome || venda.descricao || "Venda registrada"}</span>{venda.nota_fiscal && <span className="text-xs text-muted-foreground">NF {venda.nota_fiscal}</span>}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{brl(Number(venda.valor_venda) || 0)}</TableCell>
                        <TableCell className="text-right font-bold text-primary">+{Number(venda.pontos_calculados) || 0}</TableCell>
                      </TableRow>
                    ))}
                    {!vendasFiltradas.length && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma venda encontrada no período selecionado</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            )}
            <PaginacaoControles pagina={paginacao.pagina} totalPaginas={paginacao.totalPaginas} onChange={paginacao.setPagina} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PontuacaoDetalhada;