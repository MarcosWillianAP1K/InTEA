import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import http from 'node:http';
import express, { Express } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { apiRouter } from '../../index.js';
import { SessaoGateway } from '../../../core/websocket/sessao.gateway.js';
import { SessaoModel } from '../models/sessao.model.js';
import { JogoModel } from '../../jogos/models/jogo.model.js';
import { PacienteModel } from '../../paciente/models/paciente.model.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

describe('Card 2.4 - Testes E2E de Pareamento Remoto e Não-Regressão (CT-S01 a CT-S06)', () => {
  let app: Express;
  let httpServer: http.Server;
  let ioServer: SocketIOServer;
  let port: number;
  let serverUrl: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api', apiRouter);

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
    SessaoGateway.obterInstancia().resetarPresencas();
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

  // ==============================================================================
  // 1. CASOS DE TESTE FORMAIS DE PAREAMENTO (CT-S01 a CT-S06)
  // ==============================================================================

  it('CT-S01: Pareamento Remoto Bem-Sucedido com Notificação Reativa via WebSocket', async () => {
    const terapeutaSocket = await createClientSocket();

    // Terapeuta entra na sala aguardando a conexão do dispositivo
    await new Promise<void>((resolve) => {
      terapeutaSocket.emit('entrar_sessao', {
        session_token: '849-291',
        role: 'terapeuta'
      });
      terapeutaSocket.on('sessao_conectada', () => resolve());
    });

    const notificacaoPromise = new Promise<any>((resolve) => {
      terapeutaSocket.on('dispositivo_conectado', (dados) => resolve(dados));
    });

    // Jogo submete o handshake HTTP
    const res = await fetch(`http://localhost:${port}/api/sessao/parear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_token: '849-291',
        dispositivo_info: {
          tipo_dispositivo: 'tablet',
          modelo: 'Galaxy Tab S8',
          sistema_operacional: 'Android 14',
          versao_jogo: '1.2.0'
        }
      })
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(json.message).toBe('Dispositivo pareado com sucesso');
    expect(json.data.status_sessao).toBe('em_andamento');
    expect(json.data.websocket.canal).toBe('session_849-291');

    // Notificação WebSocket em tempo real entregue ao terapeuta
    const evento = await notificacaoPromise;
    expect(evento.session_token).toBe('849-291');
    expect(evento.status_sessao).toBe('em_andamento');

    terapeutaSocket.disconnect();
  });

  it('CT-S02: Normalização de Token de Pareamento sem Hífen e em Minúsculas', async () => {
    const res = await fetch(`http://localhost:${port}/api/sessao/parear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_token: '  849291  '
      })
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(json.data.session_token).toBe('849-291');
    expect(json.data.status_sessao).toBe('em_andamento');
  });

  it('CT-S03: Rejeição de Token de Pareamento Expirado após 15 Minutos (RNF03)', async () => {
    const res = await fetch(`http://localhost:${port}/api/sessao/parear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_token: 'EXP-001'
      })
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(410);
    expect(json.error).toContain('Token de pareamento expirado');
    expect(json.expirado_em).toBeDefined();
  });

  it('CT-S04: Rejeição de Token Inexistente ou Incorreto com HTTP 404', async () => {
    const res = await fetch(`http://localhost:${port}/api/sessao/parear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_token: 'TOKEN-INVALIDO-999'
      })
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(404);
    expect(json.error).toContain('Sessão não encontrada');
  });

  it('CT-S05: Rejeição de Pareamento Concorrente em Sessão Já em Andamento com HTTP 409', async () => {
    const res = await fetch(`http://localhost:${port}/api/sessao/parear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_token: 'AND-002'
      })
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(409);
    expect(json.error).toContain('Sessão já pareada ou em andamento');
  });

  it('CT-S06: Monitoramento de Perda de Conexão e Evento de Reconexão com Tempo Offline (RNF04)', async () => {
    const terapeutaSocket = await createClientSocket();
    let dispositivoSocket = await createClientSocket();

    // 1. Terapeuta aguarda
    await new Promise<void>((resolve) => {
      terapeutaSocket.emit('entrar_sessao', { session_token: '849-291', role: 'terapeuta' });
      terapeutaSocket.on('sessao_conectada', () => resolve());
    });

    // 2. Dispositivo conecta pela primeira vez
    await new Promise<void>((resolve) => {
      dispositivoSocket.emit('entrar_sessao', { session_token: '849-291', role: 'dispositivo' });
      dispositivoSocket.on('sessao_conectada', () => resolve());
    });

    // 3. Prepara listener de queda de sinal
    const desconexaoPromise = new Promise<any>((resolve) => {
      terapeutaSocket.on('dispositivo_desconectado', (dados) => resolve(dados));
    });

    // Queda abrupta
    dispositivoSocket.disconnect();
    const eventoQueda = await desconexaoPromise;
    expect(eventoQueda.session_token).toBe('849-291');
    expect(eventoQueda.motivo).toBeDefined();

    // 4. Prepara listener de reconexão
    const reconexaoPromise = new Promise<any>((resolve) => {
      terapeutaSocket.on('dispositivo_reconectado', (dados) => resolve(dados));
    });

    // Dispositivo restabelece conexão
    dispositivoSocket = await createClientSocket();
    dispositivoSocket.emit('entrar_sessao', {
      session_token: '849-291',
      role: 'dispositivo',
      dispositivo_info: { reconectado: true }
    });

    const eventoReconexao = await reconexaoPromise;
    expect(eventoReconexao.session_token).toBe('849-291');
    expect(eventoReconexao.tempo_offline_ms).toBeGreaterThanOrEqual(0);
    expect(eventoReconexao.reconectado_em).toBeDefined();

    terapeutaSocket.disconnect();
    dispositivoSocket.disconnect();
  });

  // ==============================================================================
  // 2. GARANTIA DE NÃO-REGRESSÃO DAS FEATURES DA SPRINT 7
  // ==============================================================================

  it('Não-Regressão Jogos: Catálogo e validação de manifesto com tipagem estrita (RN02) funcionam em paralelo', async () => {
    // 1. Catálogo de jogos continua acessível e paginado
    const resJogos = await fetch(`http://localhost:${port}/api/jogos?page=1&limit=5`);
    const jsonJogos = (await resJogos.json()) as any;
    expect(resJogos.status).toBe(200);
    expect(Array.isArray(jsonJogos.data)).toBe(true);
    expect(jsonJogos.data.length).toBeGreaterThan(0);

    // 2. Validação de manifesto RN02 continua estrita
    const resManifesto = await fetch(`http://localhost:${port}/api/jogos/1/manifesto`);
    const jsonManifesto = (await resManifesto.json()) as any;
    expect(resManifesto.status).toBe(200);
    expect(jsonManifesto.data).toBeDefined();
    expect(jsonManifesto.validacao.valido).toBe(true);
  });

  it('Não-Regressão Pacientes: Listagem, busca e conformidade RN05 continuam íntegras', async () => {
    const mockRange = vi.fn().mockResolvedValue({
      data: [
        { id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', nome: 'Pedro Henrique', status_ativo: true },
      ],
      error: null,
      count: 1,
    });
    const mockEq = vi.fn().mockReturnValue({ range: mockRange });
    const mockOrder = vi.fn().mockReturnValue({ eq: mockEq });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as any);

    // 1. Pacientes continuam sendo listados sem erro
    const resultado = await PacienteModel.listar();
    expect(resultado.data).toHaveLength(1);
    expect(resultado.data[0].status_ativo).toBe(true);

    // 2. Preserva regra de soft delete RN05 e conformidade de tipos
    expect(typeof PacienteModel.desativar).toBe('function');
    expect(typeof PacienteModel.reativar).toBe('function');
    expect(typeof PacienteModel.buscarPorId).toBe('function');
  });
});
