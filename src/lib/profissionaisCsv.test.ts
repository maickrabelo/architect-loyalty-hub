/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { COLUNAS_PROFISSIONAIS, gerarProfissionaisCsv, type ContatoProfissional } from "./profissionaisCsv";

const contato = Object.fromEntries(COLUNAS_PROFISSIONAIS.map(([campo]) => [campo, null])) as ContatoProfissional;

describe("exportação dos contatos cadastrados", () => {
  test("inclui nome, telefones, endereço e e-mail de cada profissional, sem documentos ou notas internas", () => {
    const csv = gerarProfissionaisCsv([{ ...contato, nome: "Ana", telefone: "3433334444", celular: "34999998888", email: "ana@example.com", endereco: "Rua das Flores", numero: "12", cep: "01234-567" }]);
    for (const valor of ["Ana", "3433334444", "34999998888", "ana@example.com", "Rua das Flores", "01234-567"]) expect(csv).toContain(valor);
    expect(COLUNAS_PROFISSIONAIS.map(([campo]) => campo)).not.toContain("cnpj_cpf");
    expect(COLUNAS_PROFISSIONAIS.map(([campo]) => campo)).not.toContain("observacao");
  });
  test("preserva todos os registros e acentos sem depender da paginação", () => {
    const csv = gerarProfissionaisCsv(Array.from({ length: 25 }, (_, i) => ({ ...contato, nome: `João ${i}` })));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(26);
    expect(csv).toContain("João 24");
  });
  test("escapa aspas e separadores e neutraliza fórmulas", () => {
    const csv = gerarProfissionaisCsv([{ ...contato, nome: 'Ana; "Silva"', endereco: "=SUM(1,2)", telefone: "+5534999998888" }]);
    expect(csv).toContain('"Ana; ""Silva"""');
    expect(csv).toContain('"\'=SUM(1,2)"');
    expect(csv).toContain('"\'+5534999998888"');
  });
});