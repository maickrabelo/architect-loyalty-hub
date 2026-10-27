export const COLUNAS_PROFISSIONAIS = [
  ["nome", "Nome"], ["nome_divulgacao", "Nome de divulgação"],
  ["profissao", "Profissão"], ["email", "E-mail"],
  ["telefone", "Telefone"], ["celular", "Celular"],
  ["cep", "CEP"], ["endereco", "Endereço"], ["numero", "Número"],
  ["complemento", "Complemento"], ["bairro", "Bairro"],
  ["cidade", "Cidade"], ["estado", "Estado"],
  ["instagram", "Instagram"], ["facebook", "Facebook"],
] as const;

export type ContatoProfissional = Record<typeof COLUNAS_PROFISSIONAIS[number][0], string | null>;

function celula(valor: string | null): string {
  const texto = valor ?? "";
  // Prevent spreadsheet formulas from executing user-provided profile values.
  const seguro = /^[\s]*[=+@-]|^[\t\r\n]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replace(/"/g, '""')}"`;
}

export function gerarProfissionaisCsv(contatos: ContatoProfissional[]): string {
  const linhas = [COLUNAS_PROFISSIONAIS.map(([, titulo]) => celula(titulo)).join(";")];
  for (const contato of contatos) {
    linhas.push(COLUNAS_PROFISSIONAIS.map(([campo]) => celula(contato[campo])).join(";"));
  }
  return `\uFEFF${linhas.join("\r\n")}\r\n`;
}