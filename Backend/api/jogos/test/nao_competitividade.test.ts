import { describe, it, expect } from 'vitest';
import { ManifestoValidator } from '../validators/manifesto.validator.js';
import { JogoModel } from '../models/jogo.model.js';
import { JogoService, JogoServiceError } from '../services/jogo.service.js';
import { JogoController } from '../controllers/jogo.controller.js';
import { Request, Response } from 'express';

describe('Diretriz Clínica de Não-Competitividade (Validação no Manifesto e Catálogo)', () => {
  const manifestoBaseValido = {
    id_jogo: 'jardim-sensorial',
    nome: 'Jardim Sensorial',
    versao: '1.0.0',
    objetivo_clinico: 'regulacao_emocional',
    foco_pedagogico: 'autorregulacao',
    cooperativo: true,
    adaptativo: true,
    mecanicas: ['estimulo_positivo', 'adaptativo', 'cooperacao'],
    metricas_suportadas: [
      {
        id_metrica: 'tempo_foco',
        tipo_metrica: 'numerica',
        unidade: 'segundos'
      },
      {
        id_metrica: 'estabilidade_emocional',
        tipo_metrica: 'categorica',
        valores: ['calmo', 'em_regulacao', 'agitado']
      }
    ]
  };

  describe('Critério 1: Rejeição de jogos que declarem mecânicas competitivas eliminatórias', () => {
    it('deve aprovar manifesto focado estritamente em estímulos positivos e cooperação', () => {
      const resultado = ManifestoValidator.validar(manifestoBaseValido);
      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);
      expect(resultado.manifestoValido).toBeDefined();
    });

    it('deve rejeitar quando flag booleana de competitividade for declarada (competitivo: true)', () => {
      const manifestoCompetitivo = {
        ...manifestoBaseValido,
        competitivo: true
      };
      const resultado = ManifestoValidator.validar(manifestoCompetitivo);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros.some(e => e.includes('Diretriz Clínica de Não-Competitividade'))).toBe(true);
      expect(resultado.erros.some(e => e.includes('modo competitivo'))).toBe(true);
    });

    it('deve rejeitar quando declarar mecânica eliminatória (eliminatorio: true)', () => {
      const manifestoEliminatorio = {
        ...manifestoBaseValido,
        eliminatorio: true
      };
      const resultado = ManifestoValidator.validar(manifestoEliminatorio);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros.some(e => e.includes('mecânica eliminatória'))).toBe(true);
    });

    it('deve rejeitar quando declarar ranking ou leaderboard (ranking: true / leaderboard: true)', () => {
      const manifestoRanking = {
        ...manifestoBaseValido,
        ranking: true
      };
      const resRanking = ManifestoValidator.validar(manifestoRanking);
      expect(resRanking.valido).toBe(false);
      expect(resRanking.erros.some(e => e.includes('ranking'))).toBe(true);

      const manifestoLeaderboard = {
        ...manifestoBaseValido,
        leaderboard: true
      };
      const resLeaderboard = ManifestoValidator.validar(manifestoLeaderboard);
      expect(resLeaderboard.valido).toBe(false);
      expect(resLeaderboard.erros.some(e => e.includes('leaderboard'))).toBe(true);
    });

    it('deve rejeitar quando declarar mecânicas punitivas (punitivo: true / morte_subita: true / derrota_punitiva: true)', () => {
      const manifestoPunitivo = {
        ...manifestoBaseValido,
        punitivo: true,
        morte_subita: true
      };
      const resultado = ManifestoValidator.validar(manifestoPunitivo);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros.some(e => e.includes('punição ou penalidade severa'))).toBe(true);
      expect(resultado.erros.some(e => e.includes('morte súbita'))).toBe(true);
    });

    it('deve rejeitar quando o campo "modo" ou "modo_jogo" declarar modo competitivo ou versus/pvp', () => {
      const manifestoModoPvp = {
        ...manifestoBaseValido,
        modo: 'pvp'
      };
      const resPvp = ManifestoValidator.validar(manifestoModoPvp);
      expect(resPvp.valido).toBe(false);
      expect(resPvp.erros.some(e => e.includes('pvp'))).toBe(true);

      const manifestoVersus = {
        ...manifestoBaseValido,
        modo_jogo: 'competitivo_versus'
      };
      const resVersus = ManifestoValidator.validar(manifestoVersus);
      expect(resVersus.valido).toBe(false);
      expect(resVersus.erros.some(e => e.includes('competitivo'))).toBe(true);
    });

    it('deve rejeitar quando a coleção de tags ou mecânicas contiver termos eliminatórios ou punitivos', () => {
      const manifestoComMecanicaProibida = {
        ...manifestoBaseValido,
        mecanicas: ['estimulo_positivo', 'morte_subita', 'cooperacao']
      };
      const resultado = ManifestoValidator.validar(manifestoComMecanicaProibida);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros.some(e => e.includes('morte_subita'))).toBe(true);
    });

    it('deve rejeitar quando metricas_suportadas incluírem métricas de ranking ou eliminação punitiva', () => {
      const manifestoMetricaRanking = {
        ...manifestoBaseValido,
        metricas_suportadas: [
          ...manifestoBaseValido.metricas_suportadas,
          {
            id_metrica: 'posicao_ranking_geral',
            tipo_metrica: 'numerica',
            unidade: 'posicao'
          }
        ]
      };
      const resultado = ManifestoValidator.validar(manifestoMetricaRanking);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros.some(e => e.includes('posicao_ranking_geral'))).toBe(true);
      expect(resultado.erros.some(e => e.includes('Diretriz Clínica de Não-Competitividade'))).toBe(true);
    });

    it('JogoService: deve lançar JogoServiceError com HTTP 422 para manifestos não conformes', async () => {
      const manifestoInvalido = {
        ...manifestoBaseValido,
        eliminatorio: true,
        ranking: true
      };

      try {
        JogoService.validarManifesto(manifestoInvalido);
        expect.unreachable('Deveria ter lançado JogoServiceError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(JogoServiceError);
        const erro = err as JogoServiceError;
        expect(erro.statusCode).toBe(422);
        expect(erro.regraViolada).toBe('Diretriz Clínica de Não-Competitividade - Foco em Cooperação e Autorregulação');
        expect(erro.message).toContain('Diretriz Clínica de Não-Competitividade');
      }
    });

    it('JogoController.validarManifesto: deve responder HTTP 422 com envelope detalhando violação clínica', async () => {
      let statusCode = 200;
      let responseJson: Record<string, any> = {};

      const req = {
        body: {
          manifesto: {
            ...manifestoBaseValido,
            ranking: true,
            punitivo: true
          }
        }
      } as unknown as Request;

      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: Record<string, any>) {
          responseJson = data;
          return this;
        }
      } as unknown as Response;

      await JogoController.validarManifesto(req, res);

      expect(statusCode).toBe(422);
      expect(responseJson.regraViolada).toBe('Diretriz Clínica de Não-Competitividade - Foco em Cooperação e Autorregulação');
      expect(Array.isArray(responseJson.erros)).toBe(true);
      expect(responseJson.erros.length).toBeGreaterThanOrEqual(1);
    });

    it('JogoModel.criar: deve barrar e lançar exceção ao tentar criar jogo com mecânicas competitivas', async () => {
      await expect(
        JogoModel.criar({
          nome: 'Jogo Competitivo Proibido',
          descricao: 'Jogo com disputa e ranking',
          versao: '1.0.0',
          status_jogo: 'ativo',
          manifesto_json: {
            ...manifestoBaseValido,
            id_jogo: 'jogo-competitivo-proibido',
            competitivo: true
          }
        })
      ).rejects.toThrow('Diretriz Clínica de Não-Competitividade');
    });
  });

  describe('Critério 2: Catálogo focado em estímulos positivos e adaptativos', () => {
    it('todos os jogos do catálogo padrão devem cumprir a Diretriz de Não-Competitividade', async () => {
      const resultado = await JogoModel.listar();
      expect(resultado.data.length).toBeGreaterThanOrEqual(3);

      for (const jogoResumo of resultado.data) {
        const jogoCompleto = await JogoModel.buscarPorId(jogoResumo.id);
        expect(jogoCompleto).toBeDefined();
        const conf = ManifestoValidator.verificarConformidadeNaoCompetitividade(jogoCompleto!.manifesto_json);
        expect(conf.conforme).toBe(true);
        expect(conf.violacoes).toHaveLength(0);
        expect(jogoCompleto!.manifesto_json.cooperativo).toBe(true);
        expect(jogoCompleto!.manifesto_json.adaptativo).toBe(true);
      }
    });

    it('JogoModel.listar: deve filtrar e ocultar jogos não conformes garantindo catálogo clínico seguro', async () => {
      // Injeta temporariamente um jogo não-conforme no fallback em memória
      const jogoInvalido = {
        id: 'jogo-competitivo-injetado',
        nome: 'Jogo Injetado Incorreto',
        descricao: 'Teste de defesa em profundidade',
        versao: '1.0.0',
        status_jogo: 'ativo' as const,
        manifesto_json: {
          ...manifestoBaseValido,
          id_jogo: 'jogo-injetado-incorreto',
          ranking: true,
          mecanica_competitiva: true
        }
      };

      // Forçamos inserção direta no array interno de fallback para simular dado corrompido em banco
      (JogoModel as unknown as { fallbackJogos: unknown[] }).fallbackJogos.push(jogoInvalido);

      const listaSanitizada = await JogoModel.listar();
      const encontrouInvalido = listaSanitizada.data.some(j => j.id === 'jogo-competitivo-injetado');
      expect(encontrouInvalido).toBe(false);

      // buscarPorId também deve ocultar o jogo não conforme
      const buscaInvalido = await JogoModel.buscarPorId('jogo-competitivo-injetado');
      expect(buscaInvalido).toBeUndefined();

      // Limpeza
      const idx = (JogoModel as unknown as { fallbackJogos: Array<{ id: string | number }> }).fallbackJogos.findIndex(
        j => j.id === 'jogo-competitivo-injetado'
      );
      if (idx !== -1) {
        (JogoModel as unknown as { fallbackJogos: unknown[] }).fallbackJogos.splice(idx, 1);
      }
    });

    it('JogoModel.listar: deve suportar busca filtrada por foco pedagógico e estímulos adaptativos', async () => {
      const resultadoFoco = await JogoModel.listar({ foco: 'foco_atencional' });
      expect(resultadoFoco.data.length).toBeGreaterThanOrEqual(1);
      expect(resultadoFoco.data.some(j => j.nome === 'Aventura das Cores')).toBe(true);

      const resultadoAdaptativo = await JogoModel.listar({ adaptativo: true });
      expect(resultadoAdaptativo.data.length).toBeGreaterThanOrEqual(3);

      const resultadoCooperativo = await JogoModel.listar({ cooperativo: true });
      expect(resultadoCooperativo.data.length).toBeGreaterThanOrEqual(3);
    });

    it('JogoController.cadastrar: deve aceitar jogo cooperativo e adaptativo com HTTP 201', async () => {
      let statusCode = 200;
      let responseJson: Record<string, any> = {};

      const req = {
        body: {
          nome: 'Cores e Sons Cooperativos',
          descricao: 'Estímulo positivo e adaptativo com tolerância ao erro.',
          versao: '1.0.0',
          objetivo_clinico: 'regulacao_emocional',
          foco_pedagogico: 'cooperacao',
          cooperativo: true,
          adaptativo: true,
          mecanicas: ['estimulo_positivo', 'adaptativo'],
          metricas_suportadas: [
            {
              id_metrica: 'engajamento_positivo',
              tipo_metrica: 'numerica',
              unidade: 'pontos'
            }
          ]
        }
      } as unknown as Request;

      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: Record<string, any>) {
          responseJson = data;
          return this;
        }
      } as unknown as Response;

      await JogoController.cadastrar(req, res);

      expect(statusCode).toBe(201);
      expect(responseJson.message).toBe('Jogo cadastrado com sucesso.');
      expect(responseJson.data.manifesto.validacao.valido).toBe(true);
      expect(responseJson.data.manifesto.validacao.erros).toHaveLength(0);
    });
  });
});
