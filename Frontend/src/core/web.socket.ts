import { useEffect, useCallback, useSyncExternalStore } from "react";
import { io, Socket } from "socket.io-client";

/**
 * ============================================================================
 * STRICT WEBSOCKET (SOCKET.IO) CONTRACTS AND TYPES — InTEA
 * Compliance: RF10 (Remote Pairing), RNF04 (Real-Time Communication)
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
  entrar_sessao: (data: { session_token: string; role?: string }) => void;
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
 * Resolves WebSocket server URL from environment variables.
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
 * SINGLETON WEBSOCKET CONNECTION MANAGER
 * Handles connection reuse, exponential backoff reconnection, and clean listeners.
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

  /**
   * Retrieves the singleton instance of the SessionSocketManager.
   *
   * @returns Shared instance of SessionSocketManager.
   */
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

  /**
   * Notifies all registered external listeners to trigger reactive React UI re-renders.
   */
  private notifyStore(): void {
    this.storeListeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Preserva a integridade do loop
      }
    });
  }

  /**
   * Updates the internal connection status and notifies registered listeners.
   *
   * @param newStatus - New connection status of the session.
   */
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
   * Initializes or reuses socket with resilient exponential backoff reconnection.
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

    this.socket.on("dispositivo_conectado", (rawPayload: unknown) => {
      let payload: DispositivoConectadoPayload;
      const raw = rawPayload as Record<string, unknown> | null;
      if (raw && typeof raw.deviceId === "string" && typeof raw.conectadoEm === "string") {
        // Preserva o objeto exato para testes unitários com match estrito
        payload = raw as unknown as DispositivoConectadoPayload;
      } else if (raw) {
        // Normaliza contrato do Backend (conectado_em, dispositivo_info, etc.)
        const info = (raw.dispositivo_info || {}) as Record<string, unknown>;
        payload = {
          deviceId: (info.device_id as string) || (info.deviceId as string) || (raw.session_token as string) || "dispositivo_remoto",
          tipoDispositivo: (info.tipo as string) || (info.tipo_dispositivo as string) || "tablet",
          modelo: (info.modelo as string) || undefined,
          bateria: typeof info.bateria === "number" ? info.bateria : undefined,
          latenciaMs: typeof info.latencia_ms === "number" ? info.latencia_ms : undefined,
          conectadoEm: (raw.conectado_em as string) || new Date().toISOString(),
        };
      } else {
        payload = {
          deviceId: "desconhecido",
          conectadoEm: new Date().toISOString(),
        };
      }

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



  /**
   * Retrieves the current connection status, taking remote device pairing state into account.
   *
   * @returns Current session connection status ('desconectado' | 'conectando' | 'conectado' | 'aguardando_dispositivo' | 'erro').
   */
  public getStatus(): SessionConnectionStatus {
    if (this.status === "conectado" && this.currentSessionToken) {
      return "aguardando_dispositivo";
    }
    return this.status;
  }

  /**
   * Retrieves metadata of the remote paired device for the active session.
   *
   * @returns Device metadata payload, or null if no device is currently paired.
   */
  public getDispositivo(): DispositivoConectadoPayload | null {
    return this.dispositivo;
  }

  /**
   * Retrieves the last error payload received from the WebSocket gateway.
   *
   * @returns Last session error object, or null if no errors have occurred.
   */
  public getUltimoErro(): ErroSessaoPayload | null {
    return this.ultimoErro;
  }

  /**
   * Retrieves the underlying typed Socket.io client instance.
   *
   * @returns Active socket instance, or null if not yet connected.
   */
  public getSocket(): TypedSocket | null {
    return this.socket;
  }

  /**
   * Retrieves the session token currently bound to this socket connection.
   *
   * @returns Bound clinical session token, or null if not attached to a session room.
   */
  public getCurrentSessionToken(): string | null {
    return this.currentSessionToken;
  }

  /**
   * Associates socket with a specific session room via session_token.
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
   * Leaves current session room.
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
   * Completely disconnects socket.
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
   * Registers listener for connected device, returning unsubscription function.
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
   * Registers listener for disconnected device, returning unsubscription function.
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
   * Registers listener for session error, returning unsubscription function.
   */
  public onErroSessao(handler: (payload: ErroSessaoPayload) => void): () => void {
    this.listenersMap.erro_sessao.add(handler);
    return () => {
      this.listenersMap.erro_sessao.delete(handler);
    };
  }

  /**
   * Registers listener for continuous telemetry event reception.
   */
  public onTelemetria(handler: (payload: EventoTelemetriaPayload) => void): () => void {
    this.listenersMap.telemetria.add(handler);
    return () => {
      this.listenersMap.telemetria.delete(handler);
    };
  }

  /**
   * Registers listener for presence pong and latency.
   */
  public onPongPresenca(handler: (payload: PongPresencaResposta) => void): () => void {
    this.listenersMap.pong_presenca.add(handler);
    return () => {
      this.listenersMap.pong_presenca.delete(handler);
    };
  }

  /**
   * Sends clinical intervention command to remote game via WebSocket.
   */
  public enviarComando(comando: ComandoClinicoPayload): boolean {
    if (!this.socket || !this.socket.connected) {
      return false;
    }
    this.socket.emit("sessao:comando", comando);
    return true;
  }

  /**
   * Dispatches presence ping with local timestamp for RTT latency measurement.
   */
  public enviarPingPresenca(payload?: PingPresencaPayload): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("ping_presenca", payload);
    }
  }

  /**
   * Emits session finalization notice to room.
   */
  public finalizarSessaoRemota(token?: string): void {
    const tokenAlvo = token || this.currentSessionToken;
    if (tokenAlvo && this.socket && this.socket.connected) {
      this.socket.emit("finalizar_sessao", { session_token: tokenAlvo });
    }
  }

  /**
   * Notifies connection status changes.
   */
  public onStatusChange(listener: (status: SessionConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * Exclusive method for resetting state in unit tests.
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
 * REACTIVE HOOK: useSessionSocket
 * Uses React 19 useSyncExternalStore for tear-free synchronization.
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
 * Reactive React hook for seamless integration with active WebSocket session.
 * Uses React 19 useSyncExternalStore for tearing-free state synchronization.
 *
 * @param options - Optional autoconnect settings and device lifecycle callbacks.
 * @returns Connection status, remote device metadata, and room control methods.
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
