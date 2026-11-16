import { expect, test } from 'bun:test';
import { calcularRelatorio, type FaturaRelatorio } from './financeiroRelatorioDados';
const fatura: FaturaRelatorio = { mes: '2026-10', pontos: 268, custo_pontos_total: 2680, valor_pontos_mes: 1340, valor_mensalidade: 1621, valor_extras: 0, valor_total: 2961, valor_pago: 0, vencimento: '2026-11-20', status: 'aberta', empresas: { nome: 'Antonelli', demo: false } };
test('relatório mantém valores bancários separados do caixa mensal', () => {
  const r = calcularRelatorio('2026-10', [fatura], [], [{ banco: 'BB', conta: '1642-X', saldo_conta: 4372.30, saldo_aplicado: 204618.02, atualizado_em: '2026-10-14' }]);
  expect(r.totalBanco).toBeCloseTo(208990.32, 2); expect(r.saldo).toBe(0); expect(r.faturado).toBe(2961);
});
test('nova consulta é refletida sem congelar os números anteriores', () => {
  expect(calcularRelatorio('2026-10', [fatura], [], []).recebidoFaturas).toBe(0);
  expect(calcularRelatorio('2026-10', [{ ...fatura, valor_pago: 1000 }], [], []).recebidoFaturas).toBe(1000);
});
test('não inclui dados demo nem faturas de outro mês no resultado mensal', () => {
  const r = calcularRelatorio('2026-10', [fatura, { ...fatura, empresas: { nome: 'Teste', demo: true } }, { ...fatura, mes: '2026-09' }], [], []);
  expect(r.faturado).toBe(2961); expect(r.doMes).toHaveLength(1); expect(r.anteriores).toHaveLength(1);
});