import { describe, expect, test } from "bun:test";
import { vendaNoMes } from "./filtroVendasMes";

describe("consulta mensal de pontos", () => {
  test("mostra somente lançamentos do mês selecionado", () => {
    expect(vendaNoMes("2026-10-01", "2026-10")).toBe(true);
    expect(vendaNoMes("2026-10-31", "2026-10")).toBe(true);
    expect(vendaNoMes("2026-09-30", "2026-10")).toBe(false);
    expect(vendaNoMes("2026-11-01", "2026-10")).toBe(false);
    expect(vendaNoMes("2025-10-15", "2026-10")).toBe(false);
  });

  test("mantém a consulta do gestor sem restrição de mês", () => {
    expect(vendaNoMes("2026-09-30")).toBe(true);
    expect(vendaNoMes("2026-11-01")).toBe(true);
  });
});