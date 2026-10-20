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

  it('deve listar pacientes filtrando por terapeutaId consultando vinculos', async () => {
    const terapeutaId = 'uuid-terapeuta-teste';
    const mockVinculos = [{ paciente_id: 'uuid-1' }];

    const mockRange = vi.fn().mockResolvedValue({
      data: [{ id: 'uuid-1', nome: 'Paciente Vinculado', status_ativo: true }],
      error: null,
      count: 1,
    });
    const mockEqStatus = vi.fn().mockReturnValue({ range: mockRange });
    const mockIn = vi.fn().mockReturnValue({ eq: mockEqStatus });
    const mockOrder = vi.fn().mockReturnValue({ in: mockIn });
    const mockSelectPaciente = vi.fn().mockReturnValue({ order: mockOrder });

    const mockEqTerapeuta = vi.fn().mockResolvedValue({
      data: mockVinculos,
      error: null,
    });
    const mockSelectVinculos = vi.fn().mockReturnValue({ eq: mockEqTerapeuta });

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'terapeuta_paciente') {
        return { select: mockSelectVinculos } as any;
      }
      return { select: mockSelectPaciente } as any;
    });

    const resultado = await PacienteModel.listar({ terapeutaId });

    expect(resultado.data).toHaveLength(1);
    expect(mockSelectVinculos).toHaveBeenCalledWith('paciente_id');
    expect(mockEqTerapeuta).toHaveBeenCalledWith('terapeuta_id', terapeutaId);
    expect(mockIn).toHaveBeenCalledWith('id', ['uuid-1']);
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

  it('deve reativar e atualizar paciente se ele já existia previamente como inativo (soft delete)', async () => {
    const pacienteInativoDTO: CriarPacienteDTO = {
      nome: 'Carlos Eduardo Atualizado',
      data_nascimento: '2015-06-10',
      cpf: '529.982.247-25',
      telefone: '(11) 91111-2222',
    };

    const mockSelectPacienteExistente = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'uuid-existente', status_ativo: false, nome: 'Carlos Eduardo' },
          error: null,
        }),
      }),
    });

    const mockSingleUpdate = vi.fn().mockResolvedValue({
      data: { id: 'uuid-existente', ...pacienteInativoDTO, status_ativo: true },
      error: null,
    });
    const mockSelectUpdate = vi.fn().mockReturnValue({ single: mockSingleUpdate });
    const mockEqUpdate = vi.fn().mockReturnValue({ select: mockSelectUpdate });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate });

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'paciente') {
        return {
          select: mockSelectPacienteExistente,
          update: mockUpdate,
        } as any;
      }
      return {} as any;
    });

    vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue({
      id: 'uuid-existente',
      nome: pacienteInativoDTO.nome,
      data_nascimento: pacienteInativoDTO.data_nascimento,
      cpf: pacienteInativoDTO.cpf,
      telefone: pacienteInativoDTO.telefone ?? null,
      status_ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      clinica_id: null,
      cidade: null,
      estado: null,
      cep: null,
      endereco: null,
      bairro: null,
      numero: null,
      complemento: null,
    });

    const reativado = await PacienteModel.criar(pacienteInativoDTO);

    expect(reativado).toBeDefined();
    expect(reativado.id).toBe('uuid-existente');
    expect(reativado.status_ativo).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Carlos Eduardo Atualizado',
        status_ativo: true,
      })
    );
  });

  it('deve lançar erro de conflito se já existir um paciente ativo com o mesmo CPF', async () => {
    const pacienteDuplicadoDTO: CriarPacienteDTO = {
      nome: 'Outro Paciente',
      data_nascimento: '2016-01-01',
      cpf: '529.982.247-25',
    };

    const mockSelectPacienteAtivo = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'uuid-ativo', status_ativo: true, nome: 'Paciente Já Ativo' },
          error: null,
        }),
      }),
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: mockSelectPacienteAtivo,
    } as any);

    await expect(PacienteModel.criar(pacienteDuplicadoDTO)).rejects.toThrow(
      'Já existe um paciente ativo cadastrado com este CPF'
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

// ==============================================================================
// TESTES DE INTEGRAÇÃO: POST /api/paciente E EQUIPE MULTIDISCIPLINAR (RN04)
// ==============================================================================

function criarMockReqResPaciente(opcoes: {
  body?: any;
  params?: any;
  user?: any;
  headers?: any;
}) {
  let statusCode = 200;
  let jsonResult: any = null;
  let sent = false;

  const req: any = {
    body: opcoes.body || {},
    params: opcoes.params || {},
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

function executarPipelinePaciente(
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

function obterHandlersPaciente(
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

describe('POST /api/paciente — Forçamento de clinica_id e Auto-Vínculo (RN04)', () => {
  const terapeutaId = '11111111-1111-4111-a111-111111111111';
  const clinicaRealId = '22222222-2222-4222-a222-222222222222';
  const clinicaFalsaId = '99999999-9999-4999-a999-999999999999';
  const pacienteId = '33333333-3333-4333-a333-333333333333';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /api/paciente: deve forçar clinica_id do terapeuta logado contra spoofing no DTO', async () => {
    const { PacienteController } = await import('../controllers/paciente.controller.js');
    const { TerapeutaModel } = await import('../../terapeuta/models/terapeuta.model.js');

    vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue({
      id: terapeutaId,
      nome: 'Dr. Terapeuta',
      clinica_id: clinicaRealId,
      status_ativo: true,
      is_super_admin: false,
    } as any);

    const spyModelCriar = vi.spyOn(PacienteModel, 'criar').mockResolvedValue({
      id: pacienteId,
      nome: 'Paciente Novo',
      data_nascimento: '2016-03-20',
      cpf: '529.982.247-25',
      clinica_id: clinicaRealId,
      status_ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    const mockHttp = criarMockReqResPaciente({
      body: {
        nome: 'Paciente Novo',
        data_nascimento: '2016-03-20',
        cpf: '52998224725',
        clinica_id: clinicaFalsaId, // Tentativa de spoofing
      },
      user: {
        id: terapeutaId,
        is_super_admin: false,
      },
    });

    await PacienteController.criar(mockHttp.req, mockHttp.res);

    expect(mockHttp.getStatus()).toBe(201);
    expect(spyModelCriar).toHaveBeenCalledWith(
      expect.objectContaining({
        clinica_id: clinicaRealId, // Forçado para a clínica real do terapeuta
      }),
      terapeutaId // Terapeuta criador para auto-vínculo
    );
  });

  it('POST /api/paciente: deve registrar o auto-vínculo do criador na tabela associativa terapeuta_paciente', async () => {
    const novoPacienteDTO: CriarPacienteDTO = {
      nome: 'Paciente Com Auto Vinculo',
      data_nascimento: '2017-08-15',
      cpf: '529.982.247-25',
      clinica_id: clinicaRealId,
    };

    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: pacienteId, ...novoPacienteDTO, status_ativo: true },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });

    vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
      if (tabela === 'terapeuta_paciente') {
        return { upsert: mockUpsert } as any;
      }
      return { insert: mockInsert } as any;
    });

    vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue({
      id: pacienteId,
      nome: novoPacienteDTO.nome,
      data_nascimento: novoPacienteDTO.data_nascimento,
      cpf: novoPacienteDTO.cpf,
      clinica_id: novoPacienteDTO.clinica_id ?? null,
      status_ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      telefone: null,
      cidade: null,
      estado: null,
      cep: null,
      endereco: null,
      bairro: null,
      numero: null,
      complemento: null,
    });

    const resultado = await PacienteModel.criar(novoPacienteDTO, terapeutaId);

    expect(resultado.id).toBe(pacienteId);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        terapeuta_id: terapeutaId,
        paciente_id: pacienteId,
      }),
      expect.objectContaining({
        onConflict: 'terapeuta_id,paciente_id',
        ignoreDuplicates: true,
      })
    );
  });

  it('POST /api/paciente: não deve sobrescrever clinica_id customizado se o requisitante for SuperAdmin', async () => {
    const { PacienteController } = await import('../controllers/paciente.controller.js');
    const adminId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
    const clinicaAdminId = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';

    const spyModelCriar = vi.spyOn(PacienteModel, 'criar').mockResolvedValue({
      id: pacienteId,
      nome: 'Paciente Criado por Admin',
      data_nascimento: '2016-03-20',
      cpf: '529.982.247-25',
      clinica_id: clinicaAdminId,
      status_ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    const mockHttp = criarMockReqResPaciente({
      body: {
        nome: 'Paciente Criado por Admin',
        data_nascimento: '2016-03-20',
        cpf: '52998224725',
        clinica_id: clinicaAdminId,
      },
      user: {
        id: adminId,
        is_super_admin: true,
      },
    });

    await PacienteController.criar(mockHttp.req, mockHttp.res);

    expect(mockHttp.getStatus()).toBe(201);
    expect(spyModelCriar).toHaveBeenCalledWith(
      expect.objectContaining({
        clinica_id: clinicaAdminId,
      }),
      adminId
    );
  });
});

describe('Equipe Multidisciplinar (GET, POST, DELETE /api/paciente/:id/terapeutas) — RN04', () => {
  const pacienteId = '11111111-1111-4111-a111-111111111111';
  const terapeutaLogadoId = '22222222-2222-4222-a222-222222222222';
  const outroTerapeutaId = '33333333-3333-4333-a333-333333333333';
  const clinicaA = '44444444-4444-4444-a444-444444444444';
  const clinicaB = '55555555-5555-4555-a555-555555555555';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/paciente/:id/terapeutas: deve bloquear com 403 Forbidden para terapeuta de outra clínica (RN04)', async () => {
    const { pacienteRoutes } = await import('../routes/paciente.routes.js');
    const handlers = obterHandlersPaciente(pacienteRoutes, '/:id/terapeutas', 'get');

    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: terapeutaLogadoId } },
      error: null,
    } as any);

    vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
      if (tabela === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteId, clinica_id: clinicaA, status_ativo: true },
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
                data: { id: terapeutaLogadoId, clinica_id: clinicaB, status_ativo: true, is_super_admin: false },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const mockHttp = criarMockReqResPaciente({
      params: { id: pacienteId },
    });

    await executarPipelinePaciente(handlers, mockHttp.req, mockHttp.res);

    expect(mockHttp.getStatus()).toBe(403);
    expect(mockHttp.getJson().error).toContain('instituição clínica diferente');
  });

  it('GET /api/paciente/:id/terapeutas: deve retornar 200 OK com terapeutas quando terapeuta possui vínculo ativo', async () => {
    const { pacienteRoutes } = await import('../routes/paciente.routes.js');
    const handlers = obterHandlersPaciente(pacienteRoutes, '/:id/terapeutas', 'get');

    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: terapeutaLogadoId } },
      error: null,
    } as any);

    vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
      if (tabela === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteId, clinica_id: clinicaA, status_ativo: true },
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
                data: { id: terapeutaLogadoId, clinica_id: clinicaA, status_ativo: true, is_super_admin: false },
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

    vi.spyOn(PacienteModel, 'listarTerapeutasVinculados').mockResolvedValue([
      { id: terapeutaLogadoId, nome: 'Dr. Terapeuta', especialidade: 'T.O.' },
    ] as any);

    const mockHttp = criarMockReqResPaciente({
      params: { id: pacienteId },
    });

    await executarPipelinePaciente(handlers, mockHttp.req, mockHttp.res);

    expect(mockHttp.getStatus()).toBe(200);
    expect(mockHttp.getJson().data).toHaveLength(1);
    expect(mockHttp.getJson().data[0].id).toBe(terapeutaLogadoId);
  });

  it('POST /api/paciente/:id/terapeutas: deve bloquear com 403 Forbidden se terapeuta requisitante não tiver vínculo ativo', async () => {
    const { pacienteRoutes } = await import('../routes/paciente.routes.js');
    const handlers = obterHandlersPaciente(pacienteRoutes, '/:id/terapeutas', 'post');

    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: terapeutaLogadoId } },
      error: null,
    } as any);

    vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
      if (tabela === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteId, clinica_id: clinicaA, status_ativo: true },
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
                data: { id: terapeutaLogadoId, clinica_id: clinicaA, status_ativo: true, is_super_admin: false },
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

    const mockHttp = criarMockReqResPaciente({
      params: { id: pacienteId },
      body: { terapeuta_id: outroTerapeutaId },
    });

    await executarPipelinePaciente(handlers, mockHttp.req, mockHttp.res);

    expect(mockHttp.getStatus()).toBe(403);
    expect(mockHttp.getJson().error).toContain('não possui vínculo ativo');
  });

  it('POST /api/paciente/:id/terapeutas: deve vincular novo terapeuta com 201 Created quando requisitante tiver vínculo e mesma clínica', async () => {
    const { pacienteRoutes } = await import('../routes/paciente.routes.js');
    const handlers = obterHandlersPaciente(pacienteRoutes, '/:id/terapeutas', 'post');

    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: terapeutaLogadoId } },
      error: null,
    } as any);

    vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
      if (tabela === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteId, clinica_id: clinicaA, status_ativo: true },
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
                data: { id: terapeutaLogadoId, clinica_id: clinicaA, status_ativo: true, is_super_admin: false },
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

    vi.spyOn(PacienteModel, 'vincularTerapeuta').mockResolvedValue(undefined);

    const mockHttp = criarMockReqResPaciente({
      params: { id: pacienteId },
      body: { terapeuta_id: outroTerapeutaId },
    });

    await executarPipelinePaciente(handlers, mockHttp.req, mockHttp.res);

    expect(mockHttp.getStatus()).toBe(201);
    expect(mockHttp.getJson().message).toContain('vinculado');
  });

  it('DELETE /api/paciente/:id/terapeutas/:terapeutaId: deve bloquear com 403 Forbidden para requisitante sem vínculo', async () => {
    const { pacienteRoutes } = await import('../routes/paciente.routes.js');
    const handlers = obterHandlersPaciente(pacienteRoutes, '/:id/terapeutas/:terapeutaId', 'delete');

    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: terapeutaLogadoId } },
      error: null,
    } as any);

    vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
      if (tabela === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteId, clinica_id: clinicaA, status_ativo: true },
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
                data: { id: terapeutaLogadoId, clinica_id: clinicaA, status_ativo: true, is_super_admin: false },
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
                  data: null, // Sem vínculo
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const mockHttp = criarMockReqResPaciente({
      params: { id: pacienteId, terapeutaId: outroTerapeutaId },
    });

    await executarPipelinePaciente(handlers, mockHttp.req, mockHttp.res);

    expect(mockHttp.getStatus()).toBe(403);
    expect(mockHttp.getJson().error).toContain('não possui vínculo ativo');
  });

  it('DELETE /api/paciente/:id/terapeutas/:terapeutaId: deve desvincular com 200 OK quando requisitante possui permissão', async () => {
    const { pacienteRoutes } = await import('../routes/paciente.routes.js');
    const handlers = obterHandlersPaciente(pacienteRoutes, '/:id/terapeutas/:terapeutaId', 'delete');

    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: terapeutaLogadoId } },
      error: null,
    } as any);

    vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
      if (tabela === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteId, clinica_id: clinicaA, status_ativo: true },
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
                data: { id: terapeutaLogadoId, clinica_id: clinicaA, status_ativo: true, is_super_admin: false },
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

    vi.spyOn(PacienteModel, 'desvincularTerapeuta').mockResolvedValue(undefined);

    const mockHttp = criarMockReqResPaciente({
      params: { id: pacienteId, terapeutaId: outroTerapeutaId },
    });

    await executarPipelinePaciente(handlers, mockHttp.req, mockHttp.res);

    expect(mockHttp.getStatus()).toBe(200);
    expect(mockHttp.getJson().message).toContain('removido');
  });
});


