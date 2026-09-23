import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthModel, LoginDTO } from '../models/auth.model.js';
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
    expect(resultado.perfil.status_ativo).toBe(true);
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
});
