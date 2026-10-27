export type RankingLinha = {
  id: string;
  nome: string;
  vendas: number | string;
  pontos: number | string;
  empresas: number | string;
};

function celula(texto: string): string {
  const seguro = /^[\s]*[=+@-]|^[\t\r\n]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replace(/"/g, '""')}"`;
}

const numero = (valor: number | string, casas?: number) => Number(valor).toLocaleString("pt-BR", {
  useGrouping: false,
  minimumFractionDigits: casas ?? 0,
  maximumFractionDigits: casas ?? 20,
});

export function gerarRankingCsv(rows: RankingLinha[]): string {
  const linhas = [["Posição", "Profissional", "Vendas (R$)", "Pontos", "Lojistas"],
    ...rows.map((r, i) => [String(i + 1), r.nome, numero(r.vendas, 2), numero(r.pontos), numero(r.empresas)]),
  ];
  return `\uFEFF${linhas.map(linha => linha.map(celula).join(";")).join("\r\n")}\r\n`;
}