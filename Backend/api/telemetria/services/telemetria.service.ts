// ==============================================================================
// InTEA: Serviço de Ingestão e Processamento de Telemetria (Sprint 9)
// ==============================================================================
//
// Responsável: Marcos Willian (@MarcosWillianAP1K)
// Requisitos: RF12, RN01, RN02, RNF05
//
// Regras Clínicas:
// - RN01 (Modo Livre sem Persistência): Se a sessão for 'modo_livre' ou não tiver
//   paciente vinculado, a persistência no banco é suprimida automaticamente.
// - RN02 (Fallback Proibido / Tipagem Estrita): Toda métrica deve ter tipo_metrica
//   declarado no manifesto do jogo e ser compatível com seu domínio. Rejeita com 422.
// - Sessões Clínicas gravam telemetria na tabela 'telemetria_evento'.
// ==============================================================================

import { TelemetriaModel, TelemetriaEvento } from '../models/telemetria.model.js';
import { SessaoModel, MODO_SESSAO, STATUS_SESSAO, Sessao } from '../../sessao/models/sessao.model.js';
import { JogoModel, ManifestoJogo } from '../../jogos/models/jogo.model.js';
import { validarUUID } from '../../../core/utils/validators.js';

export interface ResultadoPersistenciaTelemetria {
  persistido: boolean;
  motivo?: string;
  total?: number;
  dados?: TelemetriaEvento | TelemetriaEvento[];
  violacaoRN02?: boolean;
}

export type EntradaTelemetriaEvento = Omit<TelemetriaEvento, 'sessao_id' | 'data_hora'> & {
  sessao_id?: string;
  data_hora?: string;
};

export class TelemetriaService {
  /**
   * Resolves a session entity from its UUID or pairing PIN token.
   *
   * @param identificador - Session UUID or pairing token.
   * @returns Resolved session record or null if not found.
   */
  private static async resolverSessao(identificador: string): Promise<Sessao | null> {
    if (!identificador || typeof identificador !== 'string') return null;
    const idLimpo = identificador.trim();

    if (validarUUID(idLimpo)) {
      return SessaoModel.buscarPorId(idLimpo);
    }
    return SessaoModel.buscarPorToken(idLimpo);
  }

  /**
   * Valida conformidade estrita de um evento com o manifesto clínico do jogo segundo a regra RN02.
   * Proíbe fallback automático e exige tipo_metrica compatível (número ou categoria do domínio).
   *
   * @param evento - Evento de telemetria recebido.
   * @param manifesto - Manifesto clínico do jogo ativo na sessão.
   * @returns Resultado da validação indicando se é válido ou o motivo da violação.
   */
  static validarEventoRN02(
    evento: EntradaTelemetriaEvento,
    manifesto: ManifestoJogo | null
  ): { valido: boolean; motivo?: string } {
    if (!manifesto) return { valido: true };

    const idMetrica = evento.dados?.id_metrica;
    if (!idMetrica) return { valido: true };

    const metricasSuportadas = manifesto.metricas_suportadas || [];
    const metricaHomologada = metricasSuportadas.find((m) => m.id_metrica === idMetrica);

    if (!metricaHomologada) {
      return {
        valido: false,
        motivo: `Métrica '${idMetrica}' não declarada no manifesto do jogo (RN02 - proibido fallback).`,
      };
    }

    const tipoDeclarado = metricaHomologada.tipo_metrica;
    if (tipoDeclarado !== 'numerica' && tipoDeclarado !== 'categorica') {
      return {
        valido: false,
        motivo: `Métrica '${idMetrica}' possui tipo inválido '${tipoDeclarado}' no manifesto (RN02).`,
      };
    }

    const valorBruto = evento.dados.valor;
    if (tipoDeclarado === 'numerica') {
      if (typeof valorBruto !== 'number' || Number.isNaN(valorBruto)) {
        return {
          valido: false,
          motivo: `Valor não-numérico recebido para métrica numérica '${idMetrica}' (RN02).`,
        };
      }
    } else if (tipoDeclarado === 'categorica') {
      if (typeof valorBruto !== 'string') {
        return {
          valido: false,
          motivo: `Valor não-string recebido para métrica categórica '${idMetrica}' (RN02).`,
        };
      }

      if (metricaHomologada.valores && !metricaHomologada.valores.includes(valorBruto)) {
        return {
          valido: false,
          motivo: `Valor '${valorBruto}' fora do domínio homologado [${metricaHomologada.valores.join(', ')}] para '${idMetrica}' (RN02).`,
        };
      }
    }

    return { valido: true };
  }

  /**
   * Persists an individual clinical telemetry event adhering to rule RN01 and RN02.
   *
   * @param sessaoIdentificador - Session UUID or pairing code.
   * @param evento - Telemetry event data payload.
   * @returns Telemetry persistence result status and data.
   */
  static async persistirEvento(
    sessaoIdentificador: string,
    evento: EntradaTelemetriaEvento
  ): Promise<ResultadoPersistenciaTelemetria> {
    const sessao = await this.resolverSessao(sessaoIdentificador || evento.sessao_id || '');

    if (!sessao) {
      return {
        persistido: false,
        motivo: 'Sessão não encontrada para associação de telemetria',
      };
    }

    // Guarda de máquina de estados: telemetria só pode ser injetada em sessão ativa
    if (sessao.status_sessao !== STATUS_SESSAO.EM_ANDAMENTO) {
      return {
        persistido: false,
        motivo: `sessao_inativa: a sessão está no status '${sessao.status_sessao}'`,
      };
    }

    // Regra RN01: Modo livre não grava telemetria em prontuário
    if (sessao.modo_sessao === MODO_SESSAO.MODO_LIVRE || !sessao.paciente_id) {
      return {
        persistido: false,
        motivo: 'modo_livre_sem_persistencia (RN01)',
      };
    }

    // Regra RN02: Validação estrita contra o manifesto clínico do jogo
    if (sessao.jogo_id) {
      const jogo = await JogoModel.buscarPorId(sessao.jogo_id);
      if (jogo?.manifesto_json) {
        const validacao = this.validarEventoRN02(evento, jogo.manifesto_json);
        if (!validacao.valido) {
          return {
            persistido: false,
            motivo: validacao.motivo,
            violacaoRN02: true,
          };
        }
      }
    }

    const eventoCompleto: TelemetriaEvento = {
      sessao_id: sessao.id,
      tipo_evento: evento.tipo_evento,
      dados: evento.dados,
      data_hora: evento.data_hora || new Date().toISOString(),
    };

    const resultado = await TelemetriaModel.registrarEvento(eventoCompleto);

    return {
      persistido: Boolean(resultado),
      dados: resultado || undefined,
    };
  }

  /**
   * Persists a batch array of telemetry events adhering to rule RN01 and RN02.
   *
   * @param sessaoIdentificador - Session UUID or pairing code.
   * @param eventos - Array of telemetry events to ingest.
   * @returns Batch persistence result status and processed count.
   */
  static async persistirLote(
    sessaoIdentificador: string,
    eventos: EntradaTelemetriaEvento[]
  ): Promise<ResultadoPersistenciaTelemetria> {
    if (!eventos || eventos.length === 0) {
      return { persistido: true, total: 0 };
    }

    const sessao = await this.resolverSessao(sessaoIdentificador || eventos[0]?.sessao_id || '');

    if (!sessao) {
      return {
        persistido: false,
        motivo: 'Sessão não encontrada para associação de telemetria em lote',
      };
    }

    // Guarda de máquina de estados: telemetria só pode ser injetada em sessão ativa
    if (sessao.status_sessao !== STATUS_SESSAO.EM_ANDAMENTO) {
      return {
        persistido: false,
        motivo: `sessao_inativa: a sessão está no status '${sessao.status_sessao}'`,
        total: eventos.length,
      };
    }

    // Regra RN01: Modo livre não grava telemetria em prontuário
    if (sessao.modo_sessao === MODO_SESSAO.MODO_LIVRE || !sessao.paciente_id) {
      return {
        persistido: false,
        motivo: 'modo_livre_sem_persistencia (RN01)',
        total: eventos.length,
      };
    }

    // Regra RN02: Validação estrita do lote contra o manifesto clínico do jogo
    if (sessao.jogo_id) {
      const jogo = await JogoModel.buscarPorId(sessao.jogo_id);
      if (jogo?.manifesto_json) {
        for (const evt of eventos) {
          const validacao = this.validarEventoRN02(evt, jogo.manifesto_json);
          if (!validacao.valido) {
            return {
              persistido: false,
              motivo: validacao.motivo,
              violacaoRN02: true,
              total: eventos.length,
            };
          }
        }
      }
    }

    const eventosFormatados: TelemetriaEvento[] = eventos.map((e) => ({
      sessao_id: sessao.id,
      tipo_evento: e.tipo_evento,
      dados: e.dados,
      data_hora: e.data_hora || new Date().toISOString(),
    }));

    const resultado = await TelemetriaModel.registrarLote(eventosFormatados);

    return {
      persistido: Boolean(resultado && resultado.length > 0),
      total: resultado ? resultado.length : 0,
      dados: resultado || undefined,
    };
  }

  /**
   * Lists telemetry events for a session with optional metric filter and pagination.
   *
   * @param sessaoId - UUID of the session.
   * @param idMetrica - Optional metric identifier to filter by.
   * @param limite - Optional page size limit.
   * @param pagina - 1-indexed page number (defaults to 1).
   * @returns Array of telemetry event records.
   */
  static async listarPorSessao(
    sessaoId: string,
    idMetrica?: string,
    limite?: number,
    pagina: number = 1
  ): Promise<TelemetriaEvento[]> {
    return TelemetriaModel.buscarPorSessaoId(sessaoId, idMetrica, limite, pagina);
  }
}
