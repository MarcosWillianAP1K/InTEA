// ==============================================================================
// InTEA: Testes Unitários de HistoricoSessaoModel (Sprint 11 - Task 1)
// ==============================================================================
// REQUISITOS COBERTOS:
// - RF15: Prontuário Longitudinal e Métricas de Engajamento
// - RNF05: Alta Performance de Consultas
// - RN01: Expurgo Estrito de Modo Livre (paciente_id = NULL)
// - RN04: Isolamento por Vínculo Institucional
// - RN05: Inalterabilidade Clínica (Filtro de Soft Delete em relatórios)
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HistoricoSessaoModel } from '../models/historico.model.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

describe('HistoricoSessaoModel - Modelagem e Índices de Histórico Clínico (RF15, RN01, RN05)', () => {
  const pacienteIdValido = '123e4567-e89b-12d3-a456-426614174000';
  const jogoIdValido = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const terapeutaIdValido = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('buscarMetricasEngajamentoGeral', () => {
    it('deve retornar null se o pacienteId for inválido', async () => {
      const resInvalido = await HistoricoSessaoModel.buscarMetricasEngajamentoGeral('invalido-uuid');
      expect(resInvalido).toBeNull();

      const resVazio = await HistoricoSessaoModel.buscarMetricasEngajamentoGeral('');
      expect(resVazio).toBeNull();
    });

    it('deve calcular corretamente a taxa de conclusão (80%) e tempos acumulados para 10 sessões', async () => {
      // 8 finalizadas (cada uma 600 segundos = 10 min), 2 canceladas/interrompidas
      const mockSessoes = [
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `sessao-${i}`,
          paciente_id: pacienteIdValido,
          status_sessao: 'finalizada',
          modo_sessao: 'sessao_clinica',
          data_hora_inicio: '2026-10-01T10:00:00.000Z',
          data_hora_fim: '2026-10-01T10:10:00.000Z', // 600s
        })),
        {
          id: 'sessao-8',
          paciente_id: pacienteIdValido,
          status_sessao: 'cancelada',
          modo_sessao: 'sessao_clinica',
          data_hora_inicio: '2026-10-02T10:00:00.000Z',
          data_hora_fim: '2026-10-02T10:02:00.000Z', // 120s
        },
        {
          id: 'sessao-9',
          paciente_id: pacienteIdValido,
          status_sessao: 'interrompida_por_queda',
          modo_sessao: 'sessao_clinica',
          data_hora_inicio: '2026-10-03T10:00:00.000Z',
          data_hora_fim: '2026-10-03T10:03:00.000Z', // 180s
        },
      ];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) =>
          resolve({ data: mockSessoes, error: null })
        ),
      };

      vi.spyOn(supabase, 'from').mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      const resultado = await HistoricoSessaoModel.buscarMetricasEngajamentoGeral(pacienteIdValido);

      expect(resultado).not.toBeNull();
      expect(resultado?.total_sessoes).toBe(10);
      expect(resultado?.sessoes_finalizadas).toBe(8);
      expect(resultado?.sessoes_interrompidas).toBe(2);
      expect(resultado?.taxa_conclusao_porcentagem).toBe(80);
      expect(resultado?.taxa_conclusao).toBe(80);
      // Tempo total: 8 * 600s + 120s + 180s = 4800 + 300 = 5100s
      expect(resultado?.tempo_total_segundos).toBe(5100);
      // Tempo médio (dividido por sessões finalizadas 8): 5100 / 8 = 638s
      expect(resultado?.tempo_medio_segundos).toBe(638);

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('paciente_id', pacienteIdValido);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('modo_sessao', 'sessao_clinica');
      expect(mockQueryBuilder.not).toHaveBeenCalledWith('paciente_id', 'is', null);
    });

    it('deve retornar métricas zeradas quando o paciente não possuir sessões clínicas', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) =>
          resolve({ data: [], error: null })
        ),
      };

      vi.spyOn(supabase, 'from').mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      const resultado = await HistoricoSessaoModel.buscarMetricasEngajamentoGeral(pacienteIdValido);

      expect(resultado).toEqual({
        total_sessoes: 0,
        total_iniciadas: 0,
        sessoes_finalizadas: 0,
        sessoes_interrompidas: 0,
        taxa_conclusao_porcentagem: 0,
        taxa_conclusao: 0,
        tempo_total_segundos: 0,
        tempo_medio_segundos: 0,
      });
    });

    it('deve aplicar filtros de data de início e fim quando informados', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) =>
          resolve({ data: [], error: null })
        ),
      };

      vi.spyOn(supabase, 'from').mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      await HistoricoSessaoModel.buscarMetricasEngajamentoGeral(pacienteIdValido, {
        dataInicio: '2026-10-01T00:00:00.000Z',
        dataFim: '2026-10-15T23:59:59.999Z',
      });

      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('data_hora_inicio', '2026-10-01T00:00:00.000Z');
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('data_hora_inicio', '2026-10-15T23:59:59.999Z');
    });

    it('deve retornar null se o banco disparar erro', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) =>
          resolve({ data: null, error: { message: 'DB Connection Error' } })
        ),
      };

      vi.spyOn(supabase, 'from').mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      const resultado = await HistoricoSessaoModel.buscarMetricasEngajamentoGeral(pacienteIdValido);
      expect(resultado).toBeNull();
    });
  });

  describe('buscarHistoricoPorJogo', () => {
    it('deve retornar null se pacienteId ou jogoId forem inválidos', async () => {
      const res1 = await HistoricoSessaoModel.buscarHistoricoPorJogo('invalido', jogoIdValido);
      expect(res1).toBeNull();

      const res2 = await HistoricoSessaoModel.buscarHistoricoPorJogo(pacienteIdValido, 'invalido');
      expect(res2).toBeNull();
    });

    it('deve recuperar sessões com relatórios ativos e filtrar registros com soft_delete = true (RN05)', async () => {
      const sessaoAtivaId = '333e4567-e89b-12d3-a456-426614174000';
      const sessaoSoftDeletedId = '444e4567-e89b-12d3-a456-426614174000';

      const mockData = [
        {
          id: sessaoAtivaId,
          terapeuta_id: terapeutaIdValido,
          paciente_id: pacienteIdValido,
          jogo_id: jogoIdValido,
          modo_sessao: 'sessao_clinica',
          status_sessao: 'finalizada',
          data_hora_inicio: '2026-10-10T14:00:00.000Z',
          data_hora_fim: '2026-10-10T14:15:00.000Z',
          relatorio_sessao: {
            sessao_id: sessaoAtivaId,
            conteudo: 'Evolução motora excelente',
            dados_ia_json: {
              token_sessao: '998-123',
              duracao_segundos: 900,
              resumo: { taxa_conclusao: 100, intervencoes_dda: 2 },
              analises_ia: ['Atenção sustentada'],
              metricas_agregadas: [{ id_metrica: 'acertos', valor_dominante: 95, tendencia: 'crescente' }],
            },
            soft_delete: false,
          },
        },
        {
          id: sessaoSoftDeletedId,
          terapeuta_id: terapeutaIdValido,
          paciente_id: pacienteIdValido,
          jogo_id: jogoIdValido,
          modo_sessao: 'sessao_clinica',
          status_sessao: 'finalizada',
          data_hora_inicio: '2026-10-09T14:00:00.000Z',
          data_hora_fim: '2026-10-09T14:10:00.000Z',
          relatorio_sessao: {
            sessao_id: sessaoSoftDeletedId,
            conteudo: 'Relatório descartado',
            dados_ia_json: {},
            soft_delete: true, // RN05: DEVE SER DESCARTADO
          },
        },
      ];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) =>
          resolve({ data: mockData, error: null })
        ),
      };

      vi.spyOn(supabase, 'from').mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      const resultado = await HistoricoSessaoModel.buscarHistoricoPorJogo(pacienteIdValido, jogoIdValido);

      expect(resultado).not.toBeNull();
      // O registro com soft_delete = true foi expurgado
      expect(resultado?.length).toBe(1);
      expect(resultado?.[0].sessao_id).toBe(sessaoAtivaId);
      expect(resultado?.[0].duracao_segundos).toBe(900);
      expect(resultado?.[0].conteudo_relatorio).toBe('Evolução motora excelente');
      expect(resultado?.[0].dados_ia_json).toHaveProperty('resumo');

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('paciente_id', pacienteIdValido);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('jogo_id', jogoIdValido);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status_sessao', 'finalizada');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('data_hora_fim', { ascending: false });
    });

    it('deve aplicar paginação range quando limit for fornecido', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) =>
          resolve({ data: [], error: null })
        ),
      };

      vi.spyOn(supabase, 'from').mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      await HistoricoSessaoModel.buscarHistoricoPorJogo(pacienteIdValido, jogoIdValido, 10, 20);

      expect(mockQueryBuilder.range).toHaveBeenCalledWith(20, 29);
    });

    it('deve retornar null em caso de falha de consulta no Supabase', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) =>
          resolve({ data: null, error: { message: 'Database query timeout' } })
        ),
      };

      vi.spyOn(supabase, 'from').mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      const resultado = await HistoricoSessaoModel.buscarHistoricoPorJogo(pacienteIdValido, jogoIdValido);
      expect(resultado).toBeNull();
    });
  });

  describe('listarJogosDoPaciente', () => {
    it('deve retornar null se pacienteId for inválido', async () => {
      const resultado = await HistoricoSessaoModel.listarJogosDoPaciente('invalido');
      expect(resultado).toBeNull();
    });

    it('deve agrupar corretamente os jogos experimentados pelo paciente com contagens e datas', async () => {
      const jogo1Id = '11111111-1111-1111-1111-111111111111';
      const jogo2Id = '22222222-2222-2222-2222-222222222222';

      const mockData = [
        {
          jogo_id: jogo1Id,
          data_hora_inicio: '2026-10-12T10:00:00.000Z',
          data_hora_fim: '2026-10-12T10:15:00.000Z',
          jogo: { id: jogo1Id, nome: 'Aventura Espacial', versao: '1.2.0' },
        },
        {
          jogo_id: jogo1Id,
          data_hora_inicio: '2026-10-10T10:00:00.000Z',
          data_hora_fim: '2026-10-10T10:12:00.000Z',
          jogo: { id: jogo1Id, nome: 'Aventura Espacial', versao: '1.2.0' },
        },
        {
          jogo_id: jogo2Id,
          data_hora_inicio: '2026-10-08T09:00:00.000Z',
          data_hora_fim: '2026-10-08T09:20:00.000Z',
          jogo: { id: jogo2Id, nome: 'Jardim Sensorial', versao: '2.0.0' },
        },
      ];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) =>
          resolve({ data: mockData, error: null })
        ),
      };

      vi.spyOn(supabase, 'from').mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      const resultado = await HistoricoSessaoModel.listarJogosDoPaciente(pacienteIdValido);

      expect(resultado).not.toBeNull();
      expect(resultado?.length).toBe(2);

      const jogo1 = resultado?.find((j) => j.jogo_id === jogo1Id);
      expect(jogo1).toBeDefined();
      expect(jogo1?.nome).toBe('Aventura Espacial');
      expect(jogo1?.versao).toBe('1.2.0');
      expect(jogo1?.total_sessoes).toBe(2);
      expect(jogo1?.ultima_sessao).toBe('2026-10-12T10:15:00.000Z');

      const jogo2 = resultado?.find((j) => j.jogo_id === jogo2Id);
      expect(jogo2).toBeDefined();
      expect(jogo2?.nome).toBe('Jardim Sensorial');
      expect(jogo2?.total_sessoes).toBe(1);
    });

    it('deve retornar null em caso de erro no Supabase ao listar jogos', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) =>
          resolve({ data: null, error: { message: 'Erro de conexao' } })
        ),
      };

      vi.spyOn(supabase, 'from').mockReturnValue(mockQueryBuilder as unknown as ReturnType<typeof supabase.from>);

      const resultado = await HistoricoSessaoModel.listarJogosDoPaciente(pacienteIdValido);
      expect(resultado).toBeNull();
    });
  });
});
