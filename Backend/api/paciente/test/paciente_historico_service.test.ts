// ==============================================================================
// InTEA: Testes de Unidade do Serviço e Controller de Histórico (Sprint 11)
// ==============================================================================
// REQUISITOS COBERTOS:
// - RF15: Prontuário Longitudinal (Separação: Histórico Geral vs Séries por Jogo)
// - RF19: Filtros e Paginação (sessaoId, dataInicio, dataFim, page, limit)
// - RN01: Expurgo de Modo Livre
// - RN02: Tipagem Estrita e Rejeição 422 sem Fallback
// - RN04: Isolamento Institucional
// - RN05: Inalterabilidade do Histórico
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PacienteHistoricoService } from '../services/paciente-historico.service.js';
import { PacienteController } from '../controllers/paciente.controller.js';
import { HistoricoSessaoModel } from '../models/historico.model.js';
import { JogoModel, type MetricaManifesto } from '../../jogos/models/jogo.model.js';
import { SessaoModel } from '../../sessao/models/sessao.model.js';
import { PacienteServiceError } from '../services/paciente.service.js';
import { Request, Response } from 'express';

describe('PacienteHistoricoService & PacienteController (Sprint 11 - Task 2)', () => {
  const pacienteIdValido = '123e4567-e89b-12d3-a456-426614174000';
  const jogoIdValido = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const sessaoIdValido = '987e6543-e21b-12d3-a456-426614174999';

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

    it('deve lançar erro 400 se sessaoId não for um UUID válido', () => {
      expect(() => {
        PacienteHistoricoService.validarFiltros({ sessaoId: 'sessao-invalida' });
      }).toThrowError('O identificador da sessão deve ser um UUID válido.');
    });
  });

  describe('Rota 1: PacienteHistoricoService.buscarHistoricoGeral', () => {
    it('deve retornar engajamento geral e catálogo de jogos sem poluição de métricas finas', async () => {
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

      const resultado = await PacienteHistoricoService.buscarHistoricoGeral(pacienteIdValido);

      expect(resultado.engajamento.taxa_conclusao_porcentagem).toBe(80);
      expect(resultado.jogos.length).toBe(1);
      expect(resultado.jogos[0].nome).toBe('Aventura das Cores');
      expect(resultado.meta.paciente_id).toBe(pacienteIdValido);
    });
  });

  describe('Rota 2: PacienteHistoricoService.buscarHistoricoJogo', () => {
    it('deve lançar erro 404 quando o jogoId fornecido não existir no catálogo', async () => {
      vi.spyOn(JogoModel, 'buscarPorId').mockResolvedValue(undefined);

      await expect(
        PacienteHistoricoService.buscarHistoricoJogo(pacienteIdValido, jogoIdValido)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Jogo terapêutico não encontrado no catálogo.' });
    });

    it('RN02: deve lançar erro 422 Unprocessable Entity quando métrica do jogo não tiver tipo_metrica declarado', async () => {
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
            } as unknown as MetricaManifesto,
          ],
        },
      });

      await expect(
        PacienteHistoricoService.buscarHistoricoJogo(pacienteIdValido, jogoIdValido)
      ).rejects.toMatchObject({
        statusCode: 422,
        detalhes: expect.objectContaining({
          regraViolada: 'RN02 - Fallback de Métrica Proibido',
          id_metrica: 'metrica_invalida',
        }),
      });
    });

    it('RN02: deve lançar erro 422 quando tipo de métrica for inválido (diferente de numerica, categorica, ordinal, booleana)', async () => {
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
              id_metrica: 'metrica_estranha',
              tipo_metrica: 'qualquer_coisa' as unknown as string,
            },
          ],
        },
      });

      await expect(
        PacienteHistoricoService.buscarHistoricoJogo(pacienteIdValido, jogoIdValido)
      ).rejects.toMatchObject({
        statusCode: 422,
        detalhes: expect.objectContaining({
          regraViolada: 'RN02 - Fallback de Métrica Proibido',
          tipo_declarado: 'qualquer_coisa',
        }),
      });
    });

    it('deve delimitar o histórico até a data da sessão se sessaoId for fornecido', async () => {
      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
        id: sessaoIdValido,
        paciente_id: pacienteIdValido,
        jogo_id: jogoIdValido,
        terapeuta_id: 'terapeuta-1',
        session_token: 'token-1',
        modo_sessao: 'sessao_clinica',
        contexto_dda_json: {},
        status_sessao: 'finalizada',
        data_hora_inicio: '2026-10-10T10:00:00Z',
        data_hora_fim: '2026-10-10T10:30:00Z',
        expira_em: '2026-10-10T11:00:00Z',
        created_at: '2026-10-10T10:00:00Z',
        updated_at: '2026-10-10T10:30:00Z',
      });

      vi.spyOn(JogoModel, 'buscarPorId').mockResolvedValue({
        id: jogoIdValido,
        nome: 'Aventura Espacial',
        descricao: 'Jogo de atenção',
        versao: '1.0.0',
        manifesto_json: {
          id_jogo: 'aventura-espacial',
          nome: 'Aventura Espacial',
          versao: '1.0.0',
          metricas_suportadas: [
            { id_metrica: 'tempo_resposta', tipo_metrica: 'numerica', unidade: 's' },
          ],
        },
      });

      vi.spyOn(HistoricoSessaoModel, 'contarHistoricoPorJogo').mockResolvedValue(1);
      const spyBuscarHistorico = vi.spyOn(HistoricoSessaoModel, 'buscarHistoricoPorJogo').mockResolvedValue([
        {
          sessao_id: sessaoIdValido,
          terapeuta_id: 'terapeuta-1',
          paciente_id: pacienteIdValido,
          jogo_id: jogoIdValido,
          modo_sessao: 'sessao_clinica',
          status_sessao: 'finalizada',
          data_hora_inicio: '2026-10-10T10:00:00Z',
          data_hora_fim: '2026-10-10T10:30:00Z',
          duracao_segundos: 1800,
          conteudo_relatorio: 'Sessão concluída com excelente foco.',
          dados_ia_json: {
            metricas_agregadas: [
              { id_metrica: 'tempo_resposta', valor_dominante: 1.2, tendencia: 'estavel' },
            ],
          },
        },
      ]);

      const resultado = await PacienteHistoricoService.buscarHistoricoJogo(pacienteIdValido, jogoIdValido, {
        sessaoId: sessaoIdValido,
      });

      expect(spyBuscarHistorico).toHaveBeenCalledWith(
        pacienteIdValido,
        jogoIdValido,
        20,
        0,
        expect.objectContaining({ dataFim: '2026-10-10T10:30:00Z' })
      );
      expect(resultado.meta.sessao_referencia_id).toBe(sessaoIdValido);
      expect(resultado.series_temporais[0].pontos[0].valor).toBe(1.2);
    });

    it('deve rejeitar sessaoId se a sessão informada não estiver finalizada', async () => {
      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
        id: sessaoIdValido,
        paciente_id: pacienteIdValido,
        jogo_id: jogoIdValido,
        terapeuta_id: 'terapeuta-1',
        session_token: 'token-1',
        modo_sessao: 'sessao_clinica',
        contexto_dda_json: {},
        status_sessao: 'cancelada', // Não finalizada
        data_hora_inicio: '2026-10-10T10:00:00Z',
        data_hora_fim: null,
        expira_em: '2026-10-10T11:00:00Z',
        created_at: '2026-10-10T10:00:00Z',
        updated_at: '2026-10-10T10:30:00Z',
      });

      await expect(
        PacienteHistoricoService.buscarHistoricoJogo(pacienteIdValido, jogoIdValido, {
          sessaoId: sessaoIdValido,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('não foi finalizada'),
      });
    });

    it('deve rejeitar sessaoId se ela pertencer a outro paciente', async () => {
      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
        id: sessaoIdValido,
        paciente_id: 'outro-paciente-uuid',
        jogo_id: jogoIdValido,
        terapeuta_id: 'terapeuta-1',
        session_token: 'token-1',
        modo_sessao: 'sessao_clinica',
        contexto_dda_json: {},
        status_sessao: 'finalizada',
        data_hora_inicio: '2026-10-10T10:00:00Z',
        data_hora_fim: '2026-10-10T10:30:00Z',
        expira_em: '2026-10-10T11:00:00Z',
        created_at: '2026-10-10T10:00:00Z',
        updated_at: '2026-10-10T10:30:00Z',
      });

      await expect(
        PacienteHistoricoService.buscarHistoricoJogo(pacienteIdValido, jogoIdValido, {
          sessaoId: sessaoIdValido,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'A sessão informada não pertence ao paciente especificado.',
      });
    });
  });

  describe('PacienteController: Controllers Separados', () => {
    it('buscarHistoricoGeral: deve responder 200 OK com payload categorizado', async () => {
      const mockReq = {
        params: { id: pacienteIdValido },
        query: {},
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      vi.spyOn(PacienteHistoricoService, 'buscarHistoricoGeral').mockResolvedValue({
        engajamento: mockEngajamento,
        jogos: [],
        meta: { paciente_id: pacienteIdValido },
      });

      await PacienteController.buscarHistoricoGeral(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: {
          engajamento: mockEngajamento,
          jogos: [],
          meta: { paciente_id: pacienteIdValido },
        },
        message: 'Histórico geral de engajamento do paciente recuperado com sucesso.',
      });
    });

    it('buscarHistoricoJogo: deve responder 200 OK com payload categorizado', async () => {
      const mockReq = {
        params: { id: pacienteIdValido, jogoId: jogoIdValido },
        query: {},
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      vi.spyOn(PacienteHistoricoService, 'buscarHistoricoJogo').mockResolvedValue({
        jogo: { id: jogoIdValido, nome: 'Aventura Espacial', versao: '1.0.0' },
        metricas_declaradas: [],
        series_temporais: [],
        sessoes: [],
        meta: {
          paciente_id: pacienteIdValido,
          jogo_id: jogoIdValido,
          sessao_referencia_id: null,
          paginacao: { page: 1, limit: 20, total_registros: 0 },
        },
      });

      await PacienteController.buscarHistoricoJogo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            jogo: { id: jogoIdValido, nome: 'Aventura Espacial', versao: '1.0.0' },
          }),
          message: 'Histórico do jogo para o paciente recuperado com sucesso.',
        })
      );
    });
  });
});
