// ==============================================================================
// InTEA: Testes Básicos de Inicialização e Serviços da Feature Sessão
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { sessaoRoutes } from '../routes/sessao.routes.js';
import { SessaoTokenService } from '../services/sessao-token.service.js';
import { SessaoModel } from '../models/sessao.model.js';

// Helper para criar mocks de request/response de forma padronizada
function criarMocks(body: Record<string, unknown> = {}, params: Record<string, string> = {}) {
  let statusCode = 200;
  let jsonResult: unknown = null;

  const mockReq = { body, params } as unknown as import('express').Request;
  const mockRes = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: unknown) {
      jsonResult = data;
      return this;
    },
  } as unknown as import('express').Response;

  return { mockReq, mockRes, getStatus: () => statusCode, getJson: () => jsonResult };
}

describe('Feature Sessão - Estrutura e Serviços Base', () => {
  it('deve exportar as rotas de sessão corretamente', () => {
    expect(sessaoRoutes).toBeDefined();
  });

  it('deve gerar código de pareamento no formato alfanumérico XXXX-XXXX', () => {
    const token = SessaoTokenService.gerarCodigoPareamento();
    expect(token).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  });

  it('deve expor métodos estáticos do SessaoModel', () => {
    expect(typeof SessaoModel.criar).toBe('function');
    expect(typeof SessaoModel.buscarPorId).toBe('function');
    expect(typeof SessaoModel.buscarPorToken).toBe('function');
    expect(typeof SessaoModel.atualizarStatus).toBe('function');
    expect(typeof SessaoModel.finalizarSessao).toBe('function');
  });

  it('deve expor métodos cancelar e parear no SessaoController', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    expect(typeof SessaoController.cancelar).toBe('function');
    expect(typeof SessaoController.parear).toBe('function');
  });

  it('deve responder com o código de pareamento no formato XXXX-XXXX via controller', async () => {
    const originalBuscar = SessaoModel.buscarPorToken;
    SessaoModel.buscarPorToken = async () => null; // Mock: simula que o código está livre no banco (sem chamada de rede)

    const { mockReq, mockRes, getStatus, getJson } = criarMocks();

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.gerarCodigoPareamento(mockReq, mockRes);

    SessaoModel.buscarPorToken = originalBuscar;

    expect(getStatus()).toBe(200);
    expect(getJson()).toBeDefined();
    expect((getJson() as { codigo: string }).codigo).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  });

  it('deve tentar gerar outro código caso ocorra colisão no banco de dados', async () => {
    const originalBuscar = SessaoModel.buscarPorToken;
    let chamadas = 0;

    // Simula 1 colisão seguida de sucesso
    // @ts-expect-error — mock temporário para teste unitário
    SessaoModel.buscarPorToken = async () => {
      chamadas++;
      if (chamadas === 1) {
        return { id: 'sessao-existente' };
      }
      return null;
    };

    const { mockReq, mockRes, getStatus, getJson } = criarMocks();

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.gerarCodigoPareamento(mockReq, mockRes);

    SessaoModel.buscarPorToken = originalBuscar;

    expect(getStatus()).toBe(200);
    expect(chamadas).toBe(2);
    expect((getJson() as { codigo: string }).codigo).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  });
});

// =============================================================================
// atualizarStatus — validações de entrada
// =============================================================================
describe('SessaoController.atualizarStatus', () => {
  it('deve rejeitar quando o campo status estiver ausente', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { id: 'sessao-123' });

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.atualizarStatus(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('obrigatório');
  });

  it('deve rejeitar status com valor fora dos permitidos', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({ status: 'status_inventado' }, { id: 'sessao-123' });

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.atualizarStatus(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('inválido');
  });
});

// =============================================================================
// iniciar — validações de entrada e regras RN01
// =============================================================================
describe('SessaoController.iniciar', () => {
  it('deve rejeitar sem terapeuta_id ou jogo_id', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      terapeuta_id: 'terapeuta-1',
      codigo_pareamento: '4M5S-8U7B',
    });

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.iniciar(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('obrigatórios');
  });

  it('deve rejeitar sem codigo_pareamento', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      terapeuta_id: 'terapeuta-1',
      jogo_id: 'jogo-1',
      paciente_id: 'paciente-1',
    });

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.iniciar(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('codigo_pareamento');
  });

  it('deve rejeitar modo_sessao inválido', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      terapeuta_id: 'terapeuta-1',
      jogo_id: 'jogo-1',
      codigo_pareamento: '4M5S-8U7B',
      modo_sessao: 'modo_inexistente',
    });

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.iniciar(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('Modo de sessão inválido');
  });

  it('deve rejeitar sessão clínica sem paciente_id (RN01)', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      terapeuta_id: 'terapeuta-1',
      jogo_id: 'jogo-1',
      codigo_pareamento: '4M5S-8U7B',
      modo_sessao: 'sessao_clinica',
      paciente_id: null,
    });

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.iniciar(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('RN01');
  });

  it('deve rejeitar modo livre com paciente_id vinculado (RN01)', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      terapeuta_id: 'terapeuta-1',
      jogo_id: 'jogo-1',
      codigo_pareamento: '4M5S-8U7B',
      modo_sessao: 'modo_livre',
      paciente_id: 'paciente-123',
    });

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.iniciar(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('RN01');
  });

  it('deve permitir iniciar sessão com dados válidos', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalCriar = SessaoModel.criar;

    // @ts-expect-error — mock temporário para teste unitário
    SessaoModel.criar = async () => ({
      id: 'sessao-criada-123',
      session_token: '4M5S-8U7B',
      status_sessao: 'aguardando_pareamento',
      modo_sessao: 'sessao_clinica',
      paciente_id: 'paciente-123',
      expira_em: new Date().toISOString(),
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      terapeuta_id: 'terapeuta-valido',
      jogo_id: 'jogo-1',
      codigo_pareamento: '4M5S-8U7B',
      modo_sessao: 'sessao_clinica',
      paciente_id: 'paciente-123',
    });

    await SessaoController.iniciar(mockReq, mockRes);
    SessaoModel.criar = originalCriar;

    expect(getStatus()).toBe(201);
    expect((getJson() as { data: { session_id: string } }).data.session_id).toBe('sessao-criada-123');
  });

  it('verificarVisibilidadePaciente deve permitir modo_livre sem paciente_id (RN01)', async () => {
    const { verificarVisibilidadePaciente } = await import('../../../core/middlewares/visibilidade.middleware.js');
    let nextChamado = false;
    const req = { body: { modo_sessao: 'modo_livre' } } as any;
    const res = {} as any;
    const next = () => { nextChamado = true; };

    await verificarVisibilidadePaciente(req, res, next);
    expect(nextChamado).toBe(true);
  });
});

// =============================================================================
// finalizar — encerramento clínico e persistência de data_hora_fim
// =============================================================================
describe('SessaoController.finalizar', () => {
  it('deve finalizar sessão e retornar data_hora_fim preenchido', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalFinalizar = SessaoModel.finalizarSessao;

    const agora = new Date().toISOString();
    // @ts-expect-error — mock temporário para teste unitário
    SessaoModel.finalizarSessao = async (id: string) => ({
      id,
      status_sessao: 'finalizada',
      data_hora_fim: agora,
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { id: 'sessao-1' });
    await SessaoController.finalizar(mockReq, mockRes);

    SessaoModel.finalizarSessao = originalFinalizar;

    expect(getStatus()).toBe(200);
    expect((getJson() as { data: { data_hora_fim: string } }).data.data_hora_fim).toBe(agora);
  });

  it('deve retornar 404 se a sessão não for encontrada para finalização', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalFinalizar = SessaoModel.finalizarSessao;
    SessaoModel.finalizarSessao = async () => null;

    const { mockReq, mockRes, getStatus } = criarMocks({}, { id: 'id-inexistente' });
    await SessaoController.finalizar(mockReq, mockRes);

    SessaoModel.finalizarSessao = originalFinalizar;

    expect(getStatus()).toBe(404);
  });
});

// =============================================================================
// buscarPorToken — consulta de sessão por PIN de pareamento
// =============================================================================
describe('SessaoController.buscarPorToken', () => {
  it('deve retornar a sessão quando encontrada por token', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalBuscar = SessaoModel.buscarPorToken;

    // @ts-expect-error — mock temporário para teste unitário
    SessaoModel.buscarPorToken = async (token: string) => ({
      id: 'sessao-token-1',
      session_token: token,
      status_sessao: 'aguardando_pareamento',
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { token: '4M5S-8U7B' });
    await SessaoController.buscarPorToken(mockReq, mockRes);

    SessaoModel.buscarPorToken = originalBuscar;

    expect(getStatus()).toBe(200);
    expect((getJson() as { data: { session_token: string } }).data.session_token).toBe('4M5S-8U7B');
  });

  it('deve retornar 404 quando o token não for encontrado', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalBuscar = SessaoModel.buscarPorToken;
    SessaoModel.buscarPorToken = async () => null;

    const { mockReq, mockRes, getStatus } = criarMocks({}, { token: 'INEXISTENTE' });
    await SessaoController.buscarPorToken(mockReq, mockRes);

    SessaoModel.buscarPorToken = originalBuscar;

    expect(getStatus()).toBe(404);
  });
});

// =============================================================================
// cancelar — validações de entrada
// =============================================================================
describe('SessaoController.cancelar', () => {
  it('deve rejeitar cancelamento de sessão já finalizada', async () => {
    // Simula buscarPorId retornando sessão finalizada
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalBuscar = SessaoModel.buscarPorId;

    // @ts-expect-error — substituição temporária para teste unitário
    SessaoModel.buscarPorId = async () => ({ id: 'sessao-1', status_sessao: 'finalizada' });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { id: 'sessao-1' });
    await SessaoController.cancelar(mockReq, mockRes);

    SessaoModel.buscarPorId = originalBuscar;

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('finalizada');
  });

  it('deve rejeitar cancelamento de sessão já cancelada', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalBuscar = SessaoModel.buscarPorId;

    // @ts-expect-error — substituição temporária para teste unitário
    SessaoModel.buscarPorId = async () => ({ id: 'sessao-2', status_sessao: 'cancelada' });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { id: 'sessao-2' });
    await SessaoController.cancelar(mockReq, mockRes);

    SessaoModel.buscarPorId = originalBuscar;

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('cancelada');
  });

  it('deve retornar 404 quando a sessão não existe', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalBuscar = SessaoModel.buscarPorId;

    SessaoModel.buscarPorId = async () => null;

    const { mockReq, mockRes, getStatus } = criarMocks({}, { id: 'id-inexistente' });
    await SessaoController.cancelar(mockReq, mockRes);

    SessaoModel.buscarPorId = originalBuscar;

    expect(getStatus()).toBe(404);
  });
});

// =============================================================================
// parear — validações de entrada e verificação de expiração
// =============================================================================
describe('SessaoController.parear', () => {
  it('deve rejeitar pareamento sem session_token', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({});

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.parear(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('session_token');
  });

  it('deve retornar 404 para token de sessão inexistente', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalBuscar = SessaoModel.buscarPorToken;

    SessaoModel.buscarPorToken = async () => null;

    const { mockReq, mockRes, getStatus } = criarMocks({ session_token: 'TOKEN-INVALIDO' });
    await SessaoController.parear(mockReq, mockRes);

    SessaoModel.buscarPorToken = originalBuscar;

    expect(getStatus()).toBe(404);
  });

  it('deve retornar 410 Gone para token de sessão expirado (Card 551)', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalBuscar = SessaoModel.buscarPorToken;

    // @ts-expect-error — substituição temporária para teste unitário
    SessaoModel.buscarPorToken = async () => ({
      id: 'sessao-exp',
      status_sessao: 'aguardando_pareamento',
      expira_em: new Date(Date.now() - 60_000).toISOString(), // expirado há 1 minuto
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({ session_token: 'EXPIRADO-1' });
    await SessaoController.parear(mockReq, mockRes);

    SessaoModel.buscarPorToken = originalBuscar;

    expect(getStatus()).toBe(410);
    expect((getJson() as { error: string }).error).toContain('expirado');
  });

  it('deve rejeitar pareamento de sessão que não está aguardando (ex: já conectada)', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalBuscar = SessaoModel.buscarPorToken;

    // @ts-expect-error — substituição temporária para teste unitário
    SessaoModel.buscarPorToken = async () => ({
      id: 'sessao-conectada',
      status_sessao: 'conectado',
      expira_em: new Date(Date.now() + 900_000).toISOString(), // válido por 15min
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({ session_token: 'JA-CONECTADO' });
    await SessaoController.parear(mockReq, mockRes);

    SessaoModel.buscarPorToken = originalBuscar;

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('conectado');
  });

  it('deve retornar 409 Conflict quando jogo_id informado não corresponde ao da sessão', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalBuscar = SessaoModel.buscarPorToken;

    // @ts-expect-error — substituição temporária para teste unitário
    SessaoModel.buscarPorToken = async () => ({
      id: 'sessao-jogo-errado',
      jogo_id: 'uuid-jogo-correto-do-terapeuta',
      status_sessao: 'aguardando_pareamento',
      expira_em: new Date(Date.now() + 900_000).toISOString(),
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      session_token: 'ABCD-1234',
      jogo_id: 'uuid-de-outro-jogo-diferente', // ← jogo errado
    });
    await SessaoController.parear(mockReq, mockRes);

    SessaoModel.buscarPorToken = originalBuscar;

    expect(getStatus()).toBe(409);
    expect((getJson() as { error: string }).error).toContain('não corresponde');
  });
});

// =============================================================================
// SessaoTokenService — Card: Gerador de Session Token Seguro e Amigável
// Cobre todos os critérios de aceite (RF10, RNF03)
// =============================================================================
describe('SessaoTokenService — Geração e Validação de Token', () => {
  it('deve gerar token no formato XXXX-XXXX (alfanumérico maiúsculo)', () => {
    const token = SessaoTokenService.gerarCodigoPareamento();
    expect(token).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it('deve ter comprimento exato de 9 caracteres (4 + hífen + 4)', () => {
    const token = SessaoTokenService.gerarCodigoPareamento();
    expect(token).toHaveLength(9);
  });

  it('deve gerar tokens distintos — verificação de entropia (100 amostras)', () => {
    // Com ~36^8 combinações possíveis, 100 amostras têm probabilidade ínfima de colisão
    const amostras = new Set(Array.from({ length: 100 }, () => SessaoTokenService.gerarCodigoPareamento()));
    expect(amostras.size).toBe(100);
  });

  it('validarToken deve rejeitar token fora do formato esperado', () => {
    const expiraEm = new Date(Date.now() + 900_000).toISOString();
    const resultado = SessaoTokenService.validarToken('TOKEN_INVALIDO', expiraEm);
    expect(resultado.valido).toBe(false);
    expect(resultado.motivo).toContain('formato');
  });

  it('validarToken deve rejeitar token com prazo de validade vencido (expirado)', () => {
    const expirado = new Date(Date.now() - 60_000).toISOString(); // expirou há 1 min
    const resultado = SessaoTokenService.validarToken('AB1C-2D3E', expirado);
    expect(resultado.valido).toBe(false);
    expect(resultado.motivo).toContain('expirado');
  });

  it('validarToken deve aceitar token no formato correto e dentro do prazo', () => {
    const valido = new Date(Date.now() + 900_000).toISOString(); // válido por 15 min
    const resultado = SessaoTokenService.validarToken('AB1C-2D3E', valido);
    expect(resultado.valido).toBe(true);
    expect(resultado.motivo).toBeUndefined();
  });
});
