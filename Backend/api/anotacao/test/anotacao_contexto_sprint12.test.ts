// ==============================================================================
// InTEA: Testes de Integração e Unidade - Sprint 12 (Card 1.1)
// Enriquecimento de Autoria, Reativação e Filtros Avançados de Anotações Clínicas
// ==============================================================================
// Conformidade Estrita:
// - TypeScript Estrito: Sem 'any'
// - RF16 (Anotações Clínicas no Prontuário)
// - RF21 (Autoria Indelével via JWT e Enriquecimento sem UUID cru)
// - RN04 (Visibilidade Institucional por Vínculo e Clínica)
// - RN05 (Inalterabilidade e Reativação de Histórico Clínico / Soft Delete)
// - Envelope Pattern: { data: { ... }, message: "..." }
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  AnotacaoClinicaModel,
  AnotacaoClinica,
  FiltrosAnotacaoDTO,
} from '../models/anotacao.model.js';
import { AnotacaoService } from '../services/anotacao.service.js';
import { AnotacaoPacienteController } from '../controllers/anotacao-paciente.controller.js';
import {
  resolverContextoAnotacaoParaReativar,
} from '../middlewares/anotacao-contexto.middleware.js';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

interface MockResponseContext {
  statusCode: number;
  jsonData: Record<string, unknown> | null;
  headers: Record<string, string>;
  isSent: boolean;
}

function criarMockExpress(
  reqOverrides: Partial<AuthenticatedRequest> = {}
): {
  req: AuthenticatedRequest;
  res: Response;
  next: NextFunction;
  context: MockResponseContext;
} {
  const context: MockResponseContext = {
    statusCode: 200,
    jsonData: null,
    headers: {},
    isSent: false,
  };

  const req = {
    headers: { authorization: 'Bearer token-jwt-valido' },
    params: {},
    query: {},
    body: {},
    ...reqOverrides,
  } as unknown as AuthenticatedRequest;

  const res = {
    status: vi.fn().mockImplementation((code: number) => {
      context.statusCode = code;
      return res;
    }),
    json: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      context.jsonData = data;
      context.isSent = true;
      return res;
    }),
    send: vi.fn().mockImplementation(() => {
      context.isSent = true;
      return res;
    }),
    setHeader: vi.fn().mockImplementation((key: string, value: string) => {
      context.headers[key] = value;
      return res;
    }),
  } as unknown as Response;

  const next = vi.fn() as unknown as NextFunction;

  return { req, res, next, context };
}

function obterHandlersRota(
  router: unknown,
  path: string,
  method: string
): Array<(req: Request, res: Response, next: NextFunction) => Promise<void> | void> {
  const routerAny = router as { stack: Array<{ route?: { path: string; methods?: Record<string, boolean>; stack: Array<{ handle: (req: Request, res: Response, next: NextFunction) => Promise<void> | void }> } }> };
  const layer = routerAny.stack.find(
    (l) => l.route?.path === path && l.route?.methods?.[method.toLowerCase()]
  );
  if (!layer?.route?.stack) {
    throw new Error(`Rota ${method.toUpperCase()} ${path} não encontrada no router`);
  }
  return layer.route.stack.map((s) => s.handle);
}

function executarPipeline(
  handlers: Array<(req: Request, res: Response, next: NextFunction) => Promise<void> | void>,
  req: Request,
  res: Response
): Promise<void> {
  return new Promise((resolve, reject) => {
    let idx = 0;

    const originalJson = res.json?.bind(res);
    const originalSend = res.send?.bind(res);

    res.json = ((data: unknown) => {
      const ret = originalJson ? originalJson(data) : res;
      resolve();
      return ret;
    }) as unknown as typeof res.json;

    res.send = ((data?: unknown) => {
      const ret = originalSend ? originalSend(data) : res;
      resolve();
      return ret;
    }) as unknown as typeof res.send;

    function next(err?: unknown): void {
      if (err) {
        reject(err);
        return;
      }
      if (idx < handlers.length) {
        const handler = handlers[idx++];
        Promise.resolve(handler(req, res, next as NextFunction)).catch(reject);
      } else {
        resolve();
      }
    }

    next();
  });
}

describe('Sprint 12 - Enriquecimento de Autoria, Reativação e Filtros de Anotações Clínicas', () => {
  const autorId = '11111111-1111-4111-8111-111111111111';
  const coterapeutaId = '22222222-2222-4222-8222-222222222222';
  const superAdminId = '33333333-3333-4333-8333-333333333333';
  const pacienteId = '44444444-4444-4444-8444-444444444444';
  const sessaoId = '55555555-5555-4555-8555-555555555555';
  const anotacaoId = '66666666-6666-4666-8666-666666666666';
  const clinicaId = '77777777-7777-4777-8777-777777777777';

  const mockAutorInfo = {
    id: autorId,
    nome: 'Dra. Gabriela Terapeuta',
    registro_profissional: '12345/PI',
    crefito: 'CREFITO-6789',
    especialidade: 'Integração Sensorial',
  };

  const mockAnotacaoComAutor: AnotacaoClinica = {
    id: anotacaoId,
    terapeuta_id: autorId,
    paciente_id: pacienteId,
    sessao_id: null,
    conteudo: 'Paciente demonstrou excelente autorregulação ao estímulo táctil.',
    soft_delete: false,
    created_at: '2026-10-20T14:00:00.000Z',
    updated_at: '2026-10-20T14:00:00.000Z',
    autor: mockAutorInfo,
  };

  const mockAnotacaoInativa: AnotacaoClinica = {
    ...mockAnotacaoComAutor,
    soft_delete: true,
    updated_at: '2026-10-21T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. MODEL - AnotacaoClinicaModel
  // ============================================================================
  describe('AnotacaoClinicaModel - Enriquecimento e Filtros Avançados', () => {
    it('buscarPorId: deve retornar anotação enriquecida com o autor quando retornado do Supabase', async () => {
      const mockDbRow = {
        id: anotacaoId,
        terapeuta_id: autorId,
        paciente_id: pacienteId,
        sessao_id: null,
        conteudo: 'Anotação teste enriquecida',
        soft_delete: false,
        created_at: '2026-10-20T14:00:00.000Z',
        updated_at: '2026-10-20T14:00:00.000Z',
        terapeuta: {
          id: autorId,
          nome: 'Dra. Gabriela Terapeuta',
          registro_profissional: '12345/PI',
          crefito: 'CREFITO-6789',
          especialidade: 'Integração Sensorial',
        },
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: mockDbRow,
        error: null,
      });

      const mockQueryBuilder = {
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
      };

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue(mockQueryBuilder),
      } as unknown as ReturnType<typeof supabase.from>);

      const resultado = await AnotacaoClinicaModel.buscarPorId(anotacaoId);

      expect(resultado).not.toBeNull();
      expect(resultado?.id).toBe(anotacaoId);
      expect(resultado?.autor).toBeDefined();
      expect(resultado?.autor?.nome).toBe('Dra. Gabriela Terapeuta');
      expect(resultado?.autor?.registro_profissional).toBe('12345/PI');
      expect(resultado?.autor?.crefito).toBe('CREFITO-6789');
      expect(resultado?.autor?.especialidade).toBe('Integração Sensorial');
    });

    it('buscarPorId: deve permitir incluirDeletadas = true para recuperar anotação com soft_delete = true', async () => {
      const mockDbRowInativo = {
        id: anotacaoId,
        terapeuta_id: autorId,
        paciente_id: pacienteId,
        sessao_id: null,
        conteudo: 'Anotação inativada',
        soft_delete: true,
        created_at: '2026-10-20T14:00:00.000Z',
        updated_at: '2026-10-21T10:00:00.000Z',
        terapeuta: mockAutorInfo,
      };

      const eqSpy = vi.fn().mockReturnThis();
      const mockQueryBuilder = {
        eq: eqSpy,
        maybeSingle: vi.fn().mockResolvedValue({
          data: mockDbRowInativo,
          error: null,
        }),
      };

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue(mockQueryBuilder),
      } as unknown as ReturnType<typeof supabase.from>);

      const resultado = await AnotacaoClinicaModel.buscarPorId(anotacaoId, true);

      expect(resultado).not.toBeNull();
      expect(resultado?.soft_delete).toBe(true);
      expect(eqSpy).toHaveBeenCalledWith('id', anotacaoId);
      // Quando incluirDeletadas é true, NÃO deve filtrar por soft_delete = false
      expect(eqSpy).not.toHaveBeenCalledWith('soft_delete', false);
    });

    it('listarPorPaciente: deve aplicar filtros avançados (terapeutaId, sessaoId, datas, busca)', async () => {
      const mockRows = [
        {
          id: anotacaoId,
          terapeuta_id: autorId,
          paciente_id: pacienteId,
          sessao_id: sessaoId,
          conteudo: 'Observação com foco de atenção',
          soft_delete: false,
          created_at: '2026-10-20T14:00:00.000Z',
          updated_at: '2026-10-20T14:00:00.000Z',
          terapeuta: mockAutorInfo,
        },
      ];

      const eqSpy = vi.fn().mockReturnThis();
      const gteSpy = vi.fn().mockReturnThis();
      const lteSpy = vi.fn().mockReturnThis();
      const ilikeSpy = vi.fn().mockReturnThis();
      const isSpy = vi.fn().mockReturnThis();
      const notSpy = vi.fn().mockReturnThis();
      const orderSpy = vi.fn().mockReturnThis();

      const mockQueryBuilder: Record<string, unknown> = {
        eq: eqSpy,
        order: orderSpy,
        is: isSpy,
        not: notSpy,
        gte: gteSpy,
        lte: lteSpy,
        ilike: ilikeSpy,
        then: (resolve: (val: unknown) => void) => resolve({ data: mockRows, error: null }),
      };

      // Garantir encadeamento
      eqSpy.mockReturnValue(mockQueryBuilder);
      orderSpy.mockReturnValue(mockQueryBuilder);
      isSpy.mockReturnValue(mockQueryBuilder);
      notSpy.mockReturnValue(mockQueryBuilder);
      gteSpy.mockReturnValue(mockQueryBuilder);
      lteSpy.mockReturnValue(mockQueryBuilder);
      ilikeSpy.mockReturnValue(mockQueryBuilder);

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue(mockQueryBuilder),
      } as unknown as ReturnType<typeof supabase.from>);

      const filtros: FiltrosAnotacaoDTO = {
        terapeutaId: autorId,
        sessaoId: sessaoId,
        somenteSemSessao: false,
        incluirDeletadas: false,
        dataInicio: '2026-10-01T00:00:00.000Z',
        dataFim: '2026-10-31T23:59:59.000Z',
        busca: 'atenção',
      };

      const resultado = await AnotacaoClinicaModel.listarPorPaciente(pacienteId, false, false, filtros);

      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado).toHaveLength(1);
      expect(resultado[0].autor?.nome).toBe('Dra. Gabriela Terapeuta');
      expect(eqSpy).toHaveBeenCalledWith('paciente_id', pacienteId);
      expect(eqSpy).toHaveBeenCalledWith('terapeuta_id', autorId);
      expect(eqSpy).toHaveBeenCalledWith('sessao_id', sessaoId);
      expect(gteSpy).toHaveBeenCalledWith('created_at', filtros.dataInicio);
      expect(lteSpy).toHaveBeenCalledWith('created_at', filtros.dataFim);
      expect(ilikeSpy).toHaveBeenCalledWith('conteudo', '%atenção%');
    });

    it('reativar: deve atualizar soft_delete = false e updated_at no banco', async () => {
      const mockReativadaRow = {
        id: anotacaoId,
        terapeuta_id: autorId,
        paciente_id: pacienteId,
        sessao_id: null,
        conteudo: 'Anotação reativada com sucesso',
        soft_delete: false,
        created_at: '2026-10-20T14:00:00.000Z',
        updated_at: '2026-10-27T12:00:00.000Z',
        terapeuta: mockAutorInfo,
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockReativadaRow,
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        update: mockUpdate,
      } as unknown as ReturnType<typeof supabase.from>);

      const resultado = await AnotacaoClinicaModel.reativar(anotacaoId);

      expect(resultado).not.toBeNull();
      expect(resultado?.soft_delete).toBe(false);
      expect(resultado?.autor?.nome).toBe('Dra. Gabriela Terapeuta');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          soft_delete: false,
        })
      );
      expect(mockEq).toHaveBeenCalledWith('id', anotacaoId);
    });
  });

  // ============================================================================
  // 2. SERVICE - AnotacaoService
  // ============================================================================
  describe('AnotacaoService - Regras de Negócio e Autoria RF21', () => {
    it('listarAnotacoesPaciente: deve repassar filtros ao model e retornar 200', async () => {
      const mockLista = [mockAnotacaoComAutor];
      const spyModel = vi.spyOn(AnotacaoClinicaModel, 'listarPorPaciente').mockResolvedValue(mockLista);

      const filtros: FiltrosAnotacaoDTO = {
        busca: 'sensorial',
        terapeutaId: autorId,
      };

      const res = await AnotacaoService.listarAnotacoesPaciente(pacienteId, filtros);

      expect(res.sucesso).toBe(true);
      expect(res.status).toBe(200);
      expect(res.dados).toEqual(mockLista);
      expect(spyModel).toHaveBeenCalledWith(pacienteId, false, false, filtros);
    });

    it('reativar: deve retornar 400 se o UUID for inválido', async () => {
      const res = await AnotacaoService.reativar('invalido-nao-uuid', autorId);

      expect(res.sucesso).toBe(false);
      expect(res.status).toBe(400);
      expect(res.erro).toContain('ID inválido');
    });

    it('reativar: deve retornar 404 se a anotação não for encontrada no banco', async () => {
      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(null);

      const res = await AnotacaoService.reativar(anotacaoId, autorId);

      expect(res.sucesso).toBe(false);
      expect(res.status).toBe(404);
      expect(res.erro).toContain('Anotação clínica não encontrada');
    });

    it('reativar: deve retornar 403 se o usuário logado não for o autor e não for SuperAdmin (RF21)', async () => {
      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacaoInativa);

      const res = await AnotacaoService.reativar(anotacaoId, coterapeutaId, false);

      expect(res.sucesso).toBe(false);
      expect(res.status).toBe(403);
      expect(res.erro).toContain('apenas o terapeuta autor ou SuperAdmin pode reativar');
    });

    it('reativar: deve permitir reativação com sucesso (200 OK) quando requisitado pelo próprio autor', async () => {
      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacaoInativa);
      vi.spyOn(AnotacaoClinicaModel, 'reativar').mockResolvedValue(mockAnotacaoComAutor);

      const res = await AnotacaoService.reativar(anotacaoId, autorId, false);

      expect(res.sucesso).toBe(true);
      expect(res.status).toBe(200);
      expect(res.dados?.soft_delete).toBe(false);
    });

    it('reativar: deve permitir reativação com sucesso (200 OK) quando requisitado por SuperAdmin', async () => {
      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacaoInativa);
      vi.spyOn(AnotacaoClinicaModel, 'reativar').mockResolvedValue(mockAnotacaoComAutor);

      const res = await AnotacaoService.reativar(anotacaoId, superAdminId, true);

      expect(res.sucesso).toBe(true);
      expect(res.status).toBe(200);
      expect(res.dados?.soft_delete).toBe(false);
    });

    it('reativar: deve retornar 500 se o model falhar ao persistir', async () => {
      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacaoInativa);
      vi.spyOn(AnotacaoClinicaModel, 'reativar').mockResolvedValue(null);

      const res = await AnotacaoService.reativar(anotacaoId, autorId, false);

      expect(res.sucesso).toBe(false);
      expect(res.status).toBe(500);
      expect(res.erro).toContain('Erro ao reativar');
    });
  });

  // ============================================================================
  // 3. MIDDLEWARE - resolverContextoAnotacaoParaReativar
  // ============================================================================
  describe('Middleware - resolverContextoAnotacaoParaReativar', () => {
    it('deve retornar 400 se o id nos parâmetros for inválido', async () => {
      const { req, res, next, context } = criarMockExpress({
        params: { id: 'uuid-invalido' },
      });

      await resolverContextoAnotacaoParaReativar(req, res, next);

      expect(context.statusCode).toBe(400);
      expect(context.jsonData).toEqual({ error: 'ID de anotação inválido. Forneça um UUID válido.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve retornar 404 se a anotação não existir', async () => {
      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(null);

      const { req, res, next, context } = criarMockExpress({
        params: { id: anotacaoId },
      });

      await resolverContextoAnotacaoParaReativar(req, res, next);

      expect(context.statusCode).toBe(404);
      expect(context.jsonData).toEqual({ error: 'Anotação clínica não encontrada.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve carregar anotação inativa e injetar req.pacienteAlvoId e req.contextoAnotacao', async () => {
      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacaoInativa);

      const { req, res, next } = criarMockExpress({
        params: { id: anotacaoId },
      });

      await resolverContextoAnotacaoParaReativar(req, res, next);

      expect(req.pacienteAlvoId).toBe(pacienteId);
      expect(req.contextoAnotacao).toEqual(mockAnotacaoInativa);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // 4. CONTROLLER - AnotacaoPacienteController (Filtros e Reativação)
  // ============================================================================
  describe('Controller - AnotacaoPacienteController (Filtros e Reativação)', () => {
    it('listarPorPaciente: deve extrair parâmetros de query e repassar filtros avançados', async () => {
      const spyService = vi.spyOn(AnotacaoService, 'listarAnotacoesPaciente').mockResolvedValue({
        sucesso: true,
        status: 200,
        dados: [mockAnotacaoComAutor],
      });

      const { req, res, context } = criarMockExpress({
        params: { pacienteId },
        query: {
          terapeutaId: autorId,
          busca: 'sensorial',
          dataInicio: '2026-10-01',
          dataFim: '2026-10-31',
          pagina: '1',
          limite: '10',
        },
      });

      await AnotacaoPacienteController.listarPorPaciente(req, res);

      expect(context.statusCode).toBe(200);
      expect(spyService).toHaveBeenCalledWith(
        pacienteId,
        expect.objectContaining({
          terapeutaId: autorId,
          busca: 'sensorial',
          dataInicio: '2026-10-01',
          dataFim: '2026-10-31',
        })
      );
      expect(context.jsonData).toEqual(
        expect.objectContaining({
          data: {
            anotacoes: [mockAnotacaoComAutor],
            meta: {
              total: 1,
              pagina: 1,
              limite: 10,
            },
          },
          message: 'Anotações clínicas do paciente listadas com sucesso.',
        })
      );
    });

    it('reativar: deve retornar 401 se identificação do terapeuta não constar no token', async () => {
      const { req, res, context } = criarMockExpress({
        params: { id: anotacaoId },
        user: undefined,
      });

      await AnotacaoPacienteController.reativar(req, res);

      expect(context.statusCode).toBe(401);
      expect(context.jsonData).toEqual({
        error: 'Acesso não autorizado: identificação do terapeuta não encontrada no token de autenticação.',
      });
    });

    it('reativar: deve retornar 200 com Envelope Pattern categorizado em data.anotacao', async () => {
      vi.spyOn(AnotacaoService, 'reativar').mockResolvedValue({
        sucesso: true,
        status: 200,
        dados: mockAnotacaoComAutor,
      });

      const { req, res, context } = criarMockExpress({
        params: { id: anotacaoId },
        user: { id: autorId, email: 'autor@intea.com.br', is_super_admin: false },
      });

      await AnotacaoPacienteController.reativar(req, res);

      expect(context.statusCode).toBe(200);
      expect(context.jsonData).toEqual({
        data: {
          anotacao: mockAnotacaoComAutor,
        },
        message: 'Anotação clínica reativada com sucesso.',
      });
    });
  });

  // ============================================================================
  // 5. PIPELINE EXPRESS E INTEGRAÇÃO DE ROTAS (PATCH /api/anotacao/:id/reativar)
  // Conformidade: RF21, RN04 (Vínculo e Clínica) e RN05 (Reativação de Prontuário)
  // ============================================================================
  describe('Pipeline Completo - PATCH /api/anotacao/:id/reativar', () => {
    it('deve reativar com 200 OK quando o autor requisita e possui vínculo institucional ativo (RN04)', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersRota(anotacaoRoutes, '/:id/reativar', 'patch');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: autorId } },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacaoInativa);
      vi.spyOn(AnotacaoClinicaModel, 'reativar').mockResolvedValue(mockAnotacaoComAutor);

      // Mock de verificação de visibilidade institucional (RN04)
      vi.spyOn(supabase, 'from').mockImplementation(((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: autorId, clinica_id: clinicaId, status_ativo: true, is_super_admin: false },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta_paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { paciente_id: pacienteId, terapeuta_id: autorId },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }) as unknown as typeof supabase.from);

      const { req, res, context } = criarMockExpress({
        params: { id: anotacaoId },
      });

      await executarPipeline(handlers, req, res);

      expect(context.statusCode).toBe(200);
      expect(context.jsonData).toEqual({
        data: {
          anotacao: mockAnotacaoComAutor,
        },
        message: 'Anotação clínica reativada com sucesso.',
      });
    });

    it('deve reativar com 200 OK quando SuperAdmin requisita mesmo sem autoria direta', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersRota(anotacaoRoutes, '/:id/reativar', 'patch');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: {
          user: {
            id: superAdminId,
            is_super_admin: true,
            user_metadata: { is_super_admin: true },
          },
        },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacaoInativa);
      vi.spyOn(AnotacaoClinicaModel, 'reativar').mockResolvedValue(mockAnotacaoComAutor);

      vi.spyOn(supabase, 'from').mockImplementation(((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: superAdminId, clinica_id: clinicaId, status_ativo: true, is_super_admin: true },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }) as unknown as typeof supabase.from);

      const { req, res, context } = criarMockExpress({
        params: { id: anotacaoId },
      });

      await executarPipeline(handlers, req, res);

      expect(context.statusCode).toBe(200);
      expect(context.jsonData).toEqual({
        data: {
          anotacao: mockAnotacaoComAutor,
        },
        message: 'Anotação clínica reativada com sucesso.',
      });
    });

    it('deve retornar 403 Forbidden se terapeuta não possuir vínculo ativo com o paciente (RN04)', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersRota(anotacaoRoutes, '/:id/reativar', 'patch');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: autorId } },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacaoInativa);

      vi.spyOn(supabase, 'from').mockImplementation(((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: autorId, clinica_id: clinicaId, status_ativo: true, is_super_admin: false },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta_paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null, // Sem vínculo ativo!
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }) as unknown as typeof supabase.from);

      const { req, res, context } = criarMockExpress({
        params: { id: anotacaoId },
      });

      await executarPipeline(handlers, req, res);

      expect(context.statusCode).toBe(403);
      expect(context.jsonData?.error).toMatch(/vínculo ativo/i);
    });

    it('deve retornar 403 Forbidden se coterapeuta (mesma clínica e vínculo) tentar reativar anotação alheia (RF21)', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersRota(anotacaoRoutes, '/:id/reativar', 'patch');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: coterapeutaId } },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacaoInativa);

      vi.spyOn(supabase, 'from').mockImplementation(((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: coterapeutaId, clinica_id: clinicaId, status_ativo: true, is_super_admin: false },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta_paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { paciente_id: pacienteId, terapeuta_id: coterapeutaId },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }) as unknown as typeof supabase.from);

      const { req, res, context } = criarMockExpress({
        params: { id: anotacaoId },
      });

      await executarPipeline(handlers, req, res);

      expect(context.statusCode).toBe(403);
      expect(context.jsonData?.error).toContain('apenas o terapeuta autor ou SuperAdmin pode reativar');
    });
  });

  // ============================================================================
  // 6. PIPELINES DE CRIAÇÃO, EDIÇÃO E SOFT DELETE (RF21, RN04, RN05)
  // ============================================================================
  describe('Pipeline Completo - POST /api/anotacao (Criação com Autoria JWT e Vínculo Institucional - RF21 e RN04)', () => {
    it('deve criar anotação clínica com 201 Created extraindo autoria diretamente do JWT (RF21)', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersRota(anotacaoRoutes, '/', 'post');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: autorId } },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

      vi.spyOn(AnotacaoClinicaModel, 'criar').mockResolvedValue(mockAnotacaoComAutor);

      vi.spyOn(supabase, 'from').mockImplementation(((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: autorId, clinica_id: clinicaId, status_ativo: true, is_super_admin: false },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta_paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { paciente_id: pacienteId, terapeuta_id: autorId },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }) as unknown as typeof supabase.from);

      const { req, res, context } = criarMockExpress({
        body: {
          paciente_id: pacienteId,
          conteudo: 'Paciente demonstrou excelente autorregulação ao estímulo táctil.',
        },
      });

      await executarPipeline(handlers, req, res);

      expect(context.statusCode).toBe(201);
      expect(context.jsonData?.message).toBe('Anotação clínica registrada com sucesso.');
      const anotacao = (context.jsonData?.data as { anotacao: AnotacaoClinica })?.anotacao;
      expect(anotacao).toBeDefined();
      expect(anotacao.id).toBe(anotacaoId);
      expect(anotacao.terapeuta_id).toBe(autorId);
    });

    it('deve retornar 403 Forbidden se terapeuta não possuir vínculo institucional com o paciente (RN04)', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersRota(anotacaoRoutes, '/', 'post');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: autorId } },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

      vi.spyOn(supabase, 'from').mockImplementation(((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: autorId, clinica_id: clinicaId, status_ativo: true, is_super_admin: false },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta_paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null, // Sem vínculo ativo
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }) as unknown as typeof supabase.from);

      const { req, res, context } = criarMockExpress({
        body: {
          paciente_id: pacienteId,
          conteudo: 'Tentativa sem vínculo.',
        },
      });

      await executarPipeline(handlers, req, res);

      expect(context.statusCode).toBe(403);
      expect(context.jsonData?.error).toMatch(/vínculo|clinica/i);
    });
  });

  describe('Pipeline Completo - PATCH /api/anotacao/:id (Edição Restrita ao Autor - RF21)', () => {
    it('deve atualizar anotação clínica com 200 OK quando requisitado pelo próprio autor (RF21)', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersRota(anotacaoRoutes, '/:id', 'patch');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: autorId } },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacaoComAutor);
      vi.spyOn(AnotacaoClinicaModel, 'atualizar').mockResolvedValue({
        ...mockAnotacaoComAutor,
        conteudo: 'Conteúdo atualizado pelo autor.',
      });

      vi.spyOn(supabase, 'from').mockImplementation(((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: autorId, clinica_id: clinicaId, status_ativo: true, is_super_admin: false },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta_paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { paciente_id: pacienteId, terapeuta_id: autorId },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }) as unknown as typeof supabase.from);

      const { req, res, context } = criarMockExpress({
        params: { id: anotacaoId },
        body: { conteudo: 'Conteúdo atualizado pelo autor.' },
      });

      await executarPipeline(handlers, req, res);

      expect(context.statusCode).toBe(200);
      expect(context.jsonData?.message).toBe('Anotação clínica atualizada com sucesso.');
    });

    it('deve retornar 403 Forbidden quando outro terapeuta tentar editar anotação alheia (RF21)', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersRota(anotacaoRoutes, '/:id', 'patch');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: coterapeutaId } },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacaoComAutor);

      vi.spyOn(supabase, 'from').mockImplementation(((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: coterapeutaId, clinica_id: clinicaId, status_ativo: true, is_super_admin: false },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta_paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { paciente_id: pacienteId, terapeuta_id: coterapeutaId },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }) as unknown as typeof supabase.from);

      const { req, res, context } = criarMockExpress({
        params: { id: anotacaoId },
        body: { conteudo: 'Tentativa indevida de alteração.' },
      });

      await executarPipeline(handlers, req, res);

      expect(context.statusCode).toBe(403);
      expect(context.jsonData?.error).toMatch(/apenas o terapeuta autor/i);
    });
  });

  describe('Pipeline Completo - DELETE /api/anotacao/:id (Soft Delete Imutável - RN05 e RF21)', () => {
    it('deve aplicar soft delete com 200 OK preservando o histórico clínico quando requisitado pelo autor (RN05)', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersRota(anotacaoRoutes, '/:id', 'delete');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: autorId } },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacaoComAutor);
      vi.spyOn(AnotacaoClinicaModel, 'softDelete').mockResolvedValue(true);

      vi.spyOn(supabase, 'from').mockImplementation(((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: autorId, clinica_id: clinicaId, status_ativo: true, is_super_admin: false },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta_paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { paciente_id: pacienteId, terapeuta_id: autorId },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }) as unknown as typeof supabase.from);

      const { req, res, context } = criarMockExpress({
        params: { id: anotacaoId },
      });

      await executarPipeline(handlers, req, res);

      expect(context.statusCode).toBe(200);
      expect(context.jsonData?.message).toBe('Anotação clínica desativada com sucesso (soft delete aplicado).');
      const anotacao = (context.jsonData?.data as { anotacao: AnotacaoClinica })?.anotacao;
      expect(anotacao.soft_delete).toBe(true);
    });

    it('deve retornar 403 Forbidden quando coterapeuta tentar desativar anotação alheia (RF21)', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersRota(anotacaoRoutes, '/:id', 'delete');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: coterapeutaId } },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacaoComAutor);

      vi.spyOn(supabase, 'from').mockImplementation(((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: coterapeutaId, clinica_id: clinicaId, status_ativo: true, is_super_admin: false },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tabela === 'terapeuta_paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { paciente_id: pacienteId, terapeuta_id: coterapeutaId },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }) as unknown as typeof supabase.from);

      const { req, res, context } = criarMockExpress({
        params: { id: anotacaoId },
      });

      await executarPipeline(handlers, req, res);

      expect(context.statusCode).toBe(403);
      expect(context.jsonData?.error).toMatch(/apenas o terapeuta autor/i);
    });
  });
});
