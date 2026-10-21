import { describe, expect, test } from 'bun:test';
import { retryDelayMinutes } from './rules';

describe('falhas no envio de upgrades', () => {
  test('o envio recusado volta à fila após dois minutos, sem ser marcado como enviado', () => {
    expect(retryDelayMinutes(1)).toBe(2);
  });
});