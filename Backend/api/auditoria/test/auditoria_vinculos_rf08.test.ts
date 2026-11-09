// ==============================================================================
// InTEA: Testes de Auditoria Institucional de Vínculos Multiterapeuta (Sprint 13 - Card 1.4)
// ==============================================================================
// Conformidade: RF08, RNF05, RNF06 (LGPD), RN04 (Isolamento por Clínica), RN05 (Imutabilidade)
// Cobertura:
// 1. Emissão de 'vinculo:criado' em PacienteController.vincularTerapeuta (201) -> Listener -> Service -> Model
// 2. Emissão de 'vinculo:removido' em PacienteController.desvincularTerapeuta (200) -> Listener -> Service -> Model
// 3. Não-bloqueio / Resiliência: falha na auditoria não degrada nem bloqueia 201/200 nas rotas de vínculo
// 4. Validação estrita de UUIDs e acao em AuditoriaService.registrarVinculo (retorna null sem consultar banco)
// 5. Consulta GET /api/auditoria?pacienteId=:id&tipoAcao=vinculo_equipe_criado e GET /api/auditoria/vinculo (200 Envelope)
// 6. Rejeição com 400 Bad Request quando pacienteId na query não for um UUID válido
// 7. Isolamento Institucional por clinica_id (RN04): Terapeuta da Clínica A vê apenas Clínica A; SuperAdmin vê todas
// 8. Cobertura integral de branches de AuditoriaService (validarAcessoLinhaDoTempo, listarPorSessao, obterEstatisticas)
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { inicializarAuditoriaListeners } from '../listeners/auditoria.listener.js';
import { auditoriaRoutes } from '../routes/auditoria.routes.js';
import {
  AuditoriaModel,
  AuditoriaSessao,
  AuditoriaVinculoRegistro,
} from '../models/auditoria.model.js';
import { AuditoriaService } from '../services/auditoria.service.js';
import { AuditoriaController } from '../controllers/auditoria.controller.js';
import { PacienteController } from '../../paciente/controllers/paciente.controller.js';
import { PacienteService } from '../../paciente/services/paciente.service.js';
import { SessaoModel, Sessao } from '../../sessao/models/sessao.model.js';
import { eventBus } from '../../../core/events/event-bus.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

// Garante que os ouvintes de domínio estejam ativos para os testes de integração
inicializarAuditoriaListeners();

interface MockHttpContext {
  mockReq: Request;
  mockRes: Response;
  getStatus: () => number;
  getJson: () => unknown;
}

function criarContextoHttp(opcoes: {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string>;
  user?: Record<string, unknown> | null;
  headers?: Record<string, string>;
  ip?: string;
} = {}): MockHttpContext {
  let statusCode = 200;
  let jsonPayload: unknown = null;

  const mockReq = {
    body: opcoes.body ?? {},
    params: opcoes.params ?? {},
    query: opcoes.query ?? {},
    user:
      opcoes.user !== undefined
        ? opcoes.user
        : { id: '22222222-2222-4222-a222-222222222222' },
    headers: opcoes.headers ?? {
      'x-forwarded-for': '192.168.10.25',
      'user-agent': 'Mozilla/5.0 (InTEA Clinical Workstation)',
    },
    ip: opcoes.ip ?? '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as Request;

  const mockRes = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: unknown) {
      jsonPayload = data;
      return this;
    },
  } as unknown as Response;

  return {
    mockReq,
    mockRes,
    getStatus: () => statusCode,
    getJson: () => jsonPayload,
  };
}

describe('Auditoria Institucional de Vínculos Multiterapeuta (RF08 / RNF05 / RN04)', () => {
  const pacienteIdValido = '11111111-1111-4111-a111-111111111111';
  const terapeutaAutorId = '22222222-2222-4222-a222-222222222222';
  const terapeutaAlvoId = '33333333-3333-4333-a333-333333333333';
  const clinicaAId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  const clinicaBId = 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. Emissão de 'vinculo:criado' em PacienteController.vincularTerapeuta
  // ============================================================================
  it('1. deve emitir "vinculo:criado" em PacienteController.vincularTerapeuta (201) e persistir em auditoria_vinculo_acesso com acao "vinculo_equipe_criado"', async () => {
    vi.spyOn(PacienteService, 'vincularTerapeuta').mockResolvedValue(undefined);

    const registroEsperado: AuditoriaVinculoRegistro = {
      id: '99999999-9999-4999-a999-999999999999',
      paciente_id: pacienteIdValido,
      terapeuta_autor_id: terapeutaAutorId,
      terapeuta_alvo_id: terapeutaAlvoId,
      acao: 'vinculo_equipe_criado',
      ip: '192.168.10.25',
      user_agent: 'Mozilla/5.0 (InTEA Clinical Workstation)',
      created_at: '2026-11-03T12:00:00.000Z',
    };

    const singleMock = vi.fn().mockResolvedValue({ data: registroEsperado, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({
      insert: insertMock,
    } as unknown as ReturnType<typeof supabase.from>);

    const spyEmitir = vi.spyOn(eventBus, 'emitir');
    const spyServiceSilencioso = vi.spyOn(AuditoriaService, 'registrarVinculoSilencioso');
    const spyModelRegistrar = vi.spyOn(AuditoriaModel, 'registrarVinculo');

    const { mockReq, mockRes, getStatus, getJson } = criarContextoHttp({
      params: { id: pacienteIdValido },
      body: { terapeuta_id: terapeutaAlvoId },
      user: { id: terapeutaAutorId },
      headers: {
        'x-forwarded-for': '192.168.10.25, 10.0.0.1',
        'user-agent': 'Mozilla/5.0 (InTEA Clinical Workstation)',
      },
    });

    await PacienteController.vincularTerapeuta(mockReq, mockRes);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getStatus()).toBe(201);
    expect(getJson()).toEqual({
      data: {
        vinculo: {
          paciente_id: pacienteIdValido,
          terapeuta_id: terapeutaAlvoId,
        },
      },
      message: 'Terapeuta vinculado ao paciente com sucesso.',
    });

    expect(spyEmitir).toHaveBeenCalledWith('vinculo:criado', {
      pacienteId: pacienteIdValido,
      terapeutaAutorId,
      terapeutaAlvoId,
      ip: '192.168.10.25',
      userAgent: 'Mozilla/5.0 (InTEA Clinical Workstation)',
    });

    expect(spyServiceSilencioso).toHaveBeenCalledWith({
      paciente_id: pacienteIdValido,
      terapeuta_autor_id: terapeutaAutorId,
      terapeuta_alvo_id: terapeutaAlvoId,
      acao: 'vinculo_equipe_criado',
      ip: '192.168.10.25',
      user_agent: 'Mozilla/5.0 (InTEA Clinical Workstation)',
    });

    expect(spyModelRegistrar).toHaveBeenCalledTimes(1);
    expect(fromSpy).toHaveBeenCalledWith('auditoria_vinculo_acesso');
    expect(insertMock).toHaveBeenCalledWith({
      paciente_id: pacienteIdValido,
      terapeuta_autor_id: terapeutaAutorId,
      terapeuta_alvo_id: terapeutaAlvoId,
      acao: 'vinculo_equipe_criado',
      ip: '192.168.10.25',
      user_agent: 'Mozilla/5.0 (InTEA Clinical Workstation)',
    });
  });

  // ============================================================================
  // 2. Emissão de 'vinculo:removido' em PacienteController.desvincularTerapeuta
  // ============================================================================
  it('2. deve emitir "vinculo:removido" em PacienteController.desvincularTerapeuta (200) e persistir com acao "vinculo_equipe_removido"', async () => {
    vi.spyOn(PacienteService, 'desvincularTerapeuta').mockResolvedValue(undefined);

    const registroEsperado: AuditoriaVinculoRegistro = {
      id: '88888888-8888-4888-a888-888888888888',
      paciente_id: pacienteIdValido,
      terapeuta_autor_id: terapeutaAutorId,
      terapeuta_alvo_id: terapeutaAlvoId,
      acao: 'vinculo_equipe_removido',
      ip: '172.16.0.14',
      user_agent: 'Chrome/130.0 InTEA',
      created_at: '2026-11-03T12:05:00.000Z',
    };

    const singleMock = vi.fn().mockResolvedValue({ data: registroEsperado, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({
      insert: insertMock,
    } as unknown as ReturnType<typeof supabase.from>);

    const spyEmitir = vi.spyOn(eventBus, 'emitir');
    const spyServiceSilencioso = vi.spyOn(AuditoriaService, 'registrarVinculoSilencioso');
    const spyModelRegistrar = vi.spyOn(AuditoriaModel, 'registrarVinculo');

    const { mockReq, mockRes, getStatus, getJson } = criarContextoHttp({
      params: { id: pacienteIdValido, terapeutaId: terapeutaAlvoId },
      user: { id: terapeutaAutorId, is_super_admin: true },
      headers: {
        'x-forwarded-for': '172.16.0.14',
        'user-agent': 'Chrome/130.0 InTEA',
      },
    });

    await PacienteController.desvincularTerapeuta(mockReq, mockRes);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getStatus()).toBe(200);
    expect(getJson()).toEqual({
      data: {
        vinculo: {
          paciente_id: pacienteIdValido,
          terapeuta_id: terapeutaAlvoId,
          status: 'removido',
        },
      },
      message: 'Vínculo do terapeuta com o paciente removido com sucesso.',
    });

    expect(spyEmitir).toHaveBeenCalledWith('vinculo:removido', {
      pacienteId: pacienteIdValido,
      terapeutaAutorId,
      terapeutaAlvoId,
      ip: '172.16.0.14',
      userAgent: 'Chrome/130.0 InTEA',
    });

    expect(spyServiceSilencioso).toHaveBeenCalledWith({
      paciente_id: pacienteIdValido,
      terapeuta_autor_id: terapeutaAutorId,
      terapeuta_alvo_id: terapeutaAlvoId,
      acao: 'vinculo_equipe_removido',
      ip: '172.16.0.14',
      user_agent: 'Chrome/130.0 InTEA',
    });

    expect(spyModelRegistrar).toHaveBeenCalledTimes(1);
    expect(fromSpy).toHaveBeenCalledWith('auditoria_vinculo_acesso');
    expect(insertMock).toHaveBeenCalledWith({
      paciente_id: pacienteIdValido,
      terapeuta_autor_id: terapeutaAutorId,
      terapeuta_alvo_id: terapeutaAlvoId,
      acao: 'vinculo_equipe_removido',
      ip: '172.16.0.14',
      user_agent: 'Chrome/130.0 InTEA',
    });
  });

  // ============================================================================
  // 3. Não-bloqueio / Resiliência em caso de falha na Auditoria
  // ============================================================================
  it('3. deve manter resposta 201 e 200 sem bloqueio mesmo se AuditoriaModel.registrarVinculo ou o banco falharem', async () => {
    vi.spyOn(PacienteService, 'vincularTerapeuta').mockResolvedValue(undefined);
    vi.spyOn(PacienteService, 'desvincularTerapeuta').mockResolvedValue(undefined);

    // Caso A: AuditoriaModel.registrarVinculo rejeita com exceção
    vi.spyOn(AuditoriaModel, 'registrarVinculo').mockRejectedValueOnce(
      new Error('Falha catastrófica de conexão com a tabela auditoria_vinculo_acesso')
    );

    const ctxPost = criarContextoHttp({
      params: { id: pacienteIdValido },
      body: { terapeuta_id: terapeutaAlvoId },
      user: { id: terapeutaAutorId },
    });

    await expect(
      PacienteController.vincularTerapeuta(ctxPost.mockReq, ctxPost.mockRes)
    ).resolves.not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ctxPost.getStatus()).toBe(201);

    // Caso B: Banco rejeita a inserção na tabela auditoria_vinculo_acesso
    const singleErroMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'insert into auditoria_vinculo_acesso rejected' },
    });
    const selectErroMock = vi.fn().mockReturnValue({ single: singleErroMock });
    const insertErroMock = vi.fn().mockReturnValue({ select: selectErroMock });
    vi.spyOn(supabase, 'from').mockReturnValue({
      insert: insertErroMock,
    } as unknown as ReturnType<typeof supabase.from>);

    const ctxDelete = criarContextoHttp({
      params: { id: pacienteIdValido, terapeutaId: terapeutaAlvoId },
      user: { id: terapeutaAlvoId },
    });

    await expect(
      PacienteController.desvincularTerapeuta(ctxDelete.mockReq, ctxDelete.mockRes)
    ).resolves.not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ctxDelete.getStatus()).toBe(200);
  });

  // ============================================================================
  // 4. Validação de UUIDs e acao em AuditoriaService.registrarVinculo
  // ============================================================================
  it('4. deve retornar null em AuditoriaService.registrarVinculo sem chamar o banco quando qualquer UUID ou acao for inválido', async () => {
    const spyModel = vi.spyOn(AuditoriaModel, 'registrarVinculo');
    const spySupabase = vi.spyOn(supabase, 'from');

    // paciente_id inválido
    const resPacienteInvalido = await AuditoriaService.registrarVinculo({
      paciente_id: 'uuid-invalido',
      terapeuta_autor_id: terapeutaAutorId,
      terapeuta_alvo_id: terapeutaAlvoId,
      acao: 'vinculo_equipe_criado',
    });
    expect(resPacienteInvalido).toBeNull();

    // terapeuta_autor_id inválido
    const resAutorInvalido = await AuditoriaService.registrarVinculo({
      paciente_id: pacienteIdValido,
      terapeuta_autor_id: 'autor-nao-uuid',
      terapeuta_alvo_id: terapeutaAlvoId,
      acao: 'vinculo_equipe_criado',
    });
    expect(resAutorInvalido).toBeNull();

    // terapeuta_alvo_id inválido
    const resAlvoInvalido = await AuditoriaService.registrarVinculo({
      paciente_id: pacienteIdValido,
      terapeuta_autor_id: terapeutaAutorId,
      terapeuta_alvo_id: '12345',
      acao: 'vinculo_equipe_removido',
    });
    expect(resAlvoInvalido).toBeNull();

    // acao inválida
    const resAcaoInvalida = await AuditoriaService.registrarVinculo({
      paciente_id: pacienteIdValido,
      terapeuta_autor_id: terapeutaAutorId,
      terapeuta_alvo_id: terapeutaAlvoId,
      acao: 'acao_desconhecida' as unknown as 'vinculo_equipe_criado',
    });
    expect(resAcaoInvalida).toBeNull();

    expect(spyModel).not.toHaveBeenCalled();
    expect(spySupabase).not.toHaveBeenCalled();
  });

  // ============================================================================
  // 5. Consulta GET /api/auditoria?pacienteId=:id&tipoAcao=vinculo_equipe_criado e GET /api/auditoria/vinculo
  // ============================================================================
  it('5. deve retornar 200 OK no Envelope Pattern Categorizado em GET /api/auditoria?pacienteId=:id&tipoAcao=vinculo_equipe_criado e GET /api/auditoria/vinculo', async () => {
    const rotasGet = (auditoriaRoutes.stack as unknown as Array<{
      route?: { path?: string; methods?: Record<string, boolean> };
    }>)
      .filter((layer) => layer.route?.methods?.get)
      .map((layer) => layer.route?.path);

    expect(rotasGet).toContain('/');
    expect(rotasGet).toContain('/vinculo');

    const linhaVinculoBruta = {
      id: '77777777-7777-4777-a777-777777777777',
      paciente_id: pacienteIdValido,
      terapeuta_autor_id: terapeutaAutorId,
      terapeuta_alvo_id: terapeutaAlvoId,
      acao: 'vinculo_equipe_criado',
      ip: '192.168.10.25',
      user_agent: 'Mozilla/5.0',
      created_at: '2026-11-03T14:00:00.000Z',
      paciente: { id: pacienteIdValido, nome: 'Lucas Paciente', clinica_id: clinicaAId },
      autor: { id: terapeutaAutorId, nome: 'Dr. Marcos Autor', email: 'marcos@intea.ufpi.br' },
      alvo: { id: terapeutaAlvoId, nome: 'Dra. Ana Especialista', email: 'ana@intea.ufpi.br' },
    };

    vi.spyOn(supabase, 'from').mockImplementation(((tabela: string) => {
      if (tabela === 'auditoria_sessao') {
        const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
        const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
        const eqMock = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: orderMock });
        return {
          select: vi.fn().mockReturnValue({
            eq: eqMock,
            order: orderMock,
          }),
        };
      }
      if (tabela === 'auditoria_vinculo_acesso') {
        const rangeMock = vi.fn().mockResolvedValue({
          data: [linhaVinculoBruta],
          error: null,
          count: 1,
        });
        const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
        const cadeia = {
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          order: orderMock,
        };
        return {
          select: vi.fn().mockReturnValue(cadeia),
        };
      }
      return {};
    }) as unknown as typeof supabase.from);

    // 5.1 Consulta via GET /api/auditoria?pacienteId=:id&tipoAcao=vinculo_equipe_criado
    const ctxFiltro = criarContextoHttp({
      query: {
        pacienteId: pacienteIdValido,
        tipoAcao: 'vinculo_equipe_criado',
        page: '1',
        limit: '10',
      },
      user: { id: terapeutaAutorId, clinica_id: clinicaAId },
    });

    await AuditoriaController.listar(ctxFiltro.mockReq, ctxFiltro.mockRes);

    expect(ctxFiltro.getStatus()).toBe(200);
    const bodyFiltro = ctxFiltro.getJson() as {
      data: {
        auditoria: AuditoriaSessao[];
        registros: AuditoriaSessao[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      };
      message: string;
    };

    expect(bodyFiltro.message).toBe('Trilha de auditoria recuperada com sucesso.');
    expect(bodyFiltro.data.auditoria).toHaveLength(1);
    expect(bodyFiltro.data.auditoria[0].acao).toBe('vinculo_equipe_criado');
    expect(bodyFiltro.data.auditoria[0].paciente_id).toBe(pacienteIdValido);
    expect(bodyFiltro.data.auditoria[0].terapeuta_id).toBe(terapeutaAutorId);
    expect(bodyFiltro.data.auditoria[0].detalhes_json).toMatchObject({
      paciente_id: pacienteIdValido,
      terapeuta_autor_id: terapeutaAutorId,
      terapeuta_alvo_id: terapeutaAlvoId,
      terapeuta_alvo_nome: 'Dra. Ana Especialista',
    });
    expect(bodyFiltro.data.meta.total).toBe(1);

    // Valida Envelope Pattern estrito na serialização JSON
    const serializado = JSON.parse(JSON.stringify(bodyFiltro));
    expect(Object.keys(serializado).sort()).toEqual(['data', 'message'].sort());
    expect(Object.keys(serializado.data).sort()).toEqual(['auditoria', 'meta', 'registros'].sort());

    // 5.2 Consulta via GET /api/auditoria/vinculo
    const ctxVinculo = criarContextoHttp({
      query: { tipoAcao: 'vinculo_equipe_criado' },
      user: { id: terapeutaAutorId, clinica_id: clinicaAId },
    });

    await AuditoriaController.listar(ctxVinculo.mockReq, ctxVinculo.mockRes);
    expect(ctxVinculo.getStatus()).toBe(200);
  });

  // ============================================================================
  // 6. Rejeição 400 Bad Request para pacienteId inválido
  // ============================================================================
  it('6. deve rejeitar com 400 Bad Request quando pacienteId na query de GET /api/auditoria não for um UUID válido', async () => {
    const spyService = vi.spyOn(AuditoriaService, 'listarComFiltros');

    const { mockReq, mockRes, getStatus, getJson } = criarContextoHttp({
      query: {
        pacienteId: 'paciente-nao-uuid-123',
        tipoAcao: 'vinculo_equipe_criado',
      },
      user: { id: terapeutaAutorId },
    });

    await AuditoriaController.listar(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect(getJson()).toEqual({
      error: 'O parâmetro pacienteId deve ser um UUID válido.',
    });
    expect(spyService).not.toHaveBeenCalled();
  });

  // ============================================================================
  // 7. Isolamento Institucional por clinica_id (RN04) vs Visão Global SuperAdmin
  // ============================================================================
  it('7. deve isolar eventos por clinica_id (RN04) para terapeuta comum da Clínica A (ocultando Clínica B) e permitir visão global ao SuperAdmin', async () => {
    const pacienteClinicaA = '11111111-1111-4111-a111-111111111111';
    const pacienteClinicaB = '44444444-4444-4444-a444-444444444444';

    const registrosBanco = [
      {
        id: 'aaaaaaaa-0001-4000-a000-000000000001',
        paciente_id: pacienteClinicaA,
        terapeuta_autor_id: terapeutaAutorId,
        terapeuta_alvo_id: terapeutaAlvoId,
        acao: 'vinculo_equipe_criado',
        ip: '10.0.1.10',
        user_agent: 'InTEA/ClinicaA',
        created_at: '2026-11-03T15:00:00.000Z',
        paciente: { id: pacienteClinicaA, nome: 'Paciente Clínica A', clinica_id: clinicaAId },
        autor: { id: terapeutaAutorId, nome: 'Terapeuta Clínica A', clinica_id: clinicaAId },
      },
      {
        id: 'bbbbbbbb-0002-4000-a000-000000000002',
        paciente_id: pacienteClinicaB,
        terapeuta_autor_id: '55555555-5555-4555-a555-555555555555',
        terapeuta_alvo_id: '66666666-6666-4666-a666-666666666666',
        acao: 'vinculo_equipe_criado',
        ip: '10.0.2.20',
        user_agent: 'InTEA/ClinicaB',
        created_at: '2026-11-03T15:10:00.000Z',
        paciente: { id: pacienteClinicaB, nome: 'Paciente Clínica B', clinica_id: clinicaBId },
        autor: {
          id: '55555555-5555-4555-a555-555555555555',
          nome: 'Terapeuta Clínica B',
          clinica_id: clinicaBId,
        },
      },
    ];

    vi.spyOn(supabase, 'from').mockImplementation(((tabela: string) => {
      if (tabela === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { clinica_id: clinicaAId, is_super_admin: false },
                error: null,
              }),
            }),
          }),
        };
      }
      if (tabela === 'auditoria_sessao') {
        const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
        const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ order: orderMock }),
            order: orderMock,
          }),
        };
      }
      if (tabela === 'auditoria_vinculo_acesso') {
        const rangeMock = vi.fn().mockResolvedValue({
          data: registrosBanco,
          error: null,
          count: registrosBanco.length,
        });
        const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            order: orderMock,
          }),
        };
      }
      return {};
    }) as unknown as typeof supabase.from);

    // 7.1 Terapeuta comum da Clínica A consulta GET /api/auditoria?tipoAcao=vinculo_equipe_criado
    const ctxTerapeutaClinicaA = criarContextoHttp({
      query: { tipoAcao: 'vinculo_equipe_criado' },
      user: { id: terapeutaAutorId, is_super_admin: false },
    });

    await AuditoriaController.listar(ctxTerapeutaClinicaA.mockReq, ctxTerapeutaClinicaA.mockRes);

    expect(ctxTerapeutaClinicaA.getStatus()).toBe(200);
    const bodyClinicaA = ctxTerapeutaClinicaA.getJson() as {
      data: { auditoria: AuditoriaSessao[]; meta: { total: number } };
    };

    expect(bodyClinicaA.data.auditoria).toHaveLength(1);
    expect(bodyClinicaA.data.auditoria[0].id).toBe('aaaaaaaa-0001-4000-a000-000000000001');
    expect(bodyClinicaA.data.auditoria[0].paciente_id).toBe(pacienteClinicaA);
    expect(bodyClinicaA.data.meta.total).toBe(1);

    // 7.2 SuperAdmin consulta GET /api/auditoria?tipoAcao=vinculo_equipe_criado e enxerga ambas as clínicas
    const ctxSuperAdmin = criarContextoHttp({
      query: { tipoAcao: 'vinculo_equipe_criado' },
      user: {
        id: '99999999-0000-4000-a000-999999999999',
        is_super_admin: true,
        app_metadata: { is_super_admin: true },
      },
    });

    await AuditoriaController.listar(ctxSuperAdmin.mockReq, ctxSuperAdmin.mockRes);

    expect(ctxSuperAdmin.getStatus()).toBe(200);
    const bodySuperAdmin = ctxSuperAdmin.getJson() as {
      data: { auditoria: AuditoriaSessao[]; meta: { total: number } };
    };

    expect(bodySuperAdmin.data.auditoria).toHaveLength(2);
    const idsRetornados = bodySuperAdmin.data.auditoria.map((item) => item.id);
    expect(idsRetornados).toContain('aaaaaaaa-0001-4000-a000-000000000001');
    expect(idsRetornados).toContain('bbbbbbbb-0002-4000-a000-000000000002');
    expect(bodySuperAdmin.data.meta.total).toBe(2);
  });

  // ============================================================================
  // 8. Cobertura de Branches de Segurança em AuditoriaService (RN04)
  // ============================================================================
  it('8. deve validar todos os cenários de autorização RN04 e métodos auxiliares em AuditoriaService', async () => {
    const sessaoId = '11111111-1111-4111-a111-111111111111';

    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: sessaoId,
      terapeuta_id: '99999999-9999-4999-a999-999999999999',
      paciente_id: pacienteIdValido,
    } as Sessao);

    // 8.1 Terapeuta inativo ou inexistente -> 403
    vi.spyOn(supabase, 'from').mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: terapeutaAutorId, status_ativo: false },
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    const resInativo = await AuditoriaService.validarAcessoLinhaDoTempo(sessaoId, { id: terapeutaAutorId });
    expect(resInativo.autorizado).toBe(false);
    expect(resInativo.statusHttp).toBe(403);

    // 8.2 Terapeuta marcado como SuperAdmin no banco -> autorizado
    vi.spyOn(supabase, 'from').mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: terapeutaAutorId, status_ativo: true, is_super_admin: true },
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    const resSuperAdminDb = await AuditoriaService.validarAcessoLinhaDoTempo(sessaoId, { id: terapeutaAutorId });
    expect(resSuperAdminDb.autorizado).toBe(true);

    // 8.3 Paciente inativo ou não encontrado -> 403
    vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: terapeutaAutorId, clinica_id: clinicaAId, is_super_admin: false, status_ativo: true },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteIdValido, clinica_id: clinicaAId, status_ativo: false },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    }) as unknown as typeof supabase.from);

    const resPacInativo = await AuditoriaService.validarAcessoLinhaDoTempo(sessaoId, { id: terapeutaAutorId });
    expect(resPacInativo.autorizado).toBe(false);
    expect(resPacInativo.statusHttp).toBe(403);

    // 8.4 Terapeuta de clínica diferente da do paciente -> 403
    vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: terapeutaAutorId, clinica_id: clinicaAId, is_super_admin: false, status_ativo: true },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteIdValido, clinica_id: clinicaBId, status_ativo: true },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    }) as unknown as typeof supabase.from);

    const resClinicaDif = await AuditoriaService.validarAcessoLinhaDoTempo(sessaoId, { id: terapeutaAutorId });
    expect(resClinicaDif.autorizado).toBe(false);
    expect(resClinicaDif.statusHttp).toBe(403);

    // 8.5 Terapeuta da mesma clínica mas sem vínculo em terapeuta_paciente -> 403
    vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: terapeutaAutorId, clinica_id: clinicaAId, is_super_admin: false, status_ativo: true },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteIdValido, clinica_id: clinicaAId, status_ativo: true },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'terapeuta_paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    }) as unknown as typeof supabase.from);

    const resSemVinculo = await AuditoriaService.validarAcessoLinhaDoTempo(sessaoId, { id: terapeutaAutorId });
    expect(resSemVinculo.autorizado).toBe(false);
    expect(resSemVinculo.statusHttp).toBe(403);

    // 8.6 Exceção no banco durante validarAcessoLinhaDoTempo -> 403 seguro
    vi.spyOn(supabase, 'from').mockImplementation(() => {
      throw new Error('DB Error');
    });
    const resExcecao = await AuditoriaService.validarAcessoLinhaDoTempo(sessaoId, { id: terapeutaAutorId });
    expect(resExcecao.autorizado).toBe(false);
    expect(resExcecao.statusHttp).toBe(403);

    // 8.7 listarPorSessao e obterEstatisticas e listarComFiltros (SuperAdmin via DB)
    expect(await AuditoriaService.listarPorSessao('uuid-invalido')).toEqual([]);
    vi.spyOn(AuditoriaModel, 'buscarPorSessaoId').mockResolvedValue([]);
    expect(await AuditoriaService.listarPorSessao(sessaoId)).toEqual([]);

    vi.spyOn(AuditoriaModel, 'obterEstatisticas').mockResolvedValue({
      totalEventos: 3,
      acessosProntuario: 1,
      sessoesEIntervencoes: 2,
      alertasSeguranca: 0,
    });
    const stats = await AuditoriaService.obterEstatisticas({ id: terapeutaAutorId });
    expect(stats.totalEventos).toBe(3);

    vi.spyOn(AuditoriaModel, 'listarComFiltros').mockResolvedValue({ auditoria: [], total: 0 });
    vi.spyOn(supabase, 'from').mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { is_super_admin: true, clinica_id: null },
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);
    const listaSuperDb = await AuditoriaService.listarComFiltros({}, { id: terapeutaAutorId });
    expect(listaSuperDb.total).toBe(0);
  });
});
