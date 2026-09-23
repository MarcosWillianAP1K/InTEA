import { describe, it, expect } from 'vitest';
import {
  formatarCPF,
  formatarCEP,
  formatarTelefone,
  apenasDigitos,
} from '../utils/formatters.js';

describe('Core Utils: Formatadores (formatters.ts)', () => {
  describe('apenasDigitos', () => {
    it('deve extrair apenas os números de strings com pontuação', () => {
      expect(apenasDigitos('123.456.789-00')).toBe('12345678900');
      expect(apenasDigitos('+55 (11) 98765-4321')).toBe('5511987654321');
      expect(apenasDigitos('01310-100')).toBe('01310100');
    });
  });

  describe('formatarCPF', () => {
    it('deve formatar CPF sem máscara para o padrão 000.000.000-00', () => {
      expect(formatarCPF('52998224725')).toBe('529.982.247-25');
    });

    it('deve manter CPF que já está no formato correto', () => {
      expect(formatarCPF('529.982.247-25')).toBe('529.982.247-25');
    });
  });

  describe('formatarCEP', () => {
    it('deve formatar CEP sem hífen para o padrão 00000-000', () => {
      expect(formatarCEP('01310100')).toBe('01310-100');
    });

    it('deve manter CEP que já possui hífen', () => {
      expect(formatarCEP('01310-100')).toBe('01310-100');
    });
  });

  describe('formatarTelefone', () => {
    it('deve formatar número sem DDI adicionando +55 e o formato +55 (XX) 9XXXX-XXXX', () => {
      expect(formatarTelefone('11987654321')).toBe('+55 (11) 98765-4321');
    });

    it('deve formatar número já contendo DDI 55', () => {
      expect(formatarTelefone('5511987654321')).toBe('+55 (11) 98765-4321');
      expect(formatarTelefone('+5511987654321')).toBe('+55 (11) 98765-4321');
    });

    it('deve manter e padronizar número que já tenha parte da máscara', () => {
      expect(formatarTelefone('(84) 99876-1234')).toBe('+55 (84) 99876-1234');
      expect(formatarTelefone('+55 (84) 99876-1234')).toBe('+55 (84) 99876-1234');
    });
  });
});
