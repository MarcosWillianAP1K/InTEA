import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PacienteModel, CriarPacienteDTO, AtualizarPacienteDTO } from '../models/paciente.model.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

describe('Backend: PacienteModel (CRUD, Soft Delete, Hard Delete, Vínculos e Filtros)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve possuir todos os métodos necessários para o CRUD com Soft Delete, Hard Delete e Vínculos', () => {
    expect(typeof PacienteModel.listar).toBe('function');
    expect(typeof PacienteModel.buscarPorId).toBe('function');
    expect(typeof PacienteModel.criar).toBe('function');
    expect(typeof PacienteModel.atualizar).toBe('function');
    expect(typeof PacienteModel.desativar).toBe('function');
    expect(typeof PacienteModel.deletarHard).toBe('function');
    expect(typeof PacienteModel.reativar).toBe('function');
    expect(typeof PacienteModel.vincularTerapeuta).toBe('function');
    expect(typeof PacienteModel.desvincularTerapeuta).toBe('function');
    expect(typeof PacienteModel.listarTerapeutasVinculados).toBe('function');
  });

  it('deve listar pacientes filtrando por status_ativo = true por padrão e retornando paginação', async () => {
    const mockRange = vi.fn().mockResolvedValue({
      data: [
        { id: 'uuid-1', nome: 'Paciente 1', status_ativo: true },
        { id: 'uuid-2', nome: 'Paciente 2', status_ativo: true },
      ],
      error: null,
      count: 2,
    });
    const mockEq = vi.fn().mockReturnValue({ range: mockRange });
    const mockOrder = vi.fn().mockReturnValue({ eq: mockEq });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as any);

    const resultado = await PacienteModel.listar();

    expect(resultado.data).toHaveLength(2);
    expect(resultado.meta?.total).toBe(2);
    expect(resultado.meta?.page).toBe(1);
    expect(mockEq).toHaveBeenCalledWith('status_ativo', true);
  });

  it('deve criar um paciente e retornar os dados persistidos', async () => {
    const novoPacienteDTO: CriarPacienteDTO = {
      nome: 'Carlos Eduardo',
      data_nascimento: '2015-06-10',
      cpf: '529.982.247-25',
      telefone: '(11) 98765-4321',
      cidade: 'São Paulo',
      estado: 'SP',
    };

    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'uuid-novo', ...novoPacienteDTO, status_ativo: true },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    vi.spyOn(supabase, 'from').mockReturnValue({
      insert: mockInsert,
    } as any);

    vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue({
      id: 'uuid-novo',
      nome: novoPacienteDTO.nome,
      data_nascimento: novoPacienteDTO.data_nascimento,
      cpf: novoPacienteDTO.cpf,
      telefone: novoPacienteDTO.telefone ?? null,
      cidade: novoPacienteDTO.cidade ?? null,
      estado: novoPacienteDTO.estado ?? null,
      status_ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      clinica_id: null,
      cep: null,
      endereco: null,
      bairro: null,
      numero: null,
      complemento: null,
    });

    const criado = await PacienteModel.criar(novoPacienteDTO);

    expect(criado).toBeDefined();
    expect(criado.id).toBe('uuid-novo');
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        nome: 'Carlos Eduardo',
        cpf: '529.982.247-25',
        status_ativo: true,
      }),
    ]);
  });

  it('deve realizar exclusão lógica (soft delete) alterando status_ativo para false', async () => {
    const idPaciente = 'uuid-paciente-123';

    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: idPaciente, nome: 'Paciente Teste', status_ativo: false },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      update: mockUpdate,
    } as any);

    const desativado = await PacienteModel.desativar(idPaciente);

    expect(desativado.status_ativo).toBe(false);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status_ativo: false,
      })
    );
    expect(mockEq).toHaveBeenCalledWith('id', idPaciente);
  });

  it('deve realizar exclusão física (hard delete para testes) usando delete()', async () => {
    const idPaciente = 'uuid-paciente-delete-hard';

    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      delete: mockDelete,
    } as any);

    await expect(PacienteModel.deletarHard(idPaciente)).resolves.not.toThrow();
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', idPaciente);
  });

  it('deve vincular terapeuta ao paciente', async () => {
    const pacienteId = 'uuid-paciente-1';
    const terapeutaId = 'uuid-terapeuta-1';

    // Mock busca do paciente
    const mockSinglePac = vi.fn().mockResolvedValue({
      data: { id: pacienteId, clinica_id: 'clinica-a', status_ativo: true },
      error: null,
    });
    // Mock busca do terapeuta
    const mockSingleTer = vi.fn().mockResolvedValue({
      data: { id: terapeutaId, clinica_id: 'clinica-a', status_ativo: true },
      error: null,
    });

    const mockInsertVinculo = vi.fn().mockResolvedValue({ error: null });

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'paciente') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: mockSinglePac }) }) } as any;
      }
      if (table === 'terapeuta') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: mockSingleTer }) }) } as any;
      }
      if (table === 'terapeuta_paciente') {
        return { insert: mockInsertVinculo } as any;
      }
      return {} as any;
    });

    await expect(PacienteModel.vincularTerapeuta(pacienteId, terapeutaId)).resolves.not.toThrow();
    expect(mockInsertVinculo).toHaveBeenCalledWith([{ paciente_id: pacienteId, terapeuta_id: terapeutaId }]);
  });

  it('deve bloquear vínculo se terapeuta e paciente forem de clínicas distintas', async () => {
    const pacienteId = 'uuid-paciente-1';
    const terapeutaId = 'uuid-terapeuta-2';

    const mockSinglePac = vi.fn().mockResolvedValue({
      data: { id: pacienteId, clinica_id: 'clinica-a', status_ativo: true },
      error: null,
    });
    const mockSingleTer = vi.fn().mockResolvedValue({
      data: { id: terapeutaId, clinica_id: 'clinica-b', status_ativo: true },
      error: null,
    });

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'paciente') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: mockSinglePac }) }) } as any;
      }
      if (table === 'terapeuta') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: mockSingleTer }) }) } as any;
      }
      return {} as any;
    });

    await expect(PacienteModel.vincularTerapeuta(pacienteId, terapeutaId)).rejects.toThrow('Bloqueio de segurança');
  });

  it('deve bloquear vínculo se o paciente estiver inativo', async () => {
    const pacienteId = 'uuid-paciente-inativo';
    const terapeutaId = 'uuid-terapeuta-1';

    const mockSinglePac = vi.fn().mockResolvedValue({
      data: { id: pacienteId, clinica_id: 'clinica-a', status_ativo: false },
      error: null,
    });

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'paciente') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: mockSinglePac }) }) } as any;
      }
      return {} as any;
    });

    await expect(PacienteModel.vincularTerapeuta(pacienteId, terapeutaId)).rejects.toThrow('paciente inativo');
  });

  describe('PacienteController: Validação e Formatação', () => {
    it('deve validar e formatar CPF, CEP e telefone no PacienteController.criar', async () => {
      const { PacienteController } = await import('../controllers/paciente.controller.js');
      const req: any = {
        body: {
          nome: 'Lucas Silva',
          data_nascimento: '2020-01-01',
          cpf: '52998224725',
          cep: '01310100',
          telefone: '11987654321',
          responsavel: {
            nome: 'Maria Silva',
            telefone: '11912345678',
            cpf: '36472189013',
          },
        },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      vi.spyOn(PacienteModel, 'criar').mockResolvedValue({ id: 'uuid-1' } as any);

      await PacienteController.criar(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(req.body.cpf).toBe('529.982.247-25');
      expect(req.body.cep).toBe('01310-100');
      expect(req.body.telefone).toBe('+55 (11) 98765-4321');
      expect(req.body.responsavel.cpf).toBe('364.721.890-13');
      expect(req.body.responsavel.telefone).toBe('+55 (11) 91234-5678');
    });

    it('deve rejeitar telefone inválido no PacienteController.criar', async () => {
      const { PacienteController } = await import('../controllers/paciente.controller.js');
      const req: any = {
        body: {
          nome: 'Lucas Silva',
          data_nascimento: '2020-01-01',
          cpf: '52998224725',
          telefone: '11887654321', // sem dígito 9
        },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await PacienteController.criar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Erro de validação'),
      }));
    });

    it('deve rejeitar UUID inválido no PacienteController.buscarPorId', async () => {
      const { PacienteController } = await import('../controllers/paciente.controller.js');
      const req: any = {
        params: { id: 'nao-e-uuid' },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await PacienteController.buscarPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('UUID válido'),
      }));
    });

    it('deve rejeitar UUID inválido no PacienteController.vincularTerapeuta', async () => {
      const { PacienteController } = await import('../controllers/paciente.controller.js');
      const req: any = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        body: { terapeuta_id: 'invalido' },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await PacienteController.vincularTerapeuta(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('UUID válido'),
      }));
    });
  });
});

