import { describe, expect, test } from "bun:test";
import { gerarExtratoPontuacaoCsv, type VendaExtrato } from "./extratoPontuacaoCsv";

const venda: VendaExtrato = {
  data_venda: "2026-11-03",
  empresas: { nome: "Empresa Conexão" },
  valor_venda: 1999.99,
  pontos_calculados: 1,
  cliente_nome: "Cliente",
  descricao: null,
  nota_fiscal: null,
};

describe("extrato pessoal de pontuação", () => {
  test("preserva os pontos registrados, sem recalcular pelo valor da venda", () => {
    const csv = gerarExtratoPontuacaoCsv([venda, { ...venda, pontos_calculados: 3 }]);
    expect(csv).toContain('"1999,99";"3"');
    expect(csv).toContain('"TOTAL";"";"";"";"3999,98";"4"');
  });

  test("exporta todas as vendas fornecidas, não apenas uma página", () => {
    const csv = gerarExtratoPontuacaoCsv(Array.from({ length: 20 }, () => venda));
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(22);
    expect(csv).toContain('"39999,80";"20"');
  });

  test("mantém datas, centavos, acentos e separação compatíveis com planilhas brasileiras", () => {
    const csv = gerarExtratoPontuacaoCsv([venda]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"03/11/2026";"Empresa Conexão"');
    expect(csv).toContain('"1999,99";"1"');
  });

  test("escapa aspas e neutraliza fórmulas em campos de texto", () => {
    const csv = gerarExtratoPontuacaoCsv([{ ...venda, cliente_nome: '=HYPERLINK("link")', descricao: 'Projeto "A"; B' }]);
    expect(csv).toContain('"\'=HYPERLINK(""link"")"');
    expect(csv).toContain('"Projeto ""A""; B"');
  });
});