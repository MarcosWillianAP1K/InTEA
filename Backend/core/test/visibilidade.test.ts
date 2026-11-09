import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response, NextFunction } from 'express';
import { verificarVisibilidadePaciente } from '../middlewares/visibilidade.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabase } from '../supabase/supabase.client.js';

interface MockResponse {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  body: Record<string, unknown>;
}

function criarMockRes(): MockResponse {
  const res: MockResponse = {
    body: {},
    status: vi.fn().mockReturnThis(),
    json: vi.fn((payload: Record<string, unknown>) => {
      res.body = payload;
      return res;
    }),
  };
  return res;
}

describe('Core Middleware: Visibilidade por Vínculo (verificarVisibilidadePaciente)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const pacienteValidoId = '123e4567-e89b-12d3-a456-426614174000';
  const terapeutaValidoId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const clinicaId = '987fcdeb-51a2-43f7-9012-345678901234';

  it('deve permitir bypass imediato (next) para partidas em modo_livre sem paciente_id (RN01)', async () => {
    const req = {
      params: {},
      body: { modo_sessao: 'modo_livre' },
      user: { id: terapeutaValidoId },
    } as unknown as AuthenticatedRequest;
    const res = criarMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await verificarVisibilidadePaciente(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve retornar 400 se o parâmetro ID do paciente estiver ausente (vazio ou undefined)', async () => {
    const req = {
      params: {},
      body: {},
      user: { id: terapeutaValidoId },
    } as unknown as AuthenticatedRequest;
    const res = criarMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await verificarVisibilidadePaciente(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.error).toBe('O parâmetro ID do paciente é obrigatório.');
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 400 se o ID do paciente for ausente ou inválido', async () => {
    const req = {
      params: { id: 'invalido-uuid' },
      user: { id: terapeutaValidoId },
    } as unknown as AuthenticatedRequest;
    const res = criarMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await verificarVisibilidadePaciente(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('UUID válido') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve extrair pacienteId de req.pacienteAlvoId, req.params.pacienteId ou req.body.paciente_id', async () => {
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: pacienteValidoId, clinica_id: clinicaId, status_ativo: true },
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    // 1. Via req.pacienteAlvoId
    const reqAlvo = {
      pacienteAlvoId: pacienteValidoId,
      params: {},
      user: { id: terapeutaValidoId, app_metadata: { is_super_admin: true } },
    } as unknown as AuthenticatedRequest;
    const resAlvo = criarMockRes();
    const nextAlvo = vi.fn() as unknown as NextFunction;
    await verificarVisibilidadePaciente(reqAlvo, resAlvo as unknown as Response, nextAlvo);
    expect(nextAlvo).toHaveBeenCalled();

    // 2. Via req.params.pacienteId
    const reqParams = {
      params: { pacienteId: pacienteValidoId },
      user: { id: terapeutaValidoId, app_metadata: { is_super_admin: true } },
    } as unknown as AuthenticatedRequest;
    const resParams = criarMockRes();
    const nextParams = vi.fn() as unknown as NextFunction;
    await verificarVisibilidadePaciente(reqParams, resParams as unknown as Response, nextParams);
    expect(nextParams).toHaveBeenCalled();

    // 3. Via req.body.paciente_id
    const reqBody = {
      params: {},
      body: { paciente_id: pacienteValidoId },
      user: { id: terapeutaValidoId, app_metadata: { is_super_admin: true } },
    } as unknown as AuthenticatedRequest;
    const resBody = criarMockRes();
    const nextBody = vi.fn() as unknown as NextFunction;
    await verificarVisibilidadePaciente(reqBody, resBody as unknown as Response, nextBody);
    expect(nextBody).toHaveBeenCalled();
  });

  it('deve retornar 401 se o usuário não estiver autenticado (sem req.user)', async () => {
    const req = {
      params: { id: pacienteValidoId },
    } as unknown as AuthenticatedRequest;
    const res = criarMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await verificarVisibilidadePaciente(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('autenticado') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 404 se o paciente não existir no banco de dados', async () => {
    const req = {
      params: { id: pacienteValidoId },
      user: { id: terapeutaValidoId },
    } as unknown as AuthenticatedRequest;
    const res = criarMockRes();
    const next = vi.fn() as unknown as NextFunction;

    // Mock consulta de paciente retornando nulo
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    await verificarVisibilidadePaciente(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Paciente não encontrado.' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve permitir acesso (next) para SuperAdmin via user_metadata', async () => {
    const req = {
      params: { id: pacienteValidoId },
      user: { id: terapeutaValidoId, app_metadata: { is_super_admin: true } },
    } as unknown as AuthenticatedRequest;
    const res = criarMockRes();
    const next = vi.fn() as unknown as NextFunction;

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: pacienteValidoId, clinica_id: clinicaId, status_ativo: true },
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    await verificarVisibilidadePaciente(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve permitir acesso (next) para SuperAdmin registrado na tabela terapeuta', async () => {
    const req = {
      params: { id: pacienteValidoId },
      user: { id: terapeutaValidoId },
    } as unknown as AuthenticatedRequest;
    const res = criarMockRes();
    const next = vi.fn() as unknown as NextFunction;

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteValidoId, clinica_id: clinicaId, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: terapeutaValidoId, is_super_admin: true, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    await verificarVisibilidadePaciente(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('deve retornar 403 se o perfil de terapeuta associado ao token não for encontrado no banco', async () => {
    const req = {
      params: { id: pacienteValidoId },
      user: { id: terapeutaValidoId },
    } as unknown as AuthenticatedRequest;
    const res = criarMockRes();
    const next = vi.fn() as unknown as NextFunction;

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteValidoId, clinica_id: clinicaId, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    await verificarVisibilidadePaciente(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body.error).toContain('perfil de terapeuta associado ao token não encontrado');
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 403 se o terapeuta estiver com status inativo', async () => {
    const req = {
      params: { id: pacienteValidoId },
      user: { id: terapeutaValidoId },
    } as unknown as AuthenticatedRequest;
    const res = criarMockRes();
    const next = vi.fn() as unknown as NextFunction;

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteValidoId, clinica_id: clinicaId, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: terapeutaValidoId, is_super_admin: false, status_ativo: false },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    await verificarVisibilidadePaciente(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('inativa') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 403 se terapeuta for de clínica diferente da clínica do paciente', async () => {
    const req = {
      params: { id: pacienteValidoId },
      user: { id: terapeutaValidoId },
    } as unknown as AuthenticatedRequest;
    const res = criarMockRes();
    const next = vi.fn() as unknown as NextFunction;

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteValidoId, clinica_id: 'clinica-a', status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: terapeutaValidoId, clinica_id: 'clinica-b', is_super_admin: false, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    await verificarVisibilidadePaciente(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('clínica diferente') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 403 se terapeuta da mesma clínica não possuir vínculo com o paciente', async () => {
    const req = {
      params: { id: pacienteValidoId },
      user: { id: terapeutaValidoId },
    } as unknown as AuthenticatedRequest;
    const res = criarMockRes();
    const next = vi.fn() as unknown as NextFunction;

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteValidoId, clinica_id: clinicaId, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: terapeutaValidoId, clinica_id: clinicaId, is_super_admin: false, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
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
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    await verificarVisibilidadePaciente(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('não possui vínculo ativo') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve permitir acesso (next) se terapeuta ativo da mesma clínica possuir vínculo cadastrado', async () => {
    const req = {
      params: { id: pacienteValidoId },
      user: { id: terapeutaValidoId },
    } as unknown as AuthenticatedRequest;
    const res = criarMockRes();
    const next = vi.fn() as unknown as NextFunction;

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteValidoId, clinica_id: clinicaId, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: terapeutaValidoId, clinica_id: clinicaId, is_super_admin: false, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'terapeuta_paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { paciente_id: pacienteValidoId },
                  error: null,
                }),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    await verificarVisibilidadePaciente(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve retornar 500 sem expor detalhes sensíveis quando pacError, terError, vinculoError ou exceção ocorrerem no banco', async () => {
    const req = {
      params: { id: pacienteValidoId },
      user: { id: terapeutaValidoId },
    } as unknown as AuthenticatedRequest;
    const next = vi.fn() as unknown as NextFunction;

    // 1. Erro ao consultar tabela paciente (pacError)
    vi.spyOn(supabase, 'from').mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'relation "paciente" connection timeout' },
          }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    const resPacErr = criarMockRes();
    await verificarVisibilidadePaciente(req, resPacErr as unknown as Response, next);
    expect(resPacErr.status).toHaveBeenCalledWith(500);
    expect(resPacErr.body.error).toBe('Erro interno ao validar dados do paciente.');
    expect(resPacErr.body.detalhes).toBeUndefined();

    // 2. Erro ao consultar tabela terapeuta (terError)
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteValidoId, clinica_id: clinicaId, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'relation "terapeuta" deadlock detected' },
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const resTerErr = criarMockRes();
    await verificarVisibilidadePaciente(req, resTerErr as unknown as Response, next);
    expect(resTerErr.status).toHaveBeenCalledWith(500);
    expect(resTerErr.body.error).toBe('Erro interno ao consultar perfil do terapeuta.');
    expect(resTerErr.body.detalhes).toBeUndefined();

    // 3. Erro ao consultar tabela terapeuta_paciente (vinculoError)
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteValidoId, clinica_id: clinicaId, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: terapeutaValidoId, clinica_id: clinicaId, is_super_admin: false, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'terapeuta_paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'relation "terapeuta_paciente" lock timeout' },
                }),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const resVincErr = criarMockRes();
    await verificarVisibilidadePaciente(req, resVincErr as unknown as Response, next);
    expect(resVincErr.status).toHaveBeenCalledWith(500);
    expect(resVincErr.body.error).toBe('Erro interno ao validar vínculo com paciente.');
    expect(resVincErr.body.detalhes).toBeUndefined();

    // 4. Exceção inesperada lançada pelo cliente de banco (catch)
    vi.spyOn(supabase, 'from').mockImplementation(() => {
      throw new Error('FATAL: password authentication failed for user "postgres" at 10.0.0.12:5432');
    });

    const resFatal = criarMockRes();
    await verificarVisibilidadePaciente(req, resFatal as unknown as Response, next);
    expect(resFatal.status).toHaveBeenCalledWith(500);
    expect(resFatal.body.error).toBe('Erro interno ao verificar visibilidade e permissões do paciente.');
    expect(resFatal.body.detalhes).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });
});
