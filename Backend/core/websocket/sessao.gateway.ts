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
}

export class SessaoGateway {
  private static instance?: SessaoGateway;
  private io: SocketIOServer;
  private sessaoNamespace: Namespace;

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
   * Conecta os eventos emitidos via HTTP pelo SessaoController com a sala Socket.IO da sessão.
   */
  private integrarComSessaoController(): void {
    SessaoController.registrarListenerPareamento((token, dados) => {
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

      // 2. Heartbeat e monitoramento de presença (Card 2.3 - ping/pong)
      socket.on('ping_presenca', () => {
        socket.emit('pong_presenca', {
          timestamp: Date.now(),
          status: 'online'
        });
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

    // Se o cliente conectando for o dispositivo do jogo, notifica imediatamente os terapeutas na sala
    if (role === 'dispositivo') {
      const evento: DispositivoConectadoEvento = {
        session_token: tokenNormalizado,
        status_sessao: 'em_andamento',
        dispositivo_info: payload.dispositivo_info || null,
        conectado_em: new Date().toISOString()
      };

      this.sessaoNamespace.to(sala).emit('dispositivo_conectado', evento);
    }
  }

  /**
   * Monitora a desconexão e emite alerta de perda de sinal se o socket era um dispositivo remoto (Card 2.3).
   */
  private lidarDesconexao(socket: Socket, motivo: string): void {
    const token = socket.data.sessionToken as string | undefined;
    const role = socket.data.role as string | undefined;

    if (token && role === 'dispositivo') {
      const sala = `session_${token}`;
      const evento: DispositivoDesconectadoEvento = {
        session_token: token,
        motivo,
        timestamp: new Date().toISOString()
      };

      this.sessaoNamespace.to(sala).emit('dispositivo_desconectado', evento);
    }
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
    const evento: DispositivoDesconectadoEvento = {
      session_token: tokenNormalizado,
      motivo,
      timestamp: new Date().toISOString()
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
