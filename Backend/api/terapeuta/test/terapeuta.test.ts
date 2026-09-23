import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TerapeutaModel, CriarTerapeutaDTO, AtualizarTerapeutaDTO, LoginDTO } from '../models/terapeuta.model.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

describe('Backend: TerapeutaModel (CRUD, Soft Delete, Hard Delete e Auth)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve possuir todos os métodos necessários no TerapeutaModel', () => {
    expect(typeof TerapeutaModel.listar).toBe('function');
    expect(typeof TerapeutaModel.buscarPorId).toBe('function');
    expect(typeof TerapeutaModel.buscarPorEmail).toBe('function');
    expect(typeof TerapeutaModel.criar).toBe('function');
    expect(typeof TerapeutaModel.atualizar).toBe('function');
    expect(typeof TerapeutaModel.desativar).toBe('function');
    expect(typeof TerapeutaModel.reativar).toBe('function');
    expect(typeof TerapeutaModel.deletarHard).toBe('function');
    expect(typeof TerapeutaModel.login).toBe('function');
  });

  it('deve listar terapeutas ativos por padrão (Soft Delete)', async () => {
    const mockOrder = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    const mockEq = vi.fn().mockResolvedValue({
      data: [
        { id: 'uuid-t1', nome: 'Dra. Ana', status_ativo: true },
        { id: 'uuid-t2', nome: 'Dr. Bruno', status_ativo: true },
      ],
      error: null,
    });
    mockOrder.mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as any);

    const terapeutas = await TerapeutaModel.listar();

    expect(terapeutas).toHaveLength(2);
    expect(mockEq).toHaveBeenCalledWith('status_ativo', true);
  });

  it('deve buscar terapeuta por ID', async () => {
    const id = 'uuid-terapeuta-1';
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id, nome: 'Dra. Ana', email: 'ana@intea.com.br', status_ativo: true },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as any);

    const terapeuta = await TerapeutaModel.buscarPorId(id);

    expect(terapeuta).toBeDefined();
    expect(terapeuta?.id).toBe(id);
    expect(mockEq).toHaveBeenCalledWith('id', id);
  });

  it('deve criar novo terapeuta integrando com Supabase Auth', async () => {
    const dto: CriarTerapeutaDTO = {
      nome: 'Dr. Lucas Silveira',
      email: 'lucas@intea.com.br',
      password: 'senhaSegura123',
      crefito: 'CREFITO-3/9999-TO',
      especialidade: 'Integração Sensorial',
      tempo_experiencia_anos: 4,
    };

    const mockCreateUser = vi.fn().mockResolvedValue({
      data: {
        user: { id: 'uuid-lucas', email: dto.email },
      },
      error: null,
    });

    vi.spyOn(supabase.auth.admin, 'createUser').mockImplementation(mockCreateUser as any);

    // Mock do buscarPorId após criação
    vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue({
      id: 'uuid-lucas',
      nome: dto.nome,
      email: dto.email,
      crefito: dto.crefito ?? null,
      registro_profissional: dto.crefito ?? null,
      especialidade: dto.especialidade ?? null,
      tempo_experiencia_anos: 4,
      clinica_id: null,
      telefone: null,
      is_super_admin: false,
      status_ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const criado = await TerapeutaModel.criar(dto);

    expect(criado).toBeDefined();
    expect(criado.id).toBe('uuid-lucas');
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: dto.email,
        password: dto.password,
      })
    );
  });

  it('deve realizar soft delete do terapeuta alterando status_ativo para false', async () => {
    const id = 'uuid-terapeuta-soft';

    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      update: mockUpdate,
    } as any);

    vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue({
      id,
      nome: 'Terapeuta Desativado',
      email: 'inativo@intea.com.br',
      status_ativo: false,
      crefito: null,
      registro_profissional: null,
      especialidade: null,
      tempo_experiencia_anos: 0,
      clinica_id: null,
      telefone: null,
      is_super_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const desativado = await TerapeutaModel.desativar(id);

    expect(desativado.status_ativo).toBe(false);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status_ativo: false })
    );
  });

  it('deve realizar login chamando signInWithPassword e retornando access_token', async () => {
    const loginDTO: LoginDTO = {
      email: 'terapeuta@intea.com.br',
      password: 'senha123',
    };

    const mockSignIn = vi.fn().mockResolvedValue({
      data: {
        user: { id: 'uuid-login-user', email: loginDTO.email },
        session: { access_token: 'jwt-token-fake-123', expires_in: 3600 },
      },
      error: null,
    });

    vi.spyOn(supabase.auth, 'signInWithPassword').mockImplementation(mockSignIn as any);

    vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue({
      id: 'uuid-login-user',
      nome: 'Terapeuta Logado',
      email: loginDTO.email,
      status_ativo: true,
      crefito: null,
      registro_profissional: null,
      especialidade: null,
      tempo_experiencia_anos: 0,
      clinica_id: null,
      telefone: null,
      is_super_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const resultado = await TerapeutaModel.login(loginDTO);

    expect(resultado).toBeDefined();
    expect(resultado.access_token).toBe('jwt-token-fake-123');
    expect(resultado.terapeuta?.status_ativo).toBe(true);
    expect(mockSignIn).toHaveBeenCalledWith({
      email: loginDTO.email,
      password: loginDTO.password,
    });
  });

  describe('TerapeutaController: Validação e Formatação de Telefone', () => {
    it('deve validar e formatar telefone válido no TerapeutaController.criar', async () => {
      const { TerapeutaController } = await import('../controllers/terapeuta.controller.js');
      const req: any = {
        body: {
          nome: 'Dra. Maria Clara',
          email: 'maria.clara@intea.com.br',
          password: 'senhaSegura123',
          telefone: '11987654321',
        },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      vi.spyOn(TerapeutaModel, 'criar').mockResolvedValue({ id: 'uuid-terapeuta-1' } as any);

      await TerapeutaController.criar(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(req.body.telefone).toBe('+55 (11) 98765-4321');
    });

    it('deve rejeitar telefone inválido no TerapeutaController.criar', async () => {
      const { TerapeutaController } = await import('../controllers/terapeuta.controller.js');
      const req: any = {
        body: {
          nome: 'Dra. Maria Clara',
          email: 'maria.clara@intea.com.br',
          password: 'senhaSegura123',
          telefone: '1187654321', // 10 dígitos (sem 9)
        },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await TerapeutaController.criar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('telefone informado é inválido'),
      }));
    });
  });
});

