// ==============================================================================
// InTEA: Serviço de Ingestão e Processamento de Telemetria (Sprint 9)
// ==============================================================================
//
// Responsável: Marcos Willian (@MarcosWillianAP1K)
// Requisitos: RF12, RN01, RNF05
//
// Regras Clínicas:
// - RN01 (Modo Livre sem Persistência): Se a sessão for 'modo_livre' ou não tiver
//   paciente vinculado, a persistência no banco é suprimida automaticamente.
// - Sessões Clínicas gravam telemetria na tabela 'telemetria_evento'.
// ==============================================================================

import { TelemetriaModel, TelemetriaEvento } from '../models/telemetria.model.js';
import { SessaoModel, MODO_SESSAO, STATUS_SESSAO, Sessao } from '../../sessao/models/sessao.model.js';
import { validarUUID } from '../../../core/utils/validators.js';

export interface ResultadoPersistenciaTelemetria {
  persistido: boolean;
  motivo?: string;
  total?: number;
  dados?: TelemetriaEvento | TelemetriaEvento[];
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
   * Persists an individual clinical telemetry event adhering to rule RN01.
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
   * Persists a batch array of telemetry events adhering to rule RN01.
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
