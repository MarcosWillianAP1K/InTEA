import { describe, it, expect, beforeEach } from 'vitest';
import express, { Express } from 'express';
import { sessaoRoutes } from '../routes/sessao.routes.js';
import { SessaoModel } from '../models/sessao.model.js';
import { SessaoController } from '../controllers/sessao.controller.js';
import { ParearSessaoDTO } from '../dtos/sessao.dto.js';

describe('Card 2.1 - Handshake de Pareamento Remoto (/api/sessao/parear)', () => {
  let app: Express;

  beforeEach(() => {
    SessaoModel.resetarMock();
    app = express();
    app.use(express.json());
    app.use('/api/sessao', sessaoRoutes);
  });

  // Helper simples para disparar requisições contra o app Express sem depender de libs externas pesadas
  async function makeRequest(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<{ status: number; body: any }> {
    return new Promise((resolve) => {
      const server = app.listen(0, async () => {
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 3000;
        const url = `http://localhost:${port}${path}`;

        try {
          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined
          });

          const json = await res.json();
          server.close(() => resolve({ status: res.status, body: json }));
        } catch {
          server.close(() => resolve({ status: 500, body: {} }));
        }
      });
    });
  }

  it('deve parear com sucesso um dispositivo remoto com token válido formatado ("849-291")', async () => {
    const payload: ParearSessaoDTO = {
      session_token: '849-291',
      dispositivo_info: {
        tipo_dispositivo: 'tablet',
        modelo: 'iPad 10th Gen',
        sistema_operacional: 'iPadOS 17.4',
        resolucao: '2160x1620',
        versao_jogo: '1.2.0',
        identificador_dispositivo: 'device-test-001'
      }
    };

    const res = await makeRequest('POST', '/api/sessao/parear', payload);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Dispositivo pareado com sucesso');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.session_token).toBe('849-291');
    expect(res.body.data.status_sessao).toBe('em_andamento');
    expect(res.body.data.modo_sessao).toBe('sessao_clinica');
    expect(res.body.data.jogo).toBeDefined();
    expect(res.body.data.jogo.nome).toBe('Aventura das Cores');
    expect(res.body.data.contexto_dda).toBeDefined();
    expect(res.body.data.contexto_dda.objetivo_clinico).toBe('Foco Atencional');
    expect(res.body.data.websocket).toBeDefined();
    expect(res.body.data.websocket.canal).toBe('session_849-291');
    expect(res.body.data.pareado_em).toBeDefined();
  });

  it('deve aceitar e normalizar token sem hífen digitado pelo jogador ("849291")', async () => {
    const payload: ParearSessaoDTO = {
      session_token: '849291'
    };

    const res = await makeRequest('POST', '/api/sessao/parear', payload);

    expect(res.status).toBe(200);
    expect(res.body.data.session_token).toBe('849-291');
    expect(res.body.data.status_sessao).toBe('em_andamento');
  });

  it('deve rejeitar com 400 Bad Request se session_token não for informado', async () => {
    const res = await makeRequest('POST', '/api/sessao/parear', {});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Parâmetro obrigatório ausente ou inválido');
  });

  it('deve rejeitar com 400 Bad Request se session_token for vazio ou apenas espaços', async () => {
    const res = await makeRequest('POST', '/api/sessao/parear', { session_token: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Parâmetro obrigatório ausente ou inválido');
  });

  it('deve rejeitar com 404 Not Found se session_token for inexistente', async () => {
    const res = await makeRequest('POST', '/api/sessao/parear', { session_token: '999-999' });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Sessão não encontrada');
  });

  it('deve rejeitar com 410 Gone se o token de pareamento estiver expirado (RNF03)', async () => {
    const res = await makeRequest('POST', '/api/sessao/parear', { session_token: 'EXP-001' });

    expect(res.status).toBe(410);
    expect(res.body.error).toContain('Token de pareamento expirado');
    expect(res.body.expirado_em).toBeDefined();
  });

  it('deve rejeitar com 409 Conflict se a sessão já estiver em andamento/pareada', async () => {
    const res = await makeRequest('POST', '/api/sessao/parear', { session_token: 'AND-002' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Sessão já pareada ou em andamento');
  });

  it('deve rejeitar com 410 Gone se a sessão já estiver finalizada', async () => {
    const res = await makeRequest('POST', '/api/sessao/parear', { session_token: 'FIN-003' });

    expect(res.status).toBe(410);
    expect(res.body.error).toContain('Sessão já finalizada');
  });

  it('deve rejeitar com 410 Gone se a sessão foi cancelada pelo terapeuta', async () => {
    const res = await makeRequest('POST', '/api/sessao/parear', { session_token: 'CNC-004' });

    expect(res.status).toBe(410);
    expect(res.body.error).toContain('Sessão cancelada');
  });

  it('deve disparar o listener reativo de pareamento quando registrado (preparação Card 2.2)', async () => {
    let eventoRecebido: { token: string; sessaoId: string } | null = null;

    SessaoController.registrarListenerPareamento((token, dados) => {
      eventoRecebido = { token, sessaoId: dados.sessao_id };
    });

    const payload: ParearSessaoDTO = {
      session_token: '849-291'
    };

    const res = await makeRequest('POST', '/api/sessao/parear', payload);

    expect(res.status).toBe(200);
    expect(eventoRecebido).not.toBeNull();
    const evento = eventoRecebido as unknown as { token: string; sessaoId: string };
    expect(evento.token).toBe('849-291');
  });

  it('deve consultar o status atual da sessão via GET /api/sessao/:token/status', async () => {
    const res = await makeRequest('GET', '/api/sessao/849-291/status');

    expect(res.status).toBe(200);
    expect(res.body.data.session_token).toBe('849-291');
    expect(res.body.data.status_sessao).toBe('aguardando_conexao');
  });

  it('deve retornar 404 ao consultar status de token inexistente', async () => {
    const res = await makeRequest('GET', '/api/sessao/INEXISTENTE/status');

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Sessão não encontrada');
  });
});
