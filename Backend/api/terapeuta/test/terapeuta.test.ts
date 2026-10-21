import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import {
  TerapeutaModel,
  Terapeuta,
  CriarTerapeutaDTO,
  AtualizarTerapeutaDTO,
  LoginDTO,
} from '../models/terapeuta.model.js';
import { TerapeutaService } from '../services/terapeuta.service.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

describe('Backend: TerapeutaModel (CRUD, Soft Delete, Hard Delete e Auth)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve possuir todos os métodos necessários no TerapeutaModel', () => {
    expect(typeof TerapeutaModel.listar).toBe('function');
    expect(typeof TerapeutaModel.buscarPorId).toBe('function');
    expect(typeof TerapeutaModel.buscarPorEmail).toBe('function');
    expect(typeof TerapeutaModel.buscarClinicaPorId).toBe('function');
    expect(typeof TerapeutaModel.listarPacientesVinculados).toBe('function');
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

  it('deve buscar dados da clínica por ID', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'uuid-clinica-1', nome: 'Clínica Escola UFPI', cnpj: '12.345.678/0001-90' },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const clinica = await TerapeutaModel.buscarClinicaPorId('uuid-clinica-1');
    expect(clinica).toEqual({
      id: 'uuid-clinica-1',
      nome: 'Clínica Escola UFPI',
      cnpj: '12.345.678/0001-90',
    });
    expect(mockEq).toHaveBeenCalledWith('id', 'uuid-clinica-1');
  });

  it('deve listar pacientes vinculados a um terapeuta na associativa', async () => {
    const mockEq = vi.fn().mockResolvedValue({
      data: [
        {
          terapeuta_id: 'uuid-terapeuta-1',
          paciente_id: 'uuid-paciente-1',
          created_at: '2026-10-01T10:00:00Z',
          paciente: { id: 'uuid-paciente-1', nome: 'Enzo' },
        },
      ],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const vinculos = await TerapeutaModel.listarPacientesVinculados('uuid-terapeuta-1');
    expect(vinculos).toHaveLength(1);
    expect(vinculos[0].paciente_id).toBe('uuid-paciente-1');
    expect(mockEq).toHaveBeenCalledWith('terapeuta_id', 'uuid-terapeuta-1');
  });

  describe('TerapeutaController: Validação e Formatação de Telefone', () => {
    it('deve validar e formatar telefone válido no TerapeutaController.criar', async () => {
      const { TerapeutaController } = await import('../controllers/terapeuta.controller.js');
      const req = {
        body: {
          nome: 'Dra. Maria Clara',
          email: 'maria.clara@intea.com.br',
          password: 'senhaSegura123',
          telefone: '11987654321',
        },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      vi.spyOn(TerapeutaModel, 'criar').mockResolvedValue({ id: 'uuid-terapeuta-1' } as unknown as Terapeuta);

      await TerapeutaController.criar(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect((req.body as Record<string, unknown>).telefone).toBe('+55 (11) 98765-4321');
    });

    it('deve rejeitar telefone inválido no TerapeutaController.criar', async () => {
      const { TerapeutaController } = await import('../controllers/terapeuta.controller.js');
      const req = {
        body: {
          nome: 'Dra. Maria Clara',
          email: 'maria.clara@intea.com.br',
          password: 'senhaSegura123',
          telefone: '1187654321', // 10 dígitos (sem 9)
        },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await TerapeutaController.criar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('telefone informado é inválido'),
      }));
    });
  });

  describe('TerapeutaController — Envelope Pattern Categorizado e Sanitização Estrita', () => {
    it('GET /api/terapeuta (listar): deve retornar status 200 e payload categorizado com terapeutas e meta', async () => {
      const { TerapeutaController } = await import('../controllers/terapeuta.controller.js');
      const req = {
        query: { incluirInativos: 'false' },
        user: { id: '00000000-0000-4000-8000-000000000001' },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const mockTerapeutas = [
        { id: 'uuid-1', nome: 'Dra. Mariana Costa', email: 'mariana@intea.com.br', status_ativo: true },
      ];
      vi.spyOn(TerapeutaService, 'listar').mockResolvedValue(mockTerapeutas as unknown as Terapeuta[]);

      await TerapeutaController.listar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          terapeutas: mockTerapeutas,
          meta: {
            total: 1,
            incluir_inativos: false,
          },
        },
        message: 'Terapeutas listados com sucesso.',
      });
    });

    it('GET /api/terapeuta/perfil (obterPerfil): deve retornar status 200 e payload com terapeuta, clinica e areas_foco', async () => {
      const { TerapeutaController } = await import('../controllers/terapeuta.controller.js');
      const req = {
        user: { id: '11111111-1111-4111-a111-111111111111' },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const mockPerfil = {
        terapeuta: {
          id: '11111111-1111-4111-a111-111111111111',
          nome: 'Dra. Mariana',
          email: 'mariana@intea.com.br',
          clinica_id: 'clinica-1',
          is_super_admin: false,
          status_ativo: true,
          telefone: null,
          crefito: null,
          registro_profissional: null,
          especialidade: null,
          tempo_experiencia_anos: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        clinica: { id: 'clinica-1', nome: 'Clínica Integrar', cnpj: '12.345.678/0001-90' },
        areas_foco: [{ id: 'area-1', nome: 'Integração Sensorial' }],
      };
      vi.spyOn(TerapeutaService, 'obterPerfil').mockResolvedValue(mockPerfil);

      await TerapeutaController.obterPerfil(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          terapeuta: mockPerfil.terapeuta,
          clinica: mockPerfil.clinica,
          areas_foco: mockPerfil.areas_foco,
        },
        message: 'Perfil do terapeuta recuperado com sucesso.',
      });
    });

    it('GET /api/terapeuta/:id (buscarPorId): deve retornar status 200 com envelope { data: { terapeuta }, message }', async () => {
      const { TerapeutaController } = await import('../controllers/terapeuta.controller.js');
      const idValido = '11111111-1111-4111-a111-111111111111';
      const req = {
        params: { id: idValido },
        user: { id: idValido },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const mockTerapeuta = {
        id: idValido,
        nome: 'Dra. Mariana Costa',
        email: 'mariana@intea.com.br',
      } as unknown as Terapeuta;
      vi.spyOn(TerapeutaService, 'buscarPorId').mockResolvedValue(mockTerapeuta);

      await TerapeutaController.buscarPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          terapeuta: mockTerapeuta,
        },
        message: 'Terapeuta recuperado com sucesso.',
      });
    });

    it('GET /api/terapeuta/:id (buscarPorId): deve retornar 404 se terapeuta não for localizado', async () => {
      const { TerapeutaController } = await import('../controllers/terapeuta.controller.js');
      const idValido = '11111111-1111-4111-a111-111111111111';
      const req = {
        params: { id: idValido },
        user: { id: idValido },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      vi.spyOn(TerapeutaService, 'buscarPorId').mockResolvedValue(null);

      await TerapeutaController.buscarPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Terapeuta não encontrado.' });
    });

    it('GET /api/terapeuta/:id/pacientes: deve retornar 200 e payload com vinculos e meta', async () => {
      const { TerapeutaController } = await import('../controllers/terapeuta.controller.js');
      const idValido = '11111111-1111-4111-a111-111111111111';
      const req = {
        params: { id: idValido },
        user: { id: idValido },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const mockVinculos = [
        {
          terapeuta_id: idValido,
          paciente_id: '22222222-2222-4222-a222-222222222222',
          created_at: new Date().toISOString(),
          paciente: { id: '22222222-2222-4222-a222-222222222222', nome: 'Paciente A' },
        },
      ];
      vi.spyOn(TerapeutaService, 'listarPacientesVinculados').mockResolvedValue(mockVinculos);

      await TerapeutaController.listarPacientesVinculados(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          vinculos: mockVinculos,
          meta: {
            total: 1,
          },
        },
        message: 'Pacientes vinculados listados com sucesso.',
      });
    });

    it('POST /api/terapeuta (criar): deve retornar status 201 e payload categorizado { data: { terapeuta }, message }', async () => {
      const { TerapeutaController } = await import('../controllers/terapeuta.controller.js');
      const req = {
        body: {
          nome: 'Dra. Julia Mendes',
          email: 'julia.mendes@intea.com.br',
          password: 'senhaSegura123',
          telefone: '+55 (11) 98765-4321',
        },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const mockCriado = {
        id: 'uuid-julia',
        nome: 'Dra. Julia Mendes',
        email: 'julia.mendes@intea.com.br',
      } as unknown as Terapeuta;
      vi.spyOn(TerapeutaService, 'criar').mockResolvedValue(mockCriado);

      await TerapeutaController.criar(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          terapeuta: mockCriado,
        },
        message: 'Terapeuta cadastrado e conta de acesso criada com sucesso.',
      });
    });

    it('PUT /api/terapeuta/:id (atualizar): deve retornar status 200 e { data: { terapeuta }, message }', async () => {
      const { TerapeutaController } = await import('../controllers/terapeuta.controller.js');
      const idValido = '11111111-1111-4111-a111-111111111111';
      const req = {
        params: { id: idValido },
        body: { nome: 'Dra. Mariana Costa Silva' },
        user: { id: idValido },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const mockAtualizado = {
        id: idValido,
        nome: 'Dra. Mariana Costa Silva',
      } as unknown as Terapeuta;
      vi.spyOn(TerapeutaService, 'atualizar').mockResolvedValue(mockAtualizado);

      await TerapeutaController.atualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          terapeuta: mockAtualizado,
        },
        message: 'Terapeuta atualizado com sucesso.',
      });
    });

    it('DELETE /api/terapeuta/:id (desativar / soft delete): deve retornar status 200 e { data: { terapeuta }, message }', async () => {
      const { TerapeutaController } = await import('../controllers/terapeuta.controller.js');
      const idValido = '11111111-1111-4111-a111-111111111111';
      const req = {
        params: { id: idValido },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const mockDesativado = {
        id: idValido,
        nome: 'Dra. Mariana Costa',
        status_ativo: false,
      } as unknown as Terapeuta;
      vi.spyOn(TerapeutaService, 'desativar').mockResolvedValue({ terapeuta: mockDesativado, jaInativo: false });

      await TerapeutaController.desativar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          terapeuta: mockDesativado,
        },
        message: 'Terapeuta desativado com sucesso (soft delete aplicado).',
      });
    });

    it('PATCH /api/terapeuta/:id/reativar: deve retornar status 200 e { data: { terapeuta }, message }', async () => {
      const { TerapeutaController } = await import('../controllers/terapeuta.controller.js');
      const idValido = '11111111-1111-4111-a111-111111111111';
      const req = {
        params: { id: idValido },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const mockReativado = {
        id: idValido,
        nome: 'Dra. Mariana Costa',
        status_ativo: true,
      } as unknown as Terapeuta;
      vi.spyOn(TerapeutaService, 'reativar').mockResolvedValue(mockReativado);

      await TerapeutaController.reativar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          terapeuta: mockReativado,
        },
        message: 'Terapeuta reativado com sucesso.',
      });
    });

    it('DELETE /api/terapeuta/:id/hard: deve retornar status 204 No Content sem corpo', async () => {
      const { TerapeutaController } = await import('../controllers/terapeuta.controller.js');
      const idValido = '11111111-1111-4111-a111-111111111111';
      const req = {
        params: { id: idValido },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as Response;

      vi.spyOn(TerapeutaService, 'deletarHard').mockResolvedValue(undefined);

      await TerapeutaController.deletarHard(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });
});

