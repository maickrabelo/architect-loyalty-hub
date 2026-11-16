/** Matches the recorded sale date to the selected calendar month. */
export function vendaNoMes(dataVenda: string, mes?: string): boolean {
  return !mes || dataVenda.slice(0, 7) === mes;
}