// ==============================================================================
// InTEA: Serviço de Histórico Clínico e Séries por Jogo (Sprint 11)
// ==============================================================================
// REQUISITOS ATENDIDOS:
// - RF15: Prontuário Longitudinal (Separação: Histórico Geral vs Séries por Jogo)
// - RF19: Filtros e Paginação (sessaoId, dataInicio, dataFim, page, limit)
// - RF21: Segurança e Identidade Clínica
// - RN01: Expurgo de Sessões em Modo Livre (paciente_id = NULL)
// - RN02: Tipagem Estrita no Manifesto do Jogo (Rejeição 422 para métrica sem tipo)
// - RN04: Isolamento Institucional por Vínculo
// - RN05: Inalterabilidade do Histórico Clínico (Soft Delete de Relatórios)
// ==============================================================================

import {
  HistoricoSessaoModel,
  MetricasEngajamentoGeral,
  ResumoJogoPaciente,
  SessaoHistoricoItem,
} from '../models/historico.model.js';
import { JogoModel, MetricaManifesto } from '../../jogos/models/jogo.model.js';
import { SessaoModel } from '../../sessao/models/sessao.model.js';
import { PacienteServiceError } from './paciente.service.js';
import { validarUUID } from '../../../core/utils/validators.js';

export const TIPOS_METRICA_VALIDOS = ['numerica', 'categorica', 'ordinal', 'booleana'] as const;

export interface FiltrosHistoricoGeralInput {
  dataInicio?: string;
  dataFim?: string;
}

export interface FiltrosHistoricoJogoInput {
  sessaoId?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
}

export interface FiltrosHistoricoInput extends FiltrosHistoricoGeralInput, FiltrosHistoricoJogoInput {
  jogoId?: string;
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

/**
 * Resposta formatada para o Histórico Geral de Engajamento do Paciente.
 * Dados limpos e simplificados para cards de perfil (RF15).
 */
export interface RespostaHistoricoGeral {
  engajamento: MetricasEngajamentoGeral;
  jogos: ResumoJogoPaciente[];
  meta: {
    paciente_id: string;
    filtros?: FiltrosHistoricoGeralInput;
  };
}

/**
 * Resposta formatada para o Histórico Específico de um Jogo.
 * Séries temporais das métricas homologadas no manifesto do jogo (RN02).
 */
export interface RespostaHistoricoJogo {
  jogo: {
    id: string | number;
    nome: string;
    versao: string;
  };
  metricas_declaradas: MetricaManifesto[];
  series_temporais: SerieMetricaJogo[];
  sessoes: SessaoHistoricoItem[];
  meta: {
    paciente_id: string;
    jogo_id: string;
    sessao_referencia_id: string | null;
    paginacao: {
      page: number;
      limit: number;
      total_registros: number;
    };
  };
}

export interface RespostaHistoricoPaciente {
  paciente_id: string;
  engajamento_geral: MetricasEngajamentoGeral;
  historico_por_jogo:
    | {
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
    | {
        tipo: 'catalogo';
        jogos: ResumoJogoPaciente[];
      };
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
      throw new PacienteServiceError(
        'O parâmetro page deve ser um número inteiro maior ou igual a 1.',
        400
      );
    }

    if (filtros.limit !== undefined && (isNaN(filtros.limit) || filtros.limit < 1)) {
      throw new PacienteServiceError(
        'O parâmetro limit deve ser um número inteiro maior ou igual a 1.',
        400
      );
    }

    if (filtros.jogoId && !validarUUID(filtros.jogoId)) {
      throw new PacienteServiceError('O identificador do jogo deve ser um UUID válido.', 400);
    }

    if (filtros.sessaoId && !validarUUID(filtros.sessaoId)) {
      throw new PacienteServiceError('O identificador da sessão deve ser um UUID válido.', 400);
    }
  }

  /**
   * Rota 1: Histórico Geral do Paciente (Métricas universais de engajamento e catálogo de jogos).
   * Retorna dados limpos e simples para os cards do perfil do paciente sem poluição.
   *
   * @param pacienteId UUID do paciente
   * @param filtros Filtros opcionais de intervalo temporal
   */
  static async buscarHistoricoGeral(
    pacienteId: string,
    filtros: FiltrosHistoricoGeralInput = {}
  ): Promise<RespostaHistoricoGeral> {
    if (!pacienteId || !validarUUID(pacienteId)) {
      throw new PacienteServiceError('Identificador do paciente inválido ou ausente.', 400);
    }

    this.validarFiltros(filtros);

    const engajamento = await HistoricoSessaoModel.buscarMetricasEngajamentoGeral(pacienteId, {
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
    });

    if (!engajamento) {
      throw new PacienteServiceError('Falha ao processar métricas de engajamento do paciente.', 500);
    }

    const jogos = await HistoricoSessaoModel.listarJogosDoPaciente(pacienteId);
    if (!jogos) {
      throw new PacienteServiceError('Falha ao listar catálogo de jogos do paciente.', 500);
    }

    return {
      engajamento,
      jogos,
      meta: {
        paciente_id: pacienteId,
        filtros: Object.keys(filtros).length > 0 ? filtros : undefined,
      },
    };
  }

  /**
   * Rota 2: Histórico Específico por Jogo.
   * Recupera as métricas tipadas no manifesto do jogo (RN02) e traça a série evolutiva.
   * Se informado `sessaoId`, o histórico é delimitado estritamente até a data daquela sessão.
   *
   * @param pacienteId UUID do paciente
   * @param jogoId UUID do jogo terapêutico
   * @param filtros Filtros opcionais de sessão de referência, datas e paginação
   */
  static async buscarHistoricoJogo(
    pacienteId: string,
    jogoId: string,
    filtros: FiltrosHistoricoJogoInput = {}
  ): Promise<RespostaHistoricoJogo> {
    if (!pacienteId || !validarUUID(pacienteId)) {
      throw new PacienteServiceError('Identificador do paciente inválido ou ausente.', 400);
    }

    if (!jogoId || !validarUUID(jogoId)) {
      throw new PacienteServiceError('Identificador do jogo deve ser um UUID válido.', 400);
    }

    this.validarFiltros(filtros);

    // Se uma sessão de referência foi informada, valida e limita o histórico até a data dela
    let dataFimEfetiva = filtros.dataFim;
    if (filtros.sessaoId) {
      const sessaoRef = await SessaoModel.buscarPorId(filtros.sessaoId);
      if (!sessaoRef) {
        throw new PacienteServiceError('Sessão de referência informada não encontrada.', 404);
      }
      if (sessaoRef.paciente_id !== pacienteId) {
        throw new PacienteServiceError('A sessão informada não pertence ao paciente especificado.', 400);
      }
      if (sessaoRef.jogo_id !== jogoId) {
        throw new PacienteServiceError('A sessão informada não pertence ao jogo especificado.', 400);
      }

      if (sessaoRef.status_sessao !== 'finalizada') {
        throw new PacienteServiceError(
          'A sessão de referência informada não foi finalizada. Apenas sessões clínicas concluídas podem ser usadas como ponto de corte temporal.',
          400
        );
      }

      dataFimEfetiva = sessaoRef.data_hora_fim!;
    }

    const jogo = await JogoModel.buscarPorId(jogoId);
    if (!jogo) {
      throw new PacienteServiceError('Jogo terapêutico não encontrado no catálogo.', 404);
    }

    // Validação Estrita de Tipagem no Manifesto (RN02 - Fallback de Métrica Proibido)
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

    // Paginação e busca de sessões finalizadas com relatórios clínicos ativos (RN05)
    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const offset = (page - 1) * limit;

    const [sessoes, totalRegistros] = await Promise.all([
      HistoricoSessaoModel.buscarHistoricoPorJogo(
        pacienteId,
        jogoId,
        limit,
        offset,
        {
          dataInicio: filtros.dataInicio,
          dataFim: dataFimEfetiva,
        }
      ),
      HistoricoSessaoModel.contarHistoricoPorJogo(
        pacienteId,
        jogoId,
        {
          dataInicio: filtros.dataInicio,
          dataFim: dataFimEfetiva,
        }
      ),
    ]);

    if (!sessoes) {
      throw new PacienteServiceError('Falha ao consultar histórico de sessões do jogo.', 500);
    }

    // Construção das séries temporais por métrica declarada
    const seriesTemporais: SerieMetricaJogo[] = metricasSuportadas.map((metrica) => {
      const pontos: PontoSerieMetrica[] = sessoes.map((sessao) => {
        let valorPonto: string | number | boolean | null = null;
        let tendenciaPonto: string | null = null;

        const dadosIA = sessao.dados_ia_json as {
          metricas_agregadas?: Array<{
            id_metrica: string;
            valor_dominante: string | number;
            tendencia?: string;
          }>;
        };

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

    return {
      jogo: {
        id: jogo.id,
        nome: jogo.nome,
        versao: jogo.versao,
      },
      metricas_declaradas: metricasSuportadas,
      series_temporais: seriesTemporais,
      sessoes,
      meta: {
        paciente_id: pacienteId,
        jogo_id: jogoId,
        sessao_referencia_id: filtros.sessaoId || null,
        paginacao: {
          page,
          limit,
          total_registros: totalRegistros,
        },
      },
    };
  }

  /**
   * Método de compatibilidade reversa para consultas legadas de histórico.
   */
  static async buscarHistoricoPaciente(
    pacienteId: string,
    filtros: FiltrosHistoricoInput = {}
  ): Promise<RespostaHistoricoPaciente> {
    if (filtros.jogoId) {
      const detalheJogo = await this.buscarHistoricoJogo(pacienteId, filtros.jogoId, filtros);
      const engajamento = await HistoricoSessaoModel.buscarMetricasEngajamentoGeral(pacienteId, {
        dataInicio: filtros.dataInicio,
        dataFim: filtros.dataFim,
      });

      return {
        paciente_id: pacienteId,
        engajamento_geral: engajamento || {
          total_sessoes: 0,
          total_iniciadas: 0,
          sessoes_finalizadas: 0,
          sessoes_interrompidas: 0,
          taxa_conclusao_porcentagem: 0,
          taxa_conclusao: 0,
          tempo_total_segundos: 0,
          tempo_medio_segundos: 0,
        },
        historico_por_jogo: {
          tipo: 'detalhado',
          jogo: {
            id: detalheJogo.jogo.id,
            nome: detalheJogo.jogo.nome,
            versao: detalheJogo.jogo.versao,
            metricas_suportadas: detalheJogo.metricas_declaradas,
          },
          sessoes: detalheJogo.sessoes,
          series_temporais: detalheJogo.series_temporais,
          paginacao: detalheJogo.meta.paginacao,
        },
      };
    }

    const geral = await this.buscarHistoricoGeral(pacienteId, filtros);
    return {
      paciente_id: pacienteId,
      engajamento_geral: geral.engajamento,
      historico_por_jogo: {
        tipo: 'catalogo',
        jogos: geral.jogos,
      },
    };
  }
}
