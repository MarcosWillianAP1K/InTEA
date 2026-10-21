// ==============================================================================
// InTEA: Testes Básicos de Inicialização e Serviços da Feature Sessão
// ==============================================================================

import { describe, it, expect, vi } from 'vitest';
import { sessaoRoutes } from '../routes/sessao.routes.js';
import { SessaoTokenService } from '../services/sessao-token.service.js';
import { SessaoModel } from '../models/sessao.model.js';

// Helper para criar mocks de request/response de forma padronizada
function criarMocks(
  body: Record<string, unknown> = {},
  params: Record<string, string> = {},
  user: Record<string, unknown> | null = { id: 'terapeuta-valido' }
) {
  let statusCode = 200;
  let jsonResult: unknown = null;

  const mockReq = { body, params, user } as unknown as import('express').Request;
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
    expect(typeof SessaoModel.listar).toBe('function');
  });

  it('deve expor métodos cancelar e parear no SessaoController', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    expect(typeof SessaoController.listar).toBe('function');
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
    expect((getJson() as any).data.token_pareamento.codigo).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect((getJson() as any).message).toBe('Código de pareamento gerado com sucesso.');
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
    expect((getJson() as any).data.token_pareamento.codigo).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect((getJson() as any).message).toBe('Código de pareamento gerado com sucesso.');
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

  it('deve retornar 404 se a sessão não for encontrada para atualizar status', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(null);
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({ status: 'em_andamento' }, { id: 'sessao-inexistente' });

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.atualizarStatus(mockReq, mockRes);

    expect(getStatus()).toBe(404);
    expect((getJson() as { error: string }).error).toContain('não encontrada');
  });

  it('deve rejeitar com 400 tentativa de atualizar sessão em estado terminal finalizada', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: 'sessao-terminal-1',
      status_sessao: 'finalizada',
    } as any);

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({ status: 'em_andamento' }, { id: 'sessao-terminal-1' });

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.atualizarStatus(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('terminal');
  });

  it('deve rejeitar com 400 tentativa de atualizar sessão em estado terminal interrompida_por_queda', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: 'sessao-terminal-2',
      status_sessao: 'interrompida_por_queda',
    } as any);

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({ status: 'em_andamento' }, { id: 'sessao-terminal-2' });

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.atualizarStatus(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('terminal');
  });

  it('deve atualizar status com sucesso quando a sessão não estiver em estado terminal', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: 'sessao-ativa-1',
      status_sessao: 'conectado',
    } as any);
    vi.spyOn(SessaoModel, 'atualizarStatus').mockResolvedValue({
      id: 'sessao-ativa-1',
      status_sessao: 'em_andamento',
    } as any);

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({ status: 'em_andamento' }, { id: 'sessao-ativa-1' });

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.atualizarStatus(mockReq, mockRes);

    expect(getStatus()).toBe(200);
    expect((getJson() as any).data.sessao.status_sessao).toBe('em_andamento');
    expect((getJson() as any).message).toBe('Status da sessão atualizado com sucesso.');
  });
});

// =============================================================================
// iniciar — validações de entrada e regras RN01
// =============================================================================
describe('SessaoController.iniciar', () => {
  it('deve rejeitar sem jogo_id', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      codigo_pareamento: '4M5S-8U7B',
    });

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.iniciar(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('obrigatórios');
  });

  const JOGO_UUID = '11111111-1111-4111-a111-111111111111';
  const PACIENTE_UUID = '22222222-2222-4222-a222-222222222222';
  const TERAPEUTA_UUID = '33333333-3333-4333-a333-333333333333';

  it('deve rejeitar sem codigo_pareamento', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      jogo_id: JOGO_UUID,
      paciente_id: PACIENTE_UUID,
    });

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.iniciar(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('codigo_pareamento');
  });

  it('deve rejeitar jogo_id com formato UUID inválido (evitar 22P02 e 500)', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      jogo_id: 'jogo-invalido',
      codigo_pareamento: '4M5S-8U7B',
    });

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.iniciar(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('jogo_id inválido');
  });

  it('deve rejeitar paciente_id com formato UUID inválido (evitar 22P02 e 500)', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      jogo_id: JOGO_UUID,
      codigo_pareamento: '4M5S-8U7B',
      modo_sessao: 'sessao_clinica',
      paciente_id: 'paciente-invalido',
    });

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.iniciar(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('paciente_id inválido');
  });

  it('deve rejeitar com 401 quando o terapeuta não estiver autenticado no token (CA-2)', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks(
      {
        jogo_id: JOGO_UUID,
        codigo_pareamento: '4M5S-8U7B',
      },
      {},
      null // Sem usuário autenticado (req.user ausente)
    );

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.iniciar(mockReq, mockRes);

    expect(getStatus()).toBe(401);
    expect((getJson() as { error: string }).error).toContain('não autorizado');
  });

  it('deve rejeitar com 403 quando o terapeuta_id no body for divergente do usuário autenticado (anti-spoofing) (CA-3)', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks(
      {
        terapeuta_id: '44444444-4444-4444-a444-444444444444',
        jogo_id: JOGO_UUID,
        codigo_pareamento: '4M5S-8U7B',
      },
      {},
      { id: TERAPEUTA_UUID }
    );

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.iniciar(mockReq, mockRes);

    expect(getStatus()).toBe(403);
    expect((getJson() as { error: string }).error).toContain('não autorizada');
  });

  it('deve rejeitar modo_sessao inválido', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      jogo_id: JOGO_UUID,
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
      jogo_id: JOGO_UUID,
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
      jogo_id: JOGO_UUID,
      codigo_pareamento: '4M5S-8U7B',
      modo_sessao: 'modo_livre',
      paciente_id: PACIENTE_UUID,
    });

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.iniciar(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('RN01');
  });

  it('deve permitir iniciar sessão extraindo terapeuta_id do token quando ausente no body (CA-1)', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalCriar = SessaoModel.criar;
    let terapeutaIdRecebidoPeloModel = '';

    // @ts-expect-error — mock temporário para teste unitário
    SessaoModel.criar = async (dados: any) => {
      terapeutaIdRecebidoPeloModel = dados.terapeuta_id;
      return {
        id: '123e4567-e89b-12d3-a456-426614174000',
        session_token: '4M5S-8U7B',
        status_sessao: 'aguardando_pareamento',
        modo_sessao: 'sessao_clinica',
        paciente_id: PACIENTE_UUID,
        expira_em: new Date().toISOString(),
      };
    };

    // Requisição SEM terapeuta_id no body
    const { mockReq, mockRes, getStatus, getJson } = criarMocks(
      {
        jogo_id: JOGO_UUID,
        codigo_pareamento: '4M5S-8U7B',
        modo_sessao: 'sessao_clinica',
        paciente_id: PACIENTE_UUID,
      },
      {},
      { id: TERAPEUTA_UUID }
    );

    await SessaoController.iniciar(mockReq, mockRes);
    SessaoModel.criar = originalCriar;

    expect(getStatus()).toBe(201);
    expect(terapeutaIdRecebidoPeloModel).toBe(TERAPEUTA_UUID);
    const json = getJson() as any;
    expect(json.data.sessao.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(json.data.token_pareamento.token).toBe('4M5S-8U7B');
    expect(json.message).toBe('Sessão iniciada com sucesso.');
  });

  it('deve permitir iniciar sessão quando terapeuta_id no body for idêntico ao do token', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalCriar = SessaoModel.criar;

    // @ts-expect-error — mock temporário para teste unitário
    SessaoModel.criar = async () => ({
      id: '123e4567-e89b-12d3-a456-426614174001',
      session_token: '4M5S-8U7B',
      status_sessao: 'aguardando_pareamento',
      modo_sessao: 'sessao_clinica',
      paciente_id: PACIENTE_UUID,
      expira_em: new Date().toISOString(),
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks(
      {
        terapeuta_id: TERAPEUTA_UUID,
        jogo_id: JOGO_UUID,
        codigo_pareamento: '4M5S-8U7B',
        modo_sessao: 'sessao_clinica',
        paciente_id: PACIENTE_UUID,
      },
      {},
      { id: TERAPEUTA_UUID }
    );

    await SessaoController.iniciar(mockReq, mockRes);
    SessaoModel.criar = originalCriar;

    expect(getStatus()).toBe(201);
    expect((getJson() as any).data.sessao.id).toBe('123e4567-e89b-12d3-a456-426614174001');
    expect((getJson() as any).data.token_pareamento.token).toBe('4M5S-8U7B');
    expect((getJson() as any).message).toBe('Sessão iniciada com sucesso.');
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
  const uuidValido = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  it('deve retornar 400 se o identificador da sessão não for um UUID válido', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalBuscarToken = SessaoModel.buscarPorToken;
    SessaoModel.buscarPorToken = async () => null;

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { id: 'uuid-invalido' });
    await SessaoController.finalizar(mockReq, mockRes);

    SessaoModel.buscarPorToken = originalBuscarToken;

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('UUID válido');
  });

  it('deve retornar 404 se a sessão não for encontrada para finalização', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalBuscar = SessaoModel.buscarPorId;
    SessaoModel.buscarPorId = async () => null;

    const { mockReq, mockRes, getStatus } = criarMocks({}, { id: uuidValido });
    await SessaoController.finalizar(mockReq, mockRes);

    SessaoModel.buscarPorId = originalBuscar;
    expect(getStatus()).toBe(404);
  });

  it('deve retornar 400 se a sessão já estiver no status finalizada', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalBuscar = SessaoModel.buscarPorId;
    // @ts-expect-error — mock temporário
    SessaoModel.buscarPorId = async (id: string) => ({
      id,
      status_sessao: 'finalizada',
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { id: uuidValido });
    await SessaoController.finalizar(mockReq, mockRes);

    SessaoModel.buscarPorId = originalBuscar;
    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('já se encontra finalizada');
  });

  it('deve retornar 400 se a sessão estiver no status cancelada', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalBuscar = SessaoModel.buscarPorId;
    // @ts-expect-error — mock temporário
    SessaoModel.buscarPorId = async (id: string) => ({
      id,
      status_sessao: 'cancelada',
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { id: uuidValido });
    await SessaoController.finalizar(mockReq, mockRes);

    SessaoModel.buscarPorId = originalBuscar;
    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('cancelada');
  });

  it('deve retornar 400 se a sessão ainda estiver aguardando pareamento', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalBuscar = SessaoModel.buscarPorId;
    // @ts-expect-error — mock temporário
    SessaoModel.buscarPorId = async (id: string) => ({
      id,
      status_sessao: 'aguardando_pareamento',
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { id: uuidValido });
    await SessaoController.finalizar(mockReq, mockRes);

    SessaoModel.buscarPorId = originalBuscar;
    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('aguardando pareamento');
  });

  it('deve finalizar sessão clínica em andamento e retornar data_hora_fim preenchido', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const originalBuscar = SessaoModel.buscarPorId;
    const originalFinalizar = SessaoModel.finalizarSessao;

    const agora = new Date().toISOString();
    // @ts-expect-error — mock temporário
    SessaoModel.buscarPorId = async (id: string) => ({
      id,
      status_sessao: 'em_andamento',
      modo_sessao: 'modo_livre',
      paciente_id: null,
    });

    // @ts-expect-error — mock temporário
    SessaoModel.finalizarSessao = async (id: string) => ({
      id,
      status_sessao: 'finalizada',
      modo_sessao: 'modo_livre',
      paciente_id: null,
      data_hora_fim: agora,
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { id: uuidValido });
    await SessaoController.finalizar(mockReq, mockRes);

    SessaoModel.buscarPorId = originalBuscar;
    SessaoModel.finalizarSessao = originalFinalizar;

    expect(getStatus()).toBe(200);
    expect((getJson() as any).data.sessao.data_hora_fim).toBe(agora);
  });

  it('deve finalizar sessão clínica, sintetizar relatório no formato Contrato 4 e chamar persistência', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const { RelatorioSessaoModel } = await import('../models/relatorio.model.js');
    const originalBuscar = SessaoModel.buscarPorId;
    const originalFinalizar = SessaoModel.finalizarSessao;
    const originalCriarRelatorio = RelatorioSessaoModel.criar;

    const inicio = new Date(Date.now() - 1200_000).toISOString();
    const fim = new Date().toISOString();
    let relatorioPersistido: any = null;

    // @ts-expect-error — mock temporário
    SessaoModel.buscarPorId = async (id: string) => ({
      id,
      session_token: '4M5S-8U7B',
      terapeuta_id: '11111111-1111-1111-1111-111111111111',
      paciente_id: '33333333-3333-3333-3333-333333333333',
      modo_sessao: 'sessao_clinica',
      status_sessao: 'em_andamento',
    });

    // @ts-expect-error — mock temporário
    SessaoModel.finalizarSessao = async (id: string) => ({
      id,
      session_token: '4M5S-8U7B',
      terapeuta_id: '11111111-1111-1111-1111-111111111111',
      paciente_id: '33333333-3333-3333-3333-333333333333',
      modo_sessao: 'sessao_clinica',
      status_sessao: 'finalizada',
      data_hora_inicio: inicio,
      data_hora_fim: fim,
    });

    RelatorioSessaoModel.criar = async (dto: any) => {
      relatorioPersistido = dto;
      return { id: 'relatorio-uuid-1', ...dto };
    };

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { id: uuidValido });
    await SessaoController.finalizar(mockReq, mockRes);

    SessaoModel.buscarPorId = originalBuscar;
    SessaoModel.finalizarSessao = originalFinalizar;
    RelatorioSessaoModel.criar = originalCriarRelatorio;

    expect(getStatus()).toBe(200);
    const resposta = getJson() as any;
    expect(resposta.data.sessao.status_sessao).toBe('finalizada');
    expect(resposta.data.relatorio).toBeDefined();
    expect(resposta.data.relatorio.token_sessao).toBe('4M5S-8U7B');
    expect(resposta.data.relatorio.duracao_segundos).toBeGreaterThanOrEqual(1199);
    expect(resposta.data.relatorio.resumo.taxa_conclusao).toBe(85.5);
    expect(resposta.data.relatorio.resumo.intervencoes_dda).toBe(4);
    expect(Array.isArray(resposta.data.relatorio.analises_ia)).toBe(true);
    expect(resposta.data.relatorio.metricas_agregadas[0].id_metrica).toBe('nivel_frustracao');

    // Valida persistência no banco (3FN pura: apenas sessao_id, conteudo e dados_ia_json)
    expect(relatorioPersistido).not.toBeNull();
    expect(relatorioPersistido.sessao_id).toBe(uuidValido);
    expect(relatorioPersistido.conteudo).toBeDefined();
    expect(relatorioPersistido.dados_ia_json.token_sessao).toBe('4M5S-8U7B');
  });

  it('deve finalizar sessão em modo livre sem gerar relatório de IA (RN01)', async () => {
    const { SessaoController } = await import('../controllers/sessao.controller.js');
    const { RelatorioSessaoModel } = await import('../models/relatorio.model.js');
    const originalBuscar = SessaoModel.buscarPorId;
    const originalFinalizar = SessaoModel.finalizarSessao;
    const originalCriarRelatorio = RelatorioSessaoModel.criar;

    let relatorioChamado = false;
    RelatorioSessaoModel.criar = async () => {
      relatorioChamado = true;
      return null;
    };

    // @ts-expect-error — mock temporário
    SessaoModel.buscarPorId = async (id: string) => ({
      id,
      session_token: 'LIVR-1234',
      terapeuta_id: 'terapeuta-1',
      paciente_id: null,
      modo_sessao: 'modo_livre',
      status_sessao: 'em_andamento',
    });

    // @ts-expect-error — mock temporário
    SessaoModel.finalizarSessao = async (id: string) => ({
      id,
      session_token: 'LIVR-1234',
      terapeuta_id: 'terapeuta-1',
      paciente_id: null,
      modo_sessao: 'modo_livre',
      status_sessao: 'finalizada',
      data_hora_fim: new Date().toISOString(),
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { id: uuidValido });
    await SessaoController.finalizar(mockReq, mockRes);

    SessaoModel.buscarPorId = originalBuscar;
    SessaoModel.finalizarSessao = originalFinalizar;
    RelatorioSessaoModel.criar = originalCriarRelatorio;

    expect(getStatus()).toBe(200);
    const resposta = getJson() as any;
    expect(resposta.data.relatorio).toBeNull();
    expect(relatorioChamado).toBe(false);
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
    expect((getJson() as any).data.sessao.session_token).toBe('4M5S-8U7B');
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

  it('gerarRelatorioIA deve processar sessão finalizada e retornar Contrato 4', () => {
    const sessaoMock: any = {
      id: 'sessao-1',
      session_token: 'ABCD-1234',
      status_sessao: 'finalizada',
      modo_sessao: 'sessao_clinica',
      paciente_id: 'paciente-1',
      data_hora_inicio: new Date(Date.now() - 600_000).toISOString(),
      data_hora_fim: new Date().toISOString(),
    };

    const relatorio = SessaoTokenService.gerarRelatorioIA(sessaoMock);
    expect(relatorio).not.toBeNull();
    expect(relatorio?.token_sessao).toBe('ABCD-1234');
    expect(relatorio?.duracao_segundos).toBeGreaterThanOrEqual(599);
    expect(relatorio?.resumo.taxa_conclusao).toBe(85.5);
  });

  it('gerarRelatorioIA deve retornar null se a sessão não estiver com status finalizada', () => {
    const sessaoEmAndamento: any = {
      id: 'sessao-2',
      session_token: 'ABCD-1234',
      status_sessao: 'em_andamento',
      modo_sessao: 'sessao_clinica',
      paciente_id: 'paciente-1',
    };

    const relatorio = SessaoTokenService.gerarRelatorioIA(sessaoEmAndamento);
    expect(relatorio).toBeNull();

  });

  it('gerarRelatorioIA deve retornar null para modo livre ou sem paciente_id (RN01)', () => {
    const sessaoLivre: any = {
      id: 'sessao-3',
      session_token: 'ABCD-1234',
      status_sessao: 'finalizada',
      modo_sessao: 'modo_livre',
      paciente_id: null,
    };

    const relatorio = SessaoTokenService.gerarRelatorioIA(sessaoLivre);
    expect(relatorio).toBeNull();

  });

  describe('SessaoController.listar', () => {
    it('deve listar sessões aplicando filtro de terapeuta_id para usuário comum', async () => {
      const originalListar = SessaoModel.listar;
      let filtrosRecebidos: any = null;
      SessaoModel.listar = async (f: any) => {
        filtrosRecebidos = f;
        return { data: [{ id: 's-1', status_sessao: 'finalizada' }] as any, meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
      };

      const { SessaoController } = await import('../controllers/sessao.controller.js');
      const { mockReq, mockRes, getStatus, getJson } = criarMocks();
      (mockReq as any).query = { status: 'concluida' };
      (mockReq as any).user = { id: 'terapeuta-123', is_super_admin: false };

      await SessaoController.listar(mockReq, mockRes);
      SessaoModel.listar = originalListar;

      expect(getStatus()).toBe(200);
      expect(filtrosRecebidos.terapeutaId).toBe('terapeuta-123');
      expect(filtrosRecebidos.status).toBe('concluida');
      expect((getJson() as any).data.sessoes.length).toBe(1);
      expect((getJson() as any).message).toBe('Sessões listadas com sucesso.');
    });

    it('deve permitir listar todas as sessões quando super admin enviar all=true', async () => {
      const originalListar = SessaoModel.listar;
      let filtrosRecebidos: any = null;
      SessaoModel.listar = async (f: any) => {
        filtrosRecebidos = f;
        return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
      };

      const { SessaoController } = await import('../controllers/sessao.controller.js');
      const { mockReq, mockRes, getStatus } = criarMocks();
      (mockReq as any).query = { all: 'true' };
      (mockReq as any).user = { id: 'admin-123', is_super_admin: true };

      await SessaoController.listar(mockReq, mockRes);
      SessaoModel.listar = originalListar;

      expect(getStatus()).toBe(200);
      expect(filtrosRecebidos.terapeutaId).toBeUndefined();
    });

    it('deve extrair e sanitizar parâmetros de paginação (page e limit)', async () => {
      const originalListar = SessaoModel.listar;
      let filtrosRecebidos: any = null;
      SessaoModel.listar = async (f: any) => {
        filtrosRecebidos = f;
        return {
          data: [{ id: 's-pag-1' }] as any,
          meta: { total: 45, page: f.page || 1, limit: f.limit || 10, totalPages: 5 },
        };
      };

      const { SessaoController } = await import('../controllers/sessao.controller.js');
      const { mockReq, mockRes, getStatus, getJson } = criarMocks();
      (mockReq as any).query = { page: '2', limit: '15' };
      (mockReq as any).user = { id: 'terapeuta-123' };

      await SessaoController.listar(mockReq, mockRes);
      SessaoModel.listar = originalListar;

      expect(getStatus()).toBe(200);
      expect(filtrosRecebidos.page).toBe(2);
      expect(filtrosRecebidos.limit).toBe(15);
      const json = getJson() as any;
      expect(json.data.meta.total).toBe(45);
      expect(json.data.meta.page).toBe(2);
      expect(json.data.meta.limit).toBe(15);
      expect(json.data.meta.totalPages).toBe(5);
      expect(json.message).toBe('Sessões listadas com sucesso.');
    });

    it('deve normalizar valores inválidos de paginação para limites seguros', async () => {
      const originalListar = SessaoModel.listar;
      let filtrosRecebidos: any = null;
      SessaoModel.listar = async (f: any) => {
        filtrosRecebidos = f;
        return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
      };

      const { SessaoController } = await import('../controllers/sessao.controller.js');
      const { mockReq, mockRes, getStatus } = criarMocks();
      (mockReq as any).query = { page: '-5', limit: '500' };
      (mockReq as any).user = { id: 'terapeuta-123' };

      await SessaoController.listar(mockReq, mockRes);
      SessaoModel.listar = originalListar;

      expect(getStatus()).toBe(200);
      expect(filtrosRecebidos.page).toBeUndefined(); // Menor que 1 é ignorado e cai no default do Model
      expect(filtrosRecebidos.limit).toBe(100); // Limit máximo é 100
    });

  });
});

