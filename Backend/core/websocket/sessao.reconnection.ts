/**
 * ============================================================================
 * MÓDULO DE RECONEXÃO E RESILIÊNCIA DE SESSÃO ATIVA (Card 2.3 / Sprint 9)
 * Requisitos: RNF04 (Tolerância a Falhas e Tempo Real)
 * Regra: TypeScript estrito sem o uso de `any`
 * ============================================================================
 */

import { SessaoModel, STATUS_SESSAO } from '../../api/sessao/models/sessao.model.js';
import { AuditoriaService } from '../../api/auditoria/services/auditoria.service.js';

export type StatusReconexao =
  | 'conectado'
  | 'desconectado_transitorio'
  | 'reconectado'
  | 'interrompida_por_queda';

export interface EstadoReconexaoSessao {
  session_token: string;
  status: StatusReconexao;
  desconectado_em?: string;
  desconectado_timestamp?: number;
  janela_tolerancia_ms: number;
  expira_em?: string;
  reconectado_em?: string;
  tempo_offline_ms?: number;
}

export interface EventoAdvertenciaDesconexao {
  session_token: string;
  motivo: string;
  status_sessao: 'desconectado_transitorio';
  janela_tolerancia_ms: number;
  expira_em: string;
  advertencia: string;
}

export interface ResultadoReconexao {
  sucesso: boolean;
  tempo_offline_ms: number;
  dentro_da_janela: boolean;
  status_anterior: StatusReconexao;
  status_atual: StatusReconexao;
}

export interface EventoSessaoInterrompida {
  session_token: string;
  motivo: 'interrompida_por_queda';
  status_sessao: 'interrompida_por_queda';
  tempo_offline_total_ms: number;
  interrompida_em: string;
}

export class SessaoReconnectionManager {
  private static instance?: SessaoReconnectionManager;
  private janelaToleranciaMs: number = 60_000; // Padrão: 60 segundos conforme RNF04
  private temporizadores: Map<string, NodeJS.Timeout> = new Map();
  private estados: Map<string, EstadoReconexaoSessao> = new Map();

  constructor(janelaToleranciaMs: number = 60_000) {
    this.janelaToleranciaMs = janelaToleranciaMs;
  }

  /**
   * Returns singleton instance of reconnection manager.
   */
  static obterInstancia(): SessaoReconnectionManager {
    if (!SessaoReconnectionManager.instance) {
      SessaoReconnectionManager.instance = new SessaoReconnectionManager();
    }
    return SessaoReconnectionManager.instance;
  }

  /**
   * Allows configuring tolerance window (useful for deterministic test suites).
   */
  definirJanelaTolerancia(ms: number): void {
    if (ms <= 0) {
      throw new Error('A janela de tolerância deve ser um tempo positivo em milissegundos.');
    }
    this.janelaToleranciaMs = ms;
  }

  /**
   * Returns current tolerance window in milliseconds.
   */
  obterJanelaTolerancia(): number {
    return this.janelaToleranciaMs;
  }

  /**
   * Registers an active connection in the manager.
   */
  registrarConexao(sessionToken: string): void {
    const token = this.normalizarToken(sessionToken);
    this.cancelarTemporizador(token);

    this.estados.set(token, {
      session_token: token,
      status: 'conectado',
      janela_tolerancia_ms: this.janelaToleranciaMs
    });
  }

  /**
   * Registers a transient signal disconnection, opening the 60-second tolerance window.
   * Does not immediately drop the session, allowing reconnection without losing context.
   *
   * @param sessionToken - Session PIN code.
   * @param motivo - Cause of disconnection.
   * @param onTimeout - Callback executed if the tolerance window expires without reconnection.
   */
  registrarDesconexao(
    sessionToken: string,
    motivo: string,
    onTimeout: (evento: EventoSessaoInterrompida) => void
  ): EventoAdvertenciaDesconexao {
    const token = this.normalizarToken(sessionToken);
    const agora = Date.now();
    const expiraTimestamp = agora + this.janelaToleranciaMs;
    const expiraEmIso = new Date(expiraTimestamp).toISOString();

    // Cancela qualquer timer ativo prévio para este token
    this.cancelarTemporizador(token);

    const estado: EstadoReconexaoSessao = {
      session_token: token,
      status: 'desconectado_transitorio',
      desconectado_em: new Date(agora).toISOString(),
      desconectado_timestamp: agora,
      janela_tolerancia_ms: this.janelaToleranciaMs,
      expira_em: expiraEmIso
    };

    this.estados.set(token, estado);

    // Agenda o timeout da janela de tolerância
    const timer = setTimeout(async () => {
      this.temporizadores.delete(token);

      const tempoOfflineTotalMs = Date.now() - agora;
      estado.status = 'interrompida_por_queda';
      estado.tempo_offline_ms = tempoOfflineTotalMs;

      const eventoInterrupcao: EventoSessaoInterrompida = {
        session_token: token,
        motivo: 'interrompida_por_queda',
        status_sessao: 'interrompida_por_queda',
        tempo_offline_total_ms: tempoOfflineTotalMs,
        interrompida_em: new Date().toISOString()
      };

      onTimeout(eventoInterrupcao);

      try {
        const sessao = await SessaoModel.buscarPorToken(token);
        if (sessao) {
          await SessaoModel.atualizarStatus(sessao.id, STATUS_SESSAO.INTERROMPIDA_POR_QUEDA);
          await AuditoriaService.registrarSilencioso({
            sessao_id: sessao.id,
            terapeuta_id: sessao.terapeuta_id,
            origem: 'dispositivo_jogo',
            acao: 'interrompida_por_queda',
            detalhes_json: {
              session_token: token,
              tempo_offline_total_ms: tempoOfflineTotalMs,
              motivo: 'interrompida_por_queda',
              interrompida_em: eventoInterrupcao.interrompida_em,
            },
          });
        }
      } catch (err) {
        console.error('[SessaoReconnectionManager] Erro ao persistir queda de conexão:', err);
      }
    }, this.janelaToleranciaMs);

    // Evita prender o processo Node caso seja encerrado
    if (typeof timer.unref === 'function') {
      timer.unref();
    }

    this.temporizadores.set(token, timer);

    return {
      session_token: token,
      motivo,
      status_sessao: 'desconectado_transitorio',
      janela_tolerancia_ms: this.janelaToleranciaMs,
      expira_em: expiraEmIso,
      advertencia: `Dispositivo desconectado. Aguardando reconexão na janela de tolerância de ${Math.round(this.janelaToleranciaMs / 1000)}s.`
    };
  }

  /**
   * Processes remote device reconnection within the grace window.
   * Cancels interruption timer and calculates offline time metric.
   *
   * @param sessionToken - Session PIN code.
   */
  registrarReconexao(sessionToken: string): ResultadoReconexao {
    const token = this.normalizarToken(sessionToken);
    const estado = this.estados.get(token);
    const timer = this.temporizadores.get(token);
    const agora = Date.now();

    const dentroDaJanela = Boolean(timer);
    const statusAnterior: StatusReconexao = estado?.status || 'conectado';

    let tempoOfflineMs = 0;
    if (estado?.desconectado_timestamp) {
      tempoOfflineMs = Math.max(0, agora - estado.desconectado_timestamp);
    }

    // Cancela o timeout pendente
    this.cancelarTemporizador(token);

    const statusAtual: StatusReconexao = 'conectado';

    this.estados.set(token, {
      session_token: token,
      status: statusAtual,
      janela_tolerancia_ms: this.janelaToleranciaMs,
      reconectado_em: new Date(agora).toISOString(),
      tempo_offline_ms: tempoOfflineMs
    });

    return {
      sucesso: true,
      tempo_offline_ms: tempoOfflineMs,
      dentro_da_janela: dentroDaJanela,
      status_anterior: statusAnterior,
      status_atual: statusAtual
    };
  }

  /**
   * Returns current snapshot of session reconnection state.
   */
  obterEstado(sessionToken: string): EstadoReconexaoSessao | null {
    const token = this.normalizarToken(sessionToken);
    const estado = this.estados.get(token);
    return estado ? { ...estado } : null;
  }

  /**
   * Checks whether session is currently in tolerance grace window after connection drop.
   */
  estaEmJanelaTolerancia(sessionToken: string): boolean {
    const token = this.normalizarToken(sessionToken);
    return this.temporizadores.has(token);
  }

  /**
   * Cancels active timer for a session if running.
   */
  cancelarTemporizador(sessionToken: string): void {
    const token = this.normalizarToken(sessionToken);
    const timer = this.temporizadores.get(token);
    if (timer) {
      clearTimeout(timer);
      this.temporizadores.delete(token);
    }
  }

  /**
   * Clears all active disconnection timers and session states.
   * Test Teardown: Resets reconnecting state trackers to ensure deterministic test runs.
   */
  limparTodos(): void {
    for (const timer of this.temporizadores.values()) {
      clearTimeout(timer);
    }
    this.temporizadores.clear();
    this.estados.clear();
  }

  /**
   * Normalizes alphanumeric token by removing formatting.
   */
  private normalizarToken(token: string): string {
    return token.trim().toUpperCase();
  }
}
