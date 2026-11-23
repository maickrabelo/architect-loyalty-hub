import { expect, test } from "bun:test";
import { indicadoresDaLoja, selecionarIndicadores } from "./indicadoresLojista";

const loja = indicadoresDaLoja([
  { arquiteto_id: "ana", data_venda: "2026-11-01", valor_venda: 1999, pontos_calculados: 1 },
  { arquiteto_id: "ana", data_venda: "2026-11-02", valor_venda: 1999, pontos_calculados: 1 },
  { arquiteto_id: "ana", data_venda: "2025-11-01", valor_venda: 90000, pontos_calculados: 90 },
], [{ id: "ana", nome: "Ana" }], 2026);

test("Minha loja mantém apenas sua campanha e soma os pontos registrados", () => {
  expect(loja.ranking).toEqual([{ id: "ana", nome: "Ana", vendas: 3998, pontos: 2, empresas: 1 }]);
  expect(loja.vendas.length).toBe(2);
});
test("a chavinha seleciona os números da loja ou os gerais, sem somá-los", () => {
  const grupo = { vendas: [], ranking: [{ id: "ana", nome: "Ana", vendas: 12000, pontos: 12, empresas: 3 }] };
  expect(selecionarIndicadores(false, loja, grupo).ranking[0].pontos).toBe(2);
  expect(selecionarIndicadores(true, loja, grupo).ranking[0].pontos).toBe(12);
});
test("grupo ainda não carregado não exibe dados da loja como gerais", () => {
  expect(selecionarIndicadores(true, loja).ranking).toEqual([]);
});