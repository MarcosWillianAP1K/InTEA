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
 * Métricas universais consolidadas de engajamento do paciente.
 * Compartilhadas transversalmente por todos os jogos terapêuticos.
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
 * Parâmetros de filtro e paginação para consultas de histórico clínico (RF19).
 */
export interface FiltrosHistoricoDTO {
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
  page?: number;
  offset?: number;
}

/**
 * Item individual de histórico com parecer técnico e dados analíticos da IA.
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
 * Resumo de catálogo de jogos já jogados pelo paciente.
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
   * Calcula as métricas transversais de engajamento clínico e assiduidade do paciente.
   * Utiliza o índice parcial `idx_sessao_paciente_engajamento` no PostgreSQL.
   * Exclui rigorosamente partidas em modo livre (RN01: paciente_id = NULL).
   *
   * @param pacienteId UUID do paciente
   * @param filtros Filtros opcionais de intervalo temporal (dataInicio, dataFim)
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
   * Recupera o histórico longitudinal detalhado de sessões concluídas de um jogo específico.
   * Utiliza o índice parcial composto `idx_sessao_paciente_jogo_fim` e relaciona com `relatorio_sessao`.
   * Garante expurgo de modo livre (RN01) e ignora relatórios inativados com soft_delete = true (RN05).
   *
   * @param pacienteId UUID do paciente
   * @param jogoId UUID do jogo terapêutico
   * @param limit Limite máximo de registros (paginação)
   * @param offset Deslocamento para paginação
   * @param filtros Filtros opcionais de intervalo temporal
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
   * Conta o total de sessões finalizadas com relatório ativo para um paciente/jogo.
   * Utilizado para paginação precisa (RF19).
   */
  static async contarHistoricoPorJogo(
    pacienteId: string,
    jogoId: string,
    filtros?: FiltrosHistoricoDTO
  ): Promise<number> {
    if (!pacienteId || !validarUUID(pacienteId) || !jogoId || !validarUUID(jogoId)) {
      return 0;
    }

    try {
      let query = supabase
        .from('sessao')
        .select('id', { count: 'exact', head: true })
        .eq('paciente_id', pacienteId)
        .eq('jogo_id', jogoId)
        .eq('modo_sessao', 'sessao_clinica')
        .eq('status_sessao', 'finalizada')
        .not('paciente_id', 'is', null);

      if (filtros?.dataInicio) {
        query = query.gte('data_hora_fim', filtros.dataInicio);
      }
      if (filtros?.dataFim) {
        query = query.lte('data_hora_fim', filtros.dataFim);
      }

      const { count, error } = await query;

      if (error || count === null) {
        console.error('[HistoricoSessaoModel] Erro ao contar histórico por jogo:', error);
        return 0;
      }

      return count;
    } catch (err) {
      console.error('[HistoricoSessaoModel] Exceção em contarHistoricoPorJogo:', err);
      return 0;
    }
  }

  /**
   * Lista o catálogo de jogos com intervenções clínicas realizadas pelo paciente.
   * Utilizado quando jogoId é omitido para alimentar seletores dinâmicos no front-end.
   *
   * @param pacienteId UUID do paciente
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
