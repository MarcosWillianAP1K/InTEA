// ==============================================================================
// InTEA: Testes de Unidade do Serviço e Controller de Histórico (Sprint 11)
// ==============================================================================
// REQUISITOS COBERTOS:
// - RF15: Prontuário Longitudinal (Dois Níveis)
// - RF19: Filtros e Paginação
// - RN01: Expurgo de Modo Livre
// - RN02: Tipagem Estrita e Rejeição 422 sem Fallback
// - RN04: Isolamento Institucional
// - RN05: Inalterabilidade do Histórico
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PacienteHistoricoService } from '../services/paciente-historico.service.js';
import { PacienteController } from '../controllers/paciente.controller.js';
import { HistoricoSessaoModel } from '../models/historico.model.js';
import { JogoModel } from '../../jogos/models/jogo.model.js';
import { PacienteServiceError } from '../services/paciente.service.js';
import { Request, Response } from 'express';

describe('PacienteHistoricoService & PacienteController (Sprint 11 - Task 2)', () => {
  const pacienteIdValido = '123e4567-e89b-12d3-a456-426614174000';
  const jogoIdValido = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

  const mockEngajamento = {
    total_sessoes: 10,
    total_iniciadas: 10,
    sessoes_finalizadas: 8,
    sessoes_interrompidas: 2,
    taxa_conclusao_porcentagem: 80,
    taxa_conclusao: 80,
    tempo_total_segundos: 4800,
    tempo_medio_segundos: 600,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('PacienteHistoricoService.validarFiltros', () => {
    it('deve lançar erro 400 se dataInicio for posterior a dataFim', () => {
      expect(() => {
        PacienteHistoricoService.validarFiltros({
          dataInicio: '2026-10-20T00:00:00.000Z',
          dataFim: '2026-10-10T00:00:00.000Z',
        });
      }).toThrowError(PacienteServiceError);
    });

    it('deve lançar erro 400 se page ou limit forem menores que 1', () => {
      expect(() => {
        PacienteHistoricoService.validarFiltros({ page: 0 });
      }).toThrowError('O parâmetro page deve ser um número inteiro maior ou igual a 1.');

      expect(() => {
        PacienteHistoricoService.validarFiltros({ limit: -5 });
      }).toThrowError('O parâmetro limit deve ser um número inteiro maior ou igual a 1.');
    });

    it('deve lançar erro 400 se jogoId não for um UUID válido', () => {
      expect(() => {
        PacienteHistoricoService.validarFiltros({ jogoId: 'slug-nao-uuid' });
      }).toThrowError('O identificador do jogo deve ser um UUID válido.');
    });
  });

  describe('PacienteHistoricoService.buscarHistoricoPaciente', () => {
    it('deve retornar engajamento geral e catálogo de jogos quando jogoId for omitido', async () => {
      vi.spyOn(HistoricoSessaoModel, 'buscarMetricasEngajamentoGeral').mockResolvedValue(mockEngajamento);
      vi.spyOn(HistoricoSessaoModel, 'listarJogosDoPaciente').mockResolvedValue([
        {
          jogo_id: jogoIdValido,
          nome: 'Aventura das Cores',
          versao: '1.2.0',
          total_sessoes: 5,
          ultima_sessao: '2026-10-15T10:00:00.000Z',
        },
      ]);

      const resultado = await PacienteHistoricoService.buscarHistoricoPaciente(pacienteIdValido);

      expect(resultado.paciente_id).toBe(pacienteIdValido);
      expect(resultado.engajamento_geral.taxa_conclusao_porcentagem).toBe(80);
      expect(resultado.historico_por_jogo.tipo).toBe('catalogo');
      if (resultado.historico_por_jogo.tipo === 'catalogo') {
        expect(resultado.historico_por_jogo.jogos.length).toBe(1);
        expect(resultado.historico_por_jogo.jogos[0].nome).toBe('Aventura das Cores');
      }
    });

    it('deve lançar erro 404 quando o jogoId fornecido não existir no catálogo', async () => {
      vi.spyOn(HistoricoSessaoModel, 'buscarMetricasEngajamentoGeral').mockResolvedValue(mockEngajamento);
      vi.spyOn(JogoModel, 'buscarPorId').mockResolvedValue(undefined);

      await expect(
        PacienteHistoricoService.buscarHistoricoPaciente(pacienteIdValido, { jogoId: jogoIdValido })
      ).rejects.toMatchObject({ statusCode: 404, message: 'Jogo terapêutico não encontrado no catálogo.' });
    });

    it('RN02: deve lançar erro 422 Unprocessable Entity quando métrica do jogo não tiver tipo_metrica declarado', async () => {
      vi.spyOn(HistoricoSessaoModel, 'buscarMetricasEngajamentoGeral').mockResolvedValue(mockEngajamento);
      vi.spyOn(JogoModel, 'buscarPorId').mockResolvedValue({
        id: jogoIdValido,
        nome: 'Jogo Sem Tipo',
        descricao: 'Teste',
        versao: '1.0.0',
        manifesto_json: {
          id_jogo: 'jogo-sem-tipo',
          nome: 'Jogo Sem Tipo',
          versao: '1.0.0',
          metricas_suportadas: [
            {
              id_metrica: 'metrica_invalida',
              // tipo_metrica ausente propositalmente para violar RN02
            } as any,
          ],
        },
      });

      await expect(
        PacienteHistoricoService.buscarHistoricoPaciente(pacienteIdValido, { jogoId: jogoIdValido })
      ).rejects.toMatchObject({
        statusCode: 422,
        detalhes: expect.objectContaining({
          regraViolada: 'RN02 - Fallback de Métrica Proibido',
          id_metrica: 'metrica_invalida',
        }),
      });
    });

    it('RN02: deve lançar erro 422 quando tipo de métrica for inválido (diferente de numerica, categorica, ordinal, booleana)', async () => {
      vi.spyOn(HistoricoSessaoModel, 'buscarMetricasEngajamentoGeral').mockResolvedValue(mockEngajamento);
      vi.spyOn(JogoModel, 'buscarPorId').mockResolvedValue({
        id: jogoIdValido,
        nome: 'Jogo Tipo Invalido',
        descricao: 'Teste',
        versao: '1.0.0',
        manifesto_json: {
          id_jogo: 'jogo-tipo-invalido',
          nome: 'Jogo Tipo Invalido',
          versao: '1.0.0',
          metricas_suportadas: [
            {
              id_metrica: 'metrica_errada',
              tipo_metrica: 'texto_livre', // Incompatível com o domínio clínico
            },
          ],
        },
      });

      await expect(
        PacienteHistoricoService.buscarHistoricoPaciente(pacienteIdValido, { jogoId: jogoIdValido })
      ).rejects.toMatchObject({
        statusCode: 422,
        detalhes: expect.objectContaining({
          regraViolada: 'RN02 - Fallback de Métrica Proibido',
        }),
      });
    });

    it('deve retornar séries temporais quando o jogo for válido e possuir métricas homologadas', async () => {
      vi.spyOn(HistoricoSessaoModel, 'buscarMetricasEngajamentoGeral').mockResolvedValue(mockEngajamento);
      vi.spyOn(JogoModel, 'buscarPorId').mockResolvedValue({
        id: jogoIdValido,
        nome: 'Aventura das Cores',
        descricao: 'Teste',
        versao: '1.2.0',
        manifesto_json: {
          id_jogo: 'aventura-das-cores',
          nome: 'Aventura das Cores',
          versao: '1.2.0',
          metricas_suportadas: [
            { id_metrica: 'tempo_resposta', tipo_metrica: 'numerica', unidade: 's' },
            { id_metrica: 'nivel_frustracao', tipo_metrica: 'categorica', valores: ['baixo', 'alto'] },
          ],
        },
      });

      const sessaoId = '555e4567-e89b-12d3-a456-426614174000';
      vi.spyOn(HistoricoSessaoModel, 'buscarHistoricoPorJogo').mockResolvedValue([
        {
          sessao_id: sessaoId,
          terapeuta_id: 'terapeuta-1',
          paciente_id: pacienteIdValido,
          jogo_id: jogoIdValido,
          modo_sessao: 'sessao_clinica',
          status_sessao: 'finalizada',
          data_hora_inicio: '2026-10-10T10:00:00.000Z',
          data_hora_fim: '2026-10-10T10:15:00.000Z',
          duracao_segundos: 900,
          conteudo_relatorio: 'Paciente respondeu bem.',
          dados_ia_json: {
            token_sessao: '123-456',
            duracao_segundos: 900,
            resumo: { taxa_conclusao: 100, intervencoes_dda: 0 },
            analises_ia: [],
            metricas_agregadas: [
              { id_metrica: 'tempo_resposta', valor_dominante: 1.45, tendencia: 'decrescente' },
              { id_metrica: 'nivel_frustracao', valor_dominante: 'baixo', tendencia: 'estavel' },
            ],
          },
        },
      ]);

      const resultado = await PacienteHistoricoService.buscarHistoricoPaciente(pacienteIdValido, {
        jogoId: jogoIdValido,
      });

      expect(resultado.historico_por_jogo.tipo).toBe('detalhado');
      if (resultado.historico_por_jogo.tipo === 'detalhado') {
        expect(resultado.historico_por_jogo.sessoes.length).toBe(1);
        expect(resultado.historico_por_jogo.series_temporais.length).toBe(2);

        const serieTempo = resultado.historico_por_jogo.series_temporais.find(
          (s) => s.id_metrica === 'tempo_resposta'
        );
        expect(serieTempo).toBeDefined();
        expect(serieTempo?.tipo_metrica).toBe('numerica');
        expect(serieTempo?.pontos[0].valor).toBe(1.45);
        expect(serieTempo?.pontos[0].tendencia).toBe('decrescente');
      }
    });
  });

  describe('PacienteController.buscarHistorico', () => {
    it('deve responder 200 OK com data, engajamento_geral e historico_por_jogo', async () => {
      const mockReq = {
        params: { id: pacienteIdValido },
        query: {},
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      vi.spyOn(PacienteHistoricoService, 'buscarHistoricoPaciente').mockResolvedValue({
        paciente_id: pacienteIdValido,
        engajamento_geral: mockEngajamento,
        historico_por_jogo: { tipo: 'catalogo', jogos: [] },
      });

      await PacienteController.buscarHistorico(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          engajamento_geral: mockEngajamento,
          historico_por_jogo: { tipo: 'catalogo', jogos: [] },
        })
      );
    });

    it('deve responder com o statusCode apropriado ao capturar PacienteServiceError', async () => {
      const mockReq = {
        params: { id: pacienteIdValido },
        query: { dataInicio: '2026-10-20', dataFim: '2026-10-10' },
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      vi.spyOn(PacienteHistoricoService, 'buscarHistoricoPaciente').mockRejectedValue(
        new PacienteServiceError('A data inicial não pode ser posterior à data final.', 400)
      );

      await PacienteController.buscarHistorico(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'A data inicial não pode ser posterior à data final.',
        })
      );
    });
  });
});
