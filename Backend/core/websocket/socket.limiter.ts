/**
 * ============================================================================
 * RATE LIMITING E PREVENÇÃO DE FLOOD EM WEBSOCKET (Card 2.4 / Sprint 9)
 * Requisitos: RNF03 (Segurança e Integridade), RNF04 (Tempo Real)
 * Regra: TypeScript estrito sem o uso de `any`
 * ============================================================================
 */

export interface SocketLimiterOpcoes {
  maxEventosPorJanela?: number; // Padrão: 20 eventos por segundo (RNF03)
  janelaMs?: number;           // Padrão: 1.000 ms (1 segundo)
}

export interface ResultadoRateLimit {
  permitido: boolean;
  totalEventosNaJanela: number;
  limiteMaximo: number;
  tempoRestanteMs?: number;
  codigo?: 'RATE_LIMIT_EXCEDIDO';
  mensagem?: string;
}

interface RegistroJanelaSocket {
  timestamps: number[];
  ultimoAvisoLogMs?: number;
}

export class SocketRateLimiter {
  private static instance?: SocketRateLimiter;
  private maxEventosPorJanela: number;
  private janelaMs: number;
  private registros: Map<string, RegistroJanelaSocket> = new Map();

  constructor(opcoes?: SocketLimiterOpcoes) {
    this.maxEventosPorJanela = opcoes?.maxEventosPorJanela ?? 20;
    this.janelaMs = opcoes?.janelaMs ?? 1000;
  }

  /**
   * Returns singleton instance of rate limiter.
   */
  static obterInstancia(opcoes?: SocketLimiterOpcoes): SocketRateLimiter {
    if (!SocketRateLimiter.instance) {
      SocketRateLimiter.instance = new SocketRateLimiter(opcoes);
    }
    return SocketRateLimiter.instance;
  }

  /**
   * Checks whether event emission by a socket is allowed by rate limiting.
   * Implements sliding window log algorithm.
   *
   * @param identificador - Unique connection identifier (e.g. socket.id).
   * @param evento - Optional Socket.IO event name (for logging or composite key).
   */
  verificarLimite(identificador: string, evento?: string): ResultadoRateLimit {
    const agora = Date.now();
    const chave = evento ? `${identificador}:${evento}` : identificador;

    let registro = this.registros.get(chave);
    if (!registro) {
      registro = { timestamps: [] };
      this.registros.set(chave, registro);
    }

    // Remove timestamps fora da janela deslizante atual
    const limiarJanela = agora - this.janelaMs;
    registro.timestamps = registro.timestamps.filter((ts) => ts > limiarJanela);

    // Avalia se o limite foi atingido
    if (registro.timestamps.length >= this.maxEventosPorJanela) {
      const timestampMaisAntigo = registro.timestamps[0] ?? agora;
      const tempoRestanteMs = Math.max(0, this.janelaMs - (agora - timestampMaisAntigo));

      // Emite log de advertência no servidor com throttling de 1s para não sobrecarregar I/O
      if (!registro.ultimoAvisoLogMs || agora - registro.ultimoAvisoLogMs > 1000) {
        console.warn(
          `[SocketRateLimiter] Flood prevenido para ${identificador}. Limite de ${this.maxEventosPorJanela} eventos/s excedido.`
        );
        registro.ultimoAvisoLogMs = agora;
      }

      return {
        permitido: false,
        totalEventosNaJanela: registro.timestamps.length,
        limiteMaximo: this.maxEventosPorJanela,
        tempoRestanteMs,
        codigo: 'RATE_LIMIT_EXCEDIDO',
        mensagem: `Taxa máxima de ${this.maxEventosPorJanela} eventos por segundo excedida.`
      };
    }

    // Registra o evento na janela
    registro.timestamps.push(agora);

    return {
      permitido: true,
      totalEventosNaJanela: registro.timestamps.length,
      limiteMaximo: this.maxEventosPorJanela
    };
  }

  /**
   * Removes tracking entry for a disconnected socket to avoid memory leak.
   */
  removerIdentificador(identificador: string): void {
    for (const chave of this.registros.keys()) {
      if (chave === identificador || chave.startsWith(`${identificador}:`)) {
        this.registros.delete(chave);
      }
    }
  }

  /**
   * Allows reconfiguring rate limits (essential for deterministic test suites).
   */
  configurar(opcoes: SocketLimiterOpcoes): void {
    if (opcoes.maxEventosPorJanela !== undefined) {
      if (opcoes.maxEventosPorJanela <= 0) {
        throw new Error('maxEventosPorJanela deve ser maior que zero.');
      }
      this.maxEventosPorJanela = opcoes.maxEventosPorJanela;
    }
    if (opcoes.janelaMs !== undefined) {
      if (opcoes.janelaMs <= 0) {
        throw new Error('janelaMs deve ser maior que zero.');
      }
      this.janelaMs = opcoes.janelaMs;
    }
  }

  /**
   * Returns current limiter parameters.
   */
  obterConfiguracao(): { maxEventosPorJanela: number; janelaMs: number } {
    return {
      maxEventosPorJanela: this.maxEventosPorJanela,
      janelaMs: this.janelaMs
    };
  }

  /**
   * Clears all in-memory records (useful for test suites).
   */
  limparTodos(): void {
    this.registros.clear();
  }
}
