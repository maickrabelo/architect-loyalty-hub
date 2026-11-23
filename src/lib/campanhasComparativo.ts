export interface MesCampanha { ano: number; mes: number; valor_vendido: number }
export interface LinhaComparativa { mes: number; base: number | null; comparada: number | null; variacao: number | null }
export const MESES_CAMPANHA = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function compararCampanhas(dados: MesCampanha[], anoBase: number, anoComparado: number): LinhaComparativa[] {
  return MESES_CAMPANHA.map((_, index) => {
    const mes = index + 1;
    const base = dados.find(d => d.ano === anoBase && d.mes === mes)?.valor_vendido ?? null;
    const comparada = dados.find(d => d.ano === anoComparado && d.mes === mes)?.valor_vendido ?? null;
    return { mes, base, comparada, variacao: base !== null && base > 0 && comparada !== null ? (comparada / base - 1) * 100 : null };
  });
}

export function totalComparavel(linhas: LinhaComparativa[]) {
  const comuns = linhas.filter(l => l.base !== null && l.comparada !== null);
  const base = Math.round(comuns.reduce((s, l) => s + (l.base ?? 0), 0) * 100) / 100;
  const comparada = Math.round(comuns.reduce((s, l) => s + (l.comparada ?? 0), 0) * 100) / 100;
  return { base, comparada, meses: comuns.length, variacao: base > 0 ? (comparada / base - 1) * 100 : null };
}

// January never compares with December of another campaign; missing/zero bases are undefined.
export function variacaoMensal(linhas: LinhaComparativa[], campo: "base" | "comparada") {
  return linhas.map((linha, index) => {
    const anterior = index > 0 ? linhas[index - 1][campo] : null;
    const atual = linha[campo];
    return atual !== null && anterior !== null && anterior > 0 ? (atual / anterior - 1) * 100 : null;
  });
}

export function agruparVendasCampanha(vendas: { data_venda: string; valor_venda: number; demo: boolean }[], ano: number, ultimoMes = 12): MesCampanha[] {
  return Array.from({ length: ultimoMes }, (_, i) => ({ ano, mes: i + 1, valor_vendido: Math.round(vendas.filter(v => !v.demo && v.data_venda.slice(0, 7) === `${ano}-${String(i + 1).padStart(2, "0")}`).reduce((s, v) => s + Number(v.valor_venda), 0) * 100) / 100 }));
}

export function comparativoCsv(linhas: LinhaComparativa[], base: number, comparada: number) {
  const numero = (v: number | null) => v === null ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
  const total = totalComparavel(linhas);
  const rows = [["Mês", `Vendas ${base} (R$)`, `Vendas ${comparada} (R$)`, "Variação (%)"], ...linhas.map(l => [MESES_CAMPANHA[l.mes - 1], numero(l.base), numero(l.comparada), numero(l.variacao)]), [`Total comparável (${total.meses} meses)`, numero(total.base), numero(total.comparada), numero(total.variacao)]];
  return "\uFEFF" + rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(";")).join("\r\n") + "\r\n";
}