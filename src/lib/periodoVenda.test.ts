import { describe, it, expect } from "vitest";
import { dataVendaPermitida, periodoPermitidoVenda } from "./periodoVenda";

describe("período de lançamento de vendas", () => {
  it("até o dia 05 aceita o mês anterior", () => {
    const hoje = new Date(2026, 10, 5);
    expect(periodoPermitidoVenda(hoje)).toEqual({ min: "2026-10-01", max: "2026-11-05" });
    expect(dataVendaPermitida("2026-10-15", hoje)).toBe(true);
  });
  it("depois do dia 05 só o mês vigente", () => {
    const hoje = new Date(2026, 10, 6);
    expect(dataVendaPermitida("2026-10-31", hoje)).toBe(false);
    expect(dataVendaPermitida("2026-11-01", hoje)).toBe(true);
  });
  it("não aceita data futura", () => {
    expect(dataVendaPermitida("2026-11-04", new Date(2026, 10, 3))).toBe(false);
  });
});
