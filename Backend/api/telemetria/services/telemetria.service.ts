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
import { SessaoModel, MODO_SESSAO, Sessao } from '../../sessao/models/sessao.model.js';

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
   * Resolve a sessão a partir do ID ou do Session Token (PIN)
   */
  private static async resolverSessao(identificador: string): Promise<Sessao | null> {
    if (!identificador) return null;
    let sessao = await SessaoModel.buscarPorId(identificador);
    if (!sessao) {
      sessao = await SessaoModel.buscarPorToken(identificador);
    }
    return sessao;
  }

  /**
   * Persiste um evento individual de telemetria respeitando RN01
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
   * Persiste um lote de eventos de telemetria em batch insert respeitando RN01
   * (Esta função é consumida pelo listener Socket.IO de João Marcos e pelo REST Controller)
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
   * Consulta os eventos de telemetria de uma sessão com suporte a filtro por métrica
   */
  static async listarPorSessao(sessaoId: string, idMetrica?: string): Promise<TelemetriaEvento[]> {
    return TelemetriaModel.buscarPorSessaoId(sessaoId, idMetrica);
  }
}
