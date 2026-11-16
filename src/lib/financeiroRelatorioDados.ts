export type FaturaRelatorio = {
  mes: string; pontos: number; custo_pontos_total: number; valor_pontos_mes: number;
  valor_mensalidade: number; valor_extras: number; valor_total: number; valor_pago: number;
  vencimento: string; status: string; empresas: { nome: string; demo: boolean | null } | null;
};
export type MovimentoRelatorio = {
  mes: string; data: string; tipo: string; descricao: string; valor: number;
  empresas: { nome: string; demo: boolean | null } | null;
};
export type ContaRelatorio = {
  banco: string; conta: string; saldo_conta: number; saldo_aplicado: number; atualizado_em: string;
};
export function calcularRelatorio(mes: string, faturas: FaturaRelatorio[], movimentos: MovimentoRelatorio[], contas: ContaRelatorio[]) {
  const oficiais = faturas.filter(f => f.empresas && !f.empresas.demo);
  const doMes = oficiais.filter(f => f.mes === mes);
  const fluxo = movimentos.filter(m => m.mes === mes && !m.empresas?.demo);
  const sum = <T,>(rows: T[], fn: (row: T) => number) => rows.reduce((acc, row) => acc + Number(fn(row)), 0);
  const recebimentos = sum(fluxo.filter(m => m.tipo === 'recebimento'), m => m.valor);
  const pagamentos = sum(fluxo.filter(m => m.tipo === 'pagamento'), m => m.valor);
  const anteriores = oficiais.filter(f => f.mes < mes && !['paga', 'cancelada'].includes(f.status) && Number(f.valor_total) > Number(f.valor_pago));
  return {
    doMes, fluxo, anteriores, recebimentos, pagamentos, saldo: recebimentos - pagamentos,
    faturado: sum(doMes, f => f.valor_total), recebidoFaturas: sum(doMes, f => f.valor_pago),
    aberto: sum(doMes.filter(f => !['paga', 'cancelada'].includes(f.status)), f => Number(f.valor_total) - Number(f.valor_pago)),
    pontos: sum(doMes, f => f.pontos), custoPontos: sum(doMes, f => f.custo_pontos_total),
    cobradoPontos: sum(doMes, f => f.valor_pontos_mes),
    diferido: sum(doMes, f => Number(f.custo_pontos_total) - Number(f.valor_pontos_mes)),
    mensalidades: sum(doMes, f => f.valor_mensalidade), extras: sum(doMes, f => f.valor_extras),
    totalBanco: sum(contas, c => Number(c.saldo_conta) + Number(c.saldo_aplicado)),
  };
}