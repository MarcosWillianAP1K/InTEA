import { describe, it, expect } from 'vitest';
import {
  validarCPF,
  validarCEP,
  validarTelefone,
  validarDataNascimento,
  validarCriarPacienteDTO,
  validarAtualizarPacienteDTO,
} from '../utils/validators.js';

describe('Core Utils: Validações (validators.ts)', () => {
  describe('validarCPF (Algoritmo Módulo 11)', () => {
    it('deve validar CPFs autênticos com e sem pontuação', () => {
      // CPFs válidos conhecidos para testes
      expect(validarCPF('529.982.247-25')).toBe(true);
      expect(validarCPF('52998224725')).toBe(true);
      expect(validarCPF('364.721.890-13')).toBe(true);
    });

    it('deve rejeitar CPFs com dígitos verificadores incorretos', () => {
      expect(validarCPF('123.456.789-00')).toBe(false);
      expect(validarCPF('529.982.247-99')).toBe(false);
    });

    it('deve rejeitar sequências de números repetidos', () => {
      expect(validarCPF('000.000.000-00')).toBe(false);
      expect(validarCPF('111.111.111-11')).toBe(false);
      expect(validarCPF('999.999.999-99')).toBe(false);
    });

    it('deve rejeitar entradas vazias ou com tamanho inválido', () => {
      expect(validarCPF('')).toBe(false);
      expect(validarCPF('123')).toBe(false);
      expect(validarCPF('1234567890123')).toBe(false);
    });
  });

  describe('validarCEP', () => {
    it('deve aceitar CEPs válidos com e sem hífen', () => {
      expect(validarCEP('01310-100')).toBe(true);
      expect(validarCEP('01310100')).toBe(true);
      expect(validarCEP('59000-000')).toBe(true);
    });

    it('deve rejeitar CEPs inválidos', () => {
      expect(validarCEP('123')).toBe(false);
      expect(validarCEP('01310-1000')).toBe(false);
      expect(validarCEP('')).toBe(false);
    });
  });

  describe('validarTelefone', () => {
    it('deve aceitar celulares válidos com DDD e o dígito 9', () => {
      expect(validarTelefone('+55 (11) 98765-4321')).toBe(true);
      expect(validarTelefone('11987654321')).toBe(true);
      expect(validarTelefone('+5511987654321')).toBe(true);
      expect(validarTelefone('(84) 99876-1234')).toBe(true);
    });

    it('deve rejeitar telefones sem o dígito 9 na frente', () => {
      expect(validarTelefone('11887654321')).toBe(false); // Não começa com 9
      expect(validarTelefone('(11) 3344-5566')).toBe(false); // Telefone fixo
    });

    it('deve rejeitar telefones com DDD inválido ou quantidade incorreta de dígitos', () => {
      expect(validarTelefone('00987654321')).toBe(false); // DDD 00 inválido
      expect(validarTelefone('12345678')).toBe(false); // Curto demais
      expect(validarTelefone('')).toBe(false);
    });
  });

  describe('validarDataNascimento', () => {
    it('deve validar datas no passado reais', () => {
      expect(validarDataNascimento('2018-05-15').valida).toBe(true);
      expect(validarDataNascimento('2020-02-29').valida).toBe(true); // Ano bissexto
    });

    it('deve rejeitar datas inexistentes no calendário', () => {
      const res = validarDataNascimento('2021-02-29'); // Não é bissexto
      expect(res.valida).toBe(false);
      expect(res.erro).toContain('inexistente');
    });

    it('deve rejeitar datas no futuro', () => {
      const futuro = new Date();
      futuro.setFullYear(futuro.getFullYear() + 1);
      const strFuturo = futuro.toISOString().split('T')[0];

      const res = validarDataNascimento(strFuturo);
      expect(res.valida).toBe(false);
      expect(res.erro).toContain('futuro');
    });

    it('deve rejeitar formato inválido', () => {
      expect(validarDataNascimento('15/05/2018').valida).toBe(false);
      expect(validarDataNascimento('').valida).toBe(false);
    });
  });

  describe('validarCriarPacienteDTO', () => {
    it('deve aprovar payload válido de paciente', () => {
      const payload = {
        nome: 'Lucas Gabriel Silveira',
        data_nascimento: '2019-07-20',
        cpf: '529.982.247-25',
        cep: '01310-100',
        telefone: '(11) 98765-4321',
      };

      const res = validarCriarPacienteDTO(payload);
      expect(res.valido).toBe(true);
      expect(res.erros).toHaveLength(0);
    });

    it('deve reprovar payload com CPF inválido e data no futuro', () => {
      const payload = {
        nome: 'Lucas Gabriel',
        data_nascimento: '2099-01-01',
        cpf: '111.111.111-11',
      };

      const res = validarCriarPacienteDTO(payload);
      expect(res.valido).toBe(false);
      expect(res.erros.some((e) => e.includes('CPF'))).toBe(true);
      expect(res.erros.some((e) => e.includes('futuro'))).toBe(true);
    });

    it('deve validar responsável opcional se presente', () => {
      const payload = {
        nome: 'Lucas Gabriel',
        data_nascimento: '2019-07-20',
        cpf: '529.982.247-25',
        responsavel: {
          nome: 'M', // Curto demais
          cpf: '000.000.000-00', // Inválido
          telefone: '123', // Curto
        },
      };

      const res = validarCriarPacienteDTO(payload);
      expect(res.valido).toBe(false);
      expect(res.erros.some((e) => e.includes('responsável'))).toBe(true);
    });
  });

  describe('validarAtualizarPacienteDTO', () => {
    it('deve aprovar atualização parcial válida', () => {
      const payload = {
        telefone: '11987654321',
        cep: '01310-100',
      };

      const res = validarAtualizarPacienteDTO(payload);
      expect(res.valido).toBe(true);
      expect(res.erros).toHaveLength(0);
    });

    it('deve reprovar atualização com telefone inválido e CEP inválido', () => {
      const payload = {
        telefone: '11887654321', // sem dígito 9
        cep: '123', // CEP inválido
      };

      const res = validarAtualizarPacienteDTO(payload);
      expect(res.valido).toBe(false);
      expect(res.erros.some((e) => e.includes('telefone'))).toBe(true);
      expect(res.erros.some((e) => e.includes('CEP'))).toBe(true);
    });
  });
});

