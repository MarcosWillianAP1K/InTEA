// ==============================================================================
// InTEA: Modelo de Histórico Clínico e Engajamento Longitudinal (Sprint 11)
// ==============================================================================
// REQUISITOS ATENDIDOS:
// - RF15: Prontuário Longitudinal e Gráficos Evolutivos
// - RNF05: Otimização de I/O e Índices de Alta Performance
// - RN01: Expurgo Estrito de Partidas em Modo Livre (paciente_id = NULL)
// - RN04: Isolamento Institucional por Vínculo
// - RN05: Inalterabilidade do Histórico Clínico (Soft Delete de Relatórios)
// ==============================================================================

import { supabase } from '../../../core/supabase/supabase.client.js';
import { validarUUID } from '../../../core/utils/validators.js';
import { RelatorioIAContrato } from '../../sessao/models/relatorio.model.js';

/**
 * Consolidated universal patient engagement metrics shared across all therapeutic games.
 */
export interface MetricasEngajamentoGeral {
  total_sessoes: number;
  total_iniciadas: number;
  sessoes_finalizadas: number;
  sessoes_interrompidas: number;
  taxa_conclusao_porcentagem: number;
  taxa_conclusao: number; // Alias semântico para conformidade de contratos
  tempo_total_segundos: number;
  tempo_medio_segundos: number;
}

/**
 * Filter and pagination parameters for clinical history queries (RF19).
 */
export interface FiltrosHistoricoDTO {
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
  page?: number;
  offset?: number;
}

/**
 * Individual history record with technical report and AI analytical insights.
 */
export interface SessaoHistoricoItem {
  sessao_id: string;
  terapeuta_id: string;
  paciente_id: string;
  jogo_id: string;
  modo_sessao: string;
  status_sessao: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  duracao_segundos: number;
  conteudo_relatorio: string | null;
  dados_ia_json: RelatorioIAContrato | Record<string, unknown>;
}

/**
 * Catalog summary of therapeutic games previously played by the patient.
 */
export interface ResumoJogoPaciente {
  jogo_id: string;
  nome: string;
  versao: string;
  total_sessoes: number;
  ultima_sessao: string;
}

interface RelatorioSessaoRegistro {
  sessao_id?: string;
  conteudo?: string | null;
  dados_ia_json?: RelatorioIAContrato | Record<string, unknown>;
  soft_delete?: boolean;
}

interface SessaoComRelatorioRow {
  id: string;
  terapeuta_id: string;
  paciente_id: string | null;
  jogo_id: string;
  modo_sessao: string;
  status_sessao: string;
  data_hora_inicio: string;
  data_hora_fim: string | null;
  relatorio_sessao?: RelatorioSessaoRegistro | RelatorioSessaoRegistro[] | null;
}

interface JogoInfoRow {
  id: string;
  nome: string;
  versao: string;
}

interface SessaoComJogoRow {
  jogo_id: string;
  data_hora_fim: string | null;
  data_hora_inicio: string;
  jogo?: JogoInfoRow | JogoInfoRow[] | null;
}

export class HistoricoSessaoModel {
  /**
   * Calculates transversal metrics of clinical engagement and patient attendance.
   * Uses PostgreSQL partial index `idx_sessao_paciente_engajamento`.
   * Strictly excludes free play sessions (RN01: paciente_id = NULL).
   *
   * @param pacienteId - UUID of the patient.
   * @param filtros - Optional time range filters (dataInicio, dataFim).
   * @returns Consolidated patient engagement metrics.
   */
  static async buscarMetricasEngajamentoGeral(
    pacienteId: string,
    filtros?: FiltrosHistoricoDTO
  ): Promise<MetricasEngajamentoGeral | null> {
    if (!pacienteId || !validarUUID(pacienteId)) {
      return null;
    }

    try {
      let query = supabase
        .from('sessao')
        .select('id, paciente_id, status_sessao, modo_sessao, data_hora_inicio, data_hora_fim')
        .eq('paciente_id', pacienteId)
        .eq('modo_sessao', 'sessao_clinica')
        .not('paciente_id', 'is', null);

      if (filtros?.dataInicio) {
        query = query.gte('data_hora_inicio', filtros.dataInicio);
      }
      if (filtros?.dataFim) {
        query = query.lte('data_hora_inicio', filtros.dataFim);
      }

      const { data, error } = await query;

      if (error || !data) {
        console.error('[HistoricoSessaoModel] Erro ao buscar métricas de engajamento:', error);
        return null;
      }

      const totalSessoes = data.filter((s) => s.status_sessao !== 'aguardando_pareamento').length;
      const sessoesFinalizadas = data.filter((s) => s.status_sessao === 'finalizada').length;
      const sessoesInterrompidas = data.filter((s) =>
        ['cancelada', 'interrompida_por_queda', 'expirada'].includes(s.status_sessao)
      ).length;

      // Sessões que iniciaram a execução clínica (não ficaram apenas em aguardando_pareamento)
      const totalIniciadas = totalSessoes;

      const baseCalculo = totalIniciadas > 0 ? totalIniciadas : totalSessoes;
      const taxaConclusao =
        baseCalculo > 0
          ? Number(((sessoesFinalizadas / baseCalculo) * 100).toFixed(1))
          : 0;

      let tempoTotalSegundos = 0;
      for (const sessao of data) {
        if (sessao.data_hora_inicio && sessao.data_hora_fim) {
          const inicio = new Date(sessao.data_hora_inicio).getTime();
          const fim = new Date(sessao.data_hora_fim).getTime();
          if (!isNaN(inicio) && !isNaN(fim) && fim >= inicio) {
            tempoTotalSegundos += Math.round((fim - inicio) / 1000);
          }
        }
      }

      const divisorTempo = sessoesFinalizadas > 0 ? sessoesFinalizadas : totalSessoes;
      const tempoMedioSegundos =
        divisorTempo > 0 ? Math.round(tempoTotalSegundos / divisorTempo) : 0;

      return {
        total_sessoes: totalSessoes,
        total_iniciadas: totalIniciadas,
        sessoes_finalizadas: sessoesFinalizadas,
        sessoes_interrompidas: sessoesInterrompidas,
        taxa_conclusao_porcentagem: taxaConclusao,
        taxa_conclusao: taxaConclusao,
        tempo_total_segundos: tempoTotalSegundos,
        tempo_medio_segundos: tempoMedioSegundos,
      };
    } catch (err) {
      console.error('[HistoricoSessaoModel] Exceção em buscarMetricasEngajamentoGeral:', err);
      return null;
    }
  }

  /**
   * Retrieves detailed longitudinal history of completed sessions for a specific game.
   * Uses compound partial index `idx_sessao_paciente_jogo_fim` and joins with `relatorio_sessao`.
   * Strictly excludes free play mode (RN01) and ignores soft-deleted reports (RN05).
   *
   * @param pacienteId - UUID of the patient.
   * @param jogoId - UUID of the therapeutic game.
   * @param limit - Maximum record limit for pagination.
   * @param offset - Offset for pagination.
   * @param filtros - Optional time range filters.
   * @returns Array of individual session history items.
   */
  static async buscarHistoricoPorJogo(
    pacienteId: string,
    jogoId: string,
    limit?: number,
    offset?: number,
    filtros?: FiltrosHistoricoDTO
  ): Promise<SessaoHistoricoItem[] | null> {
    if (!pacienteId || !validarUUID(pacienteId) || !jogoId || !validarUUID(jogoId)) {
      return null;
    }

    try {
      let query = supabase
        .from('sessao')
        .select(`
          id,
          terapeuta_id,
          paciente_id,
          jogo_id,
          modo_sessao,
          status_sessao,
          data_hora_inicio,
          data_hora_fim,
          relatorio_sessao (
            sessao_id,
            conteudo,
            dados_ia_json,
            soft_delete
          )
        `)
        .eq('paciente_id', pacienteId)
        .eq('jogo_id', jogoId)
        .eq('modo_sessao', 'sessao_clinica')
        .eq('status_sessao', 'finalizada')
        .not('paciente_id', 'is', null)
        .order('data_hora_fim', { ascending: false });

      if (filtros?.dataInicio) {
        query = query.gte('data_hora_fim', filtros.dataInicio);
      }
      if (filtros?.dataFim) {
        query = query.lte('data_hora_fim', filtros.dataFim);
      }
      if (typeof limit === 'number' && limit > 0) {
        const from = typeof offset === 'number' && offset >= 0 ? offset : 0;
        query = query.range(from, from + limit - 1);
      }

      const { data, error } = await query;

      if (error || !data) {
        console.error('[HistoricoSessaoModel] Erro ao buscar histórico por jogo:', error);
        return null;
      }

      const rows = data as unknown as SessaoComRelatorioRow[];
      const historicoItens: SessaoHistoricoItem[] = [];

      for (const row of rows) {
        // Normaliza retorno do relacionamento 1:1
        const relatorio = Array.isArray(row.relatorio_sessao)
          ? row.relatorio_sessao[0]
          : row.relatorio_sessao;

        // RN05: Ignora relatórios com soft delete ativado
        if (relatorio && relatorio.soft_delete === true) {
          continue;
        }

        // Determina duração a partir do payload de IA ou timestamp diff
        let duracaoSegundos = 0;
        const dadosIA = relatorio?.dados_ia_json as RelatorioIAContrato | undefined;
        if (dadosIA && typeof dadosIA.duracao_segundos === 'number' && dadosIA.duracao_segundos > 0) {
          duracaoSegundos = dadosIA.duracao_segundos;
        } else if (row.data_hora_inicio && row.data_hora_fim) {
          const ini = new Date(row.data_hora_inicio).getTime();
          const fim = new Date(row.data_hora_fim).getTime();
          if (!isNaN(ini) && !isNaN(fim) && fim >= ini) {
            duracaoSegundos = Math.round((fim - inicioSegura(ini, fim)) / 1000);
          }
        }

        historicoItens.push({
          sessao_id: row.id,
          terapeuta_id: row.terapeuta_id,
          paciente_id: row.paciente_id as string,
          jogo_id: row.jogo_id,
          modo_sessao: row.modo_sessao,
          status_sessao: row.status_sessao,
          data_hora_inicio: row.data_hora_inicio,
          data_hora_fim: row.data_hora_fim || row.data_hora_inicio,
          duracao_segundos: duracaoSegundos,
          conteudo_relatorio: relatorio?.conteudo ?? null,
          dados_ia_json: relatorio?.dados_ia_json ?? {},
        });
      }

      return historicoItens;
    } catch (err) {
      console.error('[HistoricoSessaoModel] Exceção em buscarHistoricoPorJogo:', err);
      return null;
    }
  }

  /**
   * Lists catalog of games with clinical interventions completed by the patient.
   * Used when jogoId is omitted to populate dynamic front-end selectors.
   *
   * @param pacienteId - UUID of the patient.
   * @returns List of played games with session counts.
   */
  static async listarJogosDoPaciente(pacienteId: string): Promise<ResumoJogoPaciente[] | null> {
    if (!pacienteId || !validarUUID(pacienteId)) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('sessao')
        .select(`
          jogo_id,
          data_hora_fim,
          data_hora_inicio,
          jogo:jogo_id (
            id,
            nome,
            versao
          )
        `)
        .eq('paciente_id', pacienteId)
        .eq('modo_sessao', 'sessao_clinica')
        .eq('status_sessao', 'finalizada')
        .not('paciente_id', 'is', null)
        .order('data_hora_fim', { ascending: false });

      if (error || !data) {
        console.error('[HistoricoSessaoModel] Erro ao listar jogos do paciente:', error);
        return null;
      }

      const rows = data as unknown as SessaoComJogoRow[];
      const mapaJogos = new Map<string, ResumoJogoPaciente>();

      for (const row of rows) {
        const jogoInfo = Array.isArray(row.jogo) ? row.jogo[0] : row.jogo;
        const jogoNome = jogoInfo?.nome || 'Jogo Terapêutico';
        const jogoVersao = jogoInfo?.versao || '1.0.0';
        const dataReferencia = row.data_hora_fim || row.data_hora_inicio;

        const existente = mapaJogos.get(row.jogo_id);
        if (existente) {
          existente.total_sessoes += 1;
          if (new Date(dataReferencia).getTime() > new Date(existente.ultima_sessao).getTime()) {
            existente.ultima_sessao = dataReferencia;
          }
        } else {
          mapaJogos.set(row.jogo_id, {
            jogo_id: row.jogo_id,
            nome: jogoNome,
            versao: jogoVersao,
            total_sessoes: 1,
            ultima_sessao: dataReferencia,
          });
        }
      }

      return Array.from(mapaJogos.values());
    } catch (err) {
      console.error('[HistoricoSessaoModel] Exceção em listarJogosDoPaciente:', err);
      return null;
    }
  }
}

function inicioSegura(ini: number, _fim: number): number {
  return ini;
}
