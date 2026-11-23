import { describe, expect, test } from "bun:test";
import { agruparVendasCampanha, compararCampanhas, comparativoCsv, totalComparavel, variacaoMensal } from "./campanhasComparativo";

describe("campanhas anuais independentes", () => {
  test("2024 e 2025 permanecem separados e comparados pelo mesmo mês", () => {
    const rows = compararCampanhas([{ ano: 2024, mes: 1, valor_vendido: 3096683.31 }, { ano: 2025, mes: 1, valor_vendido: 2543343.21 }, { ano: 2026, mes: 1, valor_vendido: 999999 }, { ano: 2025, mes: 2, valor_vendido: 3176461.11 }], 2024, 2025);
    expect(rows[0].base).toBe(3096683.31);
    expect(rows[0].comparada).toBe(2543343.21);
    expect(rows[0].variacao).toBeCloseTo(-17.868822, 4);
    expect(rows[1].base).toBeNull();
    expect(totalComparavel(rows)).toMatchObject({ base: 3096683.31, comparada: 2543343.21, meses: 1 });
  });
  test("histórico e demonstração não se misturam às vendas da campanha vigente", () => {
    const vendas = [{ data_venda: "2025-01-15", valor_venda: 500000, demo: false }, { data_venda: "2026-01-15", valor_venda: 19000, demo: false }, { data_venda: "2026-01-20", valor_venda: 160000, demo: true }];
    expect(agruparVendasCampanha(vendas, 2026, 1)).toEqual([{ ano: 2026, mes: 1, valor_vendido: 19000 }]);
  });
  test("exportação mantém colunas anuais e não transforma ausência em zero", () => {
    const csv = comparativoCsv(compararCampanhas([{ ano: 2024, mes: 1, valor_vendido: 3096683.31 }], 2024, 2025), 2024, 2025);
    expect(csv).toContain('"Janeiro";"3096683,31";"";""');
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });
  test("variação mês a mês é calculada separadamente dentro de 2024 e 2025", () => {
    const linhas = compararCampanhas([
      { ano: 2024, mes: 1, valor_vendido: 1000 }, { ano: 2024, mes: 2, valor_vendido: 1500 },
      { ano: 2025, mes: 1, valor_vendido: 2000 }, { ano: 2025, mes: 2, valor_vendido: 1000 },
      { ano: 2024, mes: 12, valor_vendido: 9000 },
    ], 2024, 2025);
    expect(variacaoMensal(linhas, "base").slice(0, 3)).toEqual([null, 50, null]);
    expect(variacaoMensal(linhas, "comparada").slice(0, 3)).toEqual([null, -50, null]);
  });
  test("base mensal zero não gera infinito e não há salto sobre mês ausente", () => {
    const linhas = compararCampanhas([
      { ano: 2024, mes: 1, valor_vendido: 0 }, { ano: 2024, mes: 2, valor_vendido: 100 },
      { ano: 2024, mes: 4, valor_vendido: 200 }, { ano: 2024, mes: 5, valor_vendido: 0 },
    ], 2024, 2025);
    expect(variacaoMensal(linhas, "base").slice(0, 5)).toEqual([null, null, null, null, -100]);
  });
});