import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminMiddleware } from '../middlewares/admin.middleware.js';
import { supabase } from '../supabase/supabase.client.js';

describe('Core Middleware: Restrição de Administrador (adminMiddleware)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const adminId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  it('deve retornar 401 se o usuário não estiver autenticado (sem req.user)', async () => {
    const req: any = {};
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await adminMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('autenticado') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 403 se o perfil do terapeuta não for encontrado', async () => {
    const req: any = {
      user: { id: adminId },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as any);

    await adminMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('perfil de terapeuta') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 403 se o terapeuta estiver com conta inativa', async () => {
    const req: any = {
      user: { id: adminId },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { is_super_admin: true, status_ativo: false },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as any);

    await adminMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('inativa') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 403 se o terapeuta estiver ativo mas não for super admin', async () => {
    const req: any = {
      user: { id: adminId },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { is_super_admin: false, status_ativo: true },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as any);

    await adminMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('restrita a administradores') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve autorizar e chamar next() se o usuário for super admin ativo na tabela', async () => {
    const req: any = {
      user: { id: adminId },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { is_super_admin: true, status_ativo: true },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as any);

    await adminMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve autorizar e chamar next() se o usuário tiver is_super_admin no user_metadata e estiver ativo', async () => {
    const req: any = {
      user: {
        id: adminId,
        user_metadata: { is_super_admin: true },
      },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { is_super_admin: false, status_ativo: true },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as any);

    await adminMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
