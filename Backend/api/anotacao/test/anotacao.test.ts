// ==============================================================================
// InTEA: Testes Unitários de AnotacaoClinicaModel (Sprint 10 - Card 1.1)
// ==============================================================================
// Conformidade: RF16, RF21, RN04, RN05
// TypeScript Estrito
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnotacaoClinicaModel, CriarAnotacaoDTO } from '../models/anotacao.model.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

describe('AnotacaoClinicaModel - Testes Unitários (RF16, RN04, RN05)', () => {
  const terapeutaId = '11111111-1111-4111-a111-111111111111';
  const pacienteId = '22222222-2222-4222-a222-222222222222';
  const sessaoId = '33333333-3333-4333-a333-333333333333';
  const anotacaoId = '44444444-4444-4444-a444-444444444444';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve expor todos os métodos canônicos do model', () => {
    expect(typeof AnotacaoClinicaModel.criar).toBe('function');
    expect(typeof AnotacaoClinicaModel.buscarPorId).toBe('function');
    expect(typeof AnotacaoClinicaModel.listarPorPaciente).toBe('function');
    expect(typeof AnotacaoClinicaModel.listarPorSessao).toBe('function');
    expect(typeof AnotacaoClinicaModel.atualizar).toBe('function');
    expect(typeof AnotacaoClinicaModel.softDelete).toBe('function');
  });

  it('deve registrar anotação clínica associada à sessão com sucesso', async () => {
    const dto: CriarAnotacaoDTO = {
      terapeuta_id: terapeutaId,
      paciente_id: pacienteId,
      sessao_id: sessaoId,
      conteudo: 'Paciente manteve foco por 15 minutos contínuos.',
    };

    const mockRetorno = {
      id: anotacaoId,
      terapeuta_id: dto.terapeuta_id,
      paciente_id: dto.paciente_id,
      sessao_id: dto.sessao_id,
      conteudo: dto.conteudo,
      soft_delete: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockRetorno,
          error: null,
        }),
      }),
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      insert: mockInsert,
    } as unknown as ReturnType<typeof supabase.from>);

    const resultado = await AnotacaoClinicaModel.criar(dto);

    expect(resultado).not.toBeNull();
    expect(resultado?.id).toBe(anotacaoId);
    expect(resultado?.paciente_id).toBe(pacienteId);
    expect(resultado?.sessao_id).toBe(sessaoId);
    expect(resultado?.conteudo).toBe(dto.conteudo);
    expect(mockInsert).toHaveBeenCalledWith({
      terapeuta_id: dto.terapeuta_id,
      paciente_id: dto.paciente_id,
      sessao_id: dto.sessao_id,
      conteudo: dto.conteudo,
    });
  });

  it('deve registrar anotação clínica avulsa (sessao_id = null) com sucesso', async () => {
    const dto: CriarAnotacaoDTO = {
      terapeuta_id: terapeutaId,
      paciente_id: pacienteId,
      conteudo: 'Entrevista de anamnese realizada com a mãe.',
    };

    const mockRetorno = {
      id: anotacaoId,
      terapeuta_id: dto.terapeuta_id,
      paciente_id: dto.paciente_id,
      sessao_id: null,
      conteudo: dto.conteudo,
      soft_delete: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockRetorno,
          error: null,
        }),
      }),
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      insert: mockInsert,
    } as unknown as ReturnType<typeof supabase.from>);

    const resultado = await AnotacaoClinicaModel.criar(dto);

    expect(resultado).not.toBeNull();
    expect(resultado?.sessao_id).toBeNull();
    expect(mockInsert).toHaveBeenCalledWith({
      terapeuta_id: dto.terapeuta_id,
      paciente_id: dto.paciente_id,
      sessao_id: null,
      conteudo: dto.conteudo,
    });
  });

  it('deve retornar null se ocorrer erro no banco ao criar anotação', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Erro no banco' },
        }),
      }),
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      insert: mockInsert,
    } as unknown as ReturnType<typeof supabase.from>);

    const resultado = await AnotacaoClinicaModel.criar({
      terapeuta_id: terapeutaId,
      paciente_id: pacienteId,
      conteudo: 'Teste de falha',
    });

    expect(resultado).toBeNull();
  });

  it('deve buscar anotação ativa por ID com sucesso', async () => {
    const mockRetorno = {
      id: anotacaoId,
      terapeuta_id: terapeutaId,
      paciente_id: pacienteId,
      sessao_id: sessaoId,
      conteudo: 'Anotação encontrada',
      soft_delete: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      terapeuta: { id: terapeutaId, nome: 'Dr. Marcos' },
    };

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockRetorno,
            error: null,
          }),
        }),
      }),
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const resultado = await AnotacaoClinicaModel.buscarPorId(anotacaoId);

    expect(resultado).not.toBeNull();
    expect(resultado?.id).toBe(anotacaoId);
    expect(resultado?.terapeuta?.nome).toBe('Dr. Marcos');
  });

  it('deve listar anotações de um paciente respeitando soft_delete = false por padrão', async () => {
    const mockLista = [
      {
        id: '1',
        terapeuta_id: terapeutaId,
        paciente_id: pacienteId,
        sessao_id: null,
        conteudo: 'Primeira anotação',
        soft_delete: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockOrder = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: mockLista,
        error: null,
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: mockOrder,
      }),
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const resultado = await AnotacaoClinicaModel.listarPorPaciente(pacienteId);

    expect(Array.isArray(resultado)).toBe(true);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].conteudo).toBe('Primeira anotação');
  });

  it('deve listar anotações por sessão', async () => {
    const mockLista = [
      {
        id: '2',
        terapeuta_id: terapeutaId,
        paciente_id: pacienteId,
        sessao_id: sessaoId,
        conteudo: 'Anotação da partida',
        soft_delete: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockOrder = vi.fn().mockResolvedValue({
      data: mockLista,
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: mockOrder,
        }),
      }),
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const resultado = await AnotacaoClinicaModel.listarPorSessao(sessaoId);

    expect(Array.isArray(resultado)).toBe(true);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].sessao_id).toBe(sessaoId);
  });

  it('deve atualizar conteúdo da anotação clínica com sucesso', async () => {
    const mockAtualizada = {
      id: anotacaoId,
      terapeuta_id: terapeutaId,
      paciente_id: pacienteId,
      sessao_id: null,
      conteudo: 'Conteúdo devidamente corrigido.',
      soft_delete: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockAtualizada,
            error: null,
          }),
        }),
      }),
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      update: mockUpdate,
    } as unknown as ReturnType<typeof supabase.from>);

    const resultado = await AnotacaoClinicaModel.atualizar(anotacaoId, {
      conteudo: 'Conteúdo devidamente corrigido.',
    });

    expect(resultado).not.toBeNull();
    expect(resultado?.conteudo).toBe('Conteúdo devidamente corrigido.');
  });

  it('deve executar soft delete alterando soft_delete para true (RN05)', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      update: mockUpdate,
    } as unknown as ReturnType<typeof supabase.from>);

    const sucesso = await AnotacaoClinicaModel.softDelete(anotacaoId);

    expect(sucesso).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        soft_delete: true,
      })
    );
  });
});
