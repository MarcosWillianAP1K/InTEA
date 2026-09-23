import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verificarVisibilidadePaciente } from '../middlewares/visibilidade.middleware.js';
import { supabase } from '../supabase/supabase.client.js';

describe('Core Middleware: Visibilidade por Vínculo (verificarVisibilidadePaciente)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const pacienteValidoId = '123e4567-e89b-12d3-a456-426614174000';
  const terapeutaValidoId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const clinicaId = '987fcdeb-51a2-43f7-9012-345678901234';

  it('deve retornar 400 se o ID do paciente for ausente ou inválido', async () => {
    const req: any = {
      params: { id: 'invalido-uuid' },
      user: { id: terapeutaValidoId },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await verificarVisibilidadePaciente(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('UUID válido') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 se o usuário não estiver autenticado (sem req.user)', async () => {
    const req: any = {
      params: { id: pacienteValidoId },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await verificarVisibilidadePaciente(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('autenticado') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 404 se o paciente não existir no banco de dados', async () => {
    const req: any = {
      params: { id: pacienteValidoId },
      user: { id: terapeutaValidoId },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    // Mock consulta de paciente retornando nulo
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    } as any);

    await verificarVisibilidadePaciente(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Paciente não encontrado.' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve permitir acesso (next) para SuperAdmin via user_metadata', async () => {
    const req: any = {
      params: { id: pacienteValidoId },
      user: { id: terapeutaValidoId, user_metadata: { is_super_admin: true } },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: pacienteValidoId, clinica_id: clinicaId, status_ativo: true },
            error: null,
          }),
        }),
      }),
    } as any);

    await verificarVisibilidadePaciente(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve permitir acesso (next) para SuperAdmin registrado na tabela terapeuta', async () => {
    const req: any = {
      params: { id: pacienteValidoId },
      user: { id: terapeutaValidoId },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

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
        } as any;
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
        } as any;
      }
      return {} as any;
    });

    await verificarVisibilidadePaciente(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('deve retornar 403 se o terapeuta estiver com status inativo', async () => {
    const req: any = {
      params: { id: pacienteValidoId },
      user: { id: terapeutaValidoId },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

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
        } as any;
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
        } as any;
      }
      return {} as any;
    });

    await verificarVisibilidadePaciente(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('inativa') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 403 se terapeuta for de clínica diferente da clínica do paciente', async () => {
    const req: any = {
      params: { id: pacienteValidoId },
      user: { id: terapeutaValidoId },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

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
        } as any;
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
        } as any;
      }
      return {} as any;
    });

    await verificarVisibilidadePaciente(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('clínica diferente') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 403 se terapeuta da mesma clínica não possuir vínculo com o paciente', async () => {
    const req: any = {
      params: { id: pacienteValidoId },
      user: { id: terapeutaValidoId },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

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
        } as any;
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
        } as any;
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
        } as any;
      }
      return {} as any;
    });

    await verificarVisibilidadePaciente(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('não possui vínculo ativo') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve permitir acesso (next) se terapeuta ativo da mesma clínica possuir vínculo cadastrado', async () => {
    const req: any = {
      params: { id: pacienteValidoId },
      user: { id: terapeutaValidoId },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

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
        } as any;
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
        } as any;
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
        } as any;
      }
      return {} as any;
    });

    await verificarVisibilidadePaciente(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
