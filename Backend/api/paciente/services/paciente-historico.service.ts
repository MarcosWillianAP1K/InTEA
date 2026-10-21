// ==============================================================================
// InTEA: Serviço de Histórico Clínico e Séries por Jogo (Sprint 11)
// ==============================================================================
// REQUISITOS ATENDIDOS:
// - RF15: Prontuário Longitudinal (Dois Níveis: Engajamento Global e Séries por Jogo)
// - RF19: Filtros e Paginação (jogoId, dataInicio, dataFim, page, limit)
// - RF21: Segurança e Identidade Clínica
// - RN01: Expurgo de Sessões em Modo Livre (paciente_id = NULL)
// - RN02: Tipagem Estrita no Manifesto do Jogo (Rejeição 422 para métrica sem tipo)
// - RN04: Isolamento Institucional por Vínculo
// - RN05: Inalterabilidade do Histórico Clínico (Soft Delete)
// ==============================================================================

import { HistoricoSessaoModel, MetricasEngajamentoGeral, ResumoJogoPaciente, SessaoHistoricoItem } from '../models/historico.model.js';
import { JogoModel, MetricaManifesto } from '../../jogos/models/jogo.model.js';
import { PacienteServiceError } from './paciente.service.js';
import { validarUUID } from '../../../core/utils/validators.js';

export const TIPOS_METRICA_VALIDOS = ['numerica', 'categorica', 'ordinal', 'booleana'] as const;

export interface FiltrosHistoricoInput {
  jogoId?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
}

export interface PontoSerieMetrica {
  sessao_id: string;
  data_hora: string;
  valor: string | number | boolean | null;
  tendencia?: string | null;
}

export interface SerieMetricaJogo {
  id_metrica: string;
  tipo_metrica: string;
  unidade?: string;
  valores?: string[];
  pontos: PontoSerieMetrica[];
}

export interface HistoricoPorJogoDetalhado {
  tipo: 'detalhado';
  jogo: {
    id: string | number;
    nome: string;
    versao: string;
    metricas_suportadas: MetricaManifesto[];
  };
  sessoes: SessaoHistoricoItem[];
  series_temporais: SerieMetricaJogo[];
  paginacao: {
    page: number;
    limit: number;
    total_registros: number;
  };
}

export interface HistoricoPorJogoCatalogo {
  tipo: 'catalogo';
  jogos: ResumoJogoPaciente[];
}

export type HistoricoPorJogoResultado = HistoricoPorJogoDetalhado | HistoricoPorJogoCatalogo;

export interface RespostaHistoricoPaciente {
  paciente_id: string;
  engajamento_geral: MetricasEngajamentoGeral;
  historico_por_jogo: HistoricoPorJogoResultado;
}

export class PacienteHistoricoService {
  /**
   * Valida parâmetros de filtros e datas para garantir consistência temporal (RF19).
   */
  static validarFiltros(filtros: FiltrosHistoricoInput): void {
    if (filtros.dataInicio && filtros.dataFim) {
      const inicio = new Date(filtros.dataInicio).getTime();
      const fim = new Date(filtros.dataFim).getTime();

      if (isNaN(inicio) || isNaN(fim)) {
        throw new PacienteServiceError('Formato de data inválido nos filtros de período.', 400);
      }

      if (inicio > fim) {
        throw new PacienteServiceError('A data inicial não pode ser posterior à data final.', 400);
      }
    }

    if (filtros.page !== undefined && (isNaN(filtros.page) || filtros.page < 1)) {
      throw new PacienteServiceError('O parâmetro page deve ser um número inteiro maior ou igual a 1.', 400);
    }

    if (filtros.limit !== undefined && (isNaN(filtros.limit) || filtros.limit < 1)) {
      throw new PacienteServiceError('O parâmetro limit deve ser um número inteiro maior ou igual a 1.', 400);
    }

    if (filtros.jogoId && !validarUUID(filtros.jogoId)) {
      throw new PacienteServiceError('O identificador do jogo deve ser um UUID válido.', 400);
    }
  }

  /**
   * Constrói e orquestra a resposta completa do prontuário longitudinal do paciente.
   *
   * @param pacienteId UUID do paciente
   * @param filtros Filtros opcionais de intervalo temporal, paginação e jogo específico
   */
  static async buscarHistoricoPaciente(
    pacienteId: string,
    filtros: FiltrosHistoricoInput = {}
  ): Promise<RespostaHistoricoPaciente> {
    if (!pacienteId || !validarUUID(pacienteId)) {
      throw new PacienteServiceError('Identificador do paciente inválido ou ausente.', 400);
    }

    // 1. Validação estrita de parâmetros de consulta
    this.validarFiltros(filtros);

    // 2. Nível 1: Cômputo do Engajamento Geral (Universal para todos os jogos)
    const engajamentoGeral = await HistoricoSessaoModel.buscarMetricasEngajamentoGeral(pacienteId, {
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
    });

    if (!engajamentoGeral) {
      throw new PacienteServiceError('Falha ao processar métricas de engajamento do paciente.', 500);
    }

    // 3. Nível 2: Histórico Especializado por Jogo ou Catálogo
    let historicoPorJogo: HistoricoPorJogoResultado;

    if (filtros.jogoId) {
      // 3.1. Consulta de jogo específico
      const jogo = await JogoModel.buscarPorId(filtros.jogoId);
      if (!jogo) {
        throw new PacienteServiceError('Jogo terapêutico não encontrado no catálogo.', 404);
      }

      // 3.2. Validação Estrita do Manifesto do Jogo (RN02)
      const manifesto = jogo.manifesto_json;
      const metricasSuportadas = manifesto?.metricas_suportadas;

      if (!manifesto || !Array.isArray(metricasSuportadas) || metricasSuportadas.length === 0) {
        throw new PacienteServiceError(
          `Violação da RN02: O jogo '${jogo.nome}' não possui métricas clínicas homologadas em seu manifesto.`,
          422,
          {
            regraViolada: 'RN02 - Fallback de Métrica Proibido',
            jogo_id: jogo.id,
            motivo: 'Manifesto sem métricas homologadas',
          }
        );
      }

      for (const metrica of metricasSuportadas) {
        const tipoDeclarado = metrica.tipo_metrica ? String(metrica.tipo_metrica).trim().toLowerCase() : '';
        if (!tipoDeclarado || !(TIPOS_METRICA_VALIDOS as readonly string[]).includes(tipoDeclarado)) {
          throw new PacienteServiceError(
            `Violação da RN02: A métrica '${metrica.id_metrica || 'desconhecida'}' do jogo '${jogo.nome}' não possui tipo clínico válido declarado no manifesto. É estritamente proibido fallback automático.`,
            422,
            {
              regraViolada: 'RN02 - Fallback de Métrica Proibido',
              id_metrica: metrica.id_metrica || 'desconhecida',
              tipo_declarado: metrica.tipo_metrica || null,
              tipos_permitidos: TIPOS_METRICA_VALIDOS,
            }
          );
        }
      }

      // 3.3. Recuperação das sessões concluídas com seus relatórios clínicos ativos (RN05)
      const page = filtros.page || 1;
      const limit = filtros.limit || 20;
      const offset = (page - 1) * limit;

      const sessoes = await HistoricoSessaoModel.buscarHistoricoPorJogo(
        pacienteId,
        filtros.jogoId,
        limit,
        offset,
        {
          dataInicio: filtros.dataInicio,
          dataFim: filtros.dataFim,
        }
      );

      if (!sessoes) {
        throw new PacienteServiceError('Falha ao consultar histórico de sessões do jogo.', 500);
      }

      // 3.4. Montagem das Séries Temporais por Métrica Homologada
      const seriesTemporais: SerieMetricaJogo[] = metricasSuportadas.map((metrica) => {
        const pontos: PontoSerieMetrica[] = sessoes.map((sessao) => {
          let valorPonto: string | number | boolean | null = null;
          let tendenciaPonto: string | null = null;

          const dadosIA = sessao.dados_ia_json as { metricas_agregadas?: Array<{ id_metrica: string; valor_dominante: string | number; tendencia?: string }> };
          if (dadosIA && Array.isArray(dadosIA.metricas_agregadas)) {
            const metricaEncontrada = dadosIA.metricas_agregadas.find(
              (m) => m.id_metrica === metrica.id_metrica
            );
            if (metricaEncontrada) {
              valorPonto = metricaEncontrada.valor_dominante;
              tendenciaPonto = metricaEncontrada.tendencia || null;
            }
          }

          return {
            sessao_id: sessao.sessao_id,
            data_hora: sessao.data_hora_fim,
            valor: valorPonto,
            tendencia: tendenciaPonto,
          };
        });

        return {
          id_metrica: metrica.id_metrica,
          tipo_metrica: metrica.tipo_metrica,
          unidade: metrica.unidade,
          valores: metrica.valores,
          pontos,
        };
      });

      historicoPorJogo = {
        tipo: 'detalhado',
        jogo: {
          id: jogo.id,
          nome: jogo.nome,
          versao: jogo.versao,
          metricas_suportadas: metricasSuportadas,
        },
        sessoes,
        series_temporais: seriesTemporais,
        paginacao: {
          page,
          limit,
          total_registros: sessoes.length,
        },
      };
    } else {
      // 3.5. Omissão de jogoId: Retorna catálogo resumido dos jogos jogados pelo paciente
      const listaJogos = await HistoricoSessaoModel.listarJogosDoPaciente(pacienteId);
      if (!listaJogos) {
        throw new PacienteServiceError('Falha ao listar catálogo de jogos do paciente.', 500);
      }

      historicoPorJogo = {
        tipo: 'catalogo',
        jogos: listaJogos,
      };
    }

    return {
      paciente_id: pacienteId,
      engajamento_geral: engajamentoGeral,
      historico_por_jogo: historicoPorJogo,
    };
  }
}
