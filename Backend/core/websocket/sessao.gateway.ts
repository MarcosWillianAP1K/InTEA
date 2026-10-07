import { Server as SocketIOServer, Socket, Namespace } from 'socket.io';
import { SessaoController } from '../../api/sessao/controllers/sessao.controller.js';
import {
  SessaoReconnectionManager,
  EventoAdvertenciaDesconexao,
  EventoSessaoInterrompida
} from './sessao.reconnection.js';
import { SocketRateLimiter } from './socket.limiter.js';

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
  tipo_comando?: TipoComandoClinico | string;
  comando?: TipoComandoClinico | string;
  acao?: TipoComandoClinico | string;
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
}

export interface ResultadoValidacaoComando {
  valido: boolean;
  erro?: string;
  codigo?: string;
  comandoNormalizado?: ComandoClinicoEventoNormalizado;
}

export class SessaoGateway {
  private static instance?: SessaoGateway;
  private static telemetriaCallback?: TelemetriaPersistenciaCallback;
  private io: SocketIOServer;
  private sessaoNamespace: Namespace;
  private presencas: Map<string, DispositivoPresenca> = new Map();
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
    this.reconnectionManager.limparTodos();
    this.rateLimiter.limparTodos();
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

      // 6. Detecção de perda de conexão / fechamento de janela
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

      const alerta = this.reconnectionManager.registrarDesconexao(token, motivo, (eventoInterrupcao) => {
        this.notificarSessaoInterrompidaPorQueda(token, eventoInterrupcao);
      });

      this.sessaoNamespace.to(sala).emit('dispositivo_desconectado', evento);
      this.sessaoNamespace.to(sala).emit('sessao:alerta_conexao', alerta);
    }

    // Limpa rastreio de taxa do socket desconectado (Card 2.4)
    this.rateLimiter.removerIdentificador(socket.id);
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
   * Registra um callback para ingestão / persistência assíncrona de telemetria (integrado no Dia 4 com Card 1.2).
   */
  static registrarCallbackTelemetria(callback: TelemetriaPersistenciaCallback): void {
    SessaoGateway.telemetriaCallback = callback;
  }

  /**
   * Remove o callback de persistência de telemetria registrado.
   */
  static removerCallbackTelemetria(): void {
    SessaoGateway.telemetriaCallback = undefined;
  }

  /**
   * Valida o schema leve do payload de telemetria conforme o Contrato 3.
   *
   * @param socket - Socket do cliente que enviou o evento.
   * @param payloadRaw - Dados brutos recebidos via WebSocket.
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
   * Processa o evento de telemetria recebido do jogo remoto (Card 2.1).
   * Valida com schema leve e despacha em tempo real para a sala da sessão.
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
   * Despacha diretamente um evento de telemetria para a sala (útil para injeções ou testes).
   */
  notificarTelemetria(sessionToken: string, evento: TelemetriaEventoNormalizado): void {
    const tokenNormalizado = this.normalizarToken(sessionToken);
    const sala = `session_${tokenNormalizado}`;
    this.sessaoNamespace.to(sala).emit('sessao:telemetria', evento);
    this.sessaoNamespace.to(sala).emit('telemetria_recebida', evento);
  }

  /**
   * Valida o comando clínico enviado pelo terapeuta (Card 2.2 / RF13 / RF21).
   *
   * @param socket - Socket do cliente emissor.
   * @param payloadRaw - Dados brutos do comando.
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

    // Extração e validação do session_token
    const tokenInformado = (payload.session_token || payload.token_sessao) as string | undefined;
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

    // Validação do tipo de comando
    const comandoIdentificado = (payload.tipo_comando || payload.comando || payload.acao) as string | undefined;
    const COMANDOS_VALIDOS: readonly TipoComandoClinico[] = [
      'pausar_jogo',
      'retomar_jogo',
      'ajustar_dificuldade_dda',
      'solicitar_encerramento'
    ];

    if (!comandoIdentificado || !COMANDOS_VALIDOS.includes(comandoIdentificado as TipoComandoClinico)) {
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
      parametros = payload.parametros as Record<string, unknown>;
    }

    const comandoNormalizado: ComandoClinicoEventoNormalizado = {
      session_token: tokenFinal,
      tipo_comando: comandoIdentificado as TipoComandoClinico,
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
   * Processa o canal de comandos bidirecional do terapeuta para o jogo (Card 2.2).
   *
   * @param socket - Socket do cliente.
   * @param payloadRaw - Dados do comando enviado.
   * @param ack - Callback opcional de confirmação para o terapeuta.
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
        codigo: validacao.codigo || 'COMANDO_REJEITADO'
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
   * Emite programaticamente um comando para a sala da sessão.
   */
  notificarComando(sessionToken: string, comando: ComandoClinicoEventoNormalizado): void {
    const tokenNormalizado = this.normalizarToken(sessionToken);
    const sala = `session_${tokenNormalizado}`;
    this.sessaoNamespace.to(sala).emit('sessao:comando', comando);
    this.sessaoNamespace.to(sala).emit('comando_jogo', comando);
  }

  /**
   * Retorna o gerenciador de reconexão de sessão.
   */
  obterReconnectionManager(): SessaoReconnectionManager {
    return this.reconnectionManager;
  }

  /**
   * Retorna o gerenciador de taxa de eventos (Card 2.4).
   */
  obterRateLimiter(): SocketRateLimiter {
    return this.rateLimiter;
  }

  /**
   * Notifica a sala da sessão que a tolerância expirou e a sessão foi interrompida (Card 2.3).
   */
  notificarSessaoInterrompidaPorQueda(sessionToken: string, evento: EventoSessaoInterrompida): void {
    const tokenNormalizado = this.normalizarToken(sessionToken);
    const sala = `session_${tokenNormalizado}`;
    const presenca = this.presencas.get(tokenNormalizado);
    if (presenca) {
      presenca.conectado = false;
      presenca.desconectado_em = evento.interrompida_em;
    }
    this.sessaoNamespace.to(sala).emit('sessao_interrompida', evento);
    this.sessaoNamespace.to(sala).emit('sessao:interrompida', evento);
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
