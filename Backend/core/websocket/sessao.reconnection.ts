/**
 * ============================================================================
 * MÓDULO DE RECONEXÃO E RESILIÊNCIA DE SESSÃO ATIVA (Card 2.3 / Sprint 9)
 * Requisitos: RNF04 (Tolerância a Falhas e Tempo Real)
 * Regra: TypeScript estrito sem o uso de `any`
 * ============================================================================
 */

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
   * Retorna a instância singleton do gerenciador de reconexão.
   */
  static obterInstancia(): SessaoReconnectionManager {
    if (!SessaoReconnectionManager.instance) {
      SessaoReconnectionManager.instance = new SessaoReconnectionManager();
    }
    return SessaoReconnectionManager.instance;
  }

  /**
   * Permite ajustar a janela de tolerância (útil para suítes de testes determinísticos).
   */
  definirJanelaTolerancia(ms: number): void {
    if (ms <= 0) {
      throw new Error('A janela de tolerância deve ser um tempo positivo em milissegundos.');
    }
    this.janelaToleranciaMs = ms;
  }

  /**
   * Retorna a janela de tolerância atual em milissegundos.
   */
  obterJanelaTolerancia(): number {
    return this.janelaToleranciaMs;
  }

  /**
   * Registra uma conexão ativa no gerenciador.
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
   * Registra uma desconexão transitória de sinal, abrindo a janela de tolerância de 60 segundos.
   * Não derruba a sessão de imediato, permitindo reconexão sem perda de contexto.
   *
   * @param sessionToken - PIN identificador da sessão.
   * @param motivo - Causa da perda de conexão.
   * @param onTimeout - Callback executado caso a janela de tolerância expire sem reconexão.
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
    const timer = setTimeout(() => {
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
   * Processa a reconexão do dispositivo remoto dentro da janela de graça.
   * Cancela o temporizador de interrupção e calcula a métrica de tempo offline.
   *
   * @param sessionToken - PIN identificador da sessão.
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
   * Retorna o snapshot atual do estado de reconexão de uma sessão.
   */
  obterEstado(sessionToken: string): EstadoReconexaoSessao | null {
    const token = this.normalizarToken(sessionToken);
    const estado = this.estados.get(token);
    return estado ? { ...estado } : null;
  }

  /**
   * Verifica se uma sessão está atualmente na janela de tolerância após queda de conexão.
   */
  estaEmJanelaTolerancia(sessionToken: string): boolean {
    const token = this.normalizarToken(sessionToken);
    return this.temporizadores.has(token);
  }

  /**
   * Cancela o temporizador ativo de uma sessão se houver.
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
   * Limpa todos os temporizadores e estados (essencial para tearDown de testes sem memory leak).
   */
  limparTodos(): void {
    for (const timer of this.temporizadores.values()) {
      clearTimeout(timer);
    }
    this.temporizadores.clear();
    this.estados.clear();
  }

  /**
   * Normaliza o token alfanumérico removendo formatação.
   */
  private normalizarToken(token: string): string {
    return token.trim().toUpperCase();
  }
}
