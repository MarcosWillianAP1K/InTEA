import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response, NextFunction } from 'express';
import { verificarSessaoMiddleware, REGEX_PIN_PAREAMENTO } from '../middlewares/sessao.middleware.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabase } from '../supabase/supabase.client.js';
import { SessaoModel, Sessao, MODO_SESSAO, STATUS_SESSAO } from '../../api/sessao/models/sessao.model.js';

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

describe('Core Middleware: Verificação de Sessão Clínica e Anti-IDOR (verificarSessaoMiddleware)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sessaoId = '11111111-2222-4333-a444-555555555555';
  const autorId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const outroTerapeutaId = 'b1ffcd88-8b1a-4fe7-aa5c-5aa8ac270b22';
  const pacienteId = 'c2eebc77-7a2b-4cd6-994b-4bb7ab160c33';
  const clinicaA = 'd3eebc66-6b3a-4bc5-883a-3aa6ab050d44';
  const clinicaB = 'e4eebc55-5c4a-4ab4-b72a-2bb5ab940e55';
  const pinValido = 'INT-4321';

  const sessaoBase: Sessao = {
    id: sessaoId,
    terapeuta_id: autorId,
    paciente_id: pacienteId,
    jogo_id: '99999999-8888-4777-a666-555555555555',
    session_token: pinValido,
    modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
    contexto_dda_json: {},
    status_sessao: STATUS_SESSAO.EM_ANDAMENTO,
    data_hora_inicio: new Date().toISOString(),
    expira_em: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    data_hora_fim: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. 400 identificador ausente ou inválido
  it('1. deve retornar 400 se o identificador da sessão for ausente ou sintaticamente inválido', async () => {
    // 1a: Ausente
    const reqVazio = {
      params: {},
      body: {},
      user: { id: autorId },
    } as unknown as AuthenticatedRequest;
    const resVazio = createMockResponse();
    const nextVazio = vi.fn() as unknown as NextFunction;

    await verificarSessaoMiddleware(reqVazio, resVazio, nextVazio);
    expect(resVazio.status).toHaveBeenCalledWith(400);
    expect(resVazio.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Identificador da sessão ausente') })
    );
    expect(nextVazio).not.toHaveBeenCalled();

    // 1b: Sintaticamente inválido (nem UUID nem PIN)
    const reqInvalido = {
      params: { id: 'identificador!invalido@123' },
      user: { id: autorId },
    } as unknown as AuthenticatedRequest;
    const resInvalido = createMockResponse();
    const nextInvalido = vi.fn() as unknown as NextFunction;

    await verificarSessaoMiddleware(reqInvalido, resInvalido, nextInvalido);
    expect(resInvalido.status).toHaveBeenCalledWith(400);
    expect(resInvalido.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('UUID válido ou código PIN') })
    );
    expect(nextInvalido).not.toHaveBeenCalled();
  });

  // 2. 401 sem token (não autenticado)
  it('2. deve retornar 401 se a requisição não possuir usuário autenticado (req.user ausente)', async () => {
    const req = {
      params: { id: sessaoId },
      user: undefined,
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    await verificarSessaoMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('autenticação necessária') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // 3. 404 sessão inexistente
  it('3. deve retornar 404 se a sessão clínica não for localizada no banco de dados', async () => {
    const req = {
      params: { id: sessaoId },
      user: { id: autorId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(null);

    await verificarSessaoMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Sessão clínica não encontrada.' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // 4. 403 IDOR em modo livre (RN01)
  it('4. deve retornar 403 (RN01) se terapeuta não-autor e não-admin tentar acessar sessão em modo livre', async () => {
    const req = {
      params: { id: sessaoId },
      user: { id: outroTerapeutaId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const sessaoModoLivre: Sessao = {
      ...sessaoBase,
      modo_sessao: MODO_SESSAO.MODO_LIVRE,
      paciente_id: null,
    };

    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoModoLivre);

    await verificarSessaoMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('modo livre só podem ser acessadas pelo terapeuta autor') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // 5. 403 IDOR sessão clínica sem vínculo em terapeuta_paciente (RN04)
  it('5. deve retornar 403 (RN04) se coterapeuta da mesma clínica não possuir vínculo ativo com o paciente', async () => {
    const req = {
      params: { id: sessaoId },
      user: { id: outroTerapeutaId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoBase);

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: outroTerapeutaId, clinica_id: clinicaA, is_super_admin: false, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteId, clinica_id: clinicaA, status_ativo: true },
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
                  data: null, // Sem vínculo ativo
                  error: null,
                }),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    await verificarSessaoMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('não possui vínculo ativo com o paciente desta sessão') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // 6. 403 clínicas divergentes
  it('6. deve retornar 403 se o terapeuta e o paciente pertencerem a instituições clínicas divergentes', async () => {
    const req = {
      params: { id: sessaoId },
      user: { id: outroTerapeutaId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoBase);

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: outroTerapeutaId, clinica_id: clinicaA, is_super_admin: false, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteId, clinica_id: clinicaB, status_ativo: true }, // Clínica divergente
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    await verificarSessaoMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('pertence a uma instituição clínica diferente') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // 7. 200 criador imediato sem queries extras
  it('7. deve conceder acesso imediato ao terapeuta autor da sessão com zero queries adicionais de permissão', async () => {
    const req = {
      params: { id: sessaoId },
      user: { id: autorId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoBase);
    const supabaseFromSpy = vi.spyOn(supabase, 'from');

    await verificarSessaoMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.contextoSessao).toEqual(sessaoBase);
    expect(req.pacienteAlvoId).toBe(pacienteId);

    // Otimização estrita de I/O: nenhuma query extra executada no Supabase
    expect(supabaseFromSpy).not.toHaveBeenCalled();
  });

  // 8. 200 coterapeuta vinculado
  it('8. deve permitir acesso para coterapeuta ativo da mesma clínica com vínculo ativo em terapeuta_paciente', async () => {
    const req = {
      params: { id: sessaoId },
      user: { id: outroTerapeutaId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoBase);

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: outroTerapeutaId, clinica_id: clinicaA, is_super_admin: false, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteId, clinica_id: clinicaA, status_ativo: true },
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
                  data: { paciente_id: pacienteId },
                  error: null,
                }),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    await verificarSessaoMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.contextoSessao).toEqual(sessaoBase);
    expect(req.pacienteAlvoId).toBe(pacienteId);
  });

  // 9. 200 SuperAdmin
  it('9. deve permitir bypass de SuperAdmin via user_metadata mesmo para sessão de outro autor em modo livre', async () => {
    const req = {
      params: { id: sessaoId },
      user: { id: outroTerapeutaId, user_metadata: { is_super_admin: true } },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const sessaoModoLivre: Sessao = {
      ...sessaoBase,
      modo_sessao: MODO_SESSAO.MODO_LIVRE,
      paciente_id: null,
    };

    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoModoLivre);

    await verificarSessaoMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.contextoSessao).toEqual(sessaoModoLivre);
    expect(req.pacienteAlvoId).toBeUndefined();
  });

  // 10. Injeção de contexto via busca por PIN
  it('10. deve resolver e injetar contexto da sessão buscando por PIN de pareamento válido (REGEX_PIN_PAREAMENTO)', async () => {
    expect(REGEX_PIN_PAREAMENTO.test(pinValido)).toBe(true);

    const req = {
      params: { token: pinValido },
      user: { id: autorId },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const buscarPorTokenSpy = vi.spyOn(SessaoModel, 'buscarPorToken').mockResolvedValue(sessaoBase);

    await verificarSessaoMiddleware(req, res, next);
    expect(buscarPorTokenSpy).toHaveBeenCalledWith(pinValido);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.contextoSessao).toEqual(sessaoBase);
    expect(req.pacienteAlvoId).toBe(pacienteId);
  });
});
