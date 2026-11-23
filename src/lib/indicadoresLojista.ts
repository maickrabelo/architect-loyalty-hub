import type { RankingLinha } from "./rankingCsv";

export type VendaIndicador = {
  arquiteto_id: string;
  data_venda: string;
  valor_venda: number | string;
  pontos_calculados: number | string;
  registros?: number;
};
export type IndicadoresLojista = { vendas: VendaIndicador[]; ranking: RankingLinha[] };

export function indicadoresDaLoja(vendas: VendaIndicador[], profissionais: { id: string; nome: string }[], ano: number): IndicadoresLojista {
  const daCampanha = vendas.filter(v => v.data_venda.startsWith(`${ano}-`));
  const nomes = new Map(profissionais.map(p => [p.id, p.nome]));
  const ranking = new Map<string, RankingLinha>();
  for (const v of daCampanha) {
    const linha = ranking.get(v.arquiteto_id) ?? { id: v.arquiteto_id, nome: nomes.get(v.arquiteto_id) ?? "Profissional", vendas: 0, pontos: 0, empresas: 1 };
    linha.vendas = Number(linha.vendas) + Number(v.valor_venda);
    linha.pontos = Number(linha.pontos) + Number(v.pontos_calculados);
    ranking.set(linha.id, linha);
  }
  return { vendas: daCampanha, ranking: [...ranking.values()].sort((a, b) => Number(b.pontos) - Number(a.pontos) || Number(b.vendas) - Number(a.vendas) || a.nome.localeCompare(b.nome, "pt-BR")) };
}

export function selecionarIndicadores(grupo: boolean, loja: IndicadoresLojista, gerais?: IndicadoresLojista): IndicadoresLojista {
  return grupo ? gerais ?? { vendas: [], ranking: [] } : loja;
}