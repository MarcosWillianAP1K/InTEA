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

  it('anotacaoRoutes deve estar exportado e com rotas registradas', async () => {
    const { anotacaoRoutes } = await import('../routes/anotacao.routes.js');
    expect(anotacaoRoutes).toBeDefined();
  });
});

