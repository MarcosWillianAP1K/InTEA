import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  SessionSocketManager,
  getSocketUrl,
  useSessionSocket,
  DispositivoConectadoPayload,
  DispositivoDesconectadoPayload,
  ErroSessaoPayload,
} from "../web.socket";
import { io } from "socket.io-client";

// Mock do socket.io-client
vi.mock("socket.io-client", () => {
  return {
    io: vi.fn(),
  };
});

describe("Card 4.1 — Integração do Cliente WebSocket / Socket.IO (core/web.socket.ts)", () => {
  let mockSocket: {
    connected: boolean;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
    listeners: Record<string, ((...args: unknown[]) => void)[]>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    SessionSocketManager._resetInstanceForTesting();

    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

    mockSocket = {
      connected: false,
      listeners,
      connect: vi.fn().mockImplementation(() => {
        mockSocket.connected = true;
        mockSocket.triggerEvent("connect");
      }),
      disconnect: vi.fn().mockImplementation(() => {
        mockSocket.connected = false;
        mockSocket.triggerEvent("disconnect", "io client disconnect");
      }),
      on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback);
        return mockSocket;
      }),
      off: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((cb) => cb !== callback);
        }
        return mockSocket;
      }),
      emit: vi.fn(),
      triggerEvent: (event: string, ...args: unknown[]) => {
        listeners[event]?.forEach((cb) => cb(...args));
      },
    };

    vi.mocked(io).mockReturnValue(mockSocket as unknown as ReturnType<typeof io>);
  });

  afterEach(() => {
    SessionSocketManager._resetInstanceForTesting();
  });

  describe("Configuração e Resiliência da Conexão", () => {
    it("deve ser uma instância Singleton reutilizável em toda a aplicação", () => {
      const instance1 = SessionSocketManager.getInstance();
      const instance2 = SessionSocketManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("deve inicializar o Socket.IO com configurações de reconexão e backoff exponencial", () => {
      const manager = SessionSocketManager.getInstance();
      manager.conectar("http://localhost:3000");

      expect(io).toHaveBeenCalledTimes(1);
      expect(io).toHaveBeenCalledWith(
        "http://localhost:3000",
        expect.objectContaining({
          autoConnect: false,
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 10000,
          randomizationFactor: 0.5,
          timeout: 20000,
          transports: ["websocket", "polling"],
        })
      );
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it("deve reaproveitar a conexão existente sem recriar sockets se já estiver conectado", () => {
      const manager = SessionSocketManager.getInstance();
      manager.conectar();
      mockSocket.connected = true;

      manager.conectar();
      expect(io).toHaveBeenCalledTimes(1);
    });

    it("deve resolver a URL de WebSocket padrão de forma resiliente", () => {
      const url = getSocketUrl();
      expect(url).toBeDefined();
      expect(typeof url).toBe("string");
    });
  });

  describe("Gerenciamento de Canais e Salas (RF10 — Pareamento)", () => {
    it("deve emitir 'entrar_sala' ao invocar entrarSala com sessionToken", () => {
      const manager = SessionSocketManager.getInstance();
      const token = "TEA-4092";

      mockSocket.connected = true;
      manager.entrarSala(token);

      expect(mockSocket.emit).toHaveBeenCalledWith("entrar_sala", {
        sessionToken: token,
      });
      expect(manager.getCurrentSessionToken()).toBe(token);
      expect(manager.getStatus()).toBe("aguardando_dispositivo");
    });

    it("deve emitir 'sair_sala' ao chamar sairSala e limpar o sessionToken atual", () => {
      const manager = SessionSocketManager.getInstance();
      const token = "TEA-4092";

      mockSocket.connected = true;
      manager.entrarSala(token);
      manager.sairSala(token);

      expect(mockSocket.emit).toHaveBeenCalledWith("sair_sala", {
        sessionToken: token,
      });
      expect(manager.getCurrentSessionToken()).toBeNull();
      expect(manager.getStatus()).toBe("conectado");
    });

    it("deve desconectar completamente e resetar o status para 'desconectado'", () => {
      const manager = SessionSocketManager.getInstance();
      manager.conectar();
      mockSocket.connected = true;

      manager.desconectar();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(manager.getStatus()).toBe("desconectado");
      expect(manager.getSocket()).toBeNull();
    });
  });

  describe("Listeners e Handlers Tipados (Critério de Aceite)", () => {
    it("deve registrar e disparar handler tipado para 'dispositivo_conectado'", () => {
      const manager = SessionSocketManager.getInstance();
      manager.conectar();
      const handlerMock = vi.fn();

      const unsubscribe = manager.onDispositivoConectado(handlerMock);

      const payload: DispositivoConectadoPayload = {
        deviceId: "tablet-samsung-taba8",
        tipoDispositivo: "tablet",
        modelo: "Galaxy Tab A8",
        bateria: 85,
        latenciaMs: 42,
        conectadoEm: "2026-09-30T17:30:00.000Z",
      };

      // Dispara o evento mockado para todos os listeners
      mockSocket.triggerEvent("dispositivo_conectado", payload);

      expect(handlerMock).toHaveBeenCalledTimes(1);
      expect(handlerMock).toHaveBeenCalledWith(payload);

      // Testa a desinscrição (clean-up)
      unsubscribe();
      handlerMock.mockClear();

      mockSocket.triggerEvent("dispositivo_conectado", payload);
      expect(handlerMock).not.toHaveBeenCalled();
    });

    it("deve registrar e disparar handler tipado para 'dispositivo_desconectado'", () => {
      const manager = SessionSocketManager.getInstance();
      manager.conectar();
      const handlerMock = vi.fn();

      const unsubscribe = manager.onDispositivoDesconectado(handlerMock);

      const payload: DispositivoDesconectadoPayload = {
        deviceId: "tablet-samsung-taba8",
        motivo: "queda_rede",
        desconectadoEm: "2026-09-30T17:35:00.000Z",
      };

      mockSocket.triggerEvent("dispositivo_desconectado", payload);

      expect(handlerMock).toHaveBeenCalledTimes(1);
      expect(handlerMock).toHaveBeenCalledWith(payload);

      unsubscribe();
      handlerMock.mockClear();

      mockSocket.triggerEvent("dispositivo_desconectado", payload);
      expect(handlerMock).not.toHaveBeenCalled();
    });

    it("deve registrar e disparar handler tipado para 'erro_sessao'", () => {
      const manager = SessionSocketManager.getInstance();
      manager.conectar();
      const handlerMock = vi.fn();

      const unsubscribe = manager.onErroSessao(handlerMock);

      const payload: ErroSessaoPayload = {
        codigo: "TOKEN_EXPIRADO",
        mensagem: "O token de pareamento expirou após 15 minutos.",
      };

      mockSocket.triggerEvent("erro_sessao", payload);

      expect(handlerMock).toHaveBeenCalledTimes(1);
      expect(handlerMock).toHaveBeenCalledWith(payload);

      unsubscribe();
      handlerMock.mockClear();

      mockSocket.triggerEvent("erro_sessao", payload);
      expect(handlerMock).not.toHaveBeenCalled();
    });
  });

  describe("Notificação Reativa de Mudanças de Status", () => {
    it("deve notificar listeners sobre transições de estado (connect, disconnect, erro)", () => {
      const manager = SessionSocketManager.getInstance();
      const statusHistory: string[] = [];

      manager.onStatusChange((status) => {
        statusHistory.push(status);
      });

      manager.conectar();

      // Dispara evento interno de connect
      const connectHandler = mockSocket.listeners["connect"]?.[0];
      connectHandler?.();

      // Dispara evento interno de dispositivo_conectado
      const dispConectadoHandler = mockSocket.listeners["dispositivo_conectado"]?.[0];
      dispConectadoHandler?.();

      // Dispara evento interno de connect_error
      const errorHandler = mockSocket.listeners["connect_error"]?.[0];
      errorHandler?.();

      expect(statusHistory).toContain("conectando");
      expect(statusHistory).toContain("conectado");
      expect(statusHistory).toContain("dispositivo_conectado");
      expect(statusHistory).toContain("erro");
    });
  });

  describe("Hook Reativo useSessionSocket", () => {
    it("deve inicializar com status inicial correto e desconectado sem sessionToken", () => {
      const { result } = renderHook(() => useSessionSocket({ autoConnect: false }));

      expect(result.current.status).toBe("desconectado");
      expect(result.current.dispositivo).toBeNull();
      expect(result.current.ultimoErro).toBeNull();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isDeviceConnected).toBe(false);
    });

    it("deve associar o sessionToken e entrar na sala automaticamente", () => {
      mockSocket.connected = true;

      let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useSessionSocket>, unknown>>;
      act(() => {
        hookResult = renderHook(() =>
          useSessionSocket({ sessionToken: "TEA-9988", autoConnect: true })
        );
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("entrar_sala", {
        sessionToken: "TEA-9988",
      });
      expect(hookResult.result.current.status).toBe("aguardando_dispositivo");
    });

    it("deve atualizar estado e invocar callback ao conectar dispositivo", () => {
      const onConectado = vi.fn();
      mockSocket.connected = true;

      let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useSessionSocket>, unknown>>;
      act(() => {
        hookResult = renderHook(() =>
          useSessionSocket({
            sessionToken: "TEA-9988",
            onDispositivoConectado: onConectado,
          })
        );
      });

      const payload: DispositivoConectadoPayload = {
        deviceId: "vr-oculus-quest2",
        tipoDispositivo: "vr",
        modelo: "Meta Quest 2",
        conectadoEm: "2026-09-30T17:40:00.000Z",
      };

      act(() => {
        mockSocket.triggerEvent("dispositivo_conectado", payload);
      });

      expect(onConectado).toHaveBeenCalledWith(payload);
      expect(hookResult.result.current.dispositivo).toEqual(payload);
      expect(hookResult.result.current.isDeviceConnected).toBe(true);
    });

    it("deve resetar dispositivo e invocar callback ao desconectar dispositivo", () => {
      const onDesconectado = vi.fn();
      mockSocket.connected = true;

      let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useSessionSocket>, unknown>>;
      act(() => {
        hookResult = renderHook(() =>
          useSessionSocket({
            sessionToken: "TEA-9988",
            onDispositivoDesconectado: onDesconectado,
          })
        );
      });

      const payloadConectado: DispositivoConectadoPayload = {
        deviceId: "vr-oculus-quest2",
        conectadoEm: "2026-09-30T17:40:00.000Z",
      };

      act(() => {
        mockSocket.triggerEvent("dispositivo_conectado", payloadConectado);
      });
      expect(hookResult.result.current.dispositivo).not.toBeNull();

      const payloadDesconectado: DispositivoDesconectadoPayload = {
        deviceId: "vr-oculus-quest2",
        motivo: "sessao_encerrada",
        desconectadoEm: "2026-09-30T17:45:00.000Z",
      };

      act(() => {
        mockSocket.triggerEvent("dispositivo_desconectado", payloadDesconectado);
      });

      expect(onDesconectado).toHaveBeenCalledWith(payloadDesconectado);
      expect(hookResult.result.current.dispositivo).toBeNull();
      expect(hookResult.result.current.isDeviceConnected).toBe(false);
    });

    it("deve sair da sala ao desmontar o hook", () => {
      mockSocket.connected = true;

      let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useSessionSocket>, unknown>>;
      act(() => {
        hookResult = renderHook(() =>
          useSessionSocket({ sessionToken: "TEA-9988", autoConnect: true })
        );
      });

      act(() => {
        hookResult.unmount();
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("sair_sala", {
        sessionToken: "TEA-9988",
      });
    });
  });
});
