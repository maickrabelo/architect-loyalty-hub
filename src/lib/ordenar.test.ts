import { test, expect } from "bun:test";
import { ordenarPorNome, porNome } from "./ordenar";

test("ordena empresas em A→Z ignorando maiúsculas e acentos", () => {
  const nomes = [
    "Rogério Marzola",
    "Carré Arte em Mármore e Granito Ltda",
    "Design center",
    "ELETRO FONTE",
    "Antonelli Esquadrias",
    "Casa Decor",
    "IGUATEMI COLCHÕES E SOFÁS LTDA",
    "Hidráulica Uberaba",
  ];
  expect(ordenarPorNome(nomes, (n) => n)).toEqual([
    "Antonelli Esquadrias",
    "Carré Arte em Mármore e Granito Ltda",
    "Casa Decor",
    "Design center",
    "ELETRO FONTE",
    "Hidráulica Uberaba",
    "IGUATEMI COLCHÕES E SOFÁS LTDA",
    "Rogério Marzola",
  ]);
});

test("ordenarPorNome usa o nome informado e não altera o array original", () => {
  const faturas = [
    { id: "1", empresas: { nome: "Tomazini Tintas" } },
    { id: "2", empresas: { nome: "antonelli esquadrias" } },
    { id: "3", empresas: { nome: "Casa Decor" } },
  ];
  const ordenado = ordenarPorNome(faturas, (f) => f.empresas?.nome);
  expect(ordenado.map((f) => f.empresas.nome)).toEqual([
    "antonelli esquadrias",
    "Casa Decor",
    "Tomazini Tintas",
  ]);
  expect(faturas[0].empresas.nome).toBe("Tomazini Tintas");
});

test("trata nomes vazios ou ausentes sem quebrar a ordenação", () => {
  const linhas = [{ nome: null }, { nome: "Reginez" }, { nome: "" }, { nome: "área" }];
  expect(ordenarPorNome(linhas, (l) => l.nome).map((l) => l.nome)).toEqual([
    null,
    "",
    "área",
    "Reginez",
  ]);
});

test("porNome mantém a ordem quando os dois nomes são iguais", () => {
  expect(porNome("Casa Decor", "Casa Decor")).toBe(0);
});
