export type VendaExtrato = {
  data_venda: string;
  valor_venda: number | string;
  pontos_calculados: number | string;
  empresas: { nome: string } | null;
  cliente_nome: string | null;
  descricao: string | null;
  nota_fiscal: string | null;
};

function celula(texto: string): string {
  const seguro = /^[\s]*[=+@-]|^[\t\r\n]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replace(/"/g, '""')}"`;
}

function numero(valor: number | string, casas?: number): string {
  return (Number(valor) || 0).toLocaleString("pt-BR", {
    useGrouping: false,
    minimumFractionDigits: casas ?? 0,
    maximumFractionDigits: casas ?? 20,
  });
}

export function gerarExtratoPontuacaoCsv(vendas: VendaExtrato[]): string {
  const linhas = [
    ["Data", "Empresa", "Cliente", "Descrição", "Nota fiscal", "Valor (R$)", "Pontos"],
    ...vendas.map((venda) => [
      venda.data_venda.split("-").reverse().join("/"),
      venda.empresas?.nome || "",
      venda.cliente_nome || "",
      venda.descricao || "",
      venda.nota_fiscal || "",
      numero(venda.valor_venda, 2),
      numero(venda.pontos_calculados),
    ]),
    ["", "TOTAL", "", "", "",
      numero(vendas.reduce((total, venda) => total + (Number(venda.valor_venda) || 0), 0), 2),
      numero(vendas.reduce((total, venda) => total + (Number(venda.pontos_calculados) || 0), 0)),
    ],
  ];
  return `\uFEFF${linhas.map((linha) => linha.map(celula).join(";")).join("\r\n")}\r\n`;
}