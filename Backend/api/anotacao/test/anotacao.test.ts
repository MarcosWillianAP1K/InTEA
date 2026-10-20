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
    expect(typeof AnotacaoClinicaModel.deletarHard).toBe('function');
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
    expect(resultado?.terapeuta_id).toBe(terapeutaId);
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

  it('deve executar hard delete físico direto com sucesso em dev', async () => {
    const mockEq = vi.fn().mockResolvedValue({
      error: null,
    });
    const mockDelete = vi.fn().mockReturnValue({
      eq: mockEq,
    });
    vi.spyOn(supabase, 'from').mockReturnValue({
      delete: mockDelete,
    } as unknown as ReturnType<typeof supabase.from>);

    const resultado = await AnotacaoClinicaModel.deletarHard(anotacaoId);

    expect(resultado).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', anotacaoId);
  });

  it('deve bloquear hard delete se NODE_ENV for production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    await expect(AnotacaoClinicaModel.deletarHard(anotacaoId)).rejects.toThrow('Hard delete proibido');

    process.env.NODE_ENV = originalEnv;
  });
});

// ==============================================================================
// TESTES DO SERVIÇO: AnotacaoService
// ==============================================================================
describe('AnotacaoService - Regras de Negócio e Autoria (RF16, RF21, RN05)', () => {
  const autorId = '11111111-1111-4111-a111-111111111111';
  const outroTerapeutaId = '99999999-9999-4999-a999-999999999999';
  const pacienteId = '22222222-2222-4222-a222-222222222222';
  const sessaoId = '33333333-3333-4333-a333-333333333333';
  const anotacaoId = '44444444-4444-4444-a444-444444444444';

  const mockAnotacaoBase = {
    id: anotacaoId,
    terapeuta_id: autorId,
    paciente_id: pacienteId,
    sessao_id: null,
    conteudo: 'Parecer original.',
    soft_delete: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('criarAnotacaoPaciente deve rejeitar conteúdo em branco com status 400', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    const res = await AnotacaoService.criarAnotacaoPaciente(autorId, pacienteId, '   ');

    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(400);
    expect(res.erro).toContain('obrigatório');
  });

  it('criarAnotacaoPaciente deve criar com sucesso retornando 201', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoClinicaModel, 'criar').mockResolvedValue({
      ...mockAnotacaoBase,
      conteudo: 'Evolução clínica favorável.',
    });

    const res = await AnotacaoService.criarAnotacaoPaciente(autorId, pacienteId, 'Evolução clínica favorável.');

    expect(res.sucesso).toBe(true);
    expect(res.status).toBe(201);
    expect(res.dados?.conteudo).toBe('Evolução clínica favorável.');
  });

  it('criarAnotacaoSessao deve rejeitar conteúdo vazio com status 400', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    const res = await AnotacaoService.criarAnotacaoSessao(autorId, sessaoId, pacienteId, '');

    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(400);
  });

  it('atualizarConteudo deve bloquear com 403 se usuário logado não for o autor (RF21)', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');

    const res = await AnotacaoService.atualizarConteudo(mockAnotacaoBase, outroTerapeutaId, 'Tentativa de alteração');

    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(403);
    expect(res.erro).toContain('apenas o terapeuta autor');
  });

  it('atualizarConteudo deve rejeitar conteúdo vazio com 400', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');

    const res = await AnotacaoService.atualizarConteudo(mockAnotacaoBase, autorId, '   ');

    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(400);
  });

  it('atualizarConteudo deve atualizar com sucesso se usuário for o autor', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoClinicaModel, 'atualizar').mockResolvedValue({
      ...mockAnotacaoBase,
      conteudo: 'Texto atualizado pelo autor.',
    });

    const res = await AnotacaoService.atualizarConteudo(mockAnotacaoBase, autorId, 'Texto atualizado pelo autor.');

    expect(res.sucesso).toBe(true);
    expect(res.status).toBe(200);
    expect(res.dados?.conteudo).toBe('Texto atualizado pelo autor.');
  });

  it('softDelete deve bloquear com 403 se usuário não for o autor', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');

    const res = await AnotacaoService.softDelete(mockAnotacaoBase, outroTerapeutaId);

    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(403);
  });

  it('softDelete deve aplicar exclusão lógica com status 204 para o autor', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoClinicaModel, 'softDelete').mockResolvedValue(true);

    const res = await AnotacaoService.softDelete(mockAnotacaoBase, autorId);

    expect(res.sucesso).toBe(true);
    expect(res.status).toBe(204);
  });

  it('buscarPorId deve retornar 400 se UUID for inválido', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    const res = await AnotacaoService.buscarPorId('uuid-invalido');
    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(400);
  });

  it('buscarPorId deve retornar 404 se anotação não for encontrada', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(null);

    const res = await AnotacaoService.buscarPorId('00000000-0000-4000-8000-000000000000');
    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(404);
  });

  it('buscarPorId deve retornar 200 com os dados da anotação', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacaoBase);

    const res = await AnotacaoService.buscarPorId(mockAnotacaoBase.id);
    expect(res.sucesso).toBe(true);
    expect(res.status).toBe(200);
    expect(res.dados?.id).toBe(mockAnotacaoBase.id);
  });

  it('softDelete com string ID deve buscar anotação e aplicar soft delete para o autor (204)', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacaoBase);
    vi.spyOn(AnotacaoClinicaModel, 'softDelete').mockResolvedValue(true);

    const res = await AnotacaoService.softDelete(mockAnotacaoBase.id, autorId);
    expect(res.sucesso).toBe(true);
    expect(res.status).toBe(204);
  });

  it('softDelete com string ID deve bloquear com 403 e mensagem canônica se não for autor', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacaoBase);

    const res = await AnotacaoService.softDelete(mockAnotacaoBase.id, outroTerapeutaId);
    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(403);
    expect(res.erro).toContain('apenas o terapeuta autor pode inativar');
  });

  it('criarAnotacaoSessao deve criar com sucesso retornando 201', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoClinicaModel, 'criar').mockResolvedValue({
      ...mockAnotacaoBase,
      sessao_id: sessaoId,
      conteudo: 'Parecer clínico após sessão.',
    });

    const res = await AnotacaoService.criarAnotacaoSessao(autorId, sessaoId, pacienteId, 'Parecer clínico após sessão.');

    expect(res.sucesso).toBe(true);
    expect(res.status).toBe(201);
    expect(res.dados?.sessao_id).toBe(sessaoId);
    expect(res.dados?.conteudo).toBe('Parecer clínico após sessão.');
  });

  it('criarAnotacaoPaciente deve retornar 500 se o model falhar ao criar', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoClinicaModel, 'criar').mockResolvedValue(null);

    const res = await AnotacaoService.criarAnotacaoPaciente(autorId, pacienteId, 'Texto teste');

    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(500);
    expect(res.erro).toContain('Erro ao persistir anotação clínica');
  });

  it('criarAnotacaoSessao deve retornar 500 se o model falhar ao criar', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoClinicaModel, 'criar').mockResolvedValue(null);

    const res = await AnotacaoService.criarAnotacaoSessao(autorId, sessaoId, pacienteId, 'Texto teste');

    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(500);
    expect(res.erro).toContain('Erro ao persistir anotação clínica');
  });

  it('atualizarConteudo deve retornar 500 se o model falhar ao atualizar', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoClinicaModel, 'atualizar').mockResolvedValue(null);

    const res = await AnotacaoService.atualizarConteudo(mockAnotacaoBase, autorId, 'Novo conteúdo');

    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(500);
    expect(res.erro).toContain('Erro ao atualizar anotação clínica');
  });

  it('atualizarConteudo (RN05): deve aplicar trim e passar exclusivamente whitelist de conteudo ao model', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    const spyAtualizar = vi.spyOn(AnotacaoClinicaModel, 'atualizar').mockResolvedValue({
      ...mockAnotacaoBase,
      conteudo: 'Conteúdo sem espaços extras',
    });

    const res = await AnotacaoService.atualizarConteudo(mockAnotacaoBase, autorId, '   Conteúdo sem espaços extras   ');

    expect(res.sucesso).toBe(true);
    expect(spyAtualizar).toHaveBeenCalledWith(anotacaoId, {
      conteudo: 'Conteúdo sem espaços extras',
    });
  });

  it('softDelete deve retornar 500 se o model falhar ao persistir', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoClinicaModel, 'softDelete').mockResolvedValue(false);

    const res = await AnotacaoService.softDelete(mockAnotacaoBase, autorId);

    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(500);
    expect(res.erro).toContain('Erro ao aplicar soft delete');
  });

  it('listarAnotacoesPaciente deve retornar 200 chamando model com somenteSemSessao = true', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    const mockLista = [mockAnotacaoBase];
    const spyListar = vi.spyOn(AnotacaoClinicaModel, 'listarPorPaciente').mockResolvedValue(mockLista);

    const res = await AnotacaoService.listarAnotacoesPaciente(pacienteId);

    expect(res.sucesso).toBe(true);
    expect(res.status).toBe(200);
    expect(res.dados).toEqual(mockLista);
    expect(spyListar).toHaveBeenCalledWith(pacienteId, false, true);
  });

  it('listarAnotacoesSessao deve retornar 200 com anotações da sessão', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    const mockListaSessao = [{ ...mockAnotacaoBase, sessao_id: sessaoId }];
    const spyListar = vi.spyOn(AnotacaoClinicaModel, 'listarPorSessao').mockResolvedValue(mockListaSessao);

    const res = await AnotacaoService.listarAnotacoesSessao(sessaoId);

    expect(res.sucesso).toBe(true);
    expect(res.status).toBe(200);
    expect(res.dados).toEqual(mockListaSessao);
    expect(spyListar).toHaveBeenCalledWith(sessaoId, false);
  });

  it('hardDeleteDev deve retornar 204 ao executar exclusão física com sucesso', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoClinicaModel, 'deletarHard').mockResolvedValue(true);

    const res = await AnotacaoService.hardDeleteDev(anotacaoId);

    expect(res.sucesso).toBe(true);
    expect(res.status).toBe(204);
  });

  it('hardDeleteDev deve retornar 404 se o model não localizar anotação', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoClinicaModel, 'deletarHard').mockResolvedValue(false);

    const res = await AnotacaoService.hardDeleteDev(anotacaoId);

    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(404);
    expect(res.erro).toContain('não encontrada para exclusão física');
  });

  it('hardDeleteDev deve retornar 500 se ocorrer exceção no model (ex: guarda de produção)', async () => {
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoClinicaModel, 'deletarHard').mockRejectedValue(new Error('Hard delete proibido em produção (RN05)'));

    const res = await AnotacaoService.hardDeleteDev(anotacaoId);

    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(500);
    expect(res.erro).toContain('Hard delete proibido em produção');
  });
});

// ==============================================================================
// TESTES DE RESOLUÇÃO DE CONTEXTO E ESCOPOS
// ==============================================================================
describe('Middlewares de Contexto - resolverContextoPaciente e resolverContextoSessao', () => {
  const pacienteId = '22222222-2222-4222-a222-222222222222';
  const sessaoId = '33333333-3333-4333-a333-333333333333';
  const anotacaoId = '44444444-4444-4444-a444-444444444444';

  function criarMockExpress(reqData: Partial<any>) {
    let statusCode = 200;
    let jsonResult: any = null;
    let nextChamado = false;

    const req: Record<string, any> = {
      method: 'GET',
      path: '/',
      body: {},
      params: {},
      ...reqData,
    };

    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonResult = data;
        return this;
      },
    };

    const next = () => {
      nextChamado = true;
    };

    return { req, res, next, getStatus: () => statusCode, getJson: () => jsonResult, isNextChamado: () => nextChamado };
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolverContextoPaciente: deve rejeitar POST sem paciente_id', async () => {
    const { resolverContextoPaciente } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { req, res, next, getStatus, getJson, isNextChamado } = criarMockExpress({
      method: 'POST',
      body: { conteudo: 'Texto teste' },
    });

    await resolverContextoPaciente(req as any, res as any, next);

    expect(getStatus()).toBe(400);
    expect(getJson().error).toContain('paciente_id é obrigatório');
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoPaciente: deve rejeitar POST com sessao_id na rota de paciente', async () => {
    const { resolverContextoPaciente } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { req, res, next, getStatus, getJson, isNextChamado } = criarMockExpress({
      method: 'POST',
      body: { paciente_id: pacienteId, sessao_id: sessaoId, conteudo: 'Texto teste' },
    });

    await resolverContextoPaciente(req as any, res as any, next);

    expect(getStatus()).toBe(400);
    expect(getJson().error).toContain('não aceita sessao_id');
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoPaciente: deve configurar pacienteAlvoId no POST válido', async () => {
    const { resolverContextoPaciente } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { req, res, next, isNextChamado } = criarMockExpress({
      method: 'POST',
      body: { paciente_id: pacienteId, conteudo: 'Texto' },
    });

    await resolverContextoPaciente(req as any, res as any, next);

    expect(isNextChamado()).toBe(true);
    expect(req.pacienteAlvoId).toBe(pacienteId);
  });

  it('resolverContextoPaciente: deve retornar 404 em PATCH se anotação pertencer a uma sessão (escopo cruzado)', async () => {
    const { resolverContextoPaciente } = await import('../middlewares/anotacao-contexto.middleware.js');
    vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue({
      id: anotacaoId,
      terapeuta_id: '111',
      paciente_id: pacienteId,
      sessao_id: sessaoId, // Pertence à sessão!
      conteudo: 'Anotação de sessão',
      soft_delete: false,
      created_at: '',
      updated_at: '',
    });

    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      method: 'PATCH',
      params: { id: anotacaoId },
      body: { conteudo: 'Novo' },
    });

    await resolverContextoPaciente(req as any, res as any, next);

    expect(getStatus()).toBe(404);
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoSessao: deve rejeitar POST em sessão cancelada com status 400', async () => {
    const { resolverContextoSessao } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { SessaoModel, STATUS_SESSAO } = await import('../../sessao/models/sessao.model.js');
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: sessaoId,
      status_sessao: STATUS_SESSAO.CANCELADA,
      paciente_id: pacienteId,
      modo_sessao: 'sessao_clinica',
    } as any);

    const { req, res, next, getStatus, getJson, isNextChamado } = criarMockExpress({
      method: 'POST',
      body: { sessao_id: sessaoId, conteudo: 'Texto' },
    });

    await resolverContextoSessao(req as any, res as any, next);

    expect(getStatus()).toBe(400);
    expect(getJson().error).toContain('sessão cancelada');
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoSessao: deve rejeitar POST em sessão modo livre com status 400 (RN01)', async () => {
    const { resolverContextoSessao } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { SessaoModel } = await import('../../sessao/models/sessao.model.js');
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: sessaoId,
      status_sessao: 'em_andamento',
      paciente_id: null,
      modo_sessao: 'modo_livre',
    } as any);

    const { req, res, next, getStatus, getJson } = criarMockExpress({
      method: 'POST',
      body: { sessao_id: sessaoId, conteudo: 'Texto' },
    });

    await resolverContextoSessao(req as any, res as any, next);

    expect(getStatus()).toBe(400);
    expect(getJson().error).toContain('RN01');
  });

  it('resolverContextoSessao: deve retornar 404 em PATCH se anotação não pertencer a uma sessão (escopo cruzado)', async () => {
    const { resolverContextoSessao } = await import('../middlewares/anotacao-contexto.middleware.js');
    vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue({
      id: anotacaoId,
      terapeuta_id: '111',
      paciente_id: pacienteId,
      sessao_id: null, // É anotação geral de paciente!
      conteudo: 'Anotação geral',
      soft_delete: false,
      created_at: '',
      updated_at: '',
    });

    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      method: 'PATCH',
      params: { id: anotacaoId },
      body: { conteudo: 'Novo' },
    });

    await resolverContextoSessao(req as any, res as any, next);

    expect(getStatus()).toBe(404);
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoPaciente: deve rejeitar POST com paciente_id não-UUID com status 400', async () => {
    const { resolverContextoPaciente } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { req, res, next, getStatus, getJson, isNextChamado } = criarMockExpress({
      method: 'POST',
      body: { paciente_id: 'invalido-uuid', conteudo: 'Texto teste' },
    });

    await resolverContextoPaciente(req as any, res as any, next);

    expect(getStatus()).toBe(400);
    expect(getJson().error).toContain('UUID válido');
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoPaciente: deve configurar pacienteAlvoId no GET válido', async () => {
    const { resolverContextoPaciente } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { req, res, next, isNextChamado } = criarMockExpress({
      method: 'GET',
      params: { pacienteId },
    });

    await resolverContextoPaciente(req as any, res as any, next);

    expect(isNextChamado()).toBe(true);
    expect(req.pacienteAlvoId).toBe(pacienteId);
  });

  it('resolverContextoPaciente: deve rejeitar GET com pacienteId não-UUID com 400', async () => {
    const { resolverContextoPaciente } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      method: 'GET',
      params: { pacienteId: 'paciente-invalido' },
    });

    await resolverContextoPaciente(req as any, res as any, next);

    expect(getStatus()).toBe(400);
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoPaciente: deve rejeitar PATCH com id da anotação não-UUID com 400', async () => {
    const { resolverContextoPaciente } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      method: 'PATCH',
      params: { id: 'id-invalido' },
      body: { conteudo: 'Novo' },
    });

    await resolverContextoPaciente(req as any, res as any, next);

    expect(getStatus()).toBe(400);
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoPaciente: deve retornar 404 se anotação não for encontrada no banco', async () => {
    const { resolverContextoPaciente } = await import('../middlewares/anotacao-contexto.middleware.js');
    vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(null);

    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      method: 'PATCH',
      params: { id: anotacaoId },
      body: { conteudo: 'Novo' },
    });

    await resolverContextoPaciente(req as any, res as any, next);

    expect(getStatus()).toBe(404);
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoPaciente: deve configurar pacienteAlvoId e contextoAnotacao no DELETE válido de paciente', async () => {
    const { resolverContextoPaciente } = await import('../middlewares/anotacao-contexto.middleware.js');
    const mockAnotacao = {
      id: anotacaoId,
      terapeuta_id: '111',
      paciente_id: pacienteId,
      sessao_id: null,
      conteudo: 'Anotação geral',
      soft_delete: false,
      created_at: '',
      updated_at: '',
    };
    vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacao);

    const { req, res, next, isNextChamado } = criarMockExpress({
      method: 'DELETE',
      params: { id: anotacaoId },
    });

    await resolverContextoPaciente(req as any, res as any, next);

    expect(isNextChamado()).toBe(true);
    expect(req.pacienteAlvoId).toBe(pacienteId);
    expect(req.contextoAnotacao).toEqual(mockAnotacao);
  });

  it('resolverContextoPaciente: deve retornar 500 se ocorrer exceção no model', async () => {
    const { resolverContextoPaciente } = await import('../middlewares/anotacao-contexto.middleware.js');
    vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockRejectedValue(new Error('Falha de banco'));

    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      method: 'DELETE',
      params: { id: anotacaoId },
    });

    await resolverContextoPaciente(req as any, res as any, next);

    expect(getStatus()).toBe(500);
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoSessao: deve rejeitar POST com sessao_id ausente com 400', async () => {
    const { resolverContextoSessao } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      method: 'POST',
      body: { conteudo: 'Texto' },
    });

    await resolverContextoSessao(req as any, res as any, next);

    expect(getStatus()).toBe(400);
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoSessao: deve rejeitar POST com sessao_id não-UUID com 400', async () => {
    const { resolverContextoSessao } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      method: 'POST',
      body: { sessao_id: 'invalido-uuid', conteudo: 'Texto' },
    });

    await resolverContextoSessao(req as any, res as any, next);

    expect(getStatus()).toBe(400);
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoSessao: deve retornar 404 se sessão não for encontrada no POST', async () => {
    const { resolverContextoSessao } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { SessaoModel } = await import('../../sessao/models/sessao.model.js');
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(null);

    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      method: 'POST',
      body: { sessao_id: sessaoId, conteudo: 'Texto' },
    });

    await resolverContextoSessao(req as any, res as any, next);

    expect(getStatus()).toBe(404);
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoSessao: deve permitir POST para sessão em_andamento e configurar pacienteAlvoId', async () => {
    const { resolverContextoSessao } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { SessaoModel, STATUS_SESSAO } = await import('../../sessao/models/sessao.model.js');
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: sessaoId,
      status_sessao: STATUS_SESSAO.EM_ANDAMENTO,
      paciente_id: pacienteId,
      modo_sessao: 'sessao_clinica',
    } as any);

    const { req, res, next, isNextChamado } = criarMockExpress({
      method: 'POST',
      body: { sessao_id: sessaoId, conteudo: 'Texto durante a sessão' },
    });

    await resolverContextoSessao(req as any, res as any, next);

    expect(isNextChamado()).toBe(true);
    expect(req.pacienteAlvoId).toBe(pacienteId);
  });

  it('resolverContextoSessao: deve permitir POST para sessão finalizada e configurar pacienteAlvoId', async () => {
    const { resolverContextoSessao } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { SessaoModel, STATUS_SESSAO } = await import('../../sessao/models/sessao.model.js');
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: sessaoId,
      status_sessao: STATUS_SESSAO.FINALIZADA,
      paciente_id: pacienteId,
      modo_sessao: 'sessao_clinica',
    } as any);

    const { req, res, next, isNextChamado } = criarMockExpress({
      method: 'POST',
      body: { sessao_id: sessaoId, conteudo: 'Texto pós sessão' },
    });

    await resolverContextoSessao(req as any, res as any, next);

    expect(isNextChamado()).toBe(true);
    expect(req.pacienteAlvoId).toBe(pacienteId);
  });

  it('resolverContextoSessao: deve configurar pacienteAlvoId no GET válido de sessão', async () => {
    const { resolverContextoSessao } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { SessaoModel } = await import('../../sessao/models/sessao.model.js');
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: sessaoId,
      status_sessao: 'finalizada',
      paciente_id: pacienteId,
      modo_sessao: 'sessao_clinica',
    } as any);

    const { req, res, next, isNextChamado } = criarMockExpress({
      method: 'GET',
      params: { sessaoId },
    });

    await resolverContextoSessao(req as any, res as any, next);

    expect(isNextChamado()).toBe(true);
    expect(req.pacienteAlvoId).toBe(pacienteId);
  });

  it('resolverContextoSessao: deve rejeitar GET com sessaoId não-UUID com 400', async () => {
    const { resolverContextoSessao } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      method: 'GET',
      params: { sessaoId: 'invalido-uuid' },
    });

    await resolverContextoSessao(req as any, res as any, next);

    expect(getStatus()).toBe(400);
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoSessao: deve retornar 404 no GET se sessão não for encontrada', async () => {
    const { resolverContextoSessao } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { SessaoModel } = await import('../../sessao/models/sessao.model.js');
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(null);

    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      method: 'GET',
      params: { sessaoId },
    });

    await resolverContextoSessao(req as any, res as any, next);

    expect(getStatus()).toBe(404);
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoSessao: deve rejeitar GET para sessão em modo livre (400, RN01)', async () => {
    const { resolverContextoSessao } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { SessaoModel } = await import('../../sessao/models/sessao.model.js');
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: sessaoId,
      status_sessao: 'finalizada',
      paciente_id: null,
      modo_sessao: 'modo_livre',
    } as any);

    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      method: 'GET',
      params: { sessaoId },
    });

    await resolverContextoSessao(req as any, res as any, next);

    expect(getStatus()).toBe(400);
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoSessao: deve rejeitar PATCH com id não-UUID com 400', async () => {
    const { resolverContextoSessao } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      method: 'PATCH',
      params: { id: 'nao-uuid' },
      body: { conteudo: 'Novo' },
    });

    await resolverContextoSessao(req as any, res as any, next);

    expect(getStatus()).toBe(400);
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoSessao: deve retornar 404 no PATCH se anotação não for encontrada', async () => {
    const { resolverContextoSessao } = await import('../middlewares/anotacao-contexto.middleware.js');
    vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(null);

    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      method: 'PATCH',
      params: { id: anotacaoId },
      body: { conteudo: 'Novo' },
    });

    await resolverContextoSessao(req as any, res as any, next);

    expect(getStatus()).toBe(404);
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoSessao: deve configurar pacienteAlvoId e contextoAnotacao no PATCH válido de sessão', async () => {
    const { resolverContextoSessao } = await import('../middlewares/anotacao-contexto.middleware.js');
    const mockAnotacao = {
      id: anotacaoId,
      terapeuta_id: '111',
      paciente_id: pacienteId,
      sessao_id: sessaoId,
      conteudo: 'Anotação de sessão',
      soft_delete: false,
      created_at: '',
      updated_at: '',
    };
    vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacao);

    const { req, res, next, isNextChamado } = criarMockExpress({
      method: 'PATCH',
      params: { id: anotacaoId },
      body: { conteudo: 'Novo' },
    });

    await resolverContextoSessao(req as any, res as any, next);

    expect(isNextChamado()).toBe(true);
    expect(req.pacienteAlvoId).toBe(pacienteId);
    expect(req.contextoAnotacao).toEqual(mockAnotacao);
  });

  it('resolverContextoSessao: deve retornar 500 se ocorrer exceção inesperada', async () => {
    const { resolverContextoSessao } = await import('../middlewares/anotacao-contexto.middleware.js');
    vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockRejectedValue(new Error('Falha catastrófica'));

    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      method: 'PATCH',
      params: { id: anotacaoId },
      body: { conteudo: 'Novo' },
    });

    await resolverContextoSessao(req as any, res as any, next);

    expect(getStatus()).toBe(500);
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoAnotacaoPorId: deve rejeitar com 400 se o id for ausente ou inválido', async () => {
    const { resolverContextoAnotacaoPorId } = await import('../middlewares/anotacao-contexto.middleware.js');
    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      params: { id: 'uuid-invalido' },
    });

    await resolverContextoAnotacaoPorId(req as any, res as any, next);

    expect(getStatus()).toBe(400);
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoAnotacaoPorId: deve retornar 404 se a anotação não for encontrada', async () => {
    const { resolverContextoAnotacaoPorId } = await import('../middlewares/anotacao-contexto.middleware.js');
    vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(null);

    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      params: { id: anotacaoId },
    });

    await resolverContextoAnotacaoPorId(req as any, res as any, next);

    expect(getStatus()).toBe(404);
    expect(isNextChamado()).toBe(false);
  });

  it('resolverContextoAnotacaoPorId: deve injetar pacienteAlvoId e contextoAnotacao se localizada com sucesso', async () => {
    const { resolverContextoAnotacaoPorId } = await import('../middlewares/anotacao-contexto.middleware.js');
    const mockAnotacao = {
      id: anotacaoId,
      terapeuta_id: '111',
      paciente_id: pacienteId,
      sessao_id: null,
      conteudo: 'Anotação geral',
      soft_delete: false,
      created_at: '',
      updated_at: '',
    };
    vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacao);

    const { req, res, next, isNextChamado } = criarMockExpress({
      params: { id: anotacaoId },
    });

    await resolverContextoAnotacaoPorId(req as any, res as any, next);

    expect(isNextChamado()).toBe(true);
    expect(req.pacienteAlvoId).toBe(pacienteId);
    expect(req.contextoAnotacao).toEqual(mockAnotacao);
  });

  it('resolverContextoAnotacaoPorId: deve retornar 500 se ocorrer exceção inesperada', async () => {
    const { resolverContextoAnotacaoPorId } = await import('../middlewares/anotacao-contexto.middleware.js');
    vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockRejectedValue(new Error('Erro de conexão'));

    const { req, res, next, getStatus, isNextChamado } = criarMockExpress({
      params: { id: anotacaoId },
    });

    await resolverContextoAnotacaoPorId(req as any, res as any, next);

    expect(getStatus()).toBe(500);
    expect(isNextChamado()).toBe(false);
  });
});

// ==============================================================================
// TESTES INTEGRADOS DE VISIBILIDADE INSTITUCIONAL (RN04)
// ==============================================================================
describe('Segurança Institucional e Vínculo Clínico (RN04) com verificarVisibilidadePaciente', () => {
  const clinicaId = 'cccccccc-cccc-4ccc-accc-cccccccccccc';
  const outraClinicaId = 'dddddddd-dddd-4ddd-addd-dddddddddddd';
  const terapeutaId = '11111111-1111-4111-a111-111111111111';
  const pacienteId = '22222222-2222-4222-a222-222222222222';

  function criarMockExpressAutenticado(reqData: Record<string, any>) {
    let statusCode = 200;
    let jsonResult: any = null;
    let nextChamado = false;

    const req: Record<string, any> = {
      method: 'POST',
      path: '/',
      body: {},
      params: {},
      user: { id: terapeutaId, user_metadata: {} },
      ...reqData,
    };

    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonResult = data;
        return this;
      },
    };

    const next = () => {
      nextChamado = true;
    };

    return { req, res, next, getStatus: () => statusCode, getJson: () => jsonResult, isNextChamado: () => nextChamado };
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve autorizar acesso quando terapeuta e paciente possuem vínculo ativo na mesma clínica', async () => {
    const { verificarVisibilidadePaciente } = await import('../../../core/middlewares/visibilidade.middleware.js');

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: terapeutaId, clinica_id: clinicaId, is_super_admin: false, status_ativo: true },
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

    const { req, res, next, isNextChamado } = criarMockExpressAutenticado({
      pacienteAlvoId: pacienteId,
    });

    await verificarVisibilidadePaciente(req as any, res as any, next);

    expect(isNextChamado()).toBe(true);
  });

  it('deve rejeitar com 403 Forbidden se terapeuta pertencer a uma clínica diferente do paciente', async () => {
    const { verificarVisibilidadePaciente } = await import('../../../core/middlewares/visibilidade.middleware.js');

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteId, clinica_id: outraClinicaId, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: terapeutaId, clinica_id: clinicaId, is_super_admin: false, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const { req, res, next, getStatus, isNextChamado } = criarMockExpressAutenticado({
      pacienteAlvoId: pacienteId,
    });

    await verificarVisibilidadePaciente(req as any, res as any, next);

    expect(getStatus()).toBe(403);
    expect(isNextChamado()).toBe(false);
  });

  it('deve rejeitar com 403 Forbidden se terapeuta não possuir vínculo ativo em terapeuta_paciente', async () => {
    const { verificarVisibilidadePaciente } = await import('../../../core/middlewares/visibilidade.middleware.js');

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: terapeutaId, clinica_id: clinicaId, is_super_admin: false, status_ativo: true },
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

    const { req, res, next, getStatus, isNextChamado } = criarMockExpressAutenticado({
      pacienteAlvoId: pacienteId,
    });

    await verificarVisibilidadePaciente(req as any, res as any, next);

    expect(getStatus()).toBe(403);
    expect(isNextChamado()).toBe(false);
  });

  it('deve retornar 404 se o pacienteAlvoId não existir no banco de dados', async () => {
    const { verificarVisibilidadePaciente } = await import('../../../core/middlewares/visibilidade.middleware.js');

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const { req, res, next, getStatus, isNextChamado } = criarMockExpressAutenticado({
      pacienteAlvoId: pacienteId,
    });

    await verificarVisibilidadePaciente(req as any, res as any, next);

    expect(getStatus()).toBe(404);
    expect(isNextChamado()).toBe(false);
  });

  it('NÃO deve aplicar bypass de modo_livre quando req.pacienteAlvoId estiver injetado', async () => {
    const { verificarVisibilidadePaciente } = await import('../../../core/middlewares/visibilidade.middleware.js');

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null, // Vai cair na checagem de paciente, provando que NÃO deu bypass!
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const { req, res, next, getStatus } = criarMockExpressAutenticado({
      pacienteAlvoId: pacienteId,
      body: { modo_sessao: 'modo_livre' },
    });

    await verificarVisibilidadePaciente(req as any, res as any, next);

    expect(getStatus()).toBe(404); // Provou que executou a validação de paciente!
  });
});

// ==============================================================================
// TESTES DE CONTROLLERS (AnotacaoPacienteController e AnotacaoSessaoController)
// ==============================================================================
describe('Controllers de Anotações Clínicas - Autoria JWT e Códigos HTTP', () => {
  const autorId = '11111111-1111-4111-a111-111111111111';
  const pacienteId = '22222222-2222-4222-a222-222222222222';
  const sessaoId = '33333333-3333-4333-a333-333333333333';
  const anotacaoId = '44444444-4444-4444-a444-444444444444';

  function criarMockHttp(
    body: any = {},
    params: any = {},
    user: any = { id: autorId },
    contextoAnotacao: any = null,
    pacienteAlvoId: string = pacienteId
  ) {
    let statusCode = 200;
    let jsonResult: any = null;
    let sent = false;

    const req: any = {
      body,
      params,
      user,
      contextoAnotacao,
      pacienteAlvoId,
    };

    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonResult = data;
        return this;
      },
      send() {
        sent = true;
        return this;
      },
    };

    return { req, res, getStatus: () => statusCode, getJson: () => jsonResult, isSent: () => sent };
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('AnotacaoPacienteController.criar: deve rejeitar com 401 se user não estiver no token', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const { req, res, getStatus } = criarMockHttp({ paciente_id: pacienteId, conteudo: 'Texto' }, {}, null);

    await AnotacaoPacienteController.criar(req, res);

    expect(getStatus()).toBe(401);
  });

  it('AnotacaoPacienteController.criar: deve rejeitar com 403 se terapeuta_id do body for divergente do token (anti-spoofing)', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const { req, res, getStatus, getJson } = criarMockHttp({
      terapeuta_id: 'outro-uuid-malicioso',
      paciente_id: pacienteId,
      conteudo: 'Texto',
    });

    await AnotacaoPacienteController.criar(req, res);

    expect(getStatus()).toBe(403);
    expect(getJson().error).toContain('não autorizada');
  });

  it('AnotacaoPacienteController.criar: deve retornar 201 com sucesso usando ID do token', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'criarAnotacaoPaciente').mockResolvedValue({
      sucesso: true,
      status: 201,
      dados: {
        id: anotacaoId,
        terapeuta_id: autorId,
        paciente_id: pacienteId,
        sessao_id: null,
        conteudo: 'Anotação geral',
        soft_delete: false,
        created_at: '',
        updated_at: '',
      },
    });

    const { req, res, getStatus, getJson } = criarMockHttp({
      paciente_id: pacienteId,
      conteudo: 'Anotação geral',
    });

    await AnotacaoPacienteController.criar(req, res);

    expect(getStatus()).toBe(201);
    expect(getJson().data.id).toBe(anotacaoId);
  });

  it('AnotacaoPacienteController.atualizar: deve rejeitar com 400 se campo conteudo estiver ausente', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const { req, res, getStatus } = criarMockHttp({}, { id: anotacaoId });

    await AnotacaoPacienteController.atualizar(req, res);

    expect(getStatus()).toBe(400);
  });

  it('AnotacaoPacienteController.atualizar: deve retornar 200 ao atualizar conteúdo pelo autor', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'atualizarConteudo').mockResolvedValue({
      sucesso: true,
      status: 200,
      dados: {
        id: anotacaoId,
        terapeuta_id: autorId,
        paciente_id: pacienteId,
        sessao_id: null,
        conteudo: 'Atualizado',
        soft_delete: false,
        created_at: '',
        updated_at: '',
      },
    });

    const mockAnotacao = { id: anotacaoId, terapeuta_id: autorId };
    const { req, res, getStatus } = criarMockHttp({ conteudo: 'Atualizado' }, { id: anotacaoId }, { id: autorId }, mockAnotacao);

    await AnotacaoPacienteController.atualizar(req, res);

    expect(getStatus()).toBe(200);
  });

  it('AnotacaoPacienteController.deletar: deve retornar 204 ao executar soft delete pelo autor', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'softDelete').mockResolvedValue({
      sucesso: true,
      status: 204,
    });

    const mockAnotacao = { id: anotacaoId, terapeuta_id: autorId };
    const { req, res, getStatus, isSent } = criarMockHttp({}, { id: anotacaoId }, { id: autorId }, mockAnotacao);

    await AnotacaoPacienteController.deletar(req, res);

    expect(getStatus()).toBe(204);
    expect(isSent()).toBe(true);
  });

  it('AnotacaoSessaoController.criar: deve retornar 201 ao registrar anotação para sessão', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'criarAnotacaoSessao').mockResolvedValue({
      sucesso: true,
      status: 201,
      dados: {
        id: anotacaoId,
        terapeuta_id: autorId,
        paciente_id: pacienteId,
        sessao_id: sessaoId,
        conteudo: 'Parecer pós-sessão',
        soft_delete: false,
        created_at: '',
        updated_at: '',
      },
    });

    const { req, res, getStatus, getJson } = criarMockHttp(
      { sessao_id: sessaoId, conteudo: 'Parecer pós-sessão' },
      {},
      { id: autorId },
      null,
      pacienteId
    );

    await AnotacaoSessaoController.criar(req, res);

    expect(getStatus()).toBe(201);
    expect(getJson().data.sessao_id).toBe(sessaoId);
  });

  it('AnotacaoSessaoController.deletar: deve retornar 204 ao executar soft delete da anotação de sessão', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'softDelete').mockResolvedValue({
      sucesso: true,
      status: 204,
    });

    const mockAnotacao = { id: anotacaoId, terapeuta_id: autorId, sessao_id: sessaoId };
    const { req, res, getStatus, isSent } = criarMockHttp({}, { id: anotacaoId }, { id: autorId }, mockAnotacao);

    await AnotacaoSessaoController.deletar(req, res);

    expect(getStatus()).toBe(204);
    expect(isSent()).toBe(true);
  });

  it('AnotacaoPacienteController.listarPorPaciente: deve retornar 200 com array de anotações', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'listarAnotacoesPaciente').mockResolvedValue({
      sucesso: true,
      status: 200,
      dados: [],
    });

    const { req, res, getStatus, getJson } = criarMockHttp({}, { pacienteId });

    await AnotacaoPacienteController.listarPorPaciente(req, res);

    expect(getStatus()).toBe(200);
    expect(getJson().data).toEqual([]);
  });

  it('AnotacaoPacienteController.listarPorPaciente: deve retornar 500 se service falhar', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'listarAnotacoesPaciente').mockRejectedValue(new Error('Erro de banco'));

    const { req, res, getStatus } = criarMockHttp({}, { pacienteId });

    await AnotacaoPacienteController.listarPorPaciente(req, res);

    expect(getStatus()).toBe(500);
  });

  it('AnotacaoPacienteController.criar: deve retornar 500 se service lançar exceção', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'criarAnotacaoPaciente').mockRejectedValue(new Error('Falha'));

    const { req, res, getStatus } = criarMockHttp({ paciente_id: pacienteId, conteudo: 'Texto' });

    await AnotacaoPacienteController.criar(req, res);

    expect(getStatus()).toBe(500);
  });

  it('AnotacaoPacienteController.atualizar: deve retornar 401 se sem user no token', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const { req, res, getStatus } = criarMockHttp({ conteudo: 'Novo' }, { id: anotacaoId }, null);

    await AnotacaoPacienteController.atualizar(req, res);

    expect(getStatus()).toBe(401);
  });

  it('AnotacaoPacienteController.atualizar: deve retornar 403 se terapeuta não for o autor (RF21)', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const outroTerapeuta = '99999999-9999-4999-a999-999999999999';
    const mockAnotacao = { id: anotacaoId, terapeuta_id: autorId, conteudo: 'Original' };

    const { req, res, getStatus, getJson } = criarMockHttp(
      { conteudo: 'Texto modificado' },
      { id: anotacaoId },
      { id: outroTerapeuta },
      mockAnotacao
    );

    await AnotacaoPacienteController.atualizar(req, res);

    expect(getStatus()).toBe(403);
    expect(getJson().error).toContain('apenas o terapeuta autor');
  });

  it('AnotacaoPacienteController.atualizar: deve retornar 500 se service lançar exceção', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'atualizarConteudo').mockRejectedValue(new Error('Erro'));

    const { req, res, getStatus } = criarMockHttp({ conteudo: 'Novo' }, { id: anotacaoId }, { id: autorId }, { terapeuta_id: autorId });

    await AnotacaoPacienteController.atualizar(req, res);

    expect(getStatus()).toBe(500);
  });

  it('AnotacaoPacienteController.deletar: deve retornar 401 se sem user no token', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const { req, res, getStatus } = criarMockHttp({}, { id: anotacaoId }, null);

    await AnotacaoPacienteController.deletar(req, res);

    expect(getStatus()).toBe(401);
  });

  it('AnotacaoPacienteController.deletar: deve retornar 403 se usuário não for o autor', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const outroTerapeuta = '99999999-9999-4999-a999-999999999999';
    const mockAnotacao = { id: anotacaoId, terapeuta_id: autorId };

    const { req, res, getStatus, getJson } = criarMockHttp(
      {},
      { id: anotacaoId },
      { id: outroTerapeuta },
      mockAnotacao
    );

    await AnotacaoPacienteController.deletar(req, res);

    expect(getStatus()).toBe(403);
    expect(getJson().error).toContain('apenas o terapeuta autor');
  });

  it('AnotacaoPacienteController.deletar: deve retornar 500 se service lançar exceção', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'softDelete').mockRejectedValue(new Error('Erro'));

    const { req, res, getStatus } = criarMockHttp({}, { id: anotacaoId }, { id: autorId }, { terapeuta_id: autorId });

    await AnotacaoPacienteController.deletar(req, res);

    expect(getStatus()).toBe(500);
  });

  it('AnotacaoPacienteController.deletarHard: deve retornar 204 ao executar hard delete com sucesso', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'hardDeleteDev').mockResolvedValue({ sucesso: true, status: 204 });

    const { req, res, getStatus, isSent } = criarMockHttp({}, { id: anotacaoId });

    await AnotacaoPacienteController.deletarHard(req, res);

    expect(getStatus()).toBe(204);
    expect(isSent()).toBe(true);
  });

  it('AnotacaoPacienteController.deletarHard: deve repassar status de erro do service (ex: 404)', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'hardDeleteDev').mockResolvedValue({ sucesso: false, status: 404, erro: 'Não encontrada' });

    const { req, res, getStatus } = criarMockHttp({}, { id: anotacaoId });

    await AnotacaoPacienteController.deletarHard(req, res);

    expect(getStatus()).toBe(404);
  });

  it('AnotacaoPacienteController.deletarHard: deve retornar 500 se service lançar exceção', async () => {
    const { AnotacaoPacienteController } = await import('../controllers/anotacao-paciente.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'hardDeleteDev').mockRejectedValue(new Error('Erro fatal'));

    const { req, res, getStatus } = criarMockHttp({}, { id: anotacaoId });

    await AnotacaoPacienteController.deletarHard(req, res);

    expect(getStatus()).toBe(500);
  });

  it('AnotacaoSessaoController.criar: deve retornar 401 se sem user no token', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const { req, res, getStatus } = criarMockHttp({ sessao_id: sessaoId, conteudo: 'Texto' }, {}, null);

    await AnotacaoSessaoController.criar(req, res);

    expect(getStatus()).toBe(401);
  });

  it('AnotacaoSessaoController.criar: deve retornar 403 se terapeuta_id do body for divergente do token (anti-spoofing)', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const { req, res, getStatus, getJson } = criarMockHttp({
      sessao_id: sessaoId,
      terapeuta_id: 'outro-uuid',
      conteudo: 'Texto',
    });

    await AnotacaoSessaoController.criar(req, res);

    expect(getStatus()).toBe(403);
    expect(getJson().error).toContain('não autorizada');
  });

  it('AnotacaoSessaoController.criar: deve retornar 400 se pacienteAlvoId não estiver presente na requisição', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const { req, res, getStatus, getJson } = criarMockHttp({ sessao_id: sessaoId, conteudo: 'Texto' }, {}, { id: autorId }, null, '');

    await AnotacaoSessaoController.criar(req, res);

    expect(getStatus()).toBe(400);
    expect(getJson().error).toContain('Não foi possível associar a sessão ao paciente');
  });

  it('AnotacaoSessaoController.criar: deve retornar 500 se service lançar exceção', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'criarAnotacaoSessao').mockRejectedValue(new Error('Erro'));

    const { req, res, getStatus } = criarMockHttp({ sessao_id: sessaoId, conteudo: 'Texto' }, {}, { id: autorId }, null, pacienteId);

    await AnotacaoSessaoController.criar(req, res);

    expect(getStatus()).toBe(500);
  });

  it('AnotacaoSessaoController.listarPorSessao: deve retornar 200 com array de anotações', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'listarAnotacoesSessao').mockResolvedValue({
      sucesso: true,
      status: 200,
      dados: [],
    });

    const { req, res, getStatus, getJson } = criarMockHttp({}, { sessaoId });

    await AnotacaoSessaoController.listarPorSessao(req, res);

    expect(getStatus()).toBe(200);
    expect(getJson().data).toEqual([]);
  });

  it('AnotacaoSessaoController.listarPorSessao: deve retornar 500 se service falhar', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'listarAnotacoesSessao').mockRejectedValue(new Error('Erro de banco'));

    const { req, res, getStatus } = criarMockHttp({}, { sessaoId });

    await AnotacaoSessaoController.listarPorSessao(req, res);

    expect(getStatus()).toBe(500);
  });

  it('AnotacaoSessaoController.atualizar: deve retornar 401 se sem user no token', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const { req, res, getStatus } = criarMockHttp({ conteudo: 'Novo' }, { id: anotacaoId }, null);

    await AnotacaoSessaoController.atualizar(req, res);

    expect(getStatus()).toBe(401);
  });

  it('AnotacaoSessaoController.atualizar: deve rejeitar com 400 se campo conteudo estiver ausente', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const { req, res, getStatus } = criarMockHttp({}, { id: anotacaoId });

    await AnotacaoSessaoController.atualizar(req, res);

    expect(getStatus()).toBe(400);
  });

  it('AnotacaoSessaoController.atualizar: deve retornar 200 ao atualizar conteúdo pelo autor', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'atualizarConteudo').mockResolvedValue({
      sucesso: true,
      status: 200,
      dados: {
        id: anotacaoId,
        terapeuta_id: autorId,
        paciente_id: pacienteId,
        sessao_id: sessaoId,
        conteudo: 'Atualizado',
        soft_delete: false,
        created_at: '',
        updated_at: '',
      },
    });

    const mockAnotacao = { id: anotacaoId, terapeuta_id: autorId, sessao_id: sessaoId };
    const { req, res, getStatus } = criarMockHttp({ conteudo: 'Atualizado' }, { id: anotacaoId }, { id: autorId }, mockAnotacao);

    await AnotacaoSessaoController.atualizar(req, res);

    expect(getStatus()).toBe(200);
  });

  it('AnotacaoSessaoController.atualizar: deve retornar 403 se usuário não for o autor', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const outroTerapeuta = '99999999-9999-4999-a999-999999999999';
    const mockAnotacao = { id: anotacaoId, terapeuta_id: autorId, sessao_id: sessaoId };

    const { req, res, getStatus, getJson } = criarMockHttp(
      { conteudo: 'Texto modificado' },
      { id: anotacaoId },
      { id: outroTerapeuta },
      mockAnotacao
    );

    await AnotacaoSessaoController.atualizar(req, res);

    expect(getStatus()).toBe(403);
    expect(getJson().error).toContain('apenas o terapeuta autor');
  });

  it('AnotacaoSessaoController.atualizar: deve retornar 500 se service lançar exceção', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'atualizarConteudo').mockRejectedValue(new Error('Erro'));

    const { req, res, getStatus } = criarMockHttp({ conteudo: 'Novo' }, { id: anotacaoId }, { id: autorId }, { terapeuta_id: autorId });

    await AnotacaoSessaoController.atualizar(req, res);

    expect(getStatus()).toBe(500);
  });

  it('AnotacaoSessaoController.deletar: deve retornar 401 se sem user no token', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const { req, res, getStatus } = criarMockHttp({}, { id: anotacaoId }, null);

    await AnotacaoSessaoController.deletar(req, res);

    expect(getStatus()).toBe(401);
  });

  it('AnotacaoSessaoController.deletar: deve retornar 403 se usuário não for o autor', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const outroTerapeuta = '99999999-9999-4999-a999-999999999999';
    const mockAnotacao = { id: anotacaoId, terapeuta_id: autorId, sessao_id: sessaoId };

    const { req, res, getStatus, getJson } = criarMockHttp(
      {},
      { id: anotacaoId },
      { id: outroTerapeuta },
      mockAnotacao
    );

    await AnotacaoSessaoController.deletar(req, res);

    expect(getStatus()).toBe(403);
    expect(getJson().error).toContain('apenas o terapeuta autor');
  });

  it('AnotacaoSessaoController.deletar: deve retornar 500 se service lançar exceção', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'softDelete').mockRejectedValue(new Error('Erro'));

    const { req, res, getStatus } = criarMockHttp({}, { id: anotacaoId }, { id: autorId }, { terapeuta_id: autorId });

    await AnotacaoSessaoController.deletar(req, res);

    expect(getStatus()).toBe(500);
  });

  it('AnotacaoSessaoController.deletarHard: deve retornar 204 ao executar hard delete com sucesso', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'hardDeleteDev').mockResolvedValue({ sucesso: true, status: 204 });

    const { req, res, getStatus, isSent } = criarMockHttp({}, { id: anotacaoId });

    await AnotacaoSessaoController.deletarHard(req, res);

    expect(getStatus()).toBe(204);
    expect(isSent()).toBe(true);
  });

  it('AnotacaoSessaoController.deletarHard: deve repassar status de erro do service (ex: 404)', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'hardDeleteDev').mockResolvedValue({ sucesso: false, status: 404, erro: 'Não encontrada' });

    const { req, res, getStatus } = criarMockHttp({}, { id: anotacaoId });

    await AnotacaoSessaoController.deletarHard(req, res);

    expect(getStatus()).toBe(404);
  });

  it('AnotacaoSessaoController.deletarHard: deve retornar 500 se service lançar exceção', async () => {
    const { AnotacaoSessaoController } = await import('../controllers/anotacao-sessao.controller.js');
    const { AnotacaoService } = await import('../services/anotacao.service.js');
    vi.spyOn(AnotacaoService, 'hardDeleteDev').mockRejectedValue(new Error('Erro fatal'));

    const { req, res, getStatus } = criarMockHttp({}, { id: anotacaoId });

    await AnotacaoSessaoController.deletarHard(req, res);

    expect(getStatus()).toBe(500);
  });

  it('anotacaoRoutes deve conter todas as rotas de paciente e sessão e middleware de admin em /hard', async () => {
    const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
    expect(anotacaoRoutes).toBeDefined();

    const rotasRegistradas = anotacaoRoutes.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
        stackLength: layer.route.stack.length,
      }));

    const paths = rotasRegistradas.map((r: any) => r.path);
    expect(paths).toContain('/paciente');
    expect(paths).toContain('/paciente/:pacienteId');
    expect(paths).toContain('/paciente/:id');
    expect(paths).toContain('/paciente/:id/hard');
    expect(paths).toContain('/sessao');
    expect(paths).toContain('/sessao/:sessaoId');
    expect(paths).toContain('/sessao/:id');
    expect(paths).toContain('/sessao/:id/hard');

    // As rotas de hard delete devem possuir mais handlers na stack devido ao adminMiddleware
    const rotaHardPaciente = rotasRegistradas.find((r: any) => r.path === '/paciente/:id/hard');
    const rotaNormalPaciente = rotasRegistradas.find((r: any) => r.path === '/paciente/:id');
    expect(rotaHardPaciente?.stackLength).toBeGreaterThan(rotaNormalPaciente?.stackLength || 0);

    // As rotas canônicas unificadas na raiz também devem estar registradas
    expect(paths).toContain('/:id');
    expect(paths).toContain('/:id/hard');
  });
});

// ==============================================================================
// TESTES DE INTEGRAÇÃO: ROTAS CANÔNICAS UNIFICADAS (/api/anotacao/:id)
// ==============================================================================

function criarMockPipelineAnotacao(opcoes: {
  params?: any;
  body?: any;
  headers?: any;
  user?: any;
}) {
  let statusCode = 200;
  let jsonResult: any = null;
  let sent = false;

  const req: any = {
    params: opcoes.params || {},
    body: opcoes.body || {},
    headers: opcoes.headers || { authorization: 'Bearer token-teste' },
    user: opcoes.user || null,
  };

  const res: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      jsonResult = data;
      sent = true;
      return this;
    },
    send(data?: any) {
      jsonResult = data;
      sent = true;
      return this;
    },
  };

  return {
    req,
    res,
    getStatus: () => statusCode,
    getJson: () => jsonResult,
    isSent: () => sent,
  };
}

function executarPipelineAnotacao(
  handlers: Array<(req: any, res: any, next: (err?: any) => void) => Promise<void> | void>,
  req: any,
  res: any
): Promise<void> {
  return new Promise((resolve, reject) => {
    let idx = 0;

    const originalJson = res.json?.bind(res);
    const originalSend = res.send?.bind(res);

    res.json = (data: any) => {
      const ret = originalJson ? originalJson(data) : res;
      resolve();
      return ret;
    };

    res.send = (data?: any) => {
      const ret = originalSend ? originalSend(data) : res;
      resolve();
      return ret;
    };

    function next(err?: any) {
      if (err) return reject(err);
      if (idx < handlers.length) {
        const handler = handlers[idx++];
        Promise.resolve(handler(req, res, next)).catch(reject);
      } else {
        resolve();
      }
    }

    next();
  });
}

function obterHandlersAnotacao(
  router: any,
  path: string,
  method: string
): Array<(req: any, res: any, next: (err?: any) => void) => Promise<void> | void> {
  const layer = router.stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method.toLowerCase()]
  );
  if (!layer?.route?.stack) {
    throw new Error(`Rota ${method.toUpperCase()} ${path} não encontrada no router`);
  }
  return layer.route.stack.map((s: any) => s.handle);
}

describe('Rotas Canônicas Unificadas (/api/anotacao/:id) — Integração de Middlewares, Autoria RF21 e RN04', () => {
  const autorId = '11111111-1111-4111-a111-111111111111';
  const coterapeutaId = '22222222-2222-4222-a222-222222222222';
  const superAdminId = '33333333-3333-4333-a333-333333333333';
  const pacienteId = '44444444-4444-4444-a444-444444444444';
  const anotacaoId = '55555555-5555-4555-a555-555555555555';
  const clinicaId = '66666666-6666-4666-a666-666666666666';

  const mockAnotacao = {
    id: anotacaoId,
    terapeuta_id: autorId,
    paciente_id: pacienteId,
    sessao_id: null,
    conteudo: 'Evolução clínica do paciente observada em sessão.',
    soft_delete: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ----------------------------------------------------------------------------
  // 1. GET /api/anotacao/:id
  // ----------------------------------------------------------------------------
  describe('GET /api/anotacao/:id', () => {
    it('deve retornar 200 OK com os dados da anotação quando terapeuta possuir vínculo ativo (RN04)', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersAnotacao(anotacaoRoutes, '/:id', 'get');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: autorId } },
        error: null,
      } as any);

      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacao);

      vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: autorId, clinica_id: clinicaId, status_ativo: true, is_super_admin: false },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (tabela === 'terapeuta_paciente') {
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
          } as any;
        }
        return {} as any;
      });

      const mockHttp = criarMockPipelineAnotacao({
        params: { id: anotacaoId },
      });

      await executarPipelineAnotacao(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(200);
      expect(mockHttp.getJson().data.id).toBe(anotacaoId);
      expect(mockHttp.getJson().data.conteudo).toBe(mockAnotacao.conteudo);
    });

    it('deve retornar 404 Not Found se anotação clínica for inexistente no banco', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersAnotacao(anotacaoRoutes, '/:id', 'get');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: autorId } },
        error: null,
      } as any);

      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(null);

      const mockHttp = criarMockPipelineAnotacao({
        params: { id: anotacaoId },
      });

      await executarPipelineAnotacao(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(404);
      expect(mockHttp.getJson().error).toContain('não encontrada');
    });

    it('deve retornar 403 Forbidden se terapeuta requisitante não possuir vínculo ativo com o paciente (RN04)', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersAnotacao(anotacaoRoutes, '/:id', 'get');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: coterapeutaId } },
        error: null,
      } as any);

      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacao);

      vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: coterapeutaId, clinica_id: clinicaId, status_ativo: true, is_super_admin: false },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (tabela === 'terapeuta_paciente') {
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
          } as any;
        }
        return {} as any;
      });

      const mockHttp = criarMockPipelineAnotacao({
        params: { id: anotacaoId },
      });

      await executarPipelineAnotacao(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(403);
      expect(mockHttp.getJson().error).toContain('não possui vínculo ativo');
    });
  });

  // ----------------------------------------------------------------------------
  // 2. DELETE /api/anotacao/:id (Soft Delete)
  // ----------------------------------------------------------------------------
  describe('DELETE /api/anotacao/:id', () => {
    it('deve retornar 204 No Content quando executado pelo próprio autor com vínculo ativo (RF21 e RN04)', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersAnotacao(anotacaoRoutes, '/:id', 'delete');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: autorId } },
        error: null,
      } as any);

      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacao);
      vi.spyOn(AnotacaoClinicaModel, 'softDelete').mockResolvedValue(true);

      vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: autorId, clinica_id: clinicaId, status_ativo: true, is_super_admin: false },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (tabela === 'terapeuta_paciente') {
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
          } as any;
        }
        return {} as any;
      });

      const mockHttp = criarMockPipelineAnotacao({
        params: { id: anotacaoId },
      });

      await executarPipelineAnotacao(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(204);
      expect(mockHttp.isSent()).toBe(true);
    });

    it('deve retornar 403 Forbidden quando executado por outro terapeuta que não seja o autor (RF21)', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersAnotacao(anotacaoRoutes, '/:id', 'delete');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: coterapeutaId } }, // Coterapeuta tentando excluir nota do autor
        error: null,
      } as any);

      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacao);

      vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: coterapeutaId, clinica_id: clinicaId, status_ativo: true, is_super_admin: false },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (tabela === 'terapeuta_paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { paciente_id: pacienteId }, // Possui vínculo, mas NÃO é o autor!
                    error: null,
                  }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const mockHttp = criarMockPipelineAnotacao({
        params: { id: anotacaoId },
      });

      await executarPipelineAnotacao(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(403);
      expect(mockHttp.getJson().error).toContain('apenas o terapeuta autor');
    });

    it('deve retornar 403 Forbidden se terapeuta não possuir vínculo ativo com o paciente (RN04)', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersAnotacao(anotacaoRoutes, '/:id', 'delete');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: autorId } },
        error: null,
      } as any);

      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacao);

      vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: autorId, clinica_id: clinicaId, status_ativo: true, is_super_admin: false },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (tabela === 'terapeuta_paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null, // Vínculo revogado
                    error: null,
                  }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const mockHttp = criarMockPipelineAnotacao({
        params: { id: anotacaoId },
      });

      await executarPipelineAnotacao(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(403);
      expect(mockHttp.getJson().error).toContain('não possui vínculo ativo');
    });

    it('deve retornar 404 Not Found se anotação for inexistente', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersAnotacao(anotacaoRoutes, '/:id', 'delete');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: autorId } },
        error: null,
      } as any);

      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(null);

      const mockHttp = criarMockPipelineAnotacao({
        params: { id: anotacaoId },
      });

      await executarPipelineAnotacao(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(404);
      expect(mockHttp.getJson().error).toContain('não encontrada');
    });
  });

  // ----------------------------------------------------------------------------
  // 3. DELETE /api/anotacao/:id/hard (Hard Delete Dev/Testes)
  // ----------------------------------------------------------------------------
  describe('DELETE /api/anotacao/:id/hard', () => {
    it('deve retornar 204 No Content para SuperAdmin através do adminMiddleware', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersAnotacao(anotacaoRoutes, '/:id/hard', 'delete');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: {
          user: {
            id: superAdminId,
            is_super_admin: true,
            user_metadata: { is_super_admin: true },
          },
        },
        error: null,
      } as any);

      vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { is_super_admin: true, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      vi.spyOn(AnotacaoClinicaModel, 'buscarPorId').mockResolvedValue(mockAnotacao);
      vi.spyOn(AnotacaoClinicaModel, 'deletarHard').mockResolvedValue(true);

      const mockHttp = criarMockPipelineAnotacao({
        params: { id: anotacaoId },
      });

      await executarPipelineAnotacao(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(204);
      expect(mockHttp.isSent()).toBe(true);
    });

    it('deve retornar 403 Forbidden para terapeuta comum (não SuperAdmin)', async () => {
      const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
      const handlers = obterHandlersAnotacao(anotacaoRoutes, '/:id/hard', 'delete');

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: {
          user: {
            id: autorId,
            is_super_admin: false,
            user_metadata: { is_super_admin: false },
          },
        },
        error: null,
      } as any);

      vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { is_super_admin: false, status_ativo: true },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const mockHttp = criarMockPipelineAnotacao({
        params: { id: anotacaoId },
      });

      await executarPipelineAnotacao(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(403);
      expect(mockHttp.getJson().error).toContain('administradores do sistema');
    });
  });
});


