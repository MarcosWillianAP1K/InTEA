import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService, AdminServiceError } from '../services/admin.service.js';
import { AdminController } from '../controllers/admin.controller.js';
import { adminRoutes } from '../routes/admin.routes.js';
import { superAdminMiddleware } from '../../../core/middlewares/admin.middleware.js';
import { supabase } from '../../../core/supabase/supabase.client.js';
import type { Request, Response, NextFunction } from 'express';

function criarMocks(
  body: Record<string, unknown> = {},
  params: Record<string, string> = {},
  query: Record<string, string> = {},
  user: Record<string, unknown> | null = { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }
) {
  let statusCode = 200;
  let jsonResult: unknown = null;

  const mockReq = {
    body,
    params,
    query,
    user,
    headers: {},
  } as unknown as Request;

  const mockRes = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: unknown) {
      jsonResult = data;
      return this;
    },
  } as unknown as Response;

  return { mockReq, mockRes, getStatus: () => statusCode, getJson: () => jsonResult };
}

describe('Feature Admin: Endpoints Administrativos para Gestão Global de Clínicas e Terapeutas (RF07, RF08)', () => {
  const clinicaIdValida = '123e4567-e89b-12d3-a456-426614174000';
  const terapeutaIdValido = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Critério 1: Middleware superAdminMiddleware de Proteção de Rotas', () => {
    it('deve exportar adminRoutes e superAdminMiddleware configurados', () => {
      expect(adminRoutes).toBeDefined();
      expect(typeof adminRoutes).toBe('function');
      expect(superAdminMiddleware).toBeDefined();
      expect(typeof superAdminMiddleware).toBe('function');
    });

    it('deve retornar 401 Unauthorized se usuário não estiver autenticado (sem req.user)', async () => {
      const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, {}, {}, null);
      const next = vi.fn() as NextFunction;

      await superAdminMiddleware(mockReq as any, mockRes, next);

      expect(getStatus()).toBe(401);
      expect(getJson()).toMatchObject({
        error: expect.stringContaining('autenticado'),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve retornar 403 Forbidden se o terapeuta não for super admin', async () => {
      const { mockReq, mockRes, getStatus, getJson } = criarMocks();
      const next = vi.fn() as NextFunction;

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { is_super_admin: false, status_ativo: true },
              error: null,
            }),
          }),
        }),
      } as any);

      await superAdminMiddleware(mockReq as any, mockRes, next);

      expect(getStatus()).toBe(403);
      expect(getJson()).toMatchObject({
        error: expect.stringContaining('restrita a administradores'),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve autorizar e chamar next() quando o usuário for um SuperAdmin ativo', async () => {
      const { mockReq, mockRes } = criarMocks();
      const next = vi.fn() as NextFunction;

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { is_super_admin: true, status_ativo: true },
              error: null,
            }),
          }),
        }),
      } as any);

      await superAdminMiddleware(mockReq as any, mockRes, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Critério 2: Gestão Institucional de Clínicas (CRUD, Ativação e Desativação)', () => {
    describe('AdminService - Clínicas', () => {
      it('listarClinicas deve retornar dados paginados e metadados', async () => {
        const clinicasMock = [
          { id: clinicaIdValida, nome: 'Clínica InTEA Teresina', cnpj: '12.345.678/0001-90', status_ativo: true },
        ];

        vi.spyOn(supabase, 'from').mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: clinicasMock,
                count: 1,
                error: null,
              }),
            }),
          }),
        } as any);

        const resultado = await AdminService.listarClinicas({ page: 1, limit: 10 });

        expect(resultado.itens).toHaveLength(1);
        expect(resultado.meta.total).toBe(1);
        expect(resultado.meta.totalPages).toBe(1);
      });

      it('buscarClinicaPorId deve lançar 400 se o ID não for UUID válido', async () => {
        await expect(AdminService.buscarClinicaPorId('id-invalido')).rejects.toMatchObject({
          statusCode: 400,
        });
      });

      it('buscarClinicaPorId deve lançar 404 se a clínica não existir', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        } as any);

        await expect(AdminService.buscarClinicaPorId(clinicaIdValida)).rejects.toMatchObject({
          statusCode: 404,
        });
      });

      it('criarClinica deve validar nome obrigatório', async () => {
        await expect(AdminService.criarClinica({ nome: 'ab' })).rejects.toMatchObject({
          statusCode: 400,
        });
      });

      it('criarClinica deve criar e retornar registro com sucesso', async () => {
        const novaClinica = {
          id: clinicaIdValida,
          nome: 'Clínica Neuro TEA',
          cnpj: '99.888.777/0001-11',
          status_ativo: true,
        };

        const mockInsert = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: novaClinica, error: null }),
          }),
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert: mockInsert,
        } as any);

        const criada = await AdminService.criarClinica({
          nome: 'Clínica Neuro TEA',
          cnpj: '99.888.777/0001-11',
        });

        expect(criada.id).toBe(clinicaIdValida);
        expect(criada.status_ativo).toBe(true);
      });

      it('ativarClinica e desativarClinica devem alterar status_ativo', async () => {
        const clinicaBase = { id: clinicaIdValida, nome: 'Clínica Centro', status_ativo: true };

        vi.spyOn(AdminService, 'buscarClinicaPorId').mockResolvedValue(clinicaBase as any);

        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...clinicaBase, status_ativo: false },
                error: null,
              }),
            }),
          }),
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          update: mockUpdate,
        } as any);

        const desativada = await AdminService.desativarClinica(clinicaIdValida);
        expect(desativada.status_ativo).toBe(false);
      });
    });

    describe('AdminController - Clínicas (Envelope Pattern e Códigos HTTP)', () => {
      it('listarClinicas deve retornar 200 e Envelope Pattern categorizado', async () => {
        const { mockReq, mockRes, getStatus, getJson } = criarMocks();

        vi.spyOn(AdminService, 'listarClinicas').mockResolvedValue({
          itens: [{ id: clinicaIdValida, nome: 'Clínica A', cnpj: null, status_ativo: true, created_at: '', updated_at: '' }],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        });

        await AdminController.listarClinicas(mockReq, mockRes);

        expect(getStatus()).toBe(200);
        const json = getJson() as any;
        expect(json.data.clinicas).toHaveLength(1);
        expect(json.data.meta.total).toBe(1);
        expect(json.message).toContain('sucesso');
      });

      it('criarClinica deve retornar 201 Created em envelope pattern', async () => {
        const { mockReq, mockRes, getStatus, getJson } = criarMocks({
          nome: 'Clínica Pediátrica',
          cnpj: '11.222.333/0001-44',
        });

        vi.spyOn(AdminService, 'criarClinica').mockResolvedValue({
          id: clinicaIdValida,
          nome: 'Clínica Pediátrica',
          cnpj: '11.222.333/0001-44',
          status_ativo: true,
          created_at: '',
          updated_at: '',
        });

        await AdminController.criarClinica(mockReq, mockRes);

        expect(getStatus()).toBe(201);
        const json = getJson() as any;
        expect(json.data.clinica.id).toBe(clinicaIdValida);
        expect(json.message).toContain('cadastrada');
      });

      it('desativarClinica deve retornar 200 OK com status_ativo falso', async () => {
        const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { id: clinicaIdValida });

        vi.spyOn(AdminService, 'desativarClinica').mockResolvedValue({
          id: clinicaIdValida,
          nome: 'Clínica Desativada',
          cnpj: null,
          status_ativo: false,
          created_at: '',
          updated_at: '',
        });

        await AdminController.desativarClinica(mockReq, mockRes);

        expect(getStatus()).toBe(200);
        const json = getJson() as any;
        expect(json.data.clinica.status_ativo).toBe(false);
        expect(json.message).toContain('desativada');
      });
    });
  });

  describe('Critério 2: Gestão Institucional de Terapeutas', () => {
    describe('AdminService - Terapeutas', () => {
      it('listarTerapeutas deve aceitar filtros de clinica_id e status_ativo', async () => {
        const terapeutasMock = [
          {
            id: terapeutaIdValido,
            nome: 'Dra. Ana Paula',
            email: 'ana@intea.com',
            status_ativo: true,
            is_super_admin: false,
            clinica_id: clinicaIdValida,
          },
        ];

        vi.spyOn(supabase, 'from').mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: terapeutasMock,
                  count: 1,
                  error: null,
                }),
              }),
            }),
          }),
        } as any);

        const resultado = await AdminService.listarTerapeutas({ clinica_id: clinicaIdValida });

        expect(resultado.itens).toHaveLength(1);
        expect(resultado.meta.total).toBe(1);
      });

      it('ativarTerapeuta e desativarTerapeuta devem alterar status_ativo', async () => {
        const terapeutaBase = {
          id: terapeutaIdValido,
          nome: 'Dr. Lucas',
          email: 'lucas@intea.com',
          status_ativo: true,
          is_super_admin: false,
        };

        vi.spyOn(AdminService, 'buscarTerapeutaPorId').mockResolvedValue(terapeutaBase as any);

        vi.spyOn(supabase, 'from').mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...terapeutaBase, status_ativo: false },
                  error: null,
                }),
              }),
            }),
          }),
        } as any);

        const desativado = await AdminService.desativarTerapeuta(terapeutaIdValido);
        expect(desativado.status_ativo).toBe(false);
      });
    });

    describe('AdminController - Terapeutas', () => {
      it('listarTerapeutas deve retornar 200 e lista em envelope', async () => {
        const { mockReq, mockRes, getStatus, getJson } = criarMocks();

        vi.spyOn(AdminService, 'listarTerapeutas').mockResolvedValue({
          itens: [{ id: terapeutaIdValido, nome: 'Terapeuta 1', email: 't1@teste.com', telefone: null, crefito: null, registro_profissional: null, especialidade: null, tempo_experiencia_anos: 2, clinica_id: null, is_super_admin: false, status_ativo: true, created_at: '', updated_at: '' }],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        });

        await AdminController.listarTerapeutas(mockReq, mockRes);

        expect(getStatus()).toBe(200);
        const json = getJson() as any;
        expect(json.data.terapeutas).toHaveLength(1);
        expect(json.message).toContain('sucesso');
      });

      it('ativarTerapeuta deve retornar 200 OK com confirmação de ativação', async () => {
        const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { id: terapeutaIdValido });

        vi.spyOn(AdminService, 'ativarTerapeuta').mockResolvedValue({
          id: terapeutaIdValido,
          nome: 'Terapeuta Ativado',
          email: 't@teste.com',
          telefone: null,
          crefito: null,
          registro_profissional: null,
          especialidade: null,
          tempo_experiencia_anos: 1,
          clinica_id: null,
          is_super_admin: false,
          status_ativo: true,
          created_at: '',
          updated_at: '',
        });

        await AdminController.ativarTerapeuta(mockReq, mockRes);

        expect(getStatus()).toBe(200);
        const json = getJson() as any;
        expect(json.data.terapeuta.status_ativo).toBe(true);
        expect(json.message).toContain('ativada');
      });
    });
  });

  describe('Critério 3: Consulta de Logs de Auditoria Consolidada por Instituição', () => {
    it('consultarAuditoriaConsolidada deve retornar agregações e eventos filtrados por clínica', async () => {
      vi.spyOn(AdminService, 'buscarClinicaPorId').mockResolvedValue({
        id: clinicaIdValida,
        nome: 'Clínica NeuroVida',
        cnpj: null,
        status_ativo: true,
        created_at: '',
        updated_at: '',
      });

      const terapeutasDaClinica = [{ id: terapeutaIdValido }];
      const eventosMock = [
        {
          id: 'ev-1',
          sessao_id: 'sess-1',
          terapeuta_id: terapeutaIdValido,
          origem: 'terapeuta_web',
          acao: 'sessao_criada',
          detalhes_json: {},
          ip: '127.0.0.1',
          user_agent: 'Chrome',
          created_at: new Date().toISOString(),
          terapeuta: { id: terapeutaIdValido, nome: 'Dr. Lucas', email: 'lucas@intea.com' },
        },
      ];

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: terapeutasDaClinica, error: null }),
            }),
          } as any;
        }
        if (table === 'auditoria_sessao') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({ data: eventosMock, count: 1, error: null }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const resultado = await AdminService.consultarAuditoriaConsolidada({
        clinicaId: clinicaIdValida,
      });

      expect(resultado.auditoria).toHaveLength(1);
      expect(resultado.consolidado.totalEventos).toBe(1);
      expect(resultado.consolidado.clinica?.nome).toBe('Clínica NeuroVida');
      expect(resultado.consolidado.eventosPorAcao['sessao_criada']).toBe(1);
      expect(resultado.consolidado.totalTerapeutasAtivos).toBe(1);
    });

    it('AdminController.consultarAuditoriaConsolidada deve formatar envelope com consolidado e meta', async () => {
      const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, {}, { clinicaId: clinicaIdValida });

      vi.spyOn(AdminService, 'consultarAuditoriaConsolidada').mockResolvedValue({
        auditoria: [],
        consolidado: {
          totalEventos: 0,
          totalTerapeutasAtivos: 0,
          eventosPorAcao: {},
          clinica: { id: clinicaIdValida, nome: 'Clínica A' },
        },
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      await AdminController.consultarAuditoriaConsolidada(mockReq, mockRes);

      expect(getStatus()).toBe(200);
      const json = getJson() as any;
      expect(json.data.auditoria).toBeDefined();
      expect(json.data.consolidado).toBeDefined();
      expect(json.data.meta).toBeDefined();
      expect(json.message).toContain('consolidados');
    });
  });
});
