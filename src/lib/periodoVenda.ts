const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Lojistas: até o dia 05 podem lançar vendas do mês anterior; depois, só do mês vigente. Nunca datas futuras. */
export function periodoPermitidoVenda(hoje: Date = new Date()) {
  const inicio = hoje.getDate() <= 5
    ? new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    : new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return { min: iso(inicio), max: iso(hoje) };
}

export function dataVendaPermitida(data: string, hoje: Date = new Date()) {
  const { min, max } = periodoPermitidoVenda(hoje);
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && data >= min && data <= max;
}
