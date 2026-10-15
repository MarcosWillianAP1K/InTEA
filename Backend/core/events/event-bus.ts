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
   * Emite um evento de domínio tipado para todos os ouvintes registrados (fire-and-forget).
   */
  emitir<K extends keyof EventosDoSistema>(evento: K, dados: EventosDoSistema[K]): boolean {
    return this.emit(evento, dados);
  }

  /**
   * Emite um evento de domínio e aguarda a conclusão de todos os ouvintes assíncronos.
   * Não lança erros caso algum ouvinte falhe, preservando a resiliência do emissor.
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
   * Registra um ouvinte assíncrono para um evento tipado específico.
   */
  ouvir<K extends keyof EventosDoSistema>(
    evento: K,
    ouvinte: (dados: EventosDoSistema[K]) => void | Promise<void>
  ): this {
    return this.on(evento, ouvinte);
  }

  /**
   * Remove um ouvinte previamente registrado para um evento específico.
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
