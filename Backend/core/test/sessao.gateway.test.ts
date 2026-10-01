import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import http from 'node:http';
import express, { Express } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { SessaoGateway } from '../websocket/sessao.gateway.js';
import { sessaoRoutes } from '../../api/sessao/routes/sessao.routes.js';
import { SessaoModel } from '../../api/sessao/models/sessao.model.js';

describe('Card 2.2 & 2.3 - Gateway WebSocket Socket.IO (/sessao) & Heartbeat/Queda', () => {
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
    SessaoGateway.obterInstancia().resetarPresencas();

    vi.spyOn(SessaoModel, 'buscarPorToken').mockImplementation(async (token: string) => {
      const clean = token.trim().toUpperCase();
      if (clean === '849-291' || clean === '849291') {
        return {
          id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
          terapeuta_id: '11111111-1111-1111-1111-111111111111',
          paciente_id: '22222222-2222-2222-2222-222222222222',
          jogo_id: '33333333-3333-3333-3333-333333333333',
          session_token: '849-291',
          modo_sessao: 'sessao_clinica',
          contexto_dda_json: {},
          status_sessao: 'aguardando_pareamento',
          expira_em: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          data_hora_inicio: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          jogo: { id: '33333333-3333-3333-3333-333333333333', nome: 'Jogo Teste', versao: '1.0.0' }
        } as any;
      }
      return null;
    });

    vi.spyOn(SessaoModel, 'parearDispositivo').mockImplementation(async (id: string, dispositivoInfo?: any) => {
      return {
        id,
        terapeuta_id: '11111111-1111-1111-1111-111111111111',
        paciente_id: '22222222-2222-2222-2222-222222222222',
        jogo_id: '33333333-3333-3333-3333-333333333333',
        session_token: '849-291',
        modo_sessao: 'sessao_clinica',
        contexto_dda_json: {},
        status_sessao: 'em_andamento',
        dispositivo_info: dispositivoInfo || null,
        expira_em: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        data_hora_inicio: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        jogo: { id: '33333333-3333-3333-3333-333333333333', nome: 'Jogo Teste', versao: '1.0.0' }
      } as any;
    });
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

  it('deve responder ao ping de presença com timestamp e estimativa de latência (Heartbeat - Card 2.3)', async () => {
    const client = await createClientSocket();

    const clienteTimestamp = Date.now() - 15; // simulando 15ms de tempo de trânsito

    const pong = await new Promise<any>((resolve) => {
      client.emit('ping_presenca', {
        timestamp_cliente: clienteTimestamp,
        bateria: 85,
        qualidade_sinal: 'excelente'
      });
      client.on('pong_presenca', (dados) => resolve(dados));
    });

    expect(pong.status).toBe('online');
    expect(pong.timestamp_servidor).toBeGreaterThan(0);
    expect(pong.timestamp_cliente).toBe(clienteTimestamp);
    expect(pong.latencia_estimada_ms).toBeGreaterThanOrEqual(0);

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

    // 6. Presença no gateway deve refletir conectado: false
    const presenca = SessaoGateway.obterInstancia().obterPresencaDispositivo('849-291');
    expect(presenca?.conectado).toBe(false);
    expect(presenca?.desconectado_em).toBeDefined();

    terapeutaSocket.disconnect();
  });

  it('deve emitir dispositivo_reconectado com tempo_offline_ms quando o dispositivo restabelecer o link (Card 2.3)', async () => {
    const terapeutaSocket = await createClientSocket();
    let dispositivoSocket = await createClientSocket();

    // 1. Terapeuta entra na sala
    await new Promise<void>((resolve) => {
      terapeutaSocket.emit('entrar_sessao', {
        session_token: '849-291',
        role: 'terapeuta'
      });
      terapeutaSocket.on('sessao_conectada', () => resolve());
    });

    // 2. Dispositivo conecta pela 1ª vez
    await new Promise<void>((resolve) => {
      dispositivoSocket.emit('entrar_sessao', {
        session_token: '849-291',
        role: 'dispositivo'
      });
      dispositivoSocket.on('sessao_conectada', () => resolve());
    });

    // 3. Dispositivo cai/desconecta
    dispositivoSocket.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 50)); // Simula intervalo offline

    // 4. Prepara listener do terapeuta para dispositivo_reconectado
    const reconexaoPromise = new Promise<any>((resolve) => {
      terapeutaSocket.on('dispositivo_reconectado', (dados) => resolve(dados));
    });

    // 5. Dispositivo restabelece conexão (novo socket com mesmo session_token)
    dispositivoSocket = await createClientSocket();
    dispositivoSocket.emit('entrar_sessao', {
      session_token: '849-291',
      role: 'dispositivo',
      dispositivo_info: { modelo: 'Tablet Reconectado' }
    });

    // 6. Terapeuta recebe confirmação de link recuperado com métricas
    const eventoReconexao = await reconexaoPromise;
    expect(eventoReconexao.session_token).toBe('849-291');
    expect(eventoReconexao.tempo_offline_ms).toBeGreaterThanOrEqual(40);
    expect(eventoReconexao.reconectado_em).toBeDefined();
    expect(eventoReconexao.status_sessao).toBe('em_andamento');

    terapeutaSocket.disconnect();
    dispositivoSocket.disconnect();
  });

  it('deve refletir o status de presença na consulta REST GET /api/sessao/:token/status (Card 2.3)', async () => {
    const dispositivoSocket = await createClientSocket();

    // 1. Dispositivo entra na sala
    await new Promise<void>((resolve) => {
      dispositivoSocket.emit('entrar_sessao', {
        session_token: '849-291',
        role: 'dispositivo',
        dispositivo_info: { modelo: 'iPad 10th' }
      });
      dispositivoSocket.on('sessao_conectada', () => resolve());
    });

    // 2. Envia um ping com telemetria de bateria
    await new Promise<void>((resolve) => {
      dispositivoSocket.emit('ping_presenca', { bateria: 92 });
      dispositivoSocket.on('pong_presenca', () => resolve());
    });

    // 3. Consulta via REST
    const res = await fetch(`http://localhost:${port}/api/sessao/849-291/status`);
    const json = (await res.json()) as {
      data: {
        presenca_dispositivo: {
          conectado: boolean;
          bateria: number;
          ultimo_heartbeat: number;
        };
      };
    };

    expect(res.status).toBe(200);
    expect(json.data.presenca_dispositivo).toBeDefined();
    expect(json.data.presenca_dispositivo.conectado).toBe(true);
    expect(json.data.presenca_dispositivo.bateria).toBe(92);
    expect(json.data.presenca_dispositivo.ultimo_heartbeat).toBeGreaterThan(0);

    dispositivoSocket.disconnect();
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
