import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PacienteModel, CriarPacienteDTO, AtualizarPacienteDTO } from '../models/paciente.model.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

describe('Backend: PacienteModel (CRUD, Soft Delete e Hard Delete)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve possuir todos os métodos necessários para o CRUD com Soft Delete e Hard Delete', () => {
    expect(typeof PacienteModel.listar).toBe('function');
    expect(typeof PacienteModel.buscarPorId).toBe('function');
    expect(typeof PacienteModel.criar).toBe('function');
    expect(typeof PacienteModel.atualizar).toBe('function');
    expect(typeof PacienteModel.desativar).toBe('function');
    expect(typeof PacienteModel.deletarHard).toBe('function');
    expect(typeof PacienteModel.reativar).toBe('function');
  });

  it('deve listar pacientes filtrando por status_ativo = true por padrão', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({
      data: [
        { id: 'uuid-1', nome: 'Paciente 1', status_ativo: true },
        { id: 'uuid-2', nome: 'Paciente 2', status_ativo: true },
      ],
      error: null,
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
      order: mockOrder,
      eq: mockEq,
    } as any);

    const pacientes = await PacienteModel.listar();

    expect(pacientes).toHaveLength(2);
    expect(mockEq).toHaveBeenCalledWith('status_ativo', true);
  });

  it('deve permitir listar pacientes inativos quando solicitado', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        { id: 'uuid-1', nome: 'Paciente 1', status_ativo: true },
        { id: 'uuid-2', nome: 'Paciente Inativo', status_ativo: false },
      ],
      error: null,
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
      order: mockOrder,
    } as any);

    const pacientes = await PacienteModel.listar(true);

    expect(pacientes).toHaveLength(2);
  });

  it('deve criar um paciente com status_ativo = true e CPF obrigatório', async () => {
    const novoPacienteDTO: CriarPacienteDTO = {
      nome: 'Carlos Eduardo',
      data_nascimento: '2015-06-10',
      cpf: '123.456.789-00',
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

    const criado = await PacienteModel.criar(novoPacienteDTO);

    expect(criado).toBeDefined();
    expect(criado.id).toBe('uuid-novo');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Carlos Eduardo',
        cpf: '123.456.789-00',
        status_ativo: true,
      })
    );
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

    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: idPaciente, nome: 'Paciente Apagado Fisicamente' },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabase, 'from').mockReturnValue({
      delete: mockDelete,
    } as any);

    const deletado = await PacienteModel.deletarHard(idPaciente);

    expect(deletado).toBeDefined();
    expect(deletado.id).toBe(idPaciente);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', idPaciente);
  });
});
