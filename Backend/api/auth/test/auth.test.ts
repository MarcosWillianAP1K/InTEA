import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import type { User, Session } from '@supabase/supabase-js';
import { AuthModel, LoginDTO } from '../models/auth.model.js';
import { AuthController } from '../controllers/auth.controller.js';
import { supabase } from '../../../core/supabase/supabase.client.js';
import type { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import type { Terapeuta } from '../../terapeuta/models/terapeuta.model.js';

interface MockResponse {
  statusCode: number;
  body: unknown;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

interface EnvelopeSuccess<T> {
  data: T;
  message: string;
}

interface ErrorResponse {
  error: string;
  detalhes?: string;
}

describe('Backend: Auth Feature (Envelope Pattern & Sanitização Estrita)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthModel Unit Tests', () => {
    it('deve possuir os métodos login, recuperarSenha, buscarPerfilPorId, refreshSession, logout e alterarSenha', () => {
      expect(typeof AuthModel.login).toBe('function');
      expect(typeof AuthModel.recuperarSenha).toBe('function');
      expect(typeof AuthModel.buscarPerfilPorId).toBe('function');
      expect(typeof AuthModel.refreshSession).toBe('function');
      expect(typeof AuthModel.logout).toBe('function');
      expect(typeof AuthModel.alterarSenha).toBe('function');
      expect(typeof AuthModel.redefinirSenha).toBe('function');
    });

    it('deve autenticar usuário chamando signInWithPassword e retornando token JWT', async () => {
      const dto: LoginDTO = {
        email: 'terapeuta@intea.com.br',
        password: 'senhaSegura123',
      };

      const mockSignIn = vi.fn().mockResolvedValue({
        data: {
          user: { id: 'uuid-user-123', email: dto.email } as unknown as User,
          session: { access_token: 'jwt-access-token-xyz', expires_in: 3600 } as unknown as Session,
        },
        error: null,
      });

      vi.spyOn(supabase.auth, 'signInWithPassword').mockImplementation(
        mockSignIn as unknown as typeof supabase.auth.signInWithPassword
      );

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'uuid-user-123', nome: 'Dra. Alice', status_ativo: true },
            error: null,
          }),
        }),
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const resultado = await AuthModel.login(dto);

      expect(resultado).toBeDefined();
      expect(resultado.access_token).toBe('jwt-access-token-xyz');
      expect(resultado.perfil?.status_ativo).toBe(true);
      expect(mockSignIn).toHaveBeenCalledWith({
        email: dto.email,
        password: dto.password,
      });
    });

    it('deve disparar erro se a conta do terapeuta estiver inativa', async () => {
      const dto: LoginDTO = {
        email: 'inativo@intea.com.br',
        password: 'senhaSegura123',
      };

      vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
        data: {
          user: { id: 'uuid-inativo', email: dto.email } as unknown as User,
          session: { access_token: 'token-inativo', expires_in: 3600 } as unknown as Session,
        },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'uuid-inativo', nome: 'Dr. Inativo', status_ativo: false },
            error: null,
          }),
        }),
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      await expect(AuthModel.login(dto)).rejects.toThrow('inativada');
    });

    it('deve retornar confirmação segura para recuperação de senha com anti-enumeração (RNF03)', async () => {
      const email = 'recuperar@intea.com.br';

      const res = await AuthModel.recuperarSenha(email);

      expect(res).toBeDefined();
      expect(res.message).toBeDefined();
      expect(typeof res.message).toBe('string');
    });

    it('deve permitir redefinir senha com token efêmero válido', async () => {
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'uuid-user-recuperacao' } as unknown as any },
        error: null,
      });
      vi.spyOn(supabase.auth.admin, 'updateUserById').mockResolvedValueOnce({
        data: { user: { id: 'uuid-user-recuperacao' } as unknown as any },
        error: null,
      });

      const res = await AuthModel.redefinirSenha('token-valido-123', 'novaSenha123');
      expect(res.message).toContain('sucesso');
    });

    it('deve rejeitar redefinir senha com token expirado (410)', async () => {
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Token expirado') as unknown as any,
      });
      vi.spyOn(supabase.auth, 'verifyOtp').mockResolvedValueOnce({
        data: { user: null, session: null },
        error: new Error('Token expirado') as unknown as any,
      });

      await expect(AuthModel.redefinirSenha('token-expirado', 'novaSenha123')).rejects.toThrow();
    });

    it('deve renovar sessão chamando refreshSession', async () => {
      vi.spyOn(supabase.auth, 'refreshSession').mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600,
          } as unknown as Session,
          user: { id: 'uuid-user-123' } as unknown as User,
        },
        error: null,
      });

      const tokens = await AuthModel.refreshSession('old-refresh-token');

      expect(tokens.access_token).toBe('new-access-token');
      expect(tokens.refresh_token).toBe('new-refresh-token');
      expect(tokens.token_type).toBe('Bearer');
      expect(tokens.expires_in).toBe(3600);
    });

    it('deve atualizar a senha com sucesso chamando updateUserById', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ data: { user: {} as unknown as User }, error: null });
      vi.spyOn(supabase.auth.admin, 'updateUserById').mockImplementation(
        mockUpdate as unknown as typeof supabase.auth.admin.updateUserById
      );

      const res = await AuthModel.alterarSenha('uuid-user-123', 'novaSenhaSegura123');
      expect(res.message).toContain('atualizada com sucesso');
      expect(mockUpdate).toHaveBeenCalledWith('uuid-user-123', { password: 'novaSenhaSegura123' });
    });

    it('deve executar logout com sucesso', async () => {
      vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });

      const res = await AuthModel.logout();

      expect(res.success).toBe(true);
      expect(res.message).toContain('Logout realizado com sucesso');
    });
  });

  describe('AuthController: POST /api/auth/login', () => {
    it('deve retornar estritamente { data: { token: { ... } }, message } sem chaves duplicadas e sem user', async () => {
      vi.spyOn(AuthModel, 'login').mockResolvedValue({
        user: { id: 'uuid-123', email: 'teste@intea.com.br' } as unknown as User,
        session: {
          access_token: 'jwt-access-token-123',
          refresh_token: 'refresh-token-xyz',
          expires_in: 3600,
        } as unknown as Session,
        access_token: 'jwt-access-token-123',
        perfil: {
          id: 'uuid-123',
          nome: 'Dr. Marcos',
          email: 'teste@intea.com.br',
          status_ativo: true,
          is_super_admin: false,
        } as unknown as Terapeuta,
      });

      const mockReq = {
        body: {
          email: 'teste@intea.com.br',
          password: 'senhaSegura123',
        },
      } as unknown as Request;

      const mockRes = createMockResponse();

      await AuthController.login(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(200);

      const payload = mockRes.body as EnvelopeSuccess<{
        token: {
          access_token: string;
          refresh_token: string | null;
          token_type: string;
          expires_in: number;
        };
        tokens?: unknown;
        user?: unknown;
        access_token?: unknown;
        refresh_token?: unknown;
        token_type?: unknown;
        expires_in?: unknown;
      }>;

      // 1. Envelope Pattern estrito
      expect(Object.keys(payload).sort()).toEqual(['data', 'message'].sort());
      expect(payload.message).toBe('Login realizado com sucesso.');

      // 2. data.token categorizado
      expect(payload.data.token).toBeDefined();
      expect(payload.data.token.access_token).toBe('jwt-access-token-123');
      expect(payload.data.token.refresh_token).toBe('refresh-token-xyz');
      expect(payload.data.token.token_type).toBe('Bearer');
      expect(payload.data.token.expires_in).toBe(3600);

      // 3. Sanitização e proibição de chaves soltas ou duplicadas
      expect(Object.keys(payload.data)).toEqual(['token']);
      expect(payload.data.tokens).toBeUndefined();
      expect(payload.data.user).toBeUndefined();
      expect(payload.data.access_token).toBeUndefined();
      expect(payload.data.refresh_token).toBeUndefined();
      expect(payload.data.token_type).toBeUndefined();
      expect(payload.data.expires_in).toBeUndefined();
    });

    it('deve retornar 400 se e-mail não for informado', async () => {
      const mockReq = {
        body: { email: '', password: '123' },
      } as unknown as Request;
      const mockRes = createMockResponse();

      await AuthController.login(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(400);
      const payload = mockRes.body as ErrorResponse;
      expect(payload.error).toContain('email');
    });

    it('deve retornar 400 se senha não for informada', async () => {
      const mockReq = {
        body: { email: 'terapeuta@intea.com.br', password: '' },
      } as unknown as Request;
      const mockRes = createMockResponse();

      await AuthController.login(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(400);
      const payload = mockRes.body as ErrorResponse;
      expect(payload.error).toContain('password');
    });

    it('deve retornar 403 se a conta de terapeuta estiver inativada', async () => {
      vi.spyOn(AuthModel, 'login').mockRejectedValue(
        new Error('Esta conta de terapeuta encontra-se inativada. Contate o administrador.')
      );

      const mockReq = {
        body: { email: 'inativo@intea.com.br', password: '123' },
      } as unknown as Request;
      const mockRes = createMockResponse();

      await AuthController.login(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(403);
      const payload = mockRes.body as ErrorResponse;
      expect(payload.error).toContain('inativada');
    });

    it('deve retornar 401 para credenciais inválidas', async () => {
      vi.spyOn(AuthModel, 'login').mockRejectedValue(new Error('Credenciais inválidas.'));

      const mockReq = {
        body: { email: 'errado@intea.com.br', password: '123' },
      } as unknown as Request;
      const mockRes = createMockResponse();

      await AuthController.login(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(401);
      const payload = mockRes.body as ErrorResponse;
      expect(payload.error).toContain('Credenciais inválidas');
    });
  });

  describe('AuthController: POST /api/auth/refresh', () => {
    it('deve retornar 200 com { data: { token: { ... } }, message } categorizado', async () => {
      vi.spyOn(AuthModel, 'refreshSession').mockResolvedValue({
        access_token: 'novo-access-token-jwt',
        refresh_token: 'novo-refresh-token-xyz',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      const mockReq = {
        body: { refresh_token: 'antigo-refresh-token' },
      } as unknown as Request;
      const mockRes = createMockResponse();

      await AuthController.refresh(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(200);
      const payload = mockRes.body as EnvelopeSuccess<{
        token: {
          access_token: string;
          refresh_token: string | null;
          token_type: string;
          expires_in: number;
        };
      }>;

      expect(Object.keys(payload).sort()).toEqual(['data', 'message'].sort());
      expect(payload.message).toBe('Token renovado com sucesso.');
      expect(Object.keys(payload.data)).toEqual(['token']);
      expect(payload.data.token.access_token).toBe('novo-access-token-jwt');
      expect(payload.data.token.refresh_token).toBe('novo-refresh-token-xyz');
      expect(payload.data.token.token_type).toBe('Bearer');
      expect(payload.data.token.expires_in).toBe(3600);
    });

    it('deve retornar 400 se refresh_token for ausente ou vazio', async () => {
      const mockReq = {
        body: { refresh_token: '' },
      } as unknown as Request;
      const mockRes = createMockResponse();

      await AuthController.refresh(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(400);
      const payload = mockRes.body as ErrorResponse;
      expect(payload.error).toContain('refresh_token');
    });

    it('deve retornar 401 se a renovação de sessão falhar', async () => {
      vi.spyOn(AuthModel, 'refreshSession').mockRejectedValue(new Error('Token inválido ou expirado.'));

      const mockReq = {
        body: { refresh_token: 'token-invalido' },
      } as unknown as Request;
      const mockRes = createMockResponse();

      await AuthController.refresh(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(401);
      const payload = mockRes.body as ErrorResponse;
      expect(payload.error).toContain('Token inválido ou expirado');
    });
  });

  describe('AuthController: POST /api/auth/logout', () => {
    it('deve retornar 200 com { data: null, message } ao encerrar sessão', async () => {
      vi.spyOn(AuthModel, 'logout').mockResolvedValue({
        success: true,
        message: 'Logout realizado com sucesso.',
      });

      const mockReq = {} as unknown as Request;
      const mockRes = createMockResponse();

      await AuthController.logout(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(200);
      const payload = mockRes.body as EnvelopeSuccess<null>;

      expect(Object.keys(payload).sort()).toEqual(['data', 'message'].sort());
      expect(payload.data).toBeNull();
      expect(payload.message).toBe('Logout realizado com sucesso.');
    });

    it('deve retornar 200 com data: null mesmo em caso de exceção no logout', async () => {
      vi.spyOn(AuthModel, 'logout').mockRejectedValue(new Error('Erro de rede Supabase'));

      const mockReq = {} as unknown as Request;
      const mockRes = createMockResponse();

      await AuthController.logout(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(200);
      const payload = mockRes.body as EnvelopeSuccess<null>;
      expect(payload.data).toBeNull();
      expect(payload.message).toBe('Logout realizado com sucesso.');
    });
  });

  describe('AuthController: POST /api/auth/recuperar-senha', () => {
    it('deve retornar 200 com Envelope Pattern categorizado { data: { recuperacao: { ... } }, message }', async () => {
      const mockReq = {
        body: { email: 'terapeuta@intea.com.br' },
      } as unknown as Request;
      const mockRes = createMockResponse();

      await AuthController.recuperarSenha(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(200);
      const payload = mockRes.body as EnvelopeSuccess<{
        recuperacao: {
          email: string;
          solicitado: boolean;
        };
      }>;

      expect(Object.keys(payload).sort()).toEqual(['data', 'message'].sort());
      expect(payload.data.recuperacao.email).toBe('terapeuta@intea.com.br');
      expect(payload.data.recuperacao.solicitado).toBe(true);
      expect(payload.message).toBeDefined();
    });

    it('deve retornar 400 se e-mail não for informado', async () => {
      const mockReq = {
        body: { email: '' },
      } as unknown as Request;
      const mockRes = createMockResponse();

      await AuthController.recuperarSenha(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(400);
      const payload = mockRes.body as ErrorResponse;
      expect(payload.error).toContain('email');
    });
  });

  
  describe('AuthController: POST /api/auth/redefinir-senha', () => {
    it('deve retornar 200 com { data: null, message } ao redefinir com sucesso (RF01, RNF03)', async () => {
      vi.spyOn(AuthModel, 'redefinirSenha').mockResolvedValueOnce({
        message: 'Senha de acesso redefinida com sucesso.',
      });

      const mockReq = {
        body: { token: 'token-efemero-valido', novaSenha: 'novaSenhaSegura123' },
      } as unknown as Request;
      const mockRes = createMockResponse();

      await AuthController.redefinirSenha(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(200);
      const payload = mockRes.body as { data: unknown; message: string };
      expect(payload.data).toBeNull();
      expect(payload.message).toContain('sucesso');
    });

    it('deve retornar 400 se o token de recuperação não for informado', async () => {
      const mockReq = {
        body: { novaSenha: 'novaSenhaSegura123' },
      } as unknown as Request;
      const mockRes = createMockResponse();

      await AuthController.redefinirSenha(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(400);
      const payload = mockRes.body as ErrorResponse;
      expect(payload.error).toContain('token');
    });

    it('deve retornar 400 se novaSenha tiver menos de 6 caracteres', async () => {
      const mockReq = {
        body: { token: 'token-valido', novaSenha: '123' },
      } as unknown as Request;
      const mockRes = createMockResponse();

      await AuthController.redefinirSenha(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(400);
      const payload = mockRes.body as ErrorResponse;
      expect(payload.error).toContain('6 caracteres');
    });

    it('deve retornar 410 Gone se o token tiver expirado ou for inválido', async () => {
      const erroGone = new Error('O token de recuperação é inválido ou expirou. Solicite um novo link.');
      (erroGone as unknown as { statusCode: number }).statusCode = 410;
      vi.spyOn(AuthModel, 'redefinirSenha').mockRejectedValueOnce(erroGone);

      const mockReq = {
        body: { token: 'token-expirado', novaSenha: 'novaSenhaSegura123' },
      } as unknown as Request;
      const mockRes = createMockResponse();

      await AuthController.redefinirSenha(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(410);
      const payload = mockRes.body as ErrorResponse;
      expect(payload.error).toContain('expirou');
    });
  });

  describe('AuthController: PATCH /api/auth/alterar-senha', () => {
    it('deve retornar 200 com { data: null, message } ao alterar senha do usuário autenticado', async () => {
      vi.spyOn(AuthModel, 'alterarSenha').mockResolvedValue({
        message: 'Senha de acesso atualizada com sucesso.',
      });

      const mockReq = {
        user: { id: 'uuid-terapeuta-123' },
        body: { novaSenha: 'senhaSuperSegura123' },
      } as unknown as AuthenticatedRequest;
      const mockRes = createMockResponse();

      await AuthController.alterarSenha(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(200);
      const payload = mockRes.body as EnvelopeSuccess<null>;

      expect(Object.keys(payload).sort()).toEqual(['data', 'message'].sort());
      expect(payload.data).toBeNull();
      expect(payload.message).toBe('Senha de acesso atualizada com sucesso.');
    });

    it('deve retornar 401 se usuário não estiver autenticado', async () => {
      const mockReq = {
        user: undefined,
        body: { novaSenha: 'senhaSuperSegura123' },
      } as unknown as AuthenticatedRequest;
      const mockRes = createMockResponse();

      await AuthController.alterarSenha(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(401);
      const payload = mockRes.body as ErrorResponse;
      expect(payload.error).toContain('não autorizado');
    });

    it('deve retornar 400 se nova senha tiver menos de 6 caracteres', async () => {
      const mockReq = {
        user: { id: 'uuid-terapeuta-123' },
        body: { novaSenha: '123' },
      } as unknown as AuthenticatedRequest;
      const mockRes = createMockResponse();

      await AuthController.alterarSenha(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(400);
      const payload = mockRes.body as ErrorResponse;
      expect(payload.error).toContain('mínimo 6 caracteres');
    });
  });

  describe('AuthController: GET /api/auth/me', () => {
    it('deve retornar 200 com { data: { user: { ... } }, message } categorizado', async () => {
      const perfilMock: Terapeuta = {
        id: 'uuid-terapeuta-123',
        nome: 'Dra. Mariana Costa',
        email: 'mariana.costa@intea.com.br',
        telefone: '(11) 98765-4321',
        registro_profissional: 'CREFITO-3/12345-TO',
        especialidade: 'Terapia Ocupacional e Integração Sensorial',
        crefito: 'CREFITO-3/12345-TO',
        tempo_experiencia_anos: 5,
        clinica_id: 'uuid-clinica-456',
        status_ativo: true,
        is_super_admin: false,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
        areas_foco: [{ areas_foco: 'TEA' }, { areas_foco: 'TDAH' }] as unknown as Terapeuta['areas_foco'],
      };

      vi.spyOn(AuthModel, 'buscarPerfilPorId').mockResolvedValue(perfilMock);

      const mockReq = {
        user: {
          id: 'uuid-terapeuta-123',
          role: 'authenticated',
          email_confirmed_at: '2026-01-01T00:00:00.000Z',
          last_sign_in_at: '2026-10-21T12:00:00.000Z',
          user_metadata: { is_super_admin: false },
        },
      } as unknown as AuthenticatedRequest;

      const mockRes = createMockResponse();

      await AuthController.me(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(200);
      const payload = mockRes.body as EnvelopeSuccess<{
        user: {
          id: string;
          nome: string;
          email: string;
          telefone: string | null;
          registro_profissional: string | null;
          especialidade: string | null;
          crefito: string | null;
          tempo_experiencia_anos: number;
          clinica_id: string | null;
          areas_foco: unknown[];
          is_admin: boolean;
          role: string;
          status_ativo: boolean;
          autenticado: boolean;
          email_confirmado: boolean;
          telefone_confirmado: boolean;
          last_sign_in_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
      }>;

      // 1. Envelope Pattern estrito
      expect(Object.keys(payload).sort()).toEqual(['data', 'message'].sort());
      expect(payload.message).toBe('Dados do perfil do usuário autenticado recuperados com sucesso.');

      // 2. data.user categorizado sem propriedades primitivas soltas na raiz de data
      expect(Object.keys(payload.data)).toEqual(['user']);
      expect(payload.data.user.id).toBe('uuid-terapeuta-123');
      expect(payload.data.user.nome).toBe('Dra. Mariana Costa');
      expect(payload.data.user.email).toBe('mariana.costa@intea.com.br');
      expect(payload.data.user.is_admin).toBe(false);
      expect(payload.data.user.role).toBe('terapeuta');
      expect(payload.data.user.status_ativo).toBe(true);
      expect(payload.data.user.areas_foco).toEqual(['TEA', 'TDAH']);
    });

    it('deve retornar 401 se usuário não estiver no token', async () => {
      const mockReq = {
        user: undefined,
      } as unknown as AuthenticatedRequest;
      const mockRes = createMockResponse();

      await AuthController.me(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(401);
      const payload = mockRes.body as ErrorResponse;
      expect(payload.error).toContain('não autenticado');
    });

    it('deve retornar 404 se perfil de terapeuta não for localizado', async () => {
      vi.spyOn(AuthModel, 'buscarPerfilPorId').mockResolvedValue(null);

      const mockReq = {
        user: { id: 'uuid-inexistente' },
      } as unknown as AuthenticatedRequest;
      const mockRes = createMockResponse();

      await AuthController.me(mockReq, mockRes as unknown as Response);

      expect(mockRes.statusCode).toBe(404);
      const payload = mockRes.body as ErrorResponse;
      expect(payload.error).toContain('não encontrado');
    });
  });
});
