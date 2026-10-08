import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePaginacao, PaginacaoControles } from "@/components/Paginacao";
import { ProfessionalName } from "@/components/ProfessionalAvatar";

type RankingLinha = {
  id: string;
  nome: string;
  vendas: number | string;
  pontos: number | string;
  empresas: number | string;
};

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Ranking geral de profissionais do grupo inteiro (todas as lojas)
const RankingGeral = () => {
  const [linhas, setLinhas] = useState<RankingLinha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [busca, setBusca] = useState("");

  const carregar = async (mostrarSpinner = false) => {
    if (mostrarSpinner) setAtualizando(true);
    const { data, error } = await supabase.rpc("get_ranking_geral");
    if (!error && data) {
      setLinhas(data as unknown as RankingLinha[]);
    }
    setCarregando(false);
    setAtualizando(false);
  };

  useEffect(() => { carregar(); }, []);

  const filtradas = useMemo(
    () => linhas.filter(l => l.nome?.toLowerCase().includes(busca.toLowerCase())),
    [linhas, busca]
  );
  const pag = usePaginacao(filtradas);

  const exportCSV = (rows: RankingLinha[]) => {
    if (rows.length === 0) return;
    const headers = ["Posicao", "Profissional", "Vendas", "Pontos", "Lojistas"];
    const csv = [headers.join(","), ...rows.map((r, i) =>
      [String(i + 1), `"${r.nome}"`, String(r.vendas), String(r.pontos), String(r.empresas)].join(",")
    )].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ranking-geral-profissionais.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (carregando) {
    return (
      <div className="text-center py-12 text-muted-foreground">Carregando ranking geral...</div>
    );
  }

  return (
    <Card className="bg-card border-border mb-8">
      <CardHeader>
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div>
            <CardTitle>Ranking Geral de Profissionais</CardTitle>
            <CardDescription>Pontuação de todo o grupo Conexão, somando as vendas em todas as lojas parceiras</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar profissional..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => carregar(true)} disabled={atualizando}>
              <RefreshCw className={`mr-2 h-4 w-4 ${atualizando ? "animate-spin" : ""}`} /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCSV(filtradas)}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[520px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Pontos</TableHead>
                <TableHead className="text-right">Lojistas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pag.paginados.map((l, i) => (
                <TableRow key={l.id} className={i < 3 ? "bg-primary/5" : undefined}>
                  <TableCell className="font-semibold">{(pag.pagina - 1) * 10 + i + 1}</TableCell>
                  <TableCell className="font-medium">
                    <ProfessionalName professionalId={l.id} name={l.nome} />
                  </TableCell>
                  <TableCell className="text-right">{fmtBRL(Number(l.vendas))}</TableCell>
                  <TableCell className="text-right font-bold text-primary">{Number(l.pontos).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{Number(l.empresas).toLocaleString("pt-BR")}</TableCell>
                </TableRow>
              ))}
              {pag.paginados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum profissional encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <PaginacaoControles pagina={pag.pagina} totalPaginas={pag.totalPaginas} onChange={pag.setPagina} />
      </CardContent>
    </Card>
  );
};

export default RankingGeral;
