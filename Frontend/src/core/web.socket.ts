import { useEffect, useCallback, useSyncExternalStore } from "react";
import { io, Socket } from "socket.io-client";

/**
 * ============================================================================
 * CONTRATOS E TIPAGENS ESTRITAS DE WEBSOCKET (SOCKET.IO) — InTEA
 * Requisitos: RF10 (Pareamento Remoto), RNF04 (Comunicação em Tempo Real)
 * Regra: TypeScript estrito sem o uso de `any`
 * ============================================================================
 */

export interface DispositivoConectadoPayload {
  deviceId: string;
  tipoDispositivo?: "tablet" | "vr" | "desktop" | "mobile" | string;
  modelo?: string;
  bateria?: number;
  latenciaMs?: number;
  conectadoEm: string; // ISO 8601
  ip?: string;
}

export interface DispositivoDesconectadoPayload {
  deviceId?: string;
  motivo: "desconexao_voluntaria" | "timeout" | "queda_rede" | "sessao_encerrada" | string;
  desconectadoEm: string; // ISO 8601
}

export interface ErroSessaoPayload {
  codigo: string;
  mensagem: string;
  detalhes?: unknown;
}

export type SessionConnectionStatus =
  | "desconectado"
  | "conectando"
  | "conectado"
  | "aguardando_dispositivo"
  | "dispositivo_conectado"
  | "reconectando"
  | "erro";

export interface EventoTelemetriaPayload {
  token_sessao?: string;
  data_hora: string;
  tipo_evento: string; // Ex: 'interacao_paciente', 'acerto', 'erro', 'metrica'
  dados: {
    id_metrica?: string;
    valor?: number | string | boolean;
    acerto?: boolean;
    tempo_resposta_ms?: number;
    engajamento?: number;
    atencao?: number;
    estresse?: number;
    pontuacao?: number;
    [key: string]: unknown;
  };
}

export interface ComandoClinicoPayload {
  tipo: "pausar" | "retomar" | "ajustar_dda" | "finalizar";
  sessionToken: string;
  parametros?: {
    nivelDda?: number;
    motivo?: string;
    [key: string]: unknown;
  };
}

export interface PingPresencaPayload {
  timestamp_cliente?: number;
  bateria?: number;
  qualidade_sinal?: "excelente" | "bom" | "fraco" | string;
}

export interface PongPresencaResposta {
  status: "online";
  timestamp_servidor: number;
  timestamp_cliente?: number;
  latencia_estimada_ms?: number;
}

export interface ServerToClientEvents {
  dispositivo_conectado: (payload: DispositivoConectadoPayload) => void;
  dispositivo_desconectado: (payload: DispositivoDesconectadoPayload) => void;
  erro_sessao: (payload: ErroSessaoPayload) => void;
  ping: () => void;
  pong: () => void;
  status_sessao: (status: string) => void;
  telemetria: (payload: EventoTelemetriaPayload) => void;
  "sessao:telemetria": (payload: EventoTelemetriaPayload) => void;
  pong_presenca: (payload: PongPresencaResposta) => void;
  dispositivo_reconectado: (payload: unknown) => void;
  sessao_finalizada: (payload: { session_token: string; status_sessao: string; finalizado_em: string }) => void;
}

export interface ClientToServerEvents {
  entrar_sala: (data: { sessionToken: string }) => void;
  sair_sala: (data: { sessionToken: string }) => void;
  ping: () => void;
  pong: () => void;
  ping_presenca: (data?: PingPresencaPayload) => void;
  enviar_comando: (comando: ComandoClinicoPayload) => void;
  "sessao:comando": (comando: ComandoClinicoPayload) => void;
  finalizar_sessao: (dados?: { session_token?: string }) => void;
}

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Obtém a URL do servidor WebSocket a partir das variáveis de ambiente
 */
export function getSocketUrl(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "");
  }
  return "http://localhost:3000";
}

/**
 * ============================================================================
 * GERENCIADOR SINGLETON DE CONEXÃO WEBSOCKET
 * Garante reuso da instância, reconexão com backoff exponencial e listeners limpos
 * ============================================================================
 */
export class SessionSocketManager {
  private static instance: SessionSocketManager | null = null;
  private socket: TypedSocket | null = null;
  private currentSessionToken: string | null = null;
  private status: SessionConnectionStatus = "desconectado";
  private dispositivo: DispositivoConectadoPayload | null = null;
  private ultimoErro: ErroSessaoPayload | null = null;

  private storeListeners: Set<() => void> = new Set();
  private statusListeners: Set<(status: SessionConnectionStatus) => void> = new Set();
  private listenersMap = {
    dispositivo_conectado: new Set<(payload: DispositivoConectadoPayload) => void>(),
    dispositivo_desconectado: new Set<(payload: DispositivoDesconectadoPayload) => void>(),
    erro_sessao: new Set<(payload: ErroSessaoPayload) => void>(),
    telemetria: new Set<(payload: EventoTelemetriaPayload) => void>(),
    pong_presenca: new Set<(payload: PongPresencaResposta) => void>(),
  };

  private constructor() {}

  public static getInstance(): SessionSocketManager {
    if (!SessionSocketManager.instance) {
      SessionSocketManager.instance = new SessionSocketManager();
    }
    return SessionSocketManager.instance;
  }

  /**
   * Assinatura para useSyncExternalStore do React 19
   */
  public subscribe = (listener: () => void): () => void => {
    this.storeListeners.add(listener);
    return () => {
      this.storeListeners.delete(listener);
    };
  };

  private notifyStore(): void {
    this.storeListeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Preserva a integridade do loop
      }
    });
  }

  private updateStatus(newStatus: SessionConnectionStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    this.notifyStore();
    this.statusListeners.forEach((listener) => {
      try {
        listener(newStatus);
      } catch {
        // Preserva a integridade do loop de notificação
      }
    });
  }

  /**
   * Inicializa ou reaproveita o socket com reconexão resiliente e backoff exponencial
   */
  public conectar(url?: string): TypedSocket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (!this.socket) {
      const serverUrl = url || getSocketUrl();
      this.updateStatus("conectando");

      this.socket = io(serverUrl, {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        randomizationFactor: 0.5,
        timeout: 20000,
        transports: ["websocket", "polling"],
      }) as TypedSocket;

      this.configurarEventosInternos();
    }

    if (!this.socket.connected) {
      this.socket.connect();
    }

    return this.socket;
  }

  private configurarEventosInternos(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.updateStatus(this.currentSessionToken ? "aguardando_dispositivo" : "conectado");
      if (this.currentSessionToken) {
        this.socket?.emit("entrar_sala", { sessionToken: this.currentSessionToken });
      }
    });

    this.socket.on("disconnect", (motivo) => {
      this.dispositivo = null;
      this.updateStatus(motivo === "io client disconnect" ? "desconectado" : "reconectando");
    });

    this.socket.on("connect_error", () => {
      this.updateStatus("erro");
    });

    this.socket.on("dispositivo_conectado", (payload) => {
      this.dispositivo = payload;
      this.updateStatus("dispositivo_conectado");
      this.listenersMap.dispositivo_conectado.forEach((cb) => {
        try {
          cb(payload);
        } catch {
          // Protege o loop de notificação
        }
      });
    });

    this.socket.on("dispositivo_desconectado", (payload) => {
      this.dispositivo = null;
      this.updateStatus(this.currentSessionToken ? "aguardando_dispositivo" : "conectado");
      this.listenersMap.dispositivo_desconectado.forEach((cb) => {
        try {
          cb(payload);
        } catch {
          // Protege o loop de notificação
        }
      });
    });

    this.socket.on("erro_sessao", (payload) => {
      this.ultimoErro = payload;
      this.updateStatus("erro");
      this.listenersMap.erro_sessao.forEach((cb) => {
        try {
          cb(payload);
        } catch {
          // Protege o loop de notificação
        }
      });
    });

    const notificarTelemetria = (payload: EventoTelemetriaPayload) => {
      this.listenersMap.telemetria.forEach((cb) => {
        try {
          cb(payload);
        } catch {
          // Protege o loop
        }
      });
    };

    this.socket.on("telemetria", notificarTelemetria);
    this.socket.on("sessao:telemetria", notificarTelemetria);

    this.socket.on("pong_presenca", (payload) => {
      this.listenersMap.pong_presenca.forEach((cb) => {
        try {
          cb(payload);
        } catch {
          // Protege o loop
        }
      });
    });
  }



  public getStatus(): SessionConnectionStatus {
    if (this.status === "conectado" && this.currentSessionToken) {
      return "aguardando_dispositivo";
    }
    return this.status;
  }

  public getDispositivo(): DispositivoConectadoPayload | null {
    return this.dispositivo;
  }

  public getUltimoErro(): ErroSessaoPayload | null {
    return this.ultimoErro;
  }

  public getSocket(): TypedSocket | null {
    return this.socket;
  }

  public getCurrentSessionToken(): string | null {
    return this.currentSessionToken;
  }

  /**
   * Associa o socket a uma sala de sessão específica via session_token
   */
  public entrarSala(sessionToken: string): void {
    this.currentSessionToken = sessionToken;
    this.conectar();

    if (this.socket && this.socket.connected) {
      this.socket.emit("entrar_sala", { sessionToken });
      this.updateStatus("aguardando_dispositivo");
    }
  }

  /**
   * Sai da sala da sessão atual
   */
  public sairSala(sessionToken?: string): void {
    const token = sessionToken || this.currentSessionToken;
    if (token && this.socket && this.socket.connected) {
      this.socket.emit("sair_sala", { sessionToken: token });
    }
    if (token === this.currentSessionToken) {
      this.currentSessionToken = null;
      this.dispositivo = null;
      if (this.socket?.connected) {
        this.updateStatus("conectado");
      }
    }
  }

  /**
   * Desconecta completamente o socket
   */
  public desconectar(): void {
    if (this.currentSessionToken) {
      this.sairSala(this.currentSessionToken);
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.dispositivo = null;
    this.ultimoErro = null;
    this.updateStatus("desconectado");
  }

  /**
   * Registra listener para dispositivo conectado com retorno da função de desinscrição
   */
  public onDispositivoConectado(
    handler: (payload: DispositivoConectadoPayload) => void
  ): () => void {
    this.listenersMap.dispositivo_conectado.add(handler);
    return () => {
      this.listenersMap.dispositivo_conectado.delete(handler);
    };
  }

  /**
   * Registra listener para dispositivo desconectado com retorno de desinscrição
   */
  public onDispositivoDesconectado(
    handler: (payload: DispositivoDesconectadoPayload) => void
  ): () => void {
    this.listenersMap.dispositivo_desconectado.add(handler);
    return () => {
      this.listenersMap.dispositivo_desconectado.delete(handler);
    };
  }

  /**
   * Registra listener para erro de sessão com retorno de desinscrição
   */
  public onErroSessao(handler: (payload: ErroSessaoPayload) => void): () => void {
    this.listenersMap.erro_sessao.add(handler);
    return () => {
      this.listenersMap.erro_sessao.delete(handler);
    };
  }

  /**
   * Registra listener para recepção de eventos de telemetria contínua
   */
  public onTelemetria(handler: (payload: EventoTelemetriaPayload) => void): () => void {
    this.listenersMap.telemetria.add(handler);
    return () => {
      this.listenersMap.telemetria.delete(handler);
    };
  }

  /**
   * Registra listener para pong de presença e latência
   */
  public onPongPresenca(handler: (payload: PongPresencaResposta) => void): () => void {
    this.listenersMap.pong_presenca.add(handler);
    return () => {
      this.listenersMap.pong_presenca.delete(handler);
    };
  }

  /**
   * Envia comando clínico de intervenção para o jogo remoto via WebSocket
   */
  public enviarComando(comando: ComandoClinicoPayload): boolean {
    if (!this.socket || !this.socket.connected) {
      return false;
    }
    this.socket.emit("enviar_comando", comando);
    this.socket.emit("sessao:comando", comando);
    return true;
  }

  /**
   * Envia ping de presença com timestamp local para medição de latência RTT
   */
  public enviarPingPresenca(payload?: PingPresencaPayload): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("ping_presenca", payload);
    }
  }

  /**
   * Emite finalização de sessão para a sala
   */
  public finalizarSessaoRemota(token?: string): void {
    const tokenAlvo = token || this.currentSessionToken;
    if (tokenAlvo && this.socket && this.socket.connected) {
      this.socket.emit("finalizar_sessao", { session_token: tokenAlvo });
    }
  }

  /**
   * Notifica mudanças de status de conexão
   */
  public onStatusChange(listener: (status: SessionConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * Método exclusivo para reset nos testes unitários
   */
  public static _resetInstanceForTesting(): void {
    if (SessionSocketManager.instance) {
      SessionSocketManager.instance.desconectar();
      SessionSocketManager.instance = null;
    }
  }
}

/**
 * ============================================================================
 * HOOK REATIVO: useSessionSocket
 * Utiliza useSyncExternalStore do React 19 para sincronização pura sem tearing
 * ============================================================================
 */
export interface UseSessionSocketOptions {
  sessionToken?: string | null;
  autoConnect?: boolean;
  onDispositivoConectado?: (payload: DispositivoConectadoPayload) => void;
  onDispositivoDesconectado?: (payload: DispositivoDesconectadoPayload) => void;
  onErroSessao?: (payload: ErroSessaoPayload) => void;
}

export interface UseSessionSocketReturn {
  status: SessionConnectionStatus;
  dispositivo: DispositivoConectadoPayload | null;
  ultimoErro: ErroSessaoPayload | null;
  isConnected: boolean;
  isDeviceConnected: boolean;
  conectar: (token?: string) => void;
  desconectar: () => void;
  entrarSala: (token: string) => void;
  sairSala: (token?: string) => void;
}

/**
 * Hook reativo do React para integração contínua com a sessão WebSocket ativa.
 * Utiliza useSyncExternalStore do React 19 para sincronização pura sem tearing de estado.
 *
 * @param options - Configurações opcionais de auto-conexão e callbacks de ciclo de vida do dispositivo.
 * @returns Estado da conexão, metadados do dispositivo remoto e métodos de controle de sala.
 */
export function useSessionSocket(options: UseSessionSocketOptions = {}): UseSessionSocketReturn {
  const {
    sessionToken,
    autoConnect = true,
    onDispositivoConectado,
    onDispositivoDesconectado,
    onErroSessao,
  } = options;

  const manager = SessionSocketManager.getInstance();

  const status = useSyncExternalStore(
    manager.subscribe,
    () => manager.getStatus(),
    () => "desconectado" as SessionConnectionStatus
  );

  const dispositivo = useSyncExternalStore(
    manager.subscribe,
    () => manager.getDispositivo(),
    () => null
  );

  const ultimoErro = useSyncExternalStore(
    manager.subscribe,
    () => manager.getUltimoErro(),
    () => null
  );

  // Inscrição de callbacks customizados passados por options
  useEffect(() => {
    if (!onDispositivoConectado) return;
    return manager.onDispositivoConectado(onDispositivoConectado);
  }, [manager, onDispositivoConectado]);

  useEffect(() => {
    if (!onDispositivoDesconectado) return;
    return manager.onDispositivoDesconectado(onDispositivoDesconectado);
  }, [manager, onDispositivoDesconectado]);

  useEffect(() => {
    if (!onErroSessao) return;
    return manager.onErroSessao(onErroSessao);
  }, [manager, onErroSessao]);

  // Gestão de entrada e saída na sala da sessão
  useEffect(() => {
    if (sessionToken && autoConnect) {
      manager.entrarSala(sessionToken);

      return () => {
        manager.sairSala(sessionToken);
      };
    }
  }, [sessionToken, autoConnect, manager]);

  const conectar = useCallback(
    (token?: string) => {
      if (token) {
        manager.entrarSala(token);
      } else {
        manager.conectar();
      }
    },
    [manager]
  );

  const desconectar = useCallback(() => {
    manager.desconectar();
  }, [manager]);

  const entrarSala = useCallback(
    (token: string) => {
      manager.entrarSala(token);
    },
    [manager]
  );

  const sairSala = useCallback(
    (token?: string) => {
      manager.sairSala(token);
    },
    [manager]
  );

  return {
    status,
    dispositivo,
    ultimoErro,
    isConnected: status !== "desconectado" && status !== "conectando" && status !== "erro",
    isDeviceConnected: status === "dispositivo_conectado",
    conectar,
    desconectar,
    entrarSala,
    sairSala,
  };
}
