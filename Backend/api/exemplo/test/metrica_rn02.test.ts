import { describe, it, expect } from 'vitest';
import { MetricaValidator } from '../api/jogos/validators/metrica.validator.js';
import { ManifestoValidator } from '../api/jogos/validators/manifesto.validator.js';
import { JogoController } from '../api/jogos/controllers/jogo.controller.js';
import { ManifestoJogo } from '../api/jogos/models/jogo.model.js';
import { Request, Response } from 'express';

describe('Card 2.3 — Validação Estrita de Tipagem de Métricas (RN02 / RNF04)', () => {
  const manifestoTeste: ManifestoJogo = {
    id_jogo: 'jogo-teste-tipagem',
    nome: 'Jogo Teste de Tipagem',
    versao: '1.0.0',
    metricas_suportadas: [
      {
        id_metrica: 'tempo_reacao',
        tipo_metrica: 'numerica',
        unidade: 'segundos'
      },
      {
        id_metrica: 'estado_emocional',
        tipo_metrica: 'categorica',
        valores: ['calmo', 'agitado', 'frustrado']
      }
    ]
  };

  describe('Critério 1: Sem conversão/fallback automático para categórica', () => {
    it('não deve converter automaticamente métrica sem tipo em categórica', () => {
      const metricaSemTipo = {
        id_metrica: 'metrica_sem_tipo'
      };

      const validacao = MetricaValidator.validarTipagemEstrita(metricaSemTipo);
      expect(validacao.valido).toBe(false);
      expect(validacao.erro).toContain('RN02');
      expect(validacao.erro).toContain('proibido fallback automático');
    });

    it('deve rejeitar tipos desconhecidos como boolean, texto livre ou customizado', () => {
      const metricaTipoInvalido = {
        id_metrica: 'metrica_booleana',
        tipo_metrica: 'booleana'
      };

      const validacao = MetricaValidator.validarTipagemEstrita(metricaTipoInvalido);
      expect(validacao.valido).toBe(false);
      expect(validacao.erro).toContain("tipo inválido 'booleana'");
    });
  });

  describe('Critério 2: Métricas sem tipo são rejeitadas na validação do manifesto', () => {
    it('deve rejeitar manifesto contendo métrica sem tipo_metrica', () => {
      const manifestoComMetricaSemTipo = {
        ...manifestoTeste,
        metricas_suportadas: [
          { id_metrica: 'tempo_reacao', tipo_metrica: 'numerica' },
          { id_metrica: 'metrica_indefinida' } // Sem tipo!
        ]
      };

      const resultado = ManifestoValidator.validar(manifestoComMetricaSemTipo);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros.some(e => e.includes('RN02: proibido fallback automático'))).toBe(true);
    });

    it('deve rejeitar manifesto contendo métrica com tipo_metrica nulo ou vazio', () => {
      const manifestoComMetricaVazia = {
        ...manifestoTeste,
        metricas_suportadas: [
          { id_metrica: 'metrica_nula', tipo_metrica: null }
        ]
      };

      const resultado = ManifestoValidator.validar(manifestoComMetricaVazia);
      expect(resultado.valido).toBe(false);
    });
  });

  describe('Critério 3: Telemetrias de métricas sem tipo não são gravadas no prontuário', () => {
    it('deve bloquear gravação no prontuário se a métrica não for homologada no manifesto', () => {
      const telemetriaNaoDeclarada = {
        token_sessao: 'sessao-123',
        data_hora: '2026-09-21T10:00:00Z',
        tipo_evento: 'interacao_paciente',
        dados: {
          id_metrica: 'metrica_fantasma_nao_declarada',
          valor: 10
        }
      };

      const resultado = MetricaValidator.validarGravacaoProntuario(telemetriaNaoDeclarada, manifestoTeste);
      expect(resultado.podeGravar).toBe(false);
      expect(resultado.erro).toContain('não encontrada no manifesto do jogo');
    });

    it('deve bloquear gravação se a métrica no manifesto estiver sem tipo válido', () => {
      const manifestoIncompleto: any = {
        ...manifestoTeste,
        metricas_suportadas: [
          { id_metrica: 'metrica_corrompida' } // Sem tipo_metrica
        ]
      };

      const telemetria = {
        token_sessao: 'sessao-123',
        data_hora: '2026-09-21T10:00:00Z',
        tipo_evento: 'interacao_paciente',
        dados: {
          id_metrica: 'metrica_corrompida',
          valor: 'qualquer'
        }
      };

      const resultado = MetricaValidator.validarGravacaoProntuario(telemetria, manifestoIncompleto);
      expect(resultado.podeGravar).toBe(false);
      expect(resultado.erro).toContain('Violação da RN02');
    });

    it('deve bloquear gravação se métrica numérica receber string como valor', () => {
      const telemetriaValorIncorreto = {
        token_sessao: 'sessao-123',
        data_hora: '2026-09-21T10:00:00Z',
        tipo_evento: 'interacao_paciente',
        dados: {
          id_metrica: 'tempo_reacao',
          valor: 'rapido' // Deveria ser number
        }
      };

      const resultado = MetricaValidator.validarGravacaoProntuario(telemetriaValorIncorreto, manifestoTeste);
      expect(resultado.podeGravar).toBe(false);
      expect(resultado.erro).toContain('recebeu valor não numérico');
    });

    it('deve bloquear gravação se métrica categórica receber valor fora do domínio homologado', () => {
      const telemetriaValorInvalido = {
        token_sessao: 'sessao-123',
        data_hora: '2026-09-21T10:00:00Z',
        tipo_evento: 'interacao_paciente',
        dados: {
          id_metrica: 'estado_emocional',
          valor: 'eufórico' // Não está em ['calmo', 'agitado', 'frustrado']
        }
      };

      const resultado = MetricaValidator.validarGravacaoProntuario(telemetriaValorInvalido, manifestoTeste);
      expect(resultado.podeGravar).toBe(false);
      expect(resultado.erro).toContain('não pertence ao domínio permitido');
    });

    it('deve autorizar a gravação no prontuário quando a métrica for válida e o valor compatível', () => {
      const telemetriaValida = {
        token_sessao: 'sessao-123',
        data_hora: '2026-09-21T10:00:00Z',
        tipo_evento: 'interacao_paciente',
        dados: {
          id_metrica: 'tempo_reacao',
          valor: 2.35
        }
      };

      const resultado = MetricaValidator.validarGravacaoProntuario(telemetriaValida, manifestoTeste);
      expect(resultado.podeGravar).toBe(true);
      expect(resultado.tipoDetectado).toBe('numerica');
    });
  });

  describe('Endpoint POST /jogos/:id/validar-telemetria', () => {
    it('deve retornar 200 OK com podeGravar: true para telemetria válida', async () => {
      let statusCode = 200;
      let responseJson: any = null;

      const req = {
        params: { id: '1' }, // Aventura das Cores
        body: {
          token_sessao: 'tok-123',
          data_hora: '2026-09-21T10:00:00Z',
          tipo_evento: 'interacao_paciente',
          dados: {
            id_metrica: 'tempo_resposta',
            valor: 1.5
          }
        }
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

      await JogoController.validarTelemetria(req, res);

      expect(statusCode).toBe(200);
      expect(responseJson.podeGravar).toBe(true);
      expect(responseJson.tipoDetectado).toBe('numerica');
    });

    it('deve retornar 422 Unprocessable Entity com regraViolada: RN02 para telemetria incompatível', async () => {
      let statusCode = 200;
      let responseJson: any = null;

      const req = {
        params: { id: '1' },
        body: {
          token_sessao: 'tok-123',
          data_hora: '2026-09-21T10:00:00Z',
          tipo_evento: 'interacao_paciente',
          dados: {
            id_metrica: 'nivel_frustracao',
            valor: 'desconhecido_fora_do_dominio'
          }
        }
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

      await JogoController.validarTelemetria(req, res);

      expect(statusCode).toBe(422);
      expect(responseJson.podeGravar).toBe(false);
      expect(responseJson.regraViolada).toContain('RN02');
    });
  });
});
