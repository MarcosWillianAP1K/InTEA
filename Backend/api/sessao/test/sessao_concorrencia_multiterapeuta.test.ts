// ==============================================================================
// InTEA: Suíte de Concorrência e Acompanhamento Multidisciplinar (Sprint 13)
// Arquivo: Backend/api/sessao/test/sessao_concorrencia_multiterapeuta.test.ts
// Requisitos: Qualidade de Software, RF13, RF18, RF21, RN01, RN04, RNF01
// TypeScript Estrito: Proibido uso de 'any'
// ==============================================================================

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import http from 'node:http';
import express, { Express, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';

import { SessaoController } from '../controllers/sessao.controller.js';
import { SessaoModel, STATUS_SESSAO, MODO_SESSAO, Sessao } from '../models/sessao.model.js';
import { SessaoConcorrenciaService } from '../services/sessao-concorrencia.service.js';
import { SessaoResultadoService } from '../services/sessao-resultado.service.js';
import { SessaoGateway, RespostaComandoAck, EquipePresencaEvento } from '../../../core/websocket/sessao.gateway.js';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';

// UUIDs válidos RFC 4122 v4
const UUID_TERAPEUTA_A = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const UUID_TERAPEUTA_B = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const UUID_SUPER_ADMIN = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const UUID_PACIENTE = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
const UUID_JOGO = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
const UUID_SESSAO_A = 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66';
const UUID_SESSAO_B = '76eebc99-9c0b-4ef8-bb6d-6bb9bd380a77';
const TOKEN_SESSAO = '4M5S-8U7B';

interface RespostaHttpEnvelope {
  data?: Record<string, unknown>;
  message?: string;
  error?: string;
  codigo?: string;
  detalhes?: string;
}

function criarSessaoMock(parciais?: Partial<Sessao>): Sessao {
  return {
    id: UUID_SESSAO_A,
    terapeuta_id: UUID_TERAPEUTA_A,
    paciente_id: UUID_PACIENTE,
    jogo_id: UUID_JOGO,
    modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
    status_sessao: STATUS_SESSAO.EM_ANDAMENTO,
    session_token: TOKEN_SESSAO,
    data_hora_inicio: new Date(Date.now() - 600000).toISOString(),
    data_hora_fim: null,
    expira_em: new Date(Date.now() + 900000).toISOString(),
    contexto_dda_json: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...parciais,
  };
}

function criarMocksHttp(
  body: Record<string, unknown> = {},
  params: Record<string, string> = {},
  user: { id: string; is_super_admin?: boolean; user_metadata?: { is_super_admin?: boolean } } | null = { id: UUID_TERAPEUTA_A },
  contextoSessao?: Sessao | null
) {
  let statusCode = 200;
  let jsonResult: RespostaHttpEnvelope | null = null;

  const mockReq = {
    body,
    params,
    user,
    contextoSessao,
    headers: {},
    ip: '127.0.0.1',
  } as unknown as AuthenticatedRequest;

  const mockRes = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: unknown) {
      jsonResult = data as RespostaHttpEnvelope;
      return this;
    },
  } as unknown as Response;

  return {
    mockReq,
    mockRes,
    getStatus: () => statusCode,
    getJson: () => jsonResult,
  };
}

describe('Suíte Integrada: Concorrência e Equipe Multidisciplinar (Sprint 13)', () => {
  let app: Express;
  let httpServer: http.Server;
  let ioServer: SocketIOServer;
  let wsUrl: string;
  const socketsAtivos: ClientSocket[] = [];

  beforeAll(async () => {
    app = express();
    app.use(express.json());

    httpServer = http.createServer(app);
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
    });

    SessaoGateway.inicializar(ioServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        const port = typeof addr === 'object' && addr ? addr.port : 3000;
        wsUrl = `http://localhost:${port}/sessao`;
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
    vi.restoreAllMocks();
    SessaoGateway.obterInstancia().resetarPresencas();
  });

  afterEach(() => {
    // Limpeza de sockets de teste
    while (socketsAtivos.length > 0) {
      const s = socketsAtivos.pop();
      if (s && s.connected) {
        s.disconnect();
      }
    }
  });

  function conectarSocketCliente(): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const socket = ioc(wsUrl, {
        transports: ['websocket'],
        forceNew: true,
      });
      socket.on('connect', () => {
        socketsAtivos.push(socket);
        resolve(socket);
      });
      socket.on('connect_error', (err) => reject(err));
    });
  }

  // ============================================================================
  // 1. Concorrência HTTP na Criação de Sessão (RF13, RN01, RN04)
  // ============================================================================
  describe('1. Trava de Concorrência Pré-Sessão (POST /api/sessao/iniciar — RF13, RN01)', () => {
    it('deve retornar 409 Conflict quando o Terapeuta B tenta iniciar sessão clínica para paciente já em sessão ativa com o Terapeuta A', async () => {
      vi.spyOn(SessaoConcorrenciaService, 'verificarSessaoAtivaConcorrente').mockResolvedValue({
        conflito: true,
        statusHttp: 409,
        codigo: 'SESSAO_CLINICA_SIMULTANEA_CONFLITO',
        mensagem: 'O paciente já possui uma sessão clínica ativa no momento conduzida por Dr(a). Marcos Willian.',
        sessaoAtiva: {
          id: UUID_SESSAO_A,
          terapeuta_id: UUID_TERAPEUTA_A,
          status_sessao: STATUS_SESSAO.EM_ANDAMENTO,
          data_hora_inicio: new Date().toISOString(),
          mesmo_terapeuta: false,
          especialista_responsavel: {
            id: UUID_TERAPEUTA_A,
            nome: 'Dr(a). Marcos Willian',
          },
        },
      });

      const { mockReq, mockRes, getStatus, getJson } = criarMocksHttp(
        {
          jogo_id: UUID_JOGO,
          paciente_id: UUID_PACIENTE,
          modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
          codigo_pareamento: '8492-9101',
        },
        {},
        { id: UUID_TERAPEUTA_B } // Terapeuta B tentando iniciar
      );

      await SessaoController.iniciar(mockReq, mockRes);

      expect(getStatus()).toBe(409);
      const json = getJson();
      expect(json?.codigo).toBe('SESSAO_CLINICA_SIMULTANEA_CONFLITO');
      expect(json?.error).toContain('já possui uma sessão clínica ativa');
      const dados = json?.data as { conflito: boolean; sessao_ativa: { terapeuta_id: string } };
      expect(dados.conflito).toBe(true);
      expect(dados.sessao_ativa.terapeuta_id).toBe(UUID_TERAPEUTA_A);
    });

    it('deve permitir iniciar com 201 Created quando a sessão anterior do paciente foi finalizada', async () => {
      vi.spyOn(SessaoConcorrenciaService, 'verificarSessaoAtivaConcorrente').mockResolvedValue({
        conflito: false,
      });

      vi.spyOn(SessaoModel, 'criar').mockResolvedValue(
        criarSessaoMock({
          id: UUID_SESSAO_B,
          terapeuta_id: UUID_TERAPEUTA_B,
          session_token: 'NEW2-3456',
          status_sessao: STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
        })
      );

      const { mockReq, mockRes, getStatus, getJson } = criarMocksHttp(
        {
          jogo_id: UUID_JOGO,
          paciente_id: UUID_PACIENTE,
          modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
          codigo_pareamento: 'NEW2-3456',
        },
        {},
        { id: UUID_TERAPEUTA_B }
      );

      await SessaoController.iniciar(mockReq, mockRes);

      expect(getStatus()).toBe(201);
      const json = getJson();
      const sessaoCriada = json?.data as { sessao: { id: string; terapeuta_id: string } };
      expect(sessaoCriada.sessao.id).toBe(UUID_SESSAO_B);
      expect(sessaoCriada.sessao.terapeuta_id).toBe(UUID_TERAPEUTA_B);
    });

    it('deve permitir iniciar com 201 Created quando a sessão anterior do paciente foi cancelada', async () => {
      vi.spyOn(SessaoConcorrenciaService, 'verificarSessaoAtivaConcorrente').mockResolvedValue({
        conflito: false,
      });

      vi.spyOn(SessaoModel, 'criar').mockResolvedValue(
        criarSessaoMock({
          id: UUID_SESSAO_B,
          terapeuta_id: UUID_TERAPEUTA_B,
          session_token: 'CANC-1234',
          status_sessao: STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
        })
      );

      const { mockReq, mockRes, getStatus, getJson } = criarMocksHttp(
        {
          jogo_id: UUID_JOGO,
          paciente_id: UUID_PACIENTE,
          modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
          codigo_pareamento: 'CANC-1234',
        },
        {},
        { id: UUID_TERAPEUTA_B }
      );

      await SessaoController.iniciar(mockReq, mockRes);

      expect(getStatus()).toBe(201);
      const json = getJson();
      const sessaoCriada = json?.data as { sessao: { id: string } };
      expect(sessaoCriada.sessao.id).toBe(UUID_SESSAO_B);
    });
  });

  // ============================================================================
  // 2. Isolamento de Autoria e Permissões de Mutação (RF21)
  // ============================================================================
  describe('2. Isolamento do Condutor em Mutações Clínicas (RF21)', () => {
    const sessaoDoTerapeutaA = criarSessaoMock({
      id: UUID_SESSAO_A,
      terapeuta_id: UUID_TERAPEUTA_A,
      status_sessao: STATUS_SESSAO.EM_ANDAMENTO,
    });

    it('deve bloquear com 403 Forbidden quando Terapeuta B tenta finalizar a sessão ativa do Terapeuta A', async () => {
      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoDoTerapeutaA);

      const { mockReq, mockRes, getStatus, getJson } = criarMocksHttp(
        {},
        { id: UUID_SESSAO_A },
        { id: UUID_TERAPEUTA_B }, // Solicitante B alheio à condução
        sessaoDoTerapeutaA
      );

      await SessaoController.finalizar(mockReq, mockRes);

      expect(getStatus()).toBe(403);
      const json = getJson();
      expect(json?.codigo).toBe('FORBIDDEN_MUTACAO_CONDUTOR');
      expect(String(json?.error)).toMatch(/apenas o terapeuta condutor/i);
    });

    it('deve bloquear com 403 Forbidden quando Terapeuta B tenta cancelar a sessão do Terapeuta A', async () => {
      const sessaoAguardando = criarSessaoMock({
        id: UUID_SESSAO_A,
        terapeuta_id: UUID_TERAPEUTA_A,
        status_sessao: STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
      });

      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoAguardando);

      const { mockReq, mockRes, getStatus, getJson } = criarMocksHttp(
        {},
        { id: UUID_SESSAO_A },
        { id: UUID_TERAPEUTA_B }, // Solicitante B alheio
        sessaoAguardando
      );

      await SessaoController.cancelar(mockReq, mockRes);

      expect(getStatus()).toBe(403);
      const json = getJson();
      expect(json?.codigo).toBe('FORBIDDEN_MUTACAO_CONDUTOR');
      expect(String(json?.error)).toMatch(/apenas o terapeuta condutor/i);
    });

    it('deve permitir finalizar com 200 OK quando o Terapeuta A (condutor) solicita o encerramento', async () => {
      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoDoTerapeutaA);
      vi.spyOn(SessaoModel, 'finalizarSessao').mockResolvedValue({
        ...sessaoDoTerapeutaA,
        status_sessao: STATUS_SESSAO.FINALIZADA,
        data_hora_fim: new Date().toISOString(),
      });

      const { mockReq, mockRes, getStatus, getJson } = criarMocksHttp(
        {},
        { id: UUID_SESSAO_A },
        { id: UUID_TERAPEUTA_A }, // Terapeuta A condutor
        sessaoDoTerapeutaA
      );

      await SessaoController.finalizar(mockReq, mockRes);

      expect(getStatus()).toBe(200);
      const json = getJson();
      const sessaoFinalizada = json?.data as { sessao: { status_sessao: string } };
      expect(sessaoFinalizada.sessao.status_sessao).toBe(STATUS_SESSAO.FINALIZADA);
    });

    it('deve permitir cancelar com 200 OK quando o Terapeuta A (condutor) cancela sua sessão', async () => {
      const sessaoAguardando = criarSessaoMock({
        id: UUID_SESSAO_A,
        terapeuta_id: UUID_TERAPEUTA_A,
        status_sessao: STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
      });

      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoAguardando);
      vi.spyOn(SessaoModel, 'atualizarStatus').mockResolvedValue({
        ...sessaoAguardando,
        status_sessao: STATUS_SESSAO.CANCELADA,
      });

      const { mockReq, mockRes, getStatus, getJson } = criarMocksHttp(
        {},
        { id: UUID_SESSAO_A },
        { id: UUID_TERAPEUTA_A }, // Terapeuta A condutor
        sessaoAguardando
      );

      await SessaoController.cancelar(mockReq, mockRes);

      expect(getStatus()).toBe(200);
      const json = getJson();
      const sessaoCancelada = json?.data as { sessao: { status_sessao: string } };
      expect(sessaoCancelada.sessao.status_sessao).toBe(STATUS_SESSAO.CANCELADA);
    });

    it('deve permitir que SuperAdmin encerre ou cancele qualquer sessão (bypass administrativo)', async () => {
      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoDoTerapeutaA);
      vi.spyOn(SessaoModel, 'finalizarSessao').mockResolvedValue({
        ...sessaoDoTerapeutaA,
        status_sessao: STATUS_SESSAO.FINALIZADA,
        data_hora_fim: new Date().toISOString(),
      });

      const { mockReq, mockRes, getStatus } = criarMocksHttp(
        {},
        { id: UUID_SESSAO_A },
        { id: UUID_SUPER_ADMIN, is_super_admin: true }, // SuperAdmin
        sessaoDoTerapeutaA
      );

      await SessaoController.finalizar(mockReq, mockRes);

      expect(getStatus()).toBe(200);
    });
  });

  // ============================================================================
  // 3. Leitura Compartilhada Multidisciplinar (RF18, RN04)
  // ============================================================================
  describe('3. Visibilidade Compartilhada de Resultados (GET /api/sessao/:id/resultado — RF18, RN04)', () => {
    it('deve retornar 200 OK para o Terapeuta B consultar resultados da sessão conduzida pelo Terapeuta A', async () => {
      vi.spyOn(SessaoResultadoService, 'obterResultadoConsolidado').mockResolvedValue({
        sucesso: true,
        status: 200,
        dados: {
          sessao: {
            id: UUID_SESSAO_A,
            session_token: TOKEN_SESSAO,
            status_sessao: STATUS_SESSAO.FINALIZADA,
            modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
            data_hora_inicio: new Date().toISOString(),
            data_hora_fim: new Date().toISOString(),
            duracao_segundos: 600,
          },
          metricas_consolidadas: {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          insights_ia: {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          historico_evolutivo: {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          jogo: { id: UUID_JOGO, nome: 'Jogo Cognitivo TEA', versao: '1.2.0' },
          terapeuta: { id: UUID_TERAPEUTA_A, nome: 'Dr. Marcos Willian' },
          paciente: { id: UUID_PACIENTE, nome: 'Paciente Bernardo' },
          relatorio: null,
          anotacoes: [],
          cabecalho: {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        },
      });

      const { mockReq, mockRes, getStatus, getJson } = criarMocksHttp(
        {},
        { id: UUID_SESSAO_A },
        { id: UUID_TERAPEUTA_B } // Terapeuta B consultando relatório da equipe
      );

      await SessaoController.consultarResultado(mockReq, mockRes);

      expect(getStatus()).toBe(200);
      const json = getJson();
      const resultado = json?.data as {
        sessao: { id: string };
        terapeuta: { id: string; nome: string };
        paciente: { id: string; nome: string };
      };
      expect(resultado.sessao.id).toBe(UUID_SESSAO_A);
      expect(resultado.terapeuta.id).toBe(UUID_TERAPEUTA_A);
      expect(resultado.paciente.id).toBe(UUID_PACIENTE);
    });
  });

  // ============================================================================
  // 4. WebSocket: Observador de Equipe e Isolamento de Comandos (RF18, RF21, RNF01)
  // ============================================================================
  describe('4. WebSocket SessaoGateway — Acompanhamento Multidisciplinar ao Vivo (RF18, RF21, RNF01)', () => {
    it('deve emitir equipe_presenca_atualizada e contabilizar observador_equipe conectado na sala', async () => {
      const socketObservador = await conectarSocketCliente();
      const socketTerapeuta = await conectarSocketCliente();

      const presencaPromise = new Promise<EquipePresencaEvento>((resolve) => {
        socketObservador.on('equipe_presenca_atualizada', (evento: EquipePresencaEvento) => {
          if (evento.total_observadores > 0) {
            resolve(evento);
          }
        });
      });

      // 1. Terapeuta condutor entra na sala
      await new Promise<void>((resolve) => {
        socketTerapeuta.emit(
          'entrar_sessao',
          {
            session_token: TOKEN_SESSAO,
            role: 'terapeuta',
            terapeuta_id: UUID_TERAPEUTA_A,
            nome: 'Dr(a). Terapeuta A',
          },
          () => resolve()
        );
      });

      // 2. Observador da equipe multidisciplinar entra na mesma sala
      await new Promise<void>((resolve) => {
        socketObservador.emit(
          'entrar_sessao',
          {
            session_token: TOKEN_SESSAO,
            role: 'observador_equipe',
            terapeuta_id: UUID_TERAPEUTA_B,
            nome: 'Dr(a). Observador B',
            especialidade: 'Fonoaudiologia',
          },
          () => resolve()
        );
      });

      const presenca = await presencaPromise;
      expect(presenca.session_token).toBe(TOKEN_SESSAO);
      expect(presenca.total_especialistas).toBe(2);
      expect(presenca.total_observadores).toBe(1);
      expect(presenca.especialistas.some((e: { role: string }) => e.role === 'observador_equipe')).toBe(true);
    });

    it('deve permitir que observador_equipe receba telemetria ao vivo da sessão', async () => {
      const socketDispositivo = await conectarSocketCliente();
      const socketObservador = await conectarSocketCliente();

      // Observador entra como observador_equipe
      await new Promise<void>((resolve) => {
        socketObservador.emit(
          'entrar_sessao',
          { session_token: TOKEN_SESSAO, role: 'observador_equipe', terapeuta_id: UUID_TERAPEUTA_B },
          () => resolve()
        );
      });

      // Dispositivo entra como dispositivo
      await new Promise<void>((resolve) => {
        socketDispositivo.emit(
          'entrar_sessao',
          { session_token: TOKEN_SESSAO, role: 'dispositivo' },
          () => resolve()
        );
      });

      // Prepara captura de telemetria no observador
      const telemetriaPromise = new Promise<unknown>((resolve) => {
        socketObservador.on('telemetria_recebida', (dados: unknown) => {
          resolve(dados);
        });
      });

      // Dispositivo emite telemetria com schema válido
      socketDispositivo.emit('telemetria', {
        session_token: TOKEN_SESSAO,
        tipo_evento: 'toque_alvo',
        dados: { id_metrica: 'tempo_reacao', valor: 250 },
      });

      const dadosRecebidos = await telemetriaPromise;
      expect(dadosRecebidos).toBeDefined();
    });

    it('deve rejeitar comandos clínicos emitidos por observador_equipe com PERMISSAO_NEGADA (RF21)', async () => {
      const socketObservador = await conectarSocketCliente();

      await new Promise<void>((resolve) => {
        socketObservador.emit(
          'entrar_sessao',
          { session_token: TOKEN_SESSAO, role: 'observador_equipe', terapeuta_id: UUID_TERAPEUTA_B },
          () => resolve()
        );
      });

      const erroPromise = new Promise<RespostaComandoAck>((resolve) => {
        socketObservador.on('erro_comando', (erro: RespostaComandoAck) => {
          resolve(erro);
        });
      });

      // Observador tenta emitir comando de pausar jogo
      const ackResposta = await new Promise<RespostaComandoAck>((resolve) => {
        socketObservador.emit(
          'comando_clinico',
          {
            session_token: TOKEN_SESSAO,
            tipo_comando: 'pausar',
          },
          (ack: RespostaComandoAck) => resolve(ack)
        );
      });

      expect(ackResposta.sucesso).toBe(false);
      expect(ackResposta.codigo).toBe('PERMISSAO_NEGADA');
      expect(ackResposta.erro).toContain('Observadores da equipe possuem acesso exclusivamente de leitura');

      const erroEvento = await erroPromise;
      expect(erroEvento.codigo).toBe('PERMISSAO_NEGADA');
    });

    it('deve permitir comandos clínicos emitidos pelo terapeuta condutor da sessão', async () => {
      const socketTerapeuta = await conectarSocketCliente();
      const socketDispositivo = await conectarSocketCliente();

      // Dispositivo do paciente entra na sessão
      await new Promise<void>((resolve) => {
        socketDispositivo.emit(
          'entrar_sessao',
          { session_token: TOKEN_SESSAO, role: 'dispositivo' },
          () => resolve()
        );
      });

      // Terapeuta condutor entra na sessão
      await new Promise<void>((resolve) => {
        socketTerapeuta.emit(
          'entrar_sessao',
          { session_token: TOKEN_SESSAO, role: 'terapeuta', terapeuta_id: UUID_TERAPEUTA_A },
          () => resolve()
        );
      });

      const ackResposta = await new Promise<RespostaComandoAck>((resolve) => {
        socketTerapeuta.emit(
          'comando_clinico',
          {
            session_token: TOKEN_SESSAO,
            tipo_comando: 'pausar',
          },
          (ack: RespostaComandoAck) => resolve(ack)
        );
      });

      expect(ackResposta.sucesso).toBe(true);
      expect(ackResposta.comando).toBe('pausar_jogo');
    });
  });
});
