import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response, NextFunction } from 'express';
import { meMiddleware } from '../middlewares/me.middleware.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabase } from '../supabase/supabase.client.js';

interface MockResponse {
  statusCode: number;
  data: unknown;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
}

function createMockResponse(): MockResponse & Response {
  const res: Partial<MockResponse & Response> = {
    statusCode: 200,
    data: null,
  };
  res.status = vi.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn().mockImplementation((payload: unknown) => {
    res.data = payload;
    return res;
  });
  return res as MockResponse & Response;
}

describe('Core Middleware: Titularidade e Auto-Gestão de Perfil (meMiddleware)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const meuId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const outroId = 'b1ffcd88-8b1a-4fe7-aa5c-5aa8ac270b22';
  const clinicaId = 'c2eebc77-7a2b-4cd6-994b-4bb7ab160c33';

  // 1. 400 sem param
  it('1. deve retornar 400 se o parâmetro alvo estiver ausente ou vazio', async () => {
    const req = {
      params: {},
      user: { id: meuId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const middleware = meMiddleware();
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('é obrigatório na rota') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // 2. 400 UUID inválido
  it('2. deve retornar 400 se o parâmetro alvo não for um UUID válido', async () => {
    const req = {
      params: { id: 'uuid-invalido-123' },
      user: { id: meuId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const middleware = meMiddleware();
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('UUID válido') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // 3. 401 sem token (não autenticado)
  it('3. deve retornar 401 se a requisição não possuir usuário autenticado (req.user ausente)', async () => {
    const req = {
      params: { id: meuId },
      user: undefined,
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const middleware = meMiddleware();
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('autenticado') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // 4. 500 erro DB
  it('4. deve retornar 500 se o Supabase retornar erro ao consultar o perfil do terapeuta requisitante', async () => {
    const req = {
      params: { id: meuId },
      user: { id: meuId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Falha de conexão com PostgreSQL' },
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const middleware = meMiddleware();
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Erro interno ao validar permissões de acesso'),
        detalhes: 'Falha de conexão com PostgreSQL',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // 5. 403 perfil ausente
  it('5. deve retornar 403 se o perfil de terapeuta associado ao token não for encontrado no banco', async () => {
    const req = {
      params: { id: meuId },
      user: { id: meuId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const middleware = meMiddleware();
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('perfil de terapeuta associado ao token não encontrado') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // 6. 403 conta inativa
  it('6. deve retornar 403 se a conta do terapeuta requisitante estiver inativa (status_ativo = false)', async () => {
    const req = {
      params: { id: meuId },
      user: { id: meuId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: meuId, is_super_admin: false, status_ativo: false, clinica_id: clinicaId },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const middleware = meMiddleware();
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('inativa') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // 7. 403 IDOR anti-enumeração sem query alvo
  it('7. deve retornar 403 imediatamente contra IDOR sem consultar o banco pelo ID alvo (anti-enumeração)', async () => {
    const req = {
      params: { id: outroId },
      user: { id: meuId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: meuId, is_super_admin: false, status_ativo: true, clinica_id: clinicaId },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const middleware = meMiddleware();
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('não tem permissão para alterar ou acessar recursos de outro usuário') })
    );
    expect(next).not.toHaveBeenCalled();

    // Verificação estrita de anti-enumeração: o banco DEVE ter sido chamado exatamente uma vez (para meuId) e NUNCA para outroId
    expect(fromSpy).toHaveBeenCalledTimes(1);
    expect(mockEq).toHaveBeenCalledWith('id', meuId);
    expect(mockEq).not.toHaveBeenCalledWith('id', outroId);
  });

  // 8. 200 próprio usuário
  it('8. deve permitir acesso (next) para o próprio usuário ativo e sincronizar clinica_id e is_super_admin', async () => {
    const req = {
      params: { id: meuId },
      user: { id: meuId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: meuId, is_super_admin: false, status_ativo: true, clinica_id: clinicaId },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const middleware = meMiddleware();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user?.clinica_id).toBe(clinicaId);
    expect(req.user?.is_super_admin).toBe(false);
  });

  // 9. 200 bypass SuperAdmin DB
  it('9. deve permitir bypass de SuperAdmin via banco de dados (allowAdmin = true) ao acessar outro ID', async () => {
    const req = {
      params: { id: outroId },
      user: { id: meuId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: meuId, is_super_admin: true, status_ativo: true, clinica_id: clinicaId },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const middleware = meMiddleware({ allowAdmin: true });
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user?.is_super_admin).toBe(true);
  });

  // 10. 200 bypass SuperAdmin metadata
  it('10. deve permitir bypass de SuperAdmin via user_metadata do token JWT ao acessar outro ID', async () => {
    const req = {
      params: { id: outroId },
      user: { id: meuId, user_metadata: { is_super_admin: true } },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: meuId, is_super_admin: false, status_ativo: true, clinica_id: clinicaId },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const middleware = meMiddleware();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user?.is_super_admin).toBe(true);
  });

  // 11. 403 allowAdmin false
  it('11. deve retornar 403 para SuperAdmin se allowAdmin for explicitamente configurado como false ao acessar outro ID', async () => {
    const req = {
      params: { id: outroId },
      user: { id: meuId, user_metadata: { is_super_admin: true } },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: meuId, is_super_admin: true, status_ativo: true, clinica_id: clinicaId },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const middleware = meMiddleware({ allowAdmin: false });
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('não tem permissão para alterar ou acessar recursos de outro usuário') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // 12. 200 allowAdmin false mas próprio usuário
  it('12. deve permitir acesso com allowAdmin: false quando o usuário acessa seu próprio ID', async () => {
    const req = {
      params: { id: meuId },
      user: { id: meuId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: meuId, is_super_admin: true, status_ativo: true, clinica_id: clinicaId },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const middleware = meMiddleware({ allowAdmin: false });
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // 13. paramName customizado
  it('13. deve extrair corretamente o ID quando configurado um paramName customizado (ex: terapeutaId)', async () => {
    const req = {
      params: { terapeutaId: meuId },
      user: { id: meuId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: meuId, is_super_admin: false, status_ativo: true, clinica_id: clinicaId },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const middleware = meMiddleware({ paramName: 'terapeutaId' });
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // 14. 500 exceção inesperada
  it('14. deve retornar 500 caso ocorra uma exceção inesperada durante a execução', async () => {
    const req = {
      params: { id: meuId },
      user: { id: meuId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    vi.spyOn(supabase, 'from').mockImplementation(() => {
      throw new Error('Falha catastrófica no runtime');
    });

    const middleware = meMiddleware();
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Erro interno ao validar autorização de acesso') })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
