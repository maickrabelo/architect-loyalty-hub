// Ordenação alfabética compartilhada: listas de empresas e relatórios saem em A→Z.
// sensitivity "base" trata maiúsculas/minúsculas e acentos como a mesma letra,
// numeric ordena "Casa 2" antes de "Casa 10".
export const porNome = (a?: string | null, b?: string | null): number =>
  (a ?? "").localeCompare(b ?? "", "pt-BR", { sensitivity: "base", numeric: true });

export const ordenarPorNome = <T>(
  itens: readonly T[],
  nome: (item: T) => string | null | undefined,
): T[] => [...itens].sort((a, b) => porNome(nome(a), nome(b)));
