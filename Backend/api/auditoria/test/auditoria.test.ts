// ==============================================================================
// InTEA: Testes Unitários da Trilha de Auditoria Clínica de Sessão (Sprint 9 - Task 1.3)
// ==============================================================================
// Cobertura:
// 1. AuditoriaModel: inserção de evento imutável, validação de campos e consulta
// 2. AuditoriaService: validação de UUID, tratamento silencioso e regras de acesso RN04
// 3. AuditoriaController: códigos de status HTTP (200, 400, 403, 404, 500)
// 4. auditoriaRoutes: integridade do roteador Express
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditoriaRoutes } from '../routes/auditoria.routes.js';
import { AuditoriaModel, AuditoriaSessao, CriarAuditoriaDTO } from '../models/auditoria.model.js';
import { AuditoriaService } from '../services/auditoria.service.js';
import { AuditoriaController } from '../controllers/auditoria.controller.js';
import { SessaoModel, Sessao } from '../../sessao/models/sessao.model.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

function criarMocks(
  body: Record<string, unknown> = {},
  params: Record<string, string> = {},
  query: Record<string, string> = {},
  user: Record<string, unknown> | null = { id: '22222222-2222-4222-a222-222222222222' }
) {
  let statusCode = 200;
  let jsonResult: unknown = null;

  const mockReq = { body, params, query, user, headers: {} } as unknown as import('express').Request;
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

describe('Feature Auditoria — Rotas e Estrutura', () => {
  it('deve exportar o roteador auditoriaRoutes', () => {
    expect(auditoriaRoutes).toBeDefined();
    expect(typeof auditoriaRoutes).toBe('function');
  });

  it('deve expor métodos estáticos no AuditoriaModel', () => {
    expect(typeof AuditoriaModel.registrar).toBe('function');
    expect(typeof AuditoriaModel.buscarPorSessaoId).toBe('function');
  });

  it('deve expor métodos estáticos no AuditoriaService', () => {
    expect(typeof AuditoriaService.registrarEvento).toBe('function');
    expect(typeof AuditoriaService.registrarSilencioso).toBe('function');
    expect(typeof AuditoriaService.validarAcessoLinhaDoTempo).toBe('function');
    expect(typeof AuditoriaService.listarPorSessao).toBe('function');
  });

  it('deve expor métodos estáticos no AuditoriaController', () => {
    expect(typeof AuditoriaController.consultarLinhaDoTempo).toBe('function');
  });
});

describe('AuditoriaModel — Operações com Banco de Dados', () => {
  const sessaoIdValido = '11111111-1111-4111-a111-111111111111';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve rejeitar e retornar null se sessao_id, origem ou acao estiverem ausentes', async () => {
    const semSessao = await AuditoriaModel.registrar({
      sessao_id: '',
      origem: 'terapeuta_web',
      acao: 'sessao_finalizada',
    });
    expect(semSessao).toBeNull();

    const semOrigem = await AuditoriaModel.registrar({
      sessao_id: sessaoIdValido,
      origem: '',
      acao: 'sessao_finalizada',
    });
    expect(semOrigem).toBeNull();

    const semAcao = await AuditoriaModel.registrar({
      sessao_id: sessaoIdValido,
      origem: 'terapeuta_web',
      acao: '',
    });
    expect(semAcao).toBeNull();
  });

  it('deve inserir registro de auditoria com sucesso', async () => {
    const mockRetorno: AuditoriaSessao = {
      id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
      sessao_id: sessaoIdValido,
      terapeuta_id: '22222222-2222-4222-a222-222222222222',
      origem: 'terapeuta_web',
      acao: 'sessao_finalizada',
      detalhes_json: { duracao_segundos: 120 },
      ip: '127.0.0.1',
      user_agent: 'Vitest/Test',
      created_at: new Date().toISOString(),
    };

    const singleMock = vi.fn().mockResolvedValue({ data: mockRetorno, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    vi.spyOn(supabase, 'from').mockReturnValue({ insert: insertMock } as any);

    const resultado = await AuditoriaModel.registrar({
      sessao_id: sessaoIdValido,
      terapeuta_id: '22222222-2222-4222-a222-222222222222',
      origem: 'terapeuta_web',
      acao: 'sessao_finalizada',
      detalhes_json: { duracao_segundos: 120 },
      ip: '127.0.0.1',
      user_agent: 'Vitest/Test',
    });

    expect(resultado).toEqual(mockRetorno);
    expect(insertMock).toHaveBeenCalled();
  });

  it('deve retornar null se o supabase retornar erro na inserção', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    vi.spyOn(supabase, 'from').mockReturnValue({ insert: insertMock } as any);

    const resultado = await AuditoriaModel.registrar({
      sessao_id: sessaoIdValido,
      origem: 'terapeuta_web',
      acao: 'sessao_finalizada',
    });

    expect(resultado).toBeNull();
  });

  it('deve buscar eventos ordenados por sessao_id', async () => {
    const mockEventos: AuditoriaSessao[] = [
      {
        id: '11111111-1111-4111-a111-111111111111',
        sessao_id: sessaoIdValido,
        terapeuta_id: null,
        origem: 'dispositivo_jogo',
        acao: 'dispositivo_pareado',
        detalhes_json: {},
        ip: '192.168.1.10',
        user_agent: 'Android/Tablet',
        created_at: '2026-10-01T10:00:00Z',
      },
      {
        id: '22222222-2222-4222-a222-222222222222',
        sessao_id: sessaoIdValido,
        terapeuta_id: '22222222-2222-4222-a222-222222222222',
        origem: 'terapeuta_web',
        acao: 'sessao_finalizada',
        detalhes_json: {},
        ip: '127.0.0.1',
        user_agent: 'Chrome/Web',
        created_at: '2026-10-01T10:30:00Z',
      },
    ];

    const orderMock = vi.fn().mockResolvedValue({ data: mockEventos, error: null });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.spyOn(supabase, 'from').mockReturnValue({ select: selectMock } as any);

    const resultado = await AuditoriaModel.buscarPorSessaoId(sessaoIdValido);

    expect(resultado).toHaveLength(2);
    expect(resultado[0].acao).toBe('dispositivo_pareado');
    expect(resultado[1].acao).toBe('sessao_finalizada');
  });

  it('deve retornar array vazio se sessaoId for vazio', async () => {
    const resultado = await AuditoriaModel.buscarPorSessaoId('');
    expect(resultado).toEqual([]);
  });
});

describe('AuditoriaService — Regras de Negócio e Segurança', () => {
  const sessaoIdValido = '11111111-1111-4111-a111-111111111111';
  const terapeutaIdValido = '22222222-2222-4222-a222-222222222222';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve rejeitar registro se sessao_id não for um UUID válido', async () => {
    const resultado = await AuditoriaService.registrarEvento({
      sessao_id: 'invalido-uuid',
      origem: 'terapeuta_web',
      acao: 'sessao_finalizada',
    });
    expect(resultado).toBeNull();
  });

  it('deve persistir evento chamando o model quando os parâmetros forem válidos', async () => {
    const spyRegistrar = vi.spyOn(AuditoriaModel, 'registrar').mockResolvedValue({
      id: 'mock-id',
      sessao_id: sessaoIdValido,
      terapeuta_id: terapeutaIdValido,
      origem: 'terapeuta_web',
      acao: 'sessao_finalizada',
      detalhes_json: {},
      ip: null,
      user_agent: null,
      created_at: new Date().toISOString(),
    });

    const resultado = await AuditoriaService.registrarEvento({
      sessao_id: sessaoIdValido,
      terapeuta_id: terapeutaIdValido,
      origem: 'terapeuta_web',
      acao: 'sessao_finalizada',
    });

    expect(resultado).not.toBeNull();
    expect(spyRegistrar).toHaveBeenCalled();
  });

  it('registrarSilencioso não deve lançar exceção mesmo se AuditoriaModel falhar', async () => {
    vi.spyOn(AuditoriaModel, 'registrar').mockRejectedValue(new Error('Falha catastrófica de banco'));

    await expect(
      AuditoriaService.registrarSilencioso({
        sessao_id: sessaoIdValido,
        origem: 'terapeuta_web',
        acao: 'sessao_finalizada',
      })
    ).resolves.not.toThrow();
  });

  it('validarAcessoLinhaDoTempo deve retornar 400 se sessaoId for inválido', async () => {
    const res = await AuditoriaService.validarAcessoLinhaDoTempo('uuid-invalido', { id: terapeutaIdValido });
    expect(res.autorizado).toBe(false);
    expect(res.statusHttp).toBe(400);
  });

  it('validarAcessoLinhaDoTempo deve retornar 404 se a sessão não existir', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(null);

    const res = await AuditoriaService.validarAcessoLinhaDoTempo(sessaoIdValido, { id: terapeutaIdValido });
    expect(res.autorizado).toBe(false);
    expect(res.statusHttp).toBe(404);
  });

  it('validarAcessoLinhaDoTempo deve autorizar SuperAdmin mesmo sem ser o dono da sessão', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: sessaoIdValido,
      terapeuta_id: 'outro-terapeuta',
    } as Sessao);

    const res = await AuditoriaService.validarAcessoLinhaDoTempo(sessaoIdValido, {
      id: 'super-admin-id',
      user_metadata: { is_super_admin: true },
    });

    expect(res.autorizado).toBe(true);
  });

  it('validarAcessoLinhaDoTempo deve autorizar o terapeuta responsável pela sessão', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: sessaoIdValido,
      terapeuta_id: terapeutaIdValido,
    } as Sessao);

    const res = await AuditoriaService.validarAcessoLinhaDoTempo(sessaoIdValido, {
      id: terapeutaIdValido,
    });

    expect(res.autorizado).toBe(true);
  });

  it('validarAcessoLinhaDoTempo deve negar acesso com 403 se o terapeuta não tiver vínculo (RN04)', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: sessaoIdValido,
      terapeuta_id: 'terapeuta-dono',
    } as Sessao);

    const res = await AuditoriaService.validarAcessoLinhaDoTempo(sessaoIdValido, {
      id: 'terapeuta-intruso',
    });

    expect(res.autorizado).toBe(false);
    expect(res.statusHttp).toBe(403);
  });
});

describe('AuditoriaController — Endpoints e Validações REST', () => {
  const sessaoIdValido = '11111111-1111-4111-a111-111111111111';
  const terapeutaIdValido = '22222222-2222-4222-a222-222222222222';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/auditoria/sessao/:sessaoId: deve retornar 400 se sessaoId for inválido', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { sessaoId: 'invalido' });

    await AuditoriaController.consultarLinhaDoTempo(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('inválido');
  });

  it('GET /api/auditoria/sessao/:sessaoId: deve retornar 404 se a sessão não for encontrada', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(null);

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { sessaoId: sessaoIdValido });

    await AuditoriaController.consultarLinhaDoTempo(mockReq, mockRes);

    expect(getStatus()).toBe(404);
    expect((getJson() as { error: string }).error).toContain('não encontrada');
  });

  it('GET /api/auditoria/sessao/:sessaoId: deve retornar 403 se o terapeuta não tiver vínculo (RN04)', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: sessaoIdValido,
      terapeuta_id: 'outro-terapeuta',
    } as Sessao);

    const { mockReq, mockRes, getStatus, getJson } = criarMocks(
      {},
      { sessaoId: sessaoIdValido },
      {},
      { id: terapeutaIdValido }
    );

    await AuditoriaController.consultarLinhaDoTempo(mockReq, mockRes);

    expect(getStatus()).toBe(403);
    expect((getJson() as { error: string }).error).toContain('RN04');
  });

  it('GET /api/auditoria/sessao/:sessaoId: deve retornar 200 com os eventos da auditoria quando autorizado', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: sessaoIdValido,
      terapeuta_id: terapeutaIdValido,
    } as Sessao);

    const mockEventos: AuditoriaSessao[] = [
      {
        id: 'evt-1',
        sessao_id: sessaoIdValido,
        terapeuta_id: terapeutaIdValido,
        origem: 'dispositivo_jogo',
        acao: 'dispositivo_pareado',
        detalhes_json: {},
        ip: '192.168.1.5',
        user_agent: 'Tablet',
        created_at: '2026-10-01T10:00:00Z',
      },
    ];

    vi.spyOn(AuditoriaService, 'listarPorSessao').mockResolvedValue(mockEventos);

    const { mockReq, mockRes, getStatus, getJson } = criarMocks(
      {},
      { sessaoId: sessaoIdValido },
      {},
      { id: terapeutaIdValido }
    );

    await AuditoriaController.consultarLinhaDoTempo(mockReq, mockRes);

    expect(getStatus()).toBe(200);
    const json = getJson() as { data: AuditoriaSessao[]; total: number };
    expect(json.total).toBe(1);
    expect(json.data[0].acao).toBe('dispositivo_pareado');
  });

  it('GET /api/auditoria/sessao/:sessaoId: deve retornar 500 se ocorrer exceção no serviço', async () => {
    vi.spyOn(AuditoriaService, 'validarAcessoLinhaDoTempo').mockRejectedValue(new Error('Falha grave'));

    const { mockReq, mockRes, getStatus } = criarMocks({}, { sessaoId: sessaoIdValido });

    await AuditoriaController.consultarLinhaDoTempo(mockReq, mockRes);

    expect(getStatus()).toBe(500);
  });
});
