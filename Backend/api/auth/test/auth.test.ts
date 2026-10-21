import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthModel, LoginDTO } from '../models/auth.model.js';
import { AuthController } from '../controllers/auth.controller.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

describe('Backend: AuthModel (Login, Recuperação de Senha e Perfil)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve possuir os métodos login, recuperarSenha e buscarPerfilPorId', () => {
    expect(typeof AuthModel.login).toBe('function');
    expect(typeof AuthModel.recuperarSenha).toBe('function');
    expect(typeof AuthModel.buscarPerfilPorId).toBe('function');
  });

  it('deve autenticar usuário chamando signInWithPassword e retornando token JWT', async () => {
    const dto: LoginDTO = {
      email: 'terapeuta@intea.com.br',
      password: 'senhaSegura123',
    };

    const mockSignIn = vi.fn().mockResolvedValue({
      data: {
        user: { id: 'uuid-user-123', email: dto.email },
        session: { access_token: 'jwt-access-token-xyz', expires_in: 3600 },
      },
      error: null,
    });

    vi.spyOn(supabase.auth, 'signInWithPassword').mockImplementation(mockSignIn as any);

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
    } as any);

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
        user: { id: 'uuid-inativo', email: dto.email },
        session: { access_token: 'token-inativo', expires_in: 3600 },
      },
      error: null,
    } as any);

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
    } as any);

    await expect(AuthModel.login(dto)).rejects.toThrow('inativada');
  });

  it('deve retornar mensagem simulada de exemplo para recuperação de senha', async () => {
    const email = 'recuperar@intea.com.br';

    const res = await AuthModel.recuperarSenha(email);

    expect(res).toBeDefined();
    expect(res.exemplo).toBe(true);
    expect(res.message).toContain('[EXEMPLO]');
    expect(res.message).toContain(email);
  });

  it('deve renovar sessão chamando refreshSession', async () => {
    vi.spyOn(supabase.auth, 'refreshSession').mockResolvedValue({
      data: {
        session: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        },
        user: { id: 'uuid-user-123' },
      },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.refreshSession>>);

    const tokens = await AuthModel.refreshSession('old-refresh-token');

    expect(tokens.access_token).toBe('new-access-token');
    expect(tokens.refresh_token).toBe('new-refresh-token');
    expect(tokens.token_type).toBe('Bearer');
    expect(tokens.expires_in).toBe(3600);
  });

  it('deve atualizar a senha com sucesso chamando updateUserById', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ data: { user: {} }, error: null });
    vi.spyOn(supabase.auth.admin, 'updateUserById').mockImplementation(mockUpdate as any);

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

  it('AuthController.login deve retornar data.token e data.tokens padronizados sem campos redundantes soltos', async () => {
    vi.spyOn(AuthModel, 'login').mockResolvedValue({
      user: { id: 'uuid-123', email: 'teste@intea.com.br' } as any,
      session: {
        access_token: 'jwt-access-token-123',
        refresh_token: 'refresh-token-xyz',
        expires_in: 3600,
      } as any,
      access_token: 'jwt-access-token-123',
      perfil: {
        id: 'uuid-123',
        nome: 'Dr. Marcos',
        email: 'teste@intea.com.br',
        status_ativo: true,
        is_super_admin: false,
      } as any,
    });

    const mockReq = {
      body: {
        email: 'teste@intea.com.br',
        password: 'senhaSegura123',
      },
    } as any;

    let respostaJson: any = null;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockImplementation((val) => {
        respostaJson = val;
      }),
    } as any;

    await AuthController.login(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(respostaJson).toBeDefined();
    // Verifica padronização data.token.access_token e data.tokens.access_token
    expect(respostaJson.data.token.access_token).toBe('jwt-access-token-123');
    expect(respostaJson.data.tokens.access_token).toBe('jwt-access-token-123');
    expect(respostaJson.data.token.refresh_token).toBe('refresh-token-xyz');
    expect(respostaJson.data.user).toBeUndefined();
    // Verifica ausência de campos soltos redundantes na raiz de data
    expect(respostaJson.data.access_token).toBeUndefined();
    expect(respostaJson.data.refresh_token).toBeUndefined();
    expect(respostaJson.data.token_type).toBeUndefined();
    expect(respostaJson.data.expires_in).toBeUndefined();
  });
});
