import { Server as SocketIOServer, Socket, Namespace } from 'socket.io';
import { SessaoController } from '../../api/sessao/controllers/sessao.controller.js';

export interface EntrarSessaoPayload {
  session_token: string;
  role?: 'terapeuta' | 'dispositivo' | string;
  dispositivo_info?: Record<string, unknown>;
}

export interface DispositivoConectadoEvento {
  sessao_id?: string;
  session_token: string;
  status_sessao: string;
  modo_sessao?: string;
  dispositivo_info?: Record<string, unknown> | null;
  conectado_em: string;
  [key: string]: unknown;
}

export interface DispositivoDesconectadoEvento {
  session_token: string;
  motivo: string;
  timestamp: string;
  ultimo_heartbeat?: number;
}

export interface DispositivoReconectadoEvento {
  session_token: string;
  tempo_offline_ms: number;
  reconectado_em: string;
  status_sessao: string;
  dispositivo_info?: Record<string, unknown> | null;
}

export interface PingPresencaPayload {
  timestamp_cliente?: number;
  bateria?: number;
  qualidade_sinal?: 'excelente' | 'bom' | 'fraco' | string;
}

export interface PongPresencaResposta {
  status: 'online';
  timestamp_servidor: number;
  timestamp_cliente?: number;
  latencia_estimada_ms?: number;
}

export interface DispositivoPresenca {
  session_token: string;
  socket_id: string;
  conectado: boolean;
  ultimo_heartbeat: number;
  conectado_em: string;
  desconectado_em?: string;
  desconectado_timestamp?: number;
  tempo_offline_ms?: number;
  bateria?: number;
  latencia_ms?: number;
  qualidade_sinal?: string;
}

export class SessaoGateway {
  private static instance?: SessaoGateway;
  private io: SocketIOServer;
  private sessaoNamespace: Namespace;
  private presencas: Map<string, DispositivoPresenca> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.sessaoNamespace = this.io.of('/sessao');
    this.configurarNamespace();
    this.integrarComSessaoController();
  }

  /**
   * Inicializa o gateway WebSocket singleton para o namespace /sessao.
   */
  static inicializar(io: SocketIOServer): SessaoGateway {
    if (!SessaoGateway.instance) {
      SessaoGateway.instance = new SessaoGateway(io);
    }
    return SessaoGateway.instance;
  }

  /**
   * Retorna a instância ativa do gateway ou lança erro se ainda não inicializado.
   */
  static obterInstancia(): SessaoGateway {
    if (!SessaoGateway.instance) {
      throw new Error('SessaoGateway ainda não foi inicializado com uma instância do Socket.IO');
    }
    return SessaoGateway.instance;
  }

  /**
   * Limpa o mapa de presenças em memória (útil para suítes de testes).
   */
  resetarPresencas(): void {
    this.presencas.clear();
  }

  /**
   * Conecta os eventos emitidos via HTTP pelo SessaoController com a sala Socket.IO da sessão.
   */
  private integrarComSessaoController(): void {
    SessaoController.registrarListenerPareamento((token, dados) => {
      const tokenNormalizado = this.normalizarToken(token);

      // Registra presença inicial no gateway
      this.presencas.set(tokenNormalizado, {
        session_token: tokenNormalizado,
        socket_id: 'http_handshake',
        conectado: true,
        ultimo_heartbeat: Date.now(),
        conectado_em: dados.pareado_em
      });

      this.notificarDispositivoConectado(token, {
        sessao_id: dados.sessao_id,
        session_token: dados.session_token,
        status_sessao: dados.status_sessao,
        modo_sessao: dados.modo_sessao,
        dispositivo_info: dados.dispositivo_info ? (dados.dispositivo_info as unknown as Record<string, unknown>) : null,
        conectado_em: dados.pareado_em,
        jogo: dados.jogo,
        contexto_dda: dados.contexto_dda
      });
    });

    SessaoController.registrarCallbackPresenca((token) => this.obterPresencaDispositivo(token));
  }

  /**
   * Configura listeners de conexão, entrada em salas, heartbeat e desconexão.
   */
  private configurarNamespace(): void {
    this.sessaoNamespace.on('connection', (socket: Socket) => {
      // 1. Evento para vincular o socket à sala da sessão (terapeuta ou jogo)
      socket.on('entrar_sessao', (payload: EntrarSessaoPayload) => {
        this.lidarEntradaSessao(socket, payload);
      });

      // 2. Heartbeat e monitoramento de presença ativo (Card 2.3 - ping/pong)
      socket.on('ping_presenca', (payload?: PingPresencaPayload) => {
        this.lidarPingPresenca(socket, payload);
      });

      // 3. Finalização de sessão solicitada pela interface web do terapeuta
      socket.on('finalizar_sessao', (dados?: { session_token?: string }) => {
        const token = dados?.session_token || (socket.data.sessionToken as string | undefined);
        if (token) {
          this.notificarSessaoFinalizada(token);
        }
      });

      // 4. Detecção de perda de conexão / fechamento de janela
      socket.on('disconnect', (motivo: string) => {
        this.lidarDesconexao(socket, motivo);
      });
    });
  }

  /**
   * Processa a entrada de um cliente (painel web do terapeuta ou jogo remoto) na sala da sessão.
   */
  private lidarEntradaSessao(socket: Socket, payload: EntrarSessaoPayload): void {
    if (!payload || !payload.session_token) {
      socket.emit('erro_sessao', {
        error: 'Parâmetro obrigatório ausente: session_token'
      });
      return;
    }

    const tokenNormalizado = this.normalizarToken(payload.session_token);
    const sala = `session_${tokenNormalizado}`;
    const role = payload.role || 'terapeuta';

    socket.data.sessionToken = tokenNormalizado;
    socket.data.role = role;
    socket.join(sala);

    // Confirmação de entrada na sala
    socket.emit('sessao_conectada', {
      status: 'ok',
      sala,
      session_token: tokenNormalizado,
      role
    });

    // Se o cliente conectando for o dispositivo do jogo:
    if (role === 'dispositivo') {
      const presencaExistente = this.presencas.get(tokenNormalizado);
      const agora = Date.now();

      // Checa se é uma RECONEXÃO após perda de sinal prévia (Card 2.3)
      if (presencaExistente && !presencaExistente.conectado && presencaExistente.desconectado_timestamp) {
        const tempoOfflineMs = agora - presencaExistente.desconectado_timestamp;

        presencaExistente.conectado = true;
        presencaExistente.socket_id = socket.id;
        presencaExistente.ultimo_heartbeat = agora;
        presencaExistente.tempo_offline_ms = tempoOfflineMs;
        presencaExistente.desconectado_em = undefined;
        presencaExistente.desconectado_timestamp = undefined;

        const eventoReconexao: DispositivoReconectadoEvento = {
          session_token: tokenNormalizado,
          tempo_offline_ms: tempoOfflineMs,
          reconectado_em: new Date(agora).toISOString(),
          status_sessao: 'em_andamento',
          dispositivo_info: payload.dispositivo_info || null
        };

        this.sessaoNamespace.to(sala).emit('dispositivo_reconectado', eventoReconexao);
      } else {
        // Primeira conexão do dispositivo
        this.presencas.set(tokenNormalizado, {
          session_token: tokenNormalizado,
          socket_id: socket.id,
          conectado: true,
          ultimo_heartbeat: agora,
          conectado_em: new Date(agora).toISOString(),
          qualidade_sinal: 'bom'
        });

        const evento: DispositivoConectadoEvento = {
          session_token: tokenNormalizado,
          status_sessao: 'em_andamento',
          dispositivo_info: payload.dispositivo_info || null,
          conectado_em: new Date(agora).toISOString()
        };

        this.sessaoNamespace.to(sala).emit('dispositivo_conectado', evento);
      }
    }
  }

  /**
   * Processa o ping de presença com cálculo de latência e sincronização de relógio (Card 2.3).
   */
  private lidarPingPresenca(socket: Socket, payload?: PingPresencaPayload): void {
    const token = socket.data.sessionToken as string | undefined;
    const agora = Date.now();
    let latenciaMs: number | undefined;

    if (payload?.timestamp_cliente) {
      latenciaMs = Math.max(0, agora - payload.timestamp_cliente);
    }

    if (token) {
      const presenca = this.presencas.get(token);
      if (presenca) {
        presenca.ultimo_heartbeat = agora;
        if (latenciaMs !== undefined) presenca.latencia_ms = latenciaMs;
        if (payload?.bateria !== undefined) presenca.bateria = payload.bateria;
        if (payload?.qualidade_sinal) presenca.qualidade_sinal = payload.qualidade_sinal;
      }
    }

    const resposta: PongPresencaResposta = {
      status: 'online',
      timestamp_servidor: agora,
      timestamp_cliente: payload?.timestamp_cliente,
      latencia_estimada_ms: latenciaMs
    };

    socket.emit('pong_presenca', resposta);
  }

  /**
   * Monitora a desconexão e emite alerta de perda de sinal se o socket era um dispositivo remoto (Card 2.3).
   */
  private lidarDesconexao(socket: Socket, motivo: string): void {
    const token = socket.data.sessionToken as string | undefined;
    const role = socket.data.role as string | undefined;

    if (token && role === 'dispositivo') {
      const sala = `session_${token}`;
      const agora = Date.now();
      const presenca = this.presencas.get(token);

      if (presenca) {
        presenca.conectado = false;
        presenca.desconectado_em = new Date(agora).toISOString();
        presenca.desconectado_timestamp = agora;
      }

      const evento: DispositivoDesconectadoEvento = {
        session_token: token,
        motivo,
        timestamp: new Date(agora).toISOString(),
        ultimo_heartbeat: presenca?.ultimo_heartbeat
      };

      this.sessaoNamespace.to(sala).emit('dispositivo_desconectado', evento);
    }
  }

  /**
   * Consulta o estado de presença e métricas do dispositivo remoto pareado à sessão (Card 2.3).
   *
   * @param sessionToken - Código PIN da sessão.
   */
  obterPresencaDispositivo(sessionToken: string): DispositivoPresenca | null {
    const tokenNormalizado = this.normalizarToken(sessionToken);
    const presenca = this.presencas.get(tokenNormalizado);
    return presenca ? { ...presenca } : null;
  }

  /**
   * Emite para a sala da sessão que o dispositivo remoto completou o pareamento.
   *
   * @param sessionToken - Código PIN da sessão.
   * @param dados - Metadados do pareamento e parâmetros DDA.
   */
  notificarDispositivoConectado(sessionToken: string, dados: DispositivoConectadoEvento): void {
    const tokenNormalizado = this.normalizarToken(sessionToken);
    const sala = `session_${tokenNormalizado}`;
    this.sessaoNamespace.to(sala).emit('dispositivo_conectado', dados);
  }

  /**
   * Emite para a sala que o dispositivo foi desconectado ou perdeu conectividade.
   *
   * @param sessionToken - Código PIN da sessão.
   * @param motivo - Causa técnica da desconexão.
   */
  notificarDispositivoDesconectado(sessionToken: string, motivo: string = 'cliente_desconectado'): void {
    const tokenNormalizado = this.normalizarToken(sessionToken);
    const sala = `session_${tokenNormalizado}`;
    const agora = Date.now();
    const presenca = this.presencas.get(tokenNormalizado);

    if (presenca) {
      presenca.conectado = false;
      presenca.desconectado_em = new Date(agora).toISOString();
      presenca.desconectado_timestamp = agora;
    }

    const evento: DispositivoDesconectadoEvento = {
      session_token: tokenNormalizado,
      motivo,
      timestamp: new Date(agora).toISOString(),
      ultimo_heartbeat: presenca?.ultimo_heartbeat
    };
    this.sessaoNamespace.to(sala).emit('dispositivo_desconectado', evento);
  }

  /**
   * Emite sinal de encerramento da sessão para todos os clientes conectados na sala.
   *
   * @param sessionToken - Código PIN da sessão.
   */
  notificarSessaoFinalizada(sessionToken: string): void {
    const tokenNormalizado = this.normalizarToken(sessionToken);
    const sala = `session_${tokenNormalizado}`;
    this.sessaoNamespace.to(sala).emit('sessao_finalizada', {
      session_token: tokenNormalizado,
      status_sessao: 'finalizada',
      finalizado_em: new Date().toISOString()
    });
  }

  /**
   * Retorna os IDs dos sockets presentes na sala de uma sessão.
   *
   * @param sessionToken - Código PIN da sessão.
   */
  async obterSocketsNaSala(sessionToken: string): Promise<string[]> {
    const tokenNormalizado = this.normalizarToken(sessionToken);
    const sala = `session_${tokenNormalizado}`;
    const sockets = await this.sessaoNamespace.in(sala).fetchSockets();
    return sockets.map((s) => s.id);
  }

  /**
   * Normaliza o token alfanumérico removendo formatações para manter consistência das salas.
   */
  private normalizarToken(token: string): string {
    return token.trim().toUpperCase();
  }
}
