import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import express, { Express } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { SocketRateLimiter, ResultadoRateLimit } from '../websocket/socket.limiter.js';
import { SessaoGateway, TelemetriaEventoNormalizado } from '../websocket/sessao.gateway.js';

describe('Card 2.4 - Rate Limiting e Prevenção de Flood no WebSocket', () => {
  describe('Unidade: SocketRateLimiter', () => {
    let limiter: SocketRateLimiter;

    beforeEach(() => {
      limiter = new SocketRateLimiter({
        maxEventosPorJanela: 5,
        janelaMs: 100
      });
    });

    afterEach(() => {
      limiter.limparTodos();
    });

    it('deve permitir eventos dentro do limite configurado', () => {
      for (let i = 1; i <= 5; i++) {
        const resultado: ResultadoRateLimit = limiter.verificarLimite('socket_1', 'telemetria');
        expect(resultado.permitido).toBe(true);
        expect(resultado.totalEventosNaJanela).toBe(i);
        expect(resultado.limiteMaximo).toBe(5);
      }
    });

    it('deve bloquear eventos quando a taxa máxima for excedida', () => {
      // 5 permitidos
      for (let i = 0; i < 5; i++) {
        limiter.verificarLimite('socket_1', 'telemetria');
      }

      // 6º bloqueado
      const resultadoBloqueado = limiter.verificarLimite('socket_1', 'telemetria');
      expect(resultadoBloqueado.permitido).toBe(false);
      expect(resultadoBloqueado.codigo).toBe('RATE_LIMIT_EXCEDIDO');
      expect(resultadoBloqueado.mensagem).toContain('5 eventos por segundo');
      expect(resultadoBloqueado.tempoRestanteMs).toBeGreaterThanOrEqual(0);
    });

    it('deve permitir novos eventos após o tempo da janela expirar (janela deslizante)', async () => {
      for (let i = 0; i < 5; i++) {
        limiter.verificarLimite('socket_1', 'telemetria');
      }

      expect(limiter.verificarLimite('socket_1', 'telemetria').permitido).toBe(false);

      // Aguarda expirar a janela de 100ms
      await new Promise((r) => setTimeout(r, 110));

      const novoResultado = limiter.verificarLimite('socket_1', 'telemetria');
      expect(novoResultado.permitido).toBe(true);
    });

    it('deve manter limites independentes por socket sem interferência cruzada', () => {
      for (let i = 0; i < 5; i++) {
        limiter.verificarLimite('socket_A', 'telemetria');
      }

      // Socket A esgotou o limite
      expect(limiter.verificarLimite('socket_A', 'telemetria').permitido).toBe(false);

      // Socket B continua com limite livre
      expect(limiter.verificarLimite('socket_B', 'telemetria').permitido).toBe(true);
    });

    it('deve limpar registros de um socket desconectado', () => {
      limiter.verificarLimite('socket_1', 'telemetria');
      limiter.removerIdentificador('socket_1');

      // Após remoção, o contador reinicia
      const res = limiter.verificarLimite('socket_1', 'telemetria');
      expect(res.totalEventosNaJanela).toBe(1);
    });
  });

  describe('Integração WebSocket: Prevenção de Flood em Rajada no SessaoGateway', () => {
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
      // Configura limite de teste: máximo de 4 eventos de telemetria por janela de 150ms
      gateway.obterRateLimiter().configurar({
        maxEventosPorJanela: 4,
        janelaMs: 150
      });
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

    it('deve descartar pacotes excedentes de rajada e emitir erro_rate_limit ao transmissor', async () => {
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

      let eventosRecebidosPeloTerapeuta = 0;
      terapeutaSocket.on('sessao:telemetria', () => {
        eventosRecebidosPeloTerapeuta++;
      });

      const errosRateLimit: Array<{ codigo: string; limite_por_segundo: number }> = [];
      dispositivoSocket.on('erro_rate_limit', (err: { codigo: string; limite_por_segundo: number }) => {
        errosRateLimit.push(err);
      });

      // Dispara rajada (burst) de 10 eventos em sequência imediata
      for (let i = 1; i <= 10; i++) {
        dispositivoSocket.emit('sessao:telemetria', {
          token_sessao: '849-291',
          tipo_evento: 'interacao_paciente',
          dados: { id_metrica: 'rajada', valor: i }
        });
      }

      // Aguarda propagação na rede local
      await new Promise((r) => setTimeout(r, 60));

      // Exatamente 4 eventos permitidos passaram e chegaram ao terapeuta
      expect(eventosRecebidosPeloTerapeuta).toBe(4);

      // Os outros 6 foram bloqueados pelo rate limiter
      expect(errosRateLimit.length).toBe(6);
      expect(errosRateLimit[0]?.codigo).toBe('RATE_LIMIT_EXCEDIDO');
      expect(errosRateLimit[0]?.limite_por_segundo).toBe(4);

      terapeutaSocket.disconnect();
      dispositivoSocket.disconnect();
    });

    it('deve rejeitar confirmação ack quando a taxa for ultrapassada', async () => {
      const dispositivoSocket = await createClientSocket();

      await new Promise<void>((resolve) => {
        dispositivoSocket.emit('entrar_sessao', { session_token: '849-291', role: 'dispositivo' });
        dispositivoSocket.on('sessao_conectada', () => resolve());
      });

      // Esgota os 4 eventos da janela
      for (let i = 1; i <= 4; i++) {
        dispositivoSocket.emit('sessao:telemetria', {
          token_sessao: '849-291',
          tipo_evento: 'interacao_paciente',
          dados: { id_metrica: 'contagem', valor: i }
        });
      }

      // O 5º evento com ack callback deve receber resposta imediata de rejeição
      const ackResposta = await new Promise<{ sucesso: boolean; codigo?: string }>((resolve) => {
        dispositivoSocket.emit(
          'sessao:telemetria',
          {
            token_sessao: '849-291',
            tipo_evento: 'interacao_paciente',
            dados: { id_metrica: 'contagem', valor: 5 }
          },
          (res: { sucesso: boolean; codigo?: string }) => resolve(res)
        );
      });

      expect(ackResposta.sucesso).toBe(false);
      expect(ackResposta.codigo).toBe('RATE_LIMIT_EXCEDIDO');

      dispositivoSocket.disconnect();
    });
  });
});
