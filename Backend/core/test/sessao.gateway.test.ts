import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'node:http';
import express, { Express } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { SessaoGateway } from '../websocket/sessao.gateway.js';
import { sessaoRoutes } from '../../api/sessao/routes/sessao.routes.js';
import { SessaoModel } from '../../api/sessao/models/sessao.model.js';

describe('Card 2.2 & 2.3 - Gateway WebSocket Socket.IO (/sessao)', () => {
  let app: Express;
  let httpServer: http.Server;
  let ioServer: SocketIOServer;
  let port: number;
  let serverUrl: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/sessao', sessaoRoutes);

    httpServer = http.createServer(app);
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: '*' }
    });

    SessaoGateway.inicializar(ioServer);

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
    await new Promise<void>((resolve) => {
      ioServer.close(() => {
        httpServer.close(() => resolve());
      });
    });
  });

  beforeEach(() => {
    SessaoModel.resetarMock();
  });

  // Helper para criar conexões cliente Socket.IO de teste
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

  it('deve conectar com sucesso ao namespace /sessao', async () => {
    const client = await createClientSocket();
    expect(client.connected).toBe(true);
    client.disconnect();
  });

  it('deve entrar na sala da sessão e receber confirmação sessao_conectada', async () => {
    const client = await createClientSocket();

    const resposta = await new Promise<any>((resolve) => {
      client.emit('entrar_sessao', {
        session_token: '849-291',
        role: 'terapeuta'
      });
      client.on('sessao_conectada', (dados) => resolve(dados));
    });

    expect(resposta.status).toBe('ok');
    expect(resposta.session_token).toBe('849-291');
    expect(resposta.sala).toBe('session_849-291');
    expect(resposta.role).toBe('terapeuta');

    client.disconnect();
  });

  it('deve responder com erro_sessao se session_token não for informado na entrada', async () => {
    const client = await createClientSocket();

    const erro = await new Promise<any>((resolve) => {
      client.emit('entrar_sessao', {});
      client.on('erro_sessao', (dados) => resolve(dados));
    });

    expect(erro.error).toContain('Parâmetro obrigatório ausente: session_token');
    client.disconnect();
  });

  it('deve notificar o terapeuta na sala quando o dispositivo externo realizar handshake via HTTP', async () => {
    const terapeutaSocket = await createClientSocket();

    // 1. Terapeuta entra na sala aguardando o pareamento
    await new Promise<void>((resolve) => {
      terapeutaSocket.emit('entrar_sessao', {
        session_token: '849-291',
        role: 'terapeuta'
      });
      terapeutaSocket.on('sessao_conectada', () => resolve());
    });

    // 2. Prepara listener para o evento dispositivo_conectado
    const eventoPromise = new Promise<any>((resolve) => {
      terapeutaSocket.on('dispositivo_conectado', (dados) => resolve(dados));
    });

    // 3. Jogo externo realiza o handshake HTTP POST /api/sessao/parear
    const res = await fetch(`http://localhost:${port}/api/sessao/parear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_token: '849-291',
        dispositivo_info: {
          tipo_dispositivo: 'tablet',
          modelo: 'iPad 10th Gen'
        }
      })
    });

    expect(res.status).toBe(200);

    // 4. Terapeuta deve ter recebido a notificação em tempo real via WebSocket
    const evento = await eventoPromise;
    expect(evento.session_token).toBe('849-291');
    expect(evento.status_sessao).toBe('em_andamento');
    expect(evento.conectado_em).toBeDefined();

    terapeutaSocket.disconnect();
  });

  it('deve responder ao ping de presença com pong (Heartbeat - Card 2.3)', async () => {
    const client = await createClientSocket();

    const pong = await new Promise<any>((resolve) => {
      client.emit('ping_presenca');
      client.on('pong_presenca', (dados) => resolve(dados));
    });

    expect(pong.status).toBe('online');
    expect(pong.timestamp).toBeGreaterThan(0);

    client.disconnect();
  });

  it('deve notificar desconexão do dispositivo remoto quando a conexão cair (Card 2.3)', async () => {
    const terapeutaSocket = await createClientSocket();
    const dispositivoSocket = await createClientSocket();

    // 1. Terapeuta entra na sala
    await new Promise<void>((resolve) => {
      terapeutaSocket.emit('entrar_sessao', {
        session_token: '849-291',
        role: 'terapeuta'
      });
      terapeutaSocket.on('sessao_conectada', () => resolve());
    });

    // 2. Dispositivo entra na sala com role 'dispositivo'
    await new Promise<void>((resolve) => {
      dispositivoSocket.emit('entrar_sessao', {
        session_token: '849-291',
        role: 'dispositivo',
        dispositivo_info: { modelo: 'VR Headset' }
      });
      dispositivoSocket.on('sessao_conectada', () => resolve());
    });

    // 3. Terapeuta prepara listener para dispositivo_desconectado
    const desconexaoPromise = new Promise<any>((resolve) => {
      terapeutaSocket.on('dispositivo_desconectado', (dados) => resolve(dados));
    });

    // 4. Dispositivo desconecta abruptamente
    dispositivoSocket.disconnect();

    // 5. Terapeuta recebe o alerta
    const eventoDesconexao = await desconexaoPromise;
    expect(eventoDesconexao.session_token).toBe('849-291');
    expect(eventoDesconexao.motivo).toBeDefined();
    expect(eventoDesconexao.timestamp).toBeDefined();

    terapeutaSocket.disconnect();
  });

  it('deve notificar encerramento da sessão para os clientes da sala', async () => {
    const client = await createClientSocket();

    await new Promise<void>((resolve) => {
      client.emit('entrar_sessao', {
        session_token: '849-291',
        role: 'terapeuta'
      });
      client.on('sessao_conectada', () => resolve());
    });

    const finalizacaoPromise = new Promise<any>((resolve) => {
      client.on('sessao_finalizada', (dados) => resolve(dados));
    });

    client.emit('finalizar_sessao', { session_token: '849-291' });

    const eventoFinalizacao = await finalizacaoPromise;
    expect(eventoFinalizacao.session_token).toBe('849-291');
    expect(eventoFinalizacao.status_sessao).toBe('finalizada');

    client.disconnect();
  });
});
