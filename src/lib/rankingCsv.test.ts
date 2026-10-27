import { describe, expect, test } from "bun:test";
import { gerarRankingCsv, type RankingLinha } from "./rankingCsv";

const linha: RankingLinha = { id: "1", nome: "João", vendas: "123456.78", pontos: "123", empresas: "5" };

describe("exportação do ranking para planilhas brasileiras", () => {
  test("separa cinco colunas com ponto e vírgula e preserva centavos como números brasileiros", () => {
    const csv = gerarRankingCsv([linha]);
    expect(csv.split("\r\n")[1]).toBe('"1";"João";"123456,78";"123";"5"');
    expect(gerarRankingCsv([{ ...linha, vendas: 0.01 }])).toContain('"0,01"');
  });
  test("preserva acentos em UTF-8 e exporta todas as linhas, não apenas a página atual", () => {
    const csv = gerarRankingCsv(Array.from({ length: 25 }, (_, i) => ({ ...linha, nome: `João ${i}` })));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(26);
    expect(csv).toContain('"25";"João 24"');
  });
  test("preserva aspas e separadores nos nomes e impede fórmulas", () => {
    expect(gerarRankingCsv([{ ...linha, nome: 'Ana; "Silva"' }])).toContain('"Ana; ""Silva"""');
    expect(gerarRankingCsv([{ ...linha, nome: '=SUM(1,2)' }])).toContain('"\'=SUM(1,2)"');
  });
});