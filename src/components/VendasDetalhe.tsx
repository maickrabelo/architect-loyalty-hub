import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePaginacao, PaginacaoControles } from "@/components/Paginacao";
import { exportarCSV } from "@/hooks/useFinanceiro";
import { ProfessionalName } from "@/components/ProfessionalAvatar";

type Venda = {
  id: string; empresa_id: string; arquiteto_id: string; valor_venda: number; pontos_calculados: number;
  data_venda: string; nota_fiscal: string | null; descricao: string | null; cliente_nome: string | null;
  empresas: { nome: string } | null;
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (d: string) => d.split("-").reverse().join("/");
const TODOS = "__todos";

/** Detalhamento de vendas com filtros. Se empresaId for informado, mostra só essa empresa. */
export default function VendasDetalhe({ empresaId }: { empresaId?: string }) {
  const [fEmpresa, setFEmpresa] = useState(TODOS);
  const [fProf, setFProf] = useState(TODOS);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["vendas-detalhe", empresaId ?? "todas"],
    queryFn: async () => {
      const all: Venda[] = [];
      for (let from = 0; ; from += 1000) {
        let q = supabase.from("vendas")
          .select("id,empresa_id,arquiteto_id,valor_venda,pontos_calculados,data_venda,nota_fiscal,descricao,cliente_nome,empresas(nome)")
          .order("data_venda", { ascending: false }).range(from, from + 999);
        if (empresaId) q = q.eq("empresa_id", empresaId);
        const { data, error } = await q;
        if (error) throw error;
        all.push(...((data || []) as any));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
  });

  const { data: profs = [] } = useQuery({
    queryKey: ["arquitetos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_profissionais_publicos");
      if (error) throw error;
      return data as { id: string; nome: string | null; nome_divulgacao: string | null; imagem_profissional: string | null }[];
    },
  });
  const nomeProf = useMemo(() => {
    const m = new Map<string, string>();
    profs.forEach(p => m.set(p.id, p.nome_divulgacao || p.nome || "Profissional"));
    return m;
  }, [profs]);
  const imagemProf = useMemo(() => {
    const m = new Map<string, string | null>();
    profs.forEach(p => m.set(p.id, p.imagem_profissional));
    return m;
  }, [profs]);

  const empresasOpc = useMemo(() => {
    const m = new Map<string, string>();
    vendas.forEach(v => m.set(v.empresa_id, v.empresas?.nome ?? "—"));
    return [...m].sort((a, b) => a[1].localeCompare(b[1]));
  }, [vendas]);
  const profsOpc = useMemo(() => {
    const ids = new Set(vendas.map(v => v.arquiteto_id));
    return [...ids].map(id => [id, nomeProf.get(id) ?? "—"] as const).sort((a, b) => a[1].localeCompare(b[1]));
  }, [vendas, nomeProf]);

  const filtradas = useMemo(() => vendas.filter(v =>
    (fEmpresa === TODOS || v.empresa_id === fEmpresa) &&
    (fProf === TODOS || v.arquiteto_id === fProf) &&
    (!inicio || v.data_venda >= inicio) &&
    (!fim || v.data_venda <= fim)
  ), [vendas, fEmpresa, fProf, inicio, fim]);

  const totalValor = filtradas.reduce((s, v) => s + Number(v.valor_venda), 0);
  const totalPontos = filtradas.reduce((s, v) => s + Number(v.pontos_calculados), 0);

  const composicao = useMemo(() => {
    const m = new Map<string, { id: string; nome: string; vendas: number; valor: number; pontos: number }>();
    filtradas.forEach(v => {
      const r = m.get(v.arquiteto_id) ?? { id: v.arquiteto_id, nome: nomeProf.get(v.arquiteto_id) ?? "—", vendas: 0, valor: 0, pontos: 0 };
      r.vendas++; r.valor += Number(v.valor_venda); r.pontos += Number(v.pontos_calculados);
      m.set(v.arquiteto_id, r);
    });
    return [...m.values()].sort((a, b) => b.pontos - a.pontos);
  }, [filtradas, nomeProf]);

  const pag = usePaginacao(filtradas, 15);
  const pagComp = usePaginacao(composicao, 10);

  const limpar = () => { setFEmpresa(TODOS); setFProf(TODOS); setInicio(""); setFim(""); };
  const exportar = () => exportarCSV("vendas", filtradas.map(v => ({
    Data: dataBR(v.data_venda), Empresa: v.empresas?.nome ?? "", Profissional: nomeProf.get(v.arquiteto_id) ?? "",
    Cliente: v.cliente_nome ?? "", Descricao: v.descricao ?? "", NotaFiscal: v.nota_fiscal ?? "",
    Valor: Number(v.valor_venda).toFixed(2).replace(".", ","), Pontos: v.pontos_calculados,
  })));

  return (
    <div className="space-y-6 mb-8">
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento de Vendas</CardTitle>
          <CardDescription>Cada venda registrada, com os pontos gerados para o profissional</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`grid gap-3 ${empresaId ? "md:grid-cols-4" : "md:grid-cols-5"}`}>
            {!empresaId && (
              <div><Label>Empresa</Label>
                <Select value={fEmpresa} onValueChange={setFEmpresa}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todas</SelectItem>
                    {empresasOpc.map(([id, n]) => <SelectItem key={id} value={id}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Profissional</Label>
              <Select value={fProf} onValueChange={setFProf}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>
                  {profsOpc.map(([id, n]) => (
                    <SelectItem key={id} value={id}>
                      <ProfessionalName professionalId={id} name={n} imagePath={imagemProf.get(id)} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>De</Label><Input type="date" value={inicio} onChange={e => setInicio(e.target.value)} /></div>
            <div><Label>Até</Label><Input type="date" value={fim} onChange={e => setFim(e.target.value)} /></div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={limpar} className="flex-1">Limpar</Button>
              <Button variant="outline" onClick={exportar} className="flex-1">Exportar</Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Vendas</p><p className="text-2xl font-semibold">{filtradas.length.toLocaleString("pt-BR")}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Valor total</p><p className="text-2xl font-semibold">{brl(totalValor)}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Pontos gerados</p><p className="text-2xl font-semibold">{totalPontos.toLocaleString("pt-BR")}</p></div>
          </div>

          {isLoading ? <p className="text-sm text-muted-foreground">Carregando vendas...</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    {!empresaId && <TableHead>Empresa</TableHead>}
                    <TableHead>Profissional</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>NF</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Pontos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pag.paginados.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="whitespace-nowrap">{dataBR(v.data_venda)}</TableCell>
                      {!empresaId && <TableCell>{v.empresas?.nome}</TableCell>}
                      <TableCell><ProfessionalName professionalId={v.arquiteto_id} name={nomeProf.get(v.arquiteto_id) ?? "—"} imagePath={imagemProf.get(v.arquiteto_id)} /></TableCell>
                      <TableCell className="max-w-[180px] truncate">{v.cliente_nome ?? "—"}</TableCell>
                      <TableCell className="max-w-[160px] truncate">{v.descricao ?? "—"}</TableCell>
                      <TableCell>{v.nota_fiscal ?? "—"}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{brl(Number(v.valor_venda))}</TableCell>
                      <TableCell className="text-right font-semibold">{v.pontos_calculados}</TableCell>
                    </TableRow>
                  ))}
                  {filtradas.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhuma venda encontrada</TableCell></TableRow>}
                </TableBody>
              </Table>
              <PaginacaoControles pagina={pag.pagina} totalPaginas={pag.totalPaginas} onChange={pag.setPagina} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Composição da distribuição de pontos</CardTitle>
          <CardDescription>Pontos por profissional dentro dos filtros escolhidos (1 ponto = R$ 1.000 em vendas)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Pontos</TableHead>
                <TableHead className="w-[30%]">Participação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagComp.paginados.map(c => {
                const pct = totalPontos ? (c.pontos / totalPontos) * 100 : 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell><ProfessionalName professionalId={c.id} name={c.nome} imagePath={imagemProf.get(c.id)} /></TableCell>
                    <TableCell className="text-right">{c.vendas}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{brl(c.valor)}</TableCell>
                    <TableCell className="text-right font-semibold">{c.pontos.toLocaleString("pt-BR")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${pct}%` }} /></div>
                        <span className="text-xs w-12 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <PaginacaoControles pagina={pagComp.pagina} totalPaginas={pagComp.totalPaginas} onChange={pagComp.setPagina} />
        </CardContent>
      </Card>
    </div>
  );
}
