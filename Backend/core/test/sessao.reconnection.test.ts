import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import http from 'node:http';
import express, { Express } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import {
  SessaoReconnectionManager,
  EventoAdvertenciaDesconexao,
  EventoSessaoInterrompida
} from '../websocket/sessao.reconnection.js';
import { SessaoGateway } from '../websocket/sessao.gateway.js';

describe('Card 2.3 - Protocolo de Reconexão e Janela de Tolerância de 60s', () => {
  describe('Unidade: SessaoReconnectionManager', () => {
    let manager: SessaoReconnectionManager;

    beforeEach(() => {
      manager = new SessaoReconnectionManager(50); // 50ms para testes determinísticos rápidos
    });

    afterEach(() => {
      manager.limparTodos();
    });

    it('deve registrar desconexão e emitir status desconectado_transitorio com janela de tolerância', () => {
      const onTimeout = vi.fn();
      const alerta: EventoAdvertenciaDesconexao = manager.registrarDesconexao('849-291', 'queda_wifi', onTimeout);

      expect(alerta.session_token).toBe('849-291');
      expect(alerta.status_sessao).toBe('desconectado_transitorio');
      expect(alerta.janela_tolerancia_ms).toBe(50);
      expect(alerta.expira_em).toBeDefined();
      expect(manager.estaEmJanelaTolerancia('849-291')).toBe(true);

      const estado = manager.obterEstado('849-291');
      expect(estado?.status).toBe('desconectado_transitorio');
    });

    it('deve registrar reconexão dentro da janela de graça e cancelar temporizador', async () => {
      const onTimeout = vi.fn();
      manager.registrarDesconexao('849-291', 'queda_wifi', onTimeout);

      await new Promise((r) => setTimeout(r, 10));

      const reconexao = manager.registrarReconexao('849-291');

      expect(reconexao.sucesso).toBe(true);
      expect(reconexao.dentro_da_janela).toBe(true);
      expect(reconexao.tempo_offline_ms).toBeGreaterThanOrEqual(5);
      expect(manager.estaEmJanelaTolerancia('849-291')).toBe(false);

      // Aguarda passar os 50ms para garantir que o timeout NÃO disparou
      await new Promise((r) => setTimeout(r, 60));
      expect(onTimeout).not.toHaveBeenCalled();

      const estado = manager.obterEstado('849-291');
      expect(estado?.status).toBe('conectado');
    });

    it('deve disparar timeout e transicionar para interrompida_por_queda se o tempo limite expirar', async () => {
      const timeoutPromise = new Promise<EventoSessaoInterrompida>((resolve) => {
        manager.registrarDesconexao('849-291', 'queda_wifi', (evento) => resolve(evento));
      });

      const evento = await timeoutPromise;

      expect(evento.session_token).toBe('849-291');
      expect(evento.motivo).toBe('interrompida_por_queda');
      expect(evento.status_sessao).toBe('interrompida_por_queda');
      expect(evento.tempo_offline_total_ms).toBeGreaterThanOrEqual(40);

      const estado = manager.obterEstado('849-291');
      expect(estado?.status).toBe('interrompida_por_queda');
      expect(manager.estaEmJanelaTolerancia('849-291')).toBe(false);
    });
  });

  describe('Integração WebSocket: Fluxo de Reconexão e Tolerância no SessaoGateway', () => {
    let app: Express;
    let httpServer: http.Server;
    let ioServer: SocketIOServer;
    let port: number;
    let serverUrl: string;

    beforeAll(async () => {
      app = express();
      httpServer = http.createServer(app);
      ioServer = new SocketIOServer(httpServer, { cors: { origin: '*' } });
      const gateway = SessaoGateway.inicializar(ioServer);
      gateway.resetarPresencas();

      await new Promise<void>((resolve) => {
        httpServer.listen(0, () => {
          const addr = httpServer.address();
          port = typeof addr === 'object' && addr ? addr.port : 3000;
          serverUrl = `http://localhost:${port}/sessao`;
          resolve();
        });
      });
    });

    afterAll(async () => {
      SessaoGateway.obterInstancia().resetarPresencas();
      await new Promise<void>((resolve) => {
        ioServer.close(() => {
          httpServer.close(() => resolve());
        });
      });
    });

    beforeEach(() => {
      const gateway = SessaoGateway.obterInstancia();
      gateway.resetarPresencas();
      // Configura tolerância rápida de 80ms para teste de integração
      gateway.obterReconnectionManager().definirJanelaTolerancia(80);
    });

    function createClientSocket(): Promise<ClientSocket> {
      return new Promise((resolve, reject) => {
        const socket = ioc(serverUrl, {
          transports: ['websocket'],
          forceNew: true
        });
        socket.on('connect', () => resolve(socket));
        socket.on('connect_error', (err) => reject(err));
      });
    }

    it('deve emitir alerta de desconexão transitória para o terapeuta quando o tablet desconectar', async () => {
      const terapeutaSocket = await createClientSocket();
      const dispositivoSocket = await createClientSocket();

      await new Promise<void>((resolve) => {
        terapeutaSocket.emit('entrar_sessao', { session_token: '849-291', role: 'terapeuta' });
        terapeutaSocket.on('sessao_conectada', () => resolve());
      });

      await new Promise<void>((resolve) => {
        dispositivoSocket.emit('entrar_sessao', { session_token: '849-291', role: 'dispositivo' });
        dispositivoSocket.on('sessao_conectada', () => resolve());
      });

      const alertaPromise = new Promise<EventoAdvertenciaDesconexao>((resolve) => {
        terapeutaSocket.on('sessao:alerta_conexao', (alerta: EventoAdvertenciaDesconexao) => resolve(alerta));
      });

      // Dispositivo desconecta (queda de rede)
      dispositivoSocket.disconnect();

      const alerta = await alertaPromise;
      expect(alerta.session_token).toBe('849-291');
      expect(alerta.status_sessao).toBe('desconectado_transitorio');
      expect(alerta.janela_tolerancia_ms).toBe(80);
      expect(alerta.advertencia).toContain('janela de tolerância');

      terapeutaSocket.disconnect();
    });

    it('deve transicionar para interrompida_por_queda se o tablet não reconectar dentro da janela', async () => {
      const terapeutaSocket = await createClientSocket();
      const dispositivoSocket = await createClientSocket();

      await new Promise<void>((resolve) => {
        terapeutaSocket.emit('entrar_sessao', { session_token: '849-291', role: 'terapeuta' });
        terapeutaSocket.on('sessao_conectada', () => resolve());
      });

      await new Promise<void>((resolve) => {
        dispositivoSocket.emit('entrar_sessao', { session_token: '849-291', role: 'dispositivo' });
        dispositivoSocket.on('sessao_conectada', () => resolve());
      });

      const interrupcaoPromise = new Promise<EventoSessaoInterrompida>((resolve) => {
        terapeutaSocket.on('sessao_interrompida', (evt: EventoSessaoInterrompida) => resolve(evt));
      });

      // Tablet cai
      dispositivoSocket.disconnect();

      // Aguarda expiração da janela (80ms)
      const eventoInterrupcao = await interrupcaoPromise;

      expect(eventoInterrupcao.session_token).toBe('849-291');
      expect(eventoInterrupcao.motivo).toBe('interrompida_por_queda');
      expect(eventoInterrupcao.status_sessao).toBe('interrompida_por_queda');

      terapeutaSocket.disconnect();
    });
  });
});
