// ==============================================================================
// InTEA: Barramento Central de Eventos de Domínio (Event-Driven Architecture)
// ==============================================================================
// Desacopla features centrais (Sessão, Telemetria) de efeitos colaterais
// transversais (Auditoria, Notificações, Cache, Webhooks).
// ==============================================================================

import { EventEmitter } from 'node:events';
import type { Sessao } from '../../api/sessao/models/sessao.model.js';

/**
 * Catálogo formal e estritamente tipado de eventos do ecossistema InTEA.
 */
export interface EventosDoSistema {
  'sessao:finalizada': {
    sessao: Sessao;
    terapeutaId: string;
    ip: string | null;
    userAgent: string | null;
    temAnotacoes: boolean;
  };
  'sessao:cancelada': {
    sessao: Sessao;
    terapeutaId: string;
    statusAnterior: string;
    ip: string | null;
    userAgent: string | null;
  };
  'sessao:pareada': {
    sessao: Sessao;
    terapeutaId: string;
    ip: string | null;
    userAgent: string | null;
  };
}

export class InTeaEventBus extends EventEmitter {
  constructor() {
    super();
    // Permite ouvintes simultâneos sem avisos de warning do Node em testes/concorrência
    this.setMaxListeners(50);
  }

  /**
   * Emits a typed domain event to all registered listeners (fire-and-forget).
   *
   * @param evento - The domain event name.
   * @param dados - Typed event payload.
   * @returns True if the event had listeners, false otherwise.
   */
  emitir<K extends keyof EventosDoSistema>(evento: K, dados: EventosDoSistema[K]): boolean {
    return this.emit(evento, dados);
  }

  /**
   * Emits a typed domain event and awaits completion of all asynchronous listeners.
   * Does not propagate listener errors to preserve emitter resilience.
   *
   * @param evento - The domain event name.
   * @param dados - Typed event payload.
   * @returns Resolves when all listeners have finished executing.
   */
  async emitirAsync<K extends keyof EventosDoSistema>(evento: K, dados: EventosDoSistema[K]): Promise<void> {
    const ouvintes = this.listeners(evento);
    await Promise.all(
      ouvintes.map(ouvinte => {
        try {
          return Promise.resolve(ouvinte(dados));
        } catch {
          return Promise.resolve();
        }
      })
    );
  }

  /**
   * Registers a listener callback for a specific typed domain event.
   *
   * @param evento - The domain event name.
   * @param ouvinte - Callback function handling the event data.
   * @returns EventBus instance for chaining.
   */
  ouvir<K extends keyof EventosDoSistema>(
    evento: K,
    ouvinte: (dados: EventosDoSistema[K]) => void | Promise<void>
  ): this {
    return this.on(evento, ouvinte);
  }

  /**
   * Removes a previously registered listener callback for a domain event.
   *
   * @param evento - The domain event name.
   * @param ouvinte - Callback function to unregister.
   * @returns EventBus instance for chaining.
   */
  removerOuvinte<K extends keyof EventosDoSistema>(
    evento: K,
    ouvinte: (dados: EventosDoSistema[K]) => void | Promise<void>
  ): this {
    return this.off(evento, ouvinte);
  }
}

/**
 * Instância singleton global do Barramento de Eventos da aplicação.
 */
export const eventBus = new InTeaEventBus();
