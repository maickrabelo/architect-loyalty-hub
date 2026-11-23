import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePaginacao, PaginacaoControles } from "@/components/Paginacao";
import { ProfessionalName } from "@/components/ProfessionalAvatar";
import { gerarRankingCsv, type RankingLinha } from "@/lib/rankingCsv";
import { deliverFile } from "@/lib/download";
import { toast } from "sonner";

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Ranking geral de profissionais do grupo inteiro (todas as lojas)
const RankingGeral = ({ dados, escopo = "grupo", onAtualizar }: { dados?: RankingLinha[]; escopo?: "loja" | "grupo"; onAtualizar?: () => Promise<unknown> }) => {
  const [linhas, setLinhas] = useState<RankingLinha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [busca, setBusca] = useState("");

  const carregar = async (mostrarSpinner = false) => {
    if (mostrarSpinner) setAtualizando(true);
    if (dados) {
      try { await onAtualizar?.(); } catch { toast.error("Não foi possível atualizar o ranking."); }
      finally { setAtualizando(false); }
      return;
    }
    const { data, error } = await supabase.rpc("get_ranking_geral");
    if (!error && data) {
      setLinhas(data as unknown as RankingLinha[]);
    }
    setCarregando(false);
    setAtualizando(false);
  };

  useEffect(() => { if (dados) { setCarregando(false); } else { carregar(); } }, [dados]);

  const filtradas = useMemo(
    () => (dados ?? linhas).filter(l => l.nome?.toLowerCase().includes(busca.toLowerCase())),
    [dados, linhas, busca]
  );
  const pag = usePaginacao(filtradas);

  const exportCSV = (rows: RankingLinha[]) => {
    if (rows.length === 0) return;
    const blob = new Blob([gerarRankingCsv(rows)], { type: "text/csv;charset=utf-8" });
    void deliverFile(blob, escopo === "loja" ? "ranking-minha-loja-profissionais.csv" : "ranking-geral-profissionais.csv").catch(() => {
      toast.error("Não foi possível exportar o ranking. Tente novamente.");
    });
  };

  if (carregando) {
    return (
      <div className="text-center py-12 text-muted-foreground">Carregando ranking geral...</div>
    );
  }

  return (
    <Card className="bg-card border-border mb-8">
      <CardHeader>
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center justify-between">
          <div className="min-w-0">
            <CardTitle>{escopo === "loja" ? "Ranking de Profissionais da Loja" : "Ranking Geral de Profissionais"}</CardTitle>
            <CardDescription>{escopo === "loja" ? "Minha loja" : "Grupo Conexão"}{dados ? ` · Campanha ${new Date().getFullYear()}` : ""}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar profissional..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => carregar(true)} disabled={atualizando}>
              <RefreshCw className={`mr-2 h-4 w-4 ${atualizando ? "animate-spin" : ""}`} /> Atualizar
            </Button>
            <Button variant="outline" size="sm" disabled={filtradas.length === 0} onClick={() => exportCSV(filtradas)}>
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
