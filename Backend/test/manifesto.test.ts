import { describe, it, expect } from 'vitest';
import { ManifestoValidator } from '../api/jogos/validators/manifesto.validator.js';
import { JogoController } from '../api/jogos/controllers/jogo.controller.js';
import { Request, Response } from 'express';

describe('Card 2.2 — Leitura e Validação do Manifesto de Jogos (RNF02)', () => {
  const manifestoValido = {
    id_jogo: 'game-core-01',
    nome: 'Aventura Cognitiva',
    versao: '1.0.0',
    metricas_suportadas: [
      {
        id_metrica: 'tempo_resposta',
        tipo_metrica: 'numerica',
        unidade: 'segundos'
      },
      {
        id_metrica: 'nivel_frustracao',
        tipo_metrica: 'categorica',
        valores: ['baixo', 'medio', 'alto']
      }
    ]
  };

  describe('ManifestoValidator: Regras do Schema Contrato 1', () => {
    it('deve aprovar um manifesto em total conformidade com o contrato', () => {
      const resultado = ManifestoValidator.validar(manifestoValido);
      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);
      expect(resultado.manifestoValido).toBeDefined();
      expect(resultado.manifestoValido?.id_jogo).toBe('game-core-01');
    });

    it('deve rejeitar se o manifesto não for um objeto JSON válido', () => {
      expect(ManifestoValidator.validar(null).valido).toBe(false);
      expect(ManifestoValidator.validar(undefined).valido).toBe(false);
      expect(ManifestoValidator.validar('string').valido).toBe(false);
      expect(ManifestoValidator.validar([1, 2, 3]).valido).toBe(false);
    });

    it('deve rejeitar quando campos obrigatórios raiz estiverem ausentes ou vazios', () => {
      const semId = { ...manifestoValido, id_jogo: '' };
      const resId = ManifestoValidator.validar(semId);
      expect(resId.valido).toBe(false);
      expect(resId.erros.some(e => e.includes('id_jogo'))).toBe(true);

      const semNome = { ...manifestoValido, nome: '   ' };
      const resNome = ManifestoValidator.validar(semNome);
      expect(resNome.valido).toBe(false);
      expect(resNome.erros.some(e => e.includes('nome'))).toBe(true);

      const semVersao = { ...manifestoValido, versao: undefined };
      const resVersao = ManifestoValidator.validar(semVersao);
      expect(resVersao.valido).toBe(false);
      expect(resVersao.erros.some(e => e.includes('versao'))).toBe(true);
    });

    it('deve rejeitar quando metricas_suportadas for nulo, não for array ou for vazio', () => {
      const resVazio = ManifestoValidator.validar({ ...manifestoValido, metricas_suportadas: [] });
      expect(resVazio.valido).toBe(false);
      expect(resVazio.erros.some(e => e.includes('pelo menos uma métrica'))).toBe(true);

      const resNaoArray = ManifestoValidator.validar({ ...manifestoValido, metricas_suportadas: 'invalido' });
      expect(resNaoArray.valido).toBe(false);
      expect(resNaoArray.erros.some(e => e.includes('deve ser um array'))).toBe(true);
    });

    it('deve validar detalhadamente cada item do array de métricas', () => {
      const metricaSemId = {
        ...manifestoValido,
        metricas_suportadas: [{ tipo_metrica: 'numerica', unidade: 'segundos' }]
      };
      const resSemId = ManifestoValidator.validar(metricaSemId);
      expect(resSemId.valido).toBe(false);
      expect(resSemId.erros.some(e => e.includes('id_metrica'))).toBe(true);

      const metricaTipoInvalido = {
        ...manifestoValido,
        metricas_suportadas: [{ id_metrica: 'teste', tipo_metrica: 'qualquer_coisa' }]
      };
      const resTipoInvalido = ManifestoValidator.validar(metricaTipoInvalido);
      expect(resTipoInvalido.valido).toBe(false);
      expect(resTipoInvalido.erros.some(e => e.includes('tipo \'qualquer_coisa\' inválido'))).toBe(true);

      const categoricaSemValores = {
        ...manifestoValido,
        metricas_suportadas: [{ id_metrica: 'cat1', tipo_metrica: 'categorica' }]
      };
      const resCatSemValores = ManifestoValidator.validar(categoricaSemValores);
      expect(resCatSemValores.valido).toBe(false);
      expect(resCatSemValores.erros.some(e => e.includes('valores'))).toBe(true);
    });

    it('deve acumular múltiplos erros simultaneamente para relatório detalhado', () => {
      const manifestoCorrompido = {
        id_jogo: '',
        nome: '',
        versao: '',
        metricas_suportadas: [
          { id_metrica: '', tipo_metrica: 'invalido' }
        ]
      };
      const resultado = ManifestoValidator.validar(manifestoCorrompido);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('JogoController: Endpoints de Validação e Leitura de Manifesto', () => {
    it('validarManifesto: deve responder 200 OK com { valido: true } para payload válido', async () => {
      let statusCode = 200;
      let responseJson: any = null;

      const req = {
        body: manifestoValido
      } as unknown as Request;

      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          responseJson = data;
          return this;
        }
      } as unknown as Response;

      await JogoController.validarManifesto(req, res);

      expect(statusCode).toBe(200);
      expect(responseJson.valido).toBe(true);
      expect(responseJson.data.id_jogo).toBe('game-core-01');
    });

    it('validarManifesto: deve responder 400 Bad Request com lista detalhada de erros para payload inválido', async () => {
      let statusCode = 200;
      let responseJson: any = null;

      const req = {
        body: { id_jogo: 'incompleto' }
      } as unknown as Request;

      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          responseJson = data;
          return this;
        }
      } as unknown as Response;

      await JogoController.validarManifesto(req, res);

      expect(statusCode).toBe(400);
      expect(responseJson.valido).toBe(false);
      expect(responseJson.error).toBe('Manifesto do jogo inválido');
      expect(Array.isArray(responseJson.erros)).toBe(true);
      expect(responseJson.erros.length).toBeGreaterThan(0);
    });

    it('obterManifesto: deve retornar o manifesto do jogo e status de validação 200', async () => {
      let statusCode = 200;
      let responseJson: any = null;

      const req = {
        params: { id: '1' }
      } as unknown as Request;

      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          responseJson = data;
          return this;
        }
      } as unknown as Response;

      await JogoController.obterManifesto(req, res);

      expect(statusCode).toBe(200);
      expect(responseJson.data).toBeDefined();
      expect(responseJson.validacao.valido).toBe(true);
      expect(responseJson.validacao.erros).toHaveLength(0);
    });

    it('obterManifesto: deve responder 404 quando o jogo não existe', async () => {
      let statusCode = 200;
      let responseJson: any = null;

      const req = {
        params: { id: '99999' }
      } as unknown as Request;

      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          responseJson = data;
          return this;
        }
      } as unknown as Response;

      await JogoController.obterManifesto(req, res);

      expect(statusCode).toBe(404);
      expect(responseJson.error).toBe('Jogo não encontrado');
    });
  });
});
