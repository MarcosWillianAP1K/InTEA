import { Server as SocketIOServer, Socket, Namespace } from 'socket.io';
import { SessaoController } from '../../api/sessao/controllers/sessao.controller.js';
import {
  SessaoReconnectionManager,
  EventoAdvertenciaDesconexao,
  EventoSessaoInterrompida
} from './sessao.reconnection.js';
import { SocketRateLimiter } from './socket.limiter.js';
import { SessaoModel, STATUS_SESSAO } from '../../api/sessao/models/sessao.model.js';
import { AuditoriaService } from '../../api/auditoria/services/auditoria.service.js';

export type RoleSocket = 'terapeuta' | 'dispositivo' | 'observador_equipe' | string;

export interface EntrarSessaoPayload {
  session_token: string;
  role?: RoleSocket;
  dispositivo_info?: Record<string, unknown>;
  terapeuta_id?: string;
  nome?: string;
  especialidade?: string;
  registro_conselho?: string;
}

export interface EspecialistaConectado {
  socket_id: string;
  role: 'terapeuta' | 'observador_equipe' | string;
  terapeuta_id?: string;
  nome?: string;
  especialidade?: string;
  registro_conselho?: string;
  conectado_em: string;
}

export interface EquipePresencaEvento {
  session_token: string;
  total_especialistas: number;
  total_observadores: number;
  especialistas: EspecialistaConectado[];
  timestamp: string;
}

export interface DispositivoConectadoEvento {
  sessao_id?: string;
  session_token: string;
  status_sessao: string;
  modo_sessao?: string;
  dispositivo_info?: Record<string, unknown> | null;
  conectado_em: string;
  jogo?: Record<string, unknown> | null;
  contexto_dda?: Record<string, unknown> | null;
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

export interface TelemetriaDadosPayload {
  id_metrica: string;
  valor: number | string | boolean;
  [key: string]: unknown;
}

export interface TelemetriaEventoPayload {
  token_sessao?: string;
  session_token?: string;
  data_hora?: string;
  timestamp?: string | number;
  tipo_evento: string;
  dados: TelemetriaDadosPayload;
  [key: string]: unknown;
}

export interface TelemetriaEventoNormalizado {
  session_token: string;
  data_hora: string;
  tipo_evento: string;
  dados: TelemetriaDadosPayload;
  recebido_em: string;
  origem_socket_id: string;
}

export interface ResultadoValidacaoTelemetria {
  valido: boolean;
  erro?: string;
  codigo?: string;
  eventoNormalizado?: TelemetriaEventoNormalizado;
}

export type TelemetriaPersistenciaCallback = (
  sessionToken: string,
  evento: TelemetriaEventoNormalizado
) => Promise<void> | void;

export type TipoComandoClinico =
  | 'pausar_jogo'
  | 'retomar_jogo'
  | 'ajustar_dificuldade_dda'
  | 'solicitar_encerramento';

export interface ComandoClinicoPayload {
  session_token?: string;
  token_sessao?: string;
  sessionToken?: string;
  tipo_comando?: TipoComandoClinico | string;
  comando?: TipoComandoClinico | string;
  acao?: TipoComandoClinico | string;
  tipo?: TipoComandoClinico | string;
  parametros?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ComandoClinicoEventoNormalizado {
  session_token: string;
  tipo_comando: TipoComandoClinico;
  parametros?: Record<string, unknown>;
  timestamp: string;
  emitido_por: string;
}

export interface RespostaComandoAck {
  sucesso: boolean;
  comando?: TipoComandoClinico;
  timestamp?: string;
  erro?: string;
  codigo?: string;
  codigo_detalhado?: string;
}

export interface ResultadoValidacaoComando {
  valido: boolean;
  erro?: string;
  codigo?: string;
  codigoDetalhado?: string;
  comandoNormalizado?: ComandoClinicoEventoNormalizado;
}

export class SessaoGateway {
  private static instance?: SessaoGateway;
  private static telemetriaCallback?: TelemetriaPersistenciaCallback;
  private io: SocketIOServer;
  private sessaoNamespace: Namespace;
  private presencas: Map<string, DispositivoPresenca> = new Map();
  private especialistasPorSala: Map<string, Map<string, EspecialistaConectado>> = new Map();
  private reconnectionManager: SessaoReconnectionManager = SessaoReconnectionManager.obterInstancia();
  private rateLimiter: SocketRateLimiter = SocketRateLimiter.obterInstancia();

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
    SessaoGateway.instance = new SessaoGateway(io);
    return SessaoGateway.instance;
  }

  /**
   * Returns active gateway instance or throws error if not yet initialized.
   */
  static obterInstancia(): SessaoGateway {
    if (!SessaoGateway.instance) {
      throw new Error('SessaoGateway ainda não foi inicializado com uma instância do Socket.IO');
    }
    return SessaoGateway.instance;
  }

  /**
   * Clears in-memory presence map (useful for test suites).
   */
  resetarPresencas(): void {
    this.presencas.clear();
    this.especialistasPorSala.clear();
    this.reconnectionManager.limparTodos();
    this.rateLimiter.limparTodos();
  }

  /**
   * Binds HTTP-emitted events from SessaoController to session Socket.IO room.
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
   * Configures listeners for connection, room joining, heartbeat, and disconnection.
   */
  private configurarNamespace(): void {
    this.sessaoNamespace.on('connection', (socket: Socket) => {
      this.configurarSocket(socket);
    });
    if (this.io && typeof (this.io as { on?: unknown }).on === 'function') {
      this.io.on('connection', (socket: Socket) => {
        this.configurarSocket(socket);
      });
    }
  }

  /**
   * Safely emits event on root namespace '/' with defensive verification of .to() support.
   */
  private emitirGlobal(sala: string, event: string, ...args: unknown[]): void {
    if (this.io && typeof (this.io as { to?: unknown }).to === 'function') {
      this.io.to(sala).emit(event, ...args);
    }
  }

  /**
   * Configures event listeners, rate limiting middleware, and telemetry routing for a newly connected socket.
   *
   * @param socket - Connected client Socket.io instance.
   */
  private configurarSocket(socket: Socket): void {
    // 0. Middleware de contenção de flood e rate limiting (Card 2.4 - RNF03)
    socket.use(([event, ...args], next) => {
      if (event === 'sessao:telemetria' || event === 'telemetria') {
        const limite = this.rateLimiter.verificarLimite(socket.id, event);
        if (!limite.permitido) {
          socket.emit('erro_rate_limit', {
            sucesso: false,
            error: limite.mensagem,
            codigo: limite.codigo,
            limite_por_segundo: limite.limiteMaximo,
            tempo_restante_ms: limite.tempoRestanteMs
          });

          const ultimoArg = args[args.length - 1];
          if (typeof ultimoArg === 'function') {
            ultimoArg({
              sucesso: false,
              erro: limite.mensagem,
              codigo: limite.codigo
            });
          }
          return;
        }
      }
      next();
    });

    // 1. Evento para vincular o socket à sala da sessão (suporta entrar_sessao e entrar_sala)
    type EntradaPayload = {
      session_token?: string;
      sessionToken?: string;
      role?: RoleSocket;
      dispositivo_info?: Record<string, unknown>;
      dispositivoInfo?: Record<string, unknown>;
      terapeuta_id?: string;
      terapeutaId?: string;
      nome?: string;
      especialidade?: string;
      registro_conselho?: string;
      registroConselho?: string;
    };

    const handlerEntrada = (payload: EntradaPayload, ack?: (res: unknown) => void) => {
      const token = payload?.session_token || payload?.sessionToken || '';
      this.lidarEntradaSessao(socket, {
        session_token: token,
        role: payload?.role,
        dispositivo_info: payload?.dispositivo_info || payload?.dispositivoInfo,
        terapeuta_id: payload?.terapeuta_id || payload?.terapeutaId,
        nome: payload?.nome,
        especialidade: payload?.especialidade,
        registro_conselho: payload?.registro_conselho || payload?.registroConselho,
      });
      if (typeof ack === 'function') {
        ack({ sucesso: true, session_token: token });
      }
    };

    socket.on('entrar_sessao', handlerEntrada);
    socket.on('entrar_sala', handlerEntrada);

    // 2. Heartbeat e monitoramento de presença ativo (Card 2.3 - ping/pong)
    socket.on('ping_presenca', (payload?: PingPresencaPayload) => {
      this.lidarPingPresenca(socket, payload);
    });

    // 3. Finalização de sessão solicitada pela interface web do terapeuta
    socket.on('finalizar_sessao', (dados?: { session_token?: string; sessionToken?: string }) => {
      const token = dados?.session_token || dados?.sessionToken || (socket.data.sessionToken as string | undefined);
      if (token) {
        this.notificarSessaoFinalizada(token);
      }
    });

    // 4. Ingestão e Roteamento de Telemetria Contínua (Card 2.1 - sessao:telemetria)
    socket.on('sessao:telemetria', (payload: unknown, ack?: (resposta: unknown) => void) => {
      this.lidarTelemetria(socket, payload, ack);
    });
    socket.on('telemetria', (payload: unknown, ack?: (resposta: unknown) => void) => {
      this.lidarTelemetria(socket, payload, ack);
    });

    // 5. Canal de Comandos do Terapeuta para o Jogo Remoto (Card 2.2 - sessao:comando)
    socket.on('sessao:comando', (payload: unknown, ack?: (res: RespostaComandoAck) => void) => {
      this.lidarComandoClinico(socket, payload, ack);
    });
    socket.on('comando_jogo', (payload: unknown, ack?: (res: RespostaComandoAck) => void) => {
      this.lidarComandoClinico(socket, payload, ack);
    });
    socket.on('enviar_comando', (payload: unknown, ack?: (res: RespostaComandoAck) => void) => {
      this.lidarComandoClinico(socket, payload, ack);
    });
    socket.on('comando_clinico', (payload: unknown, ack?: (res: RespostaComandoAck) => void) => {
      this.lidarComandoClinico(socket, payload, ack);
    });

    // 6. Detecção de perda de conexão / fechamento de janela
    socket.on('disconnect', (motivo: string) => {
      this.lidarDesconexao(socket, motivo);
    });
  }

  /**
   * Processes client joining (therapist web panel or remote game) in the session room.
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
    socket.data.terapeutaId = payload.terapeuta_id;
    socket.join(sala);

    // Confirmação de entrada na sala
    socket.emit('sessao_conectada', {
      status: 'ok',
      sala,
      session_token: tokenNormalizado,
      role
    });

    // Rastreia especialistas da equipe multidisciplinar (terapeuta condutor ou observador_equipe)
    if (role === 'terapeuta' || role === 'observador_equipe') {
      let mapa = this.especialistasPorSala.get(tokenNormalizado);
      if (!mapa) {
        mapa = new Map();
        this.especialistasPorSala.set(tokenNormalizado, mapa);
      }

      mapa.set(socket.id, {
        socket_id: socket.id,
        role,
        terapeuta_id: payload.terapeuta_id,
        nome: payload.nome,
        especialidade: payload.especialidade,
        registro_conselho: payload.registro_conselho,
        conectado_em: new Date().toISOString(),
      });

      this.emitirPresencaEquipe(tokenNormalizado);
    }

    // Se o cliente conectando for o dispositivo do jogo:
    if (role === 'dispositivo') {
      this.reconnectionManager.registrarReconexao(tokenNormalizado);
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
        this.emitirGlobal(sala, 'dispositivo_reconectado', eventoReconexao);
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
          conectado_em: new Date(agora).toISOString(),
        };

        this.sessaoNamespace.to(sala).emit('dispositivo_conectado', evento);
        this.emitirGlobal(sala, 'dispositivo_conectado', evento);
      }
    }
  }

  /**
   * Processes presence ping with latency calculation and clock synchronization (Card 2.3).
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
   * Monitors disconnection and emits signal loss alert if socket was remote device (Card 2.3).
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

      const alerta = this.reconnectionManager.registrarDesconexao(token, motivo, (eventoInterrupcao) => {
        this.notificarSessaoInterrompidaPorQueda(token, eventoInterrupcao);
      });

      this.sessaoNamespace.to(sala).emit('dispositivo_desconectado', evento);
      this.sessaoNamespace.to(sala).emit('sessao:alerta_conexao', alerta);
      this.emitirGlobal(sala, 'dispositivo_desconectado', evento);
      this.emitirGlobal(sala, 'sessao:alerta_conexao', alerta);
    }

    // Se o socket desconectado era um especialista (terapeuta condutor ou observador_equipe)
    if (token) {
      const mapa = this.especialistasPorSala.get(token);
      if (mapa && mapa.has(socket.id)) {
        mapa.delete(socket.id);
        if (mapa.size === 0) {
          this.especialistasPorSala.delete(token);
        }
        this.emitirPresencaEquipe(token);
      }
    }

    // Limpa rastreio de taxa do socket desconectado (Card 2.4)
    this.rateLimiter.removerIdentificador(socket.id);
  }

  /**
   * Queries presence state and metrics of remote device paired to session (Card 2.3).
   *
   * @param sessionToken - Session PIN code.
   */
  obterPresencaDispositivo(sessionToken: string): DispositivoPresenca | null {
    const tokenNormalizado = this.normalizarToken(sessionToken);
    const presenca = this.presencas.get(tokenNormalizado);
    return presenca ? { ...presenca } : null;
  }

  /**
   * Emite para a sala da sessão o evento equipe_presenca_atualizada com
   * o total e a lista de especialistas (terapeuta e observadores) acompanhando a sessão.
   */
  emitirPresencaEquipe(sessionToken: string): void {
    const tokenNormalizado = this.normalizarToken(sessionToken);
    const sala = `session_${tokenNormalizado}`;
    const mapa = this.especialistasPorSala.get(tokenNormalizado);
    const especialistas = mapa ? Array.from(mapa.values()) : [];

    const totalEspecialistas = especialistas.length;
    const totalObservadores = especialistas.filter((e) => e.role === 'observador_equipe').length;

    const evento: EquipePresencaEvento = {
      session_token: tokenNormalizado,
      total_especialistas: totalEspecialistas,
      total_observadores: totalObservadores,
      especialistas,
      timestamp: new Date().toISOString(),
    };

    this.sessaoNamespace.to(sala).emit('equipe_presenca_atualizada', evento);
    this.emitirGlobal(sala, 'equipe_presenca_atualizada', evento);
  }

  /**
   * Retorna os especialistas conectados a uma sala de sessão.
   */
  obterEspecialistasConectados(sessionToken: string): EspecialistaConectado[] {
    const tokenNormalizado = this.normalizarToken(sessionToken);
    const mapa = this.especialistasPorSala.get(tokenNormalizado);
    return mapa ? Array.from(mapa.values()) : [];
  }

  /**
   * Emits to session room that remote device completed pairing.
   *
   * @param sessionToken - Session PIN code.
   * @param dados - Pairing metadata and DDA parameters.
   */
  notificarDispositivoConectado(sessionToken: string, dados: DispositivoConectadoEvento): void {
    const tokenNormalizado = this.normalizarToken(sessionToken);
    const sala = `session_${tokenNormalizado}`;
    this.sessaoNamespace.to(sala).emit('dispositivo_conectado', dados);
    this.emitirGlobal(sala, 'dispositivo_conectado', dados);
  }

  /**
   * Emits to session room that device disconnected or lost connectivity.
   *
   * @param sessionToken - Session PIN code.
   * @param motivo - Technical cause of disconnection.
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
    this.emitirGlobal(sala, 'dispositivo_desconectado', evento);
  }

  /**
   * Emits session termination signal to all connected clients in room.
   *
   * @param sessionToken - Session PIN code.
   */
  notificarSessaoFinalizada(sessionToken: string): void {
    const tokenNormalizado = this.normalizarToken(sessionToken);
    const sala = `session_${tokenNormalizado}`;
    const evento = {
      session_token: tokenNormalizado,
      status_sessao: 'finalizada',
      finalizado_em: new Date().toISOString()
    };
    this.sessaoNamespace.to(sala).emit('sessao_finalizada', evento);
    this.emitirGlobal(sala, 'sessao_finalizada', evento);
  }

  /**
   * Registers callback for asynchronous telemetry ingestion / persistence.
   */
  static registrarCallbackTelemetria(callback: TelemetriaPersistenciaCallback): void {
    SessaoGateway.telemetriaCallback = callback;
  }

  /**
   * Removes registered telemetry persistence callback.
   */
  static removerCallbackTelemetria(): void {
    SessaoGateway.telemetriaCallback = undefined;
  }

  /**
   * Validates lightweight telemetry payload schema according to Contract 3.
   *
   * @param socket - Client socket sending the event.
   * @param payloadRaw - Raw data received via WebSocket.
   */
  validarPayloadTelemetria(socket: Socket, payloadRaw: unknown): ResultadoValidacaoTelemetria {
    if (!payloadRaw || typeof payloadRaw !== 'object' || Array.isArray(payloadRaw)) {
      return {
        valido: false,
        erro: 'O payload de telemetria deve ser um objeto JSON válido',
        codigo: 'FORMATO_INVALIDO'
      };
    }

    const payload = payloadRaw as Record<string, unknown>;

    // Extração e consistência do session_token
    const tokenInformado = (payload.session_token || payload.token_sessao) as string | undefined;
    const tokenSocket = socket.data.sessionToken as string | undefined;

    let tokenFinal: string;

    if (tokenInformado && typeof tokenInformado === 'string' && tokenInformado.trim()) {
      tokenFinal = this.normalizarToken(tokenInformado);
      if (tokenSocket && tokenSocket !== tokenFinal) {
        return {
          valido: false,
          erro: 'O token informado no payload diverge do token da conexão socket ativa',
          codigo: 'TOKEN_DIVERGENTE'
        };
      }
    } else if (tokenSocket) {
      tokenFinal = tokenSocket;
    } else {
      return {
        valido: false,
        erro: 'Token de sessão não identificado para este evento de telemetria',
        codigo: 'TOKEN_AUSENTE'
      };
    }

    // Validação de tipo_evento
    if (typeof payload.tipo_evento !== 'string' || !payload.tipo_evento.trim()) {
      return {
        valido: false,
        erro: 'Campo obrigatório "tipo_evento" deve ser uma string não vazia',
        codigo: 'TIPO_EVENTO_INVALIDO'
      };
    }

    // Validação de dados (id_metrica e valor)
    if (!payload.dados || typeof payload.dados !== 'object' || Array.isArray(payload.dados)) {
      return {
        valido: false,
        erro: 'Campo obrigatório "dados" deve ser um objeto contendo id_metrica e valor',
        codigo: 'DADOS_INVALIDOS'
      };
    }

    const dados = payload.dados as Record<string, unknown>;
    if (typeof dados.id_metrica !== 'string' || !dados.id_metrica.trim()) {
      return {
        valido: false,
        erro: 'Campo obrigatório "dados.id_metrica" deve ser uma string não vazia',
        codigo: 'METRICA_INVALIDA'
      };
    }

    const tipoValor = typeof dados.valor;
    if (tipoValor !== 'number' && tipoValor !== 'string' && tipoValor !== 'boolean') {
      return {
        valido: false,
        erro: 'Campo obrigatório "dados.valor" deve ser um tipo primitivo válido (número, texto ou booleano)',
        codigo: 'VALOR_INVALIDO'
      };
    }

    const agora = new Date().toISOString();
    const dataHora = typeof payload.data_hora === 'string' && payload.data_hora.trim()
      ? payload.data_hora.trim()
      : typeof payload.timestamp === 'string' && payload.timestamp.trim()
        ? payload.timestamp.trim()
        : agora;

    const eventoNormalizado: TelemetriaEventoNormalizado = {
      session_token: tokenFinal,
      data_hora: dataHora,
      tipo_evento: payload.tipo_evento.trim(),
      dados: {
        ...(dados as TelemetriaDadosPayload),
        id_metrica: dados.id_metrica.trim(),
        valor: dados.valor as number | string | boolean
      },
      recebido_em: agora,
      origem_socket_id: socket.id
    };

    return {
      valido: true,
      eventoNormalizado
    };
  }

  /**
   * Processes telemetry event received from remote game (Card 2.1).
   * Validates against lightweight schema and broadcasts to session room in real time.
   */
  public lidarTelemetria(
    socket: Socket,
    payloadRaw: unknown,
    ack?: (resposta: { sucesso: boolean; erro?: string; codigo?: string; timestamp?: string }) => void
  ): void {
    const validacao = this.validarPayloadTelemetria(socket, payloadRaw);

    if (!validacao.valido || !validacao.eventoNormalizado) {
      const erroResposta = {
        sucesso: false,
        error: validacao.erro || 'Payload de telemetria inválido',
        codigo: validacao.codigo || 'PAYLOAD_INVALIDO'
      };

      socket.emit('erro_telemetria', erroResposta);
      if (typeof ack === 'function') {
        ack({ sucesso: false, erro: erroResposta.error, codigo: erroResposta.codigo });
      }
      return;
    }

    const evento = validacao.eventoNormalizado;
    const sala = `session_${evento.session_token}`;

    // Roteia instantaneamente (<100ms) para todos os outros clientes na sala da sessão
    socket.to(sala).emit('sessao:telemetria', evento);
    socket.to(sala).emit('telemetria_recebida', evento);

    // Emite também no outro namespace para que ouvintes em / ou /sessao recebam
    if (socket.nsp?.name === '/sessao') {
      this.emitirGlobal(sala, 'sessao:telemetria', evento);
      this.emitirGlobal(sala, 'telemetria_recebida', evento);
    } else {
      this.sessaoNamespace.to(sala).emit('sessao:telemetria', evento);
      this.sessaoNamespace.to(sala).emit('telemetria_recebida', evento);
    }

    // Retorna confirmação (ack) imediata ao transmissor se solicitada
    if (typeof ack === 'function') {
      ack({ sucesso: true, timestamp: evento.recebido_em });
    }

    // Invocação assíncrona desacoplada do callback de persistência (Card 1.2 no Dia 4)
    if (SessaoGateway.telemetriaCallback) {
      try {
        const resultado = SessaoGateway.telemetriaCallback(evento.session_token, evento);
        if (resultado instanceof Promise) {
          resultado.catch((err: unknown) => {
            console.error('[SessaoGateway] Erro assíncrono ao persistir telemetria:', err);
          });
        }
      } catch (err: unknown) {
        console.error('[SessaoGateway] Erro no callback de persistência de telemetria:', err);
      }
    }
  }

  /**
   * Directly dispatches telemetry event to session room (useful for testing and injection).
   */
  notificarTelemetria(sessionToken: string, evento: TelemetriaEventoNormalizado): void {
    const tokenNormalizado = this.normalizarToken(sessionToken);
    const sala = `session_${tokenNormalizado}`;
    this.sessaoNamespace.to(sala).emit('sessao:telemetria', evento);
    this.sessaoNamespace.to(sala).emit('telemetria_recebida', evento);
    this.io.to(sala).emit('sessao:telemetria', evento);
    this.io.to(sala).emit('telemetria_recebida', evento);
  }

  /**
   * Validates clinical command sent by therapist (Card 2.2 / RF13 / RF21).
   *
   * @param socket - Emitting client socket.
   * @param payloadRaw - Raw command data.
   */
  validarComandoClinico(socket: Socket, payloadRaw: unknown): ResultadoValidacaoComando {
    if (!payloadRaw || typeof payloadRaw !== 'object' || Array.isArray(payloadRaw)) {
      return {
        valido: false,
        erro: 'Payload de comando deve ser um objeto JSON válido',
        codigo: 'FORMATO_INVALIDO'
      };
    }

    const payload = payloadRaw as Record<string, unknown>;

    // Extração e validação do session_token (suporta session_token, token_sessao e sessionToken)
    const tokenInformado = (payload.session_token || payload.token_sessao || payload.sessionToken) as string | undefined;
    const tokenSocket = socket.data.sessionToken as string | undefined;

    let tokenFinal: string;

    if (tokenInformado && typeof tokenInformado === 'string' && tokenInformado.trim()) {
      tokenFinal = this.normalizarToken(tokenInformado);
      if (tokenSocket && tokenSocket !== tokenFinal) {
        return {
          valido: false,
          erro: 'O token informado no comando diverge do token da sessão ativa',
          codigo: 'TOKEN_DIVERGENTE'
        };
      }
    } else if (tokenSocket) {
      tokenFinal = tokenSocket;
    } else {
      return {
        valido: false,
        erro: 'Token de sessão não identificado para envio do comando',
        codigo: 'TOKEN_AUSENTE'
      };
    }

    // Permissão: dispositivo remoto do paciente não pode emitir comandos clínicos
    if (socket.data.role === 'dispositivo') {
      return {
        valido: false,
        erro: 'Dispositivos remotos não possuem autorização para emitir comandos clínicos',
        codigo: 'PERMISSAO_NEGADA'
      };
    }

    // Permissão: observadores da equipe multidisciplinar possuem acesso exclusivamente de leitura (RF18, RF21)
    if (socket.data.role === 'observador_equipe') {
      return {
        valido: false,
        erro: 'Observadores da equipe possuem acesso exclusivamente de leitura e não possuem autorização para emitir comandos clínicos',
        codigo: 'PERMISSAO_NEGADA',
        codigoDetalhado: 'PERMISSAO_NEGADA_OBSERVADOR'
      };
    }

    // Validação e normalização do tipo de comando (suporta nomes canônicos e aliases do frontend)
    const comandoBruto = (payload.tipo_comando || payload.comando || payload.acao || payload.tipo) as string | undefined;

    const MAPA_ALIAS_COMANDOS: Record<string, TipoComandoClinico> = {
      pausar_jogo: 'pausar_jogo',
      pausar: 'pausar_jogo',
      retomar_jogo: 'retomar_jogo',
      retomar: 'retomar_jogo',
      ajustar_dificuldade_dda: 'ajustar_dificuldade_dda',
      ajustar_dda: 'ajustar_dificuldade_dda',
      solicitar_encerramento: 'solicitar_encerramento',
      finalizar: 'solicitar_encerramento',
    };

    const COMANDOS_VALIDOS: readonly TipoComandoClinico[] = [
      'pausar_jogo',
      'retomar_jogo',
      'ajustar_dificuldade_dda',
      'solicitar_encerramento'
    ];

    const comandoIdentificado = comandoBruto ? MAPA_ALIAS_COMANDOS[comandoBruto] : undefined;

    if (!comandoIdentificado) {
      return {
        valido: false,
        erro: `Tipo de comando inválido. Comandos suportados: ${COMANDOS_VALIDOS.join(', ')}`,
        codigo: 'COMANDO_INVALIDO'
      };
    }

    // Validação do status da sessão / conectividade do dispositivo (Critério de Aceite Card 2.2)
    const presenca = this.presencas.get(tokenFinal);
    if (!presenca || !presenca.conectado) {
      return {
        valido: false,
        erro: 'Dispositivo remoto desconectado ou não pareado para receber comandos clínicos',
        codigo: 'DISPOSITIVO_OFFLINE'
      };
    }

    // Validação opcional de parâmetros
    let parametros: Record<string, unknown> | undefined;
    if (payload.parametros !== undefined) {
      if (typeof payload.parametros !== 'object' || payload.parametros === null || Array.isArray(payload.parametros)) {
        return {
          valido: false,
          erro: 'O campo "parametros" deve ser um objeto JSON válido quando informado',
          codigo: 'PARAMETROS_INVALIDOS'
        };
      }
      const rawParametros = payload.parametros as Record<string, unknown>;
      parametros = { ...rawParametros };
      // Mapeamento de conveniência: nivelDda -> novo_nivel
      if (parametros.nivelDda !== undefined && parametros.novo_nivel === undefined) {
        parametros.novo_nivel = parametros.nivelDda;
      }
    }

    const comandoNormalizado: ComandoClinicoEventoNormalizado = {
      session_token: tokenFinal,
      tipo_comando: comandoIdentificado,
      parametros,
      timestamp: new Date().toISOString(),
      emitido_por: socket.id
    };

    return {
      valido: true,
      comandoNormalizado
    };
  }

  /**
   * Processes bidirectional command channel from therapist to game (Card 2.2).
   *
   * @param socket - Client socket.
   * @param payloadRaw - Sent command data.
   * @param ack - Optional confirmation callback for therapist.
   */
  public lidarComandoClinico(
    socket: Socket,
    payloadRaw: unknown,
    ack?: (resposta: RespostaComandoAck) => void
  ): void {
    const validacao = this.validarComandoClinico(socket, payloadRaw);

    if (!validacao.valido || !validacao.comandoNormalizado) {
      const erroResposta: RespostaComandoAck = {
        sucesso: false,
        erro: validacao.erro || 'Falha ao processar comando clínico',
        codigo: validacao.codigo || 'COMANDO_REJEITADO',
        codigo_detalhado: validacao.codigoDetalhado
      };

      socket.emit('erro_comando', erroResposta);
      if (typeof ack === 'function') {
        ack(erroResposta);
      }
      return;
    }

    const comando = validacao.comandoNormalizado;
    const sala = `session_${comando.session_token}`;

    // Despacha o comando imediatamente ao jogo remoto conectado na sala
    socket.to(sala).emit('sessao:comando', comando);
    socket.to(sala).emit('comando_jogo', comando);

    if (socket.nsp?.name === '/sessao') {
      this.emitirGlobal(sala, 'sessao:comando', comando);
      this.emitirGlobal(sala, 'comando_jogo', comando);
    } else {
      this.sessaoNamespace.to(sala).emit('sessao:comando', comando);
      this.sessaoNamespace.to(sala).emit('comando_jogo', comando);
    }

    // Retorna ack de confirmação imediata à interface web do terapeuta
    if (typeof ack === 'function') {
      ack({
        sucesso: true,
        comando: comando.tipo_comando,
        timestamp: comando.timestamp
      });
    }
  }

  /**
   * Programmatically emits a command to the session room.
   */
  notificarComando(sessionToken: string, comando: ComandoClinicoEventoNormalizado): void {
    const tokenNormalizado = this.normalizarToken(sessionToken);
    const sala = `session_${tokenNormalizado}`;
    this.sessaoNamespace.to(sala).emit('sessao:comando', comando);
    this.sessaoNamespace.to(sala).emit('comando_jogo', comando);
    this.emitirGlobal(sala, 'sessao:comando', comando);
    this.emitirGlobal(sala, 'comando_jogo', comando);
  }

  /**
   * Returns session reconnection manager.
   */
  obterReconnectionManager(): SessaoReconnectionManager {
    return this.reconnectionManager;
  }

  /**
   * Returns event rate limiter instance (Card 2.4).
   */
  obterRateLimiter(): SocketRateLimiter {
    return this.rateLimiter;
  }

  /**
   * Notifies session room that tolerance window expired and session was interrupted (Card 2.3).
   * Persists 'interrompida_por_queda' status in database and records audit trail.
   */
  async notificarSessaoInterrompidaPorQueda(sessionToken: string, evento: EventoSessaoInterrompida): Promise<void> {
    const tokenNormalizado = this.normalizarToken(sessionToken);
    const sala = `session_${tokenNormalizado}`;
    const presenca = this.presencas.get(tokenNormalizado);
    if (presenca) {
      presenca.conectado = false;
      presenca.desconectado_em = evento.interrompida_em;
    }
    this.sessaoNamespace.to(sala).emit('sessao_interrompida', evento);
    this.sessaoNamespace.to(sala).emit('sessao:interrompida', evento);
    this.emitirGlobal(sala, 'sessao_interrompida', evento);
    this.emitirGlobal(sala, 'sessao:interrompida', evento);

    try {
      const sessao = await SessaoModel.buscarPorToken(tokenNormalizado);
      if (sessao) {
        await SessaoModel.atualizarStatus(sessao.id, STATUS_SESSAO.INTERROMPIDA_POR_QUEDA);
        await AuditoriaService.registrarSilencioso({
          sessao_id: sessao.id,
          terapeuta_id: sessao.terapeuta_id,
          origem: 'dispositivo_jogo',
          acao: 'interrompida_por_queda',
          detalhes_json: {
            session_token: tokenNormalizado,
            tempo_offline_total_ms: evento.tempo_offline_total_ms,
            motivo: evento.motivo,
            interrompida_em: evento.interrompida_em,
          },
        });
      }
    } catch (err) {
      console.error('[SessaoGateway] Falha ao persistir status de interrupção por queda:', err);
    }
  }

  /**
   * Returns socket IDs currently present in a session room.
   *
   * @param sessionToken - Session PIN code.
   */
  async obterSocketsNaSala(sessionToken: string): Promise<string[]> {
    const tokenNormalizado = this.normalizarToken(sessionToken);
    const sala = `session_${tokenNormalizado}`;
    const socketsSessao = await this.sessaoNamespace.in(sala).fetchSockets();
    const socketsIo = (this.io && typeof (this.io as { in?: unknown }).in === 'function')
      ? await this.io.in(sala).fetchSockets()
      : [];
    const allSockets = [...socketsSessao, ...socketsIo];
    return Array.from(new Set(allSockets.map((s) => s.id)));
  }

  /**
   * Normalizes alphanumeric token removing formatting to maintain room consistency.
   */
  private normalizarToken(token: string): string {
    return token.trim().toUpperCase();
  }
}
