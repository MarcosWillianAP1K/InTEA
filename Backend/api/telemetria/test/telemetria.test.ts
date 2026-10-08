// ==============================================================================
// InTEA: Testes Unitários de Telemetria Clínica (Sprint 9 - Task 1.2)
// ==============================================================================
//
// Cobertura:
// 1. TelemetriaModel: persistência individual, lote e busca com filtro
// 2. TelemetriaService: resolução de sessão, RN01 (Modo Livre) e persistência clínica
// 3. TelemetriaController: validação de payload, códigos de status (201, 200, 400, 404, 500)
// 4. TelemetriaRoutes: integridade do roteador e rotas registradas
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { telemetriaRoutes } from '../routes/telemetria.routes.js';
import { TelemetriaModel, TelemetriaEvento } from '../models/telemetria.model.js';
import { TelemetriaService } from '../services/telemetria.service.js';
import { TelemetriaController } from '../controllers/telemetria.controller.js';
import { SessaoModel, MODO_SESSAO, STATUS_SESSAO, Sessao } from '../../sessao/models/sessao.model.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

// Helper para mock de Request e Response do Express
function criarMocks(
  body: Record<string, unknown> = {},
  params: Record<string, string> = {},
  query: Record<string, string> = {},
  user: Record<string, unknown> | null = { id: '22222222-2222-4222-a222-222222222222' }
) {
  let statusCode = 200;
  let jsonResult: unknown = null;

  const mockReq = { body, params, query, user } as unknown as import('express').Request;
  const mockRes = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: unknown) {
      jsonResult = data;
      return this;
    },
  } as unknown as import('express').Response;

  return { mockReq, mockRes, getStatus: () => statusCode, getJson: () => jsonResult };
}

describe('Feature Telemetria - Rotas e Estrutura', () => {
  it('deve exportar o roteador telemetriaRoutes', () => {
    expect(telemetriaRoutes).toBeDefined();
    expect(typeof telemetriaRoutes).toBe('function');
  });

  it('deve expor métodos estáticos no TelemetriaController', () => {
    expect(typeof TelemetriaController.registrar).toBe('function');
    expect(typeof TelemetriaController.registrarLote).toBe('function');
    expect(typeof TelemetriaController.listarPorSessao).toBe('function');
  });

  it('deve expor métodos estáticos no TelemetriaService', () => {
    expect(typeof TelemetriaService.persistirEvento).toBe('function');
    expect(typeof TelemetriaService.persistirLote).toBe('function');
    expect(typeof TelemetriaService.listarPorSessao).toBe('function');
  });

  it('deve expor métodos estáticos no TelemetriaModel', () => {
    expect(typeof TelemetriaModel.registrarEvento).toBe('function');
    expect(typeof TelemetriaModel.registrarLote).toBe('function');
    expect(typeof TelemetriaModel.buscarPorSessaoId).toBe('function');
  });
});

describe('TelemetriaModel — Operações com Banco de Dados', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve rejeitar e retornar null se sessao_id ou data_hora estiverem ausentes em registrarEvento', async () => {
    const eventoInvalido = {
      sessao_id: '',
      tipo_evento: 'interacao',
      dados: { id_metrica: 'tempo_reacao', valor: 1.5 },
      data_hora: '',
    };
    const resultado = await TelemetriaModel.registrarEvento(eventoInvalido);
    expect(resultado).toBeNull();
  });

  it('deve persistir evento individual via supabase e retornar registro criado', async () => {
    const eventoValido: TelemetriaEvento = {
      sessao_id: '11111111-1111-1111-1111-111111111111',
      tipo_evento: 'interacao_paciente',
      dados: { id_metrica: 'tempo_resposta', valor: 2.3 },
      data_hora: '2026-09-01T15:30:00Z',
    };

    const mockRegistroRetornado = { id: 'evt-123', ...eventoValido };

    vi.spyOn(supabase, 'from').mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockRegistroRetornado, error: null }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    const resultado = await TelemetriaModel.registrarEvento(eventoValido);
    expect(resultado).toEqual(mockRegistroRetornado);
  });

  it('deve retornar null em registrarEvento se o supabase retornar erro', async () => {
    const eventoValido: TelemetriaEvento = {
      sessao_id: '11111111-1111-1111-1111-111111111111',
      tipo_evento: 'erro_tentativa',
      dados: { id_metrica: 'acertos', valor: 0 },
      data_hora: '2026-09-01T15:30:00Z',
    };

    vi.spyOn(supabase, 'from').mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    const resultado = await TelemetriaModel.registrarEvento(eventoValido);
    expect(resultado).toBeNull();
  });

  it('deve retornar array vazio se lote for vazio em registrarLote', async () => {
    const resultado = await TelemetriaModel.registrarLote([]);
    expect(resultado).toEqual([]);
  });

  it('deve rejeitar lote se algum evento estiver sem sessao_id ou data_hora', async () => {
    const eventosInvalidos: TelemetriaEvento[] = [
      {
        sessao_id: 'sess-1',
        tipo_evento: 'a',
        dados: { id_metrica: 'm1', valor: 1 },
        data_hora: '2026-09-01T15:00:00Z',
      },
      {
        sessao_id: '',
        tipo_evento: 'b',
        dados: { id_metrica: 'm2', valor: 2 },
        data_hora: '',
      },
    ];

    const resultado = await TelemetriaModel.registrarLote(eventosInvalidos);
    expect(resultado).toBeNull();
  });

  it('deve persistir lote de eventos com sucesso via supabase', async () => {
    const eventosValidos: TelemetriaEvento[] = [
      {
        sessao_id: 'sess-1',
        tipo_evento: 'acerto',
        dados: { id_metrica: 'taxa_acerto', valor: 80 },
        data_hora: '2026-09-01T15:00:00Z',
      },
      {
        sessao_id: 'sess-1',
        tipo_evento: 'tempo',
        dados: { id_metrica: 'duracao_fase', valor: 45 },
        data_hora: '2026-09-01T15:01:00Z',
      },
    ];

    vi.spyOn(supabase, 'from').mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: eventosValidos, error: null }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    const resultado = await TelemetriaModel.registrarLote(eventosValidos);
    expect(resultado).toHaveLength(2);
  });

  it('deve retornar array vazio em buscarPorSessaoId se sessaoId for vazio', async () => {
    const resultado = await TelemetriaModel.buscarPorSessaoId('');
    expect(resultado).toEqual([]);
  });

  it('deve buscar histórico ordenado e aplicar filtro de métrica quando fornecido', async () => {
    const mockQuery: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      then: (resolve: (val: unknown) => void) =>
        resolve({
          data: [
            {
              id: '1',
              sessao_id: 'sess-1',
              tipo_evento: 'interacao',
              dados: { id_metrica: 'tempo_resposta', valor: 2.1 },
              data_hora: '2026-09-01T15:00:00Z',
            },
          ],
          error: null,
        }),
    };

    vi.spyOn(supabase, 'from').mockReturnValue(mockQuery as unknown as ReturnType<typeof supabase.from>);

    const resultado = await TelemetriaModel.buscarPorSessaoId('sess-1', 'tempo_resposta');
    expect(resultado).toHaveLength(1);
    expect(mockQuery.filter).toHaveBeenCalledWith('dados->>id_metrica', 'eq', 'tempo_resposta');
  });
});

describe('TelemetriaService — Lógica de Negócio e RN01', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sessaoClinicaValida: Sessao = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    terapeuta_id: '22222222-2222-4222-a222-222222222222',
    paciente_id: '33333333-3333-4333-a333-333333333333',
    jogo_id: '44444444-4444-4444-4444-444444444444',
    session_token: 'ABCD-1234',
    modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
    contexto_dda_json: {},
    status_sessao: STATUS_SESSAO.EM_ANDAMENTO,
    data_hora_inicio: '2026-09-01T15:00:00Z',
    expira_em: '2026-09-01T16:00:00Z',
    data_hora_fim: null,
    created_at: '2026-09-01T15:00:00Z',
    updated_at: '2026-09-01T15:00:00Z',
  };

  const sessaoModoLivre: Sessao = {
    ...sessaoClinicaValida,
    paciente_id: null,
    modo_sessao: MODO_SESSAO.MODO_LIVRE,
    session_token: 'FREE-0001',
  };

  it('deve retornar persistido: false se sessão não for encontrada por ID nem por Token', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(null);
    vi.spyOn(SessaoModel, 'buscarPorToken').mockResolvedValue(null);

    const res = await TelemetriaService.persistirEvento('sessao-inexistente', {
      tipo_evento: 'clique',
      dados: { id_metrica: 'm1', valor: 1 },
    });

    expect(res.persistido).toBe(false);
    expect(res.motivo).toContain('Sessão não encontrada');
  });

  it('deve rejeitar telemetria se a sessão estiver no status finalizada (sessao_inativa)', async () => {
    const sessaoFinalizada: Sessao = {
      ...sessaoClinicaValida,
      status_sessao: STATUS_SESSAO.FINALIZADA,
    };
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoFinalizada);

    const res = await TelemetriaService.persistirEvento(sessaoFinalizada.id, {
      tipo_evento: 'clique',
      dados: { id_metrica: 'm1', valor: 1 },
    });

    expect(res.persistido).toBe(false);
    expect(res.motivo).toContain('sessao_inativa');
  });

  it('deve rejeitar lote de telemetria se a sessão estiver no status cancelada (sessao_inativa)', async () => {
    const sessaoCancelada: Sessao = {
      ...sessaoClinicaValida,
      status_sessao: STATUS_SESSAO.CANCELADA,
    };
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoCancelada);

    const res = await TelemetriaService.persistirLote(sessaoCancelada.id, [
      { tipo_evento: 'e1', dados: { id_metrica: 'm1', valor: 1 } },
    ]);

    expect(res.persistido).toBe(false);
    expect(res.motivo).toContain('sessao_inativa');
  });

  it('deve resolver UUID diretamente via validarUUID sem invocar buscarPorToken', async () => {
    const spyBuscarId = vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoClinicaValida);
    const spyBuscarToken = vi.spyOn(SessaoModel, 'buscarPorToken');
    vi.spyOn(TelemetriaModel, 'registrarEvento').mockResolvedValue({
      id: 'evt-1',
      sessao_id: sessaoClinicaValida.id,
      tipo_evento: 'e1',
      dados: { id_metrica: 'm1', valor: 1 },
      data_hora: '2026-09-01T15:00:00Z',
    });

    await TelemetriaService.persistirEvento(sessaoClinicaValida.id, {
      tipo_evento: 'e1',
      dados: { id_metrica: 'm1', valor: 1 },
    });

    expect(spyBuscarId).toHaveBeenCalledWith(sessaoClinicaValida.id);
    expect(spyBuscarToken).not.toHaveBeenCalled();
  });

  it('RN01: deve suprimir persistência no banco quando sessão for Modo Livre', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoModoLivre);
    const spyRegistrarModel = vi.spyOn(TelemetriaModel, 'registrarEvento');

    const res = await TelemetriaService.persistirEvento(sessaoModoLivre.id, {
      tipo_evento: 'interacao',
      dados: { id_metrica: 'tempo_reacao', valor: 1.2 },
    });

    expect(res.persistido).toBe(false);
    expect(res.motivo).toContain('modo_livre_sem_persistencia (RN01)');
    expect(spyRegistrarModel).not.toHaveBeenCalled();
  });

  it('RN01: deve suprimir persistência no banco quando sessão não tiver paciente_id', async () => {
    const sessaoSemPaciente: Sessao = {
      ...sessaoClinicaValida,
      paciente_id: null,
    };
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoSemPaciente);
    const spyRegistrarModel = vi.spyOn(TelemetriaModel, 'registrarEvento');

    const res = await TelemetriaService.persistirEvento(sessaoSemPaciente.id, {
      tipo_evento: 'interacao',
      dados: { id_metrica: 'tempo_reacao', valor: 1.2 },
    });

    expect(res.persistido).toBe(false);
    expect(res.motivo).toContain('modo_livre_sem_persistencia (RN01)');
    expect(spyRegistrarModel).not.toHaveBeenCalled();
  });

  it('deve persistir telemetria no banco quando for Sessão Clínica com paciente vinculado', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoClinicaValida);
    vi.spyOn(TelemetriaModel, 'registrarEvento').mockResolvedValue({
      id: 'tele-1',
      sessao_id: sessaoClinicaValida.id,
      tipo_evento: 'conclusao_fase',
      dados: { id_metrica: 'fase_id', valor: 2 },
      data_hora: '2026-09-01T15:10:00Z',
    });

    const res = await TelemetriaService.persistirEvento(sessaoClinicaValida.id, {
      tipo_evento: 'conclusao_fase',
      dados: { id_metrica: 'fase_id', valor: 2 },
    });

    expect(res.persistido).toBe(true);
    expect(res.dados).toBeDefined();
    expect(TelemetriaModel.registrarEvento).toHaveBeenCalled();
  });

  it('deve resolver sessão por token caso sessao_id não encontre registro', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(null);
    vi.spyOn(SessaoModel, 'buscarPorToken').mockResolvedValue(sessaoClinicaValida);
    vi.spyOn(TelemetriaModel, 'registrarEvento').mockResolvedValue({
      id: 'tele-2',
      sessao_id: sessaoClinicaValida.id,
      tipo_evento: 'toque_tela',
      dados: { id_metrica: 'acerto', valor: true },
      data_hora: '2026-09-01T15:12:00Z',
    });

    const res = await TelemetriaService.persistirEvento('ABCD-1234', {
      tipo_evento: 'toque_tela',
      dados: { id_metrica: 'acerto', valor: true },
    });

    expect(res.persistido).toBe(true);
    expect(SessaoModel.buscarPorToken).toHaveBeenCalledWith('ABCD-1234');
  });

  it('RN01 Lote: deve suprimir persistência em lote quando sessão for Modo Livre', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoModoLivre);
    const spyLoteModel = vi.spyOn(TelemetriaModel, 'registrarLote');

    const lote = [
      { tipo_evento: 'evt1', dados: { id_metrica: 'm1', valor: 10 } },
      { tipo_evento: 'evt2', dados: { id_metrica: 'm2', valor: 20 } },
    ];

    const res = await TelemetriaService.persistirLote(sessaoModoLivre.id, lote);

    expect(res.persistido).toBe(false);
    expect(res.motivo).toContain('modo_livre_sem_persistencia (RN01)');
    expect(res.total).toBe(2);
    expect(spyLoteModel).not.toHaveBeenCalled();
  });

  it('Lote Clínico: deve chamar TelemetriaModel.registrarLote em Sessão Clínica', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoClinicaValida);
    vi.spyOn(TelemetriaModel, 'registrarLote').mockResolvedValue([
      {
        id: '1',
        sessao_id: sessaoClinicaValida.id,
        tipo_evento: 'e1',
        dados: { id_metrica: 'm1', valor: 1 },
        data_hora: '2026-09-01T15:00:00Z',
      },
      {
        id: '2',
        sessao_id: sessaoClinicaValida.id,
        tipo_evento: 'e2',
        dados: { id_metrica: 'm2', valor: 2 },
        data_hora: '2026-09-01T15:01:00Z',
      },
    ]);

    const res = await TelemetriaService.persistirLote(sessaoClinicaValida.id, [
      { tipo_evento: 'e1', dados: { id_metrica: 'm1', valor: 1 } },
      { tipo_evento: 'e2', dados: { id_metrica: 'm2', valor: 2 } },
    ]);

    expect(res.persistido).toBe(true);
    expect(res.total).toBe(2);
    expect(TelemetriaModel.registrarLote).toHaveBeenCalled();
  });

  it('Lote Vazio: deve retornar persistido: true com total 0 sem consultar banco', async () => {
    const res = await TelemetriaService.persistirLote('qualquer-id', []);
    expect(res.persistido).toBe(true);
    expect(res.total).toBe(0);
  });
});

describe('TelemetriaController — Endpoints e Validações REST', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /api/telemetria: deve retornar 400 se faltar identificador da sessão', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      tipo_evento: 'clique',
      dados: { id_metrica: 'acerto', valor: true },
    });

    await TelemetriaController.registrar(mockReq, mockRes);
    expect(getStatus()).toBe(400);
    expect(getJson()).toHaveProperty('error');
  });

  it('POST /api/telemetria: deve retornar 400 se faltar tipo_evento', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      sessao_id: 'sess-1',
      dados: { id_metrica: 'acerto', valor: true },
    });

    await TelemetriaController.registrar(mockReq, mockRes);
    expect(getStatus()).toBe(400);
    expect(getJson()).toHaveProperty('error');
  });

  it('POST /api/telemetria: deve retornar 400 se faltar dados ou dados.id_metrica', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      sessao_id: 'sess-1',
      tipo_evento: 'movimento',
      dados: {},
    });

    await TelemetriaController.registrar(mockReq, mockRes);
    expect(getStatus()).toBe(400);
    expect(getJson()).toHaveProperty('error');
  });

  it('POST /api/telemetria: deve retornar 404 se sessão não for encontrada', async () => {
    vi.spyOn(TelemetriaService, 'persistirEvento').mockResolvedValue({
      persistido: false,
      motivo: 'Sessão não encontrada para associação de telemetria',
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      sessao_id: '00000000-0000-0000-0000-000000000000',
      tipo_evento: 'clique',
      dados: { id_metrica: 'm1', valor: 10 },
    });

    await TelemetriaController.registrar(mockReq, mockRes);
    expect(getStatus()).toBe(404);
    expect(getJson()).toHaveProperty('error');
  });

  it('POST /api/telemetria: deve retornar 409 Conflict se a sessão estiver inativa', async () => {
    vi.spyOn(TelemetriaService, 'persistirEvento').mockResolvedValue({
      persistido: false,
      motivo: "sessao_inativa: a sessão está no status 'finalizada'",
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      sessao_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      tipo_evento: 'clique',
      dados: { id_metrica: 'm1', valor: 10 },
    });

    await TelemetriaController.registrar(mockReq, mockRes);
    expect(getStatus()).toBe(409);
    expect((getJson() as { error: string }).error).toContain('não está em andamento');
  });

  it('POST /api/telemetria: deve retornar 200 com persistido: false para Modo Livre (RN01)', async () => {
    vi.spyOn(TelemetriaService, 'persistirEvento').mockResolvedValue({
      persistido: false,
      motivo: 'modo_livre_sem_persistencia (RN01)',
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      token_sessao: 'FREE-1234',
      tipo_evento: 'acao_livre',
      dados: { id_metrica: 'pontuacao', valor: 100 },
    });

    await TelemetriaController.registrar(mockReq, mockRes);
    expect(getStatus()).toBe(200);
    expect(getJson()).toMatchObject({
      persistido: false,
      message: expect.stringContaining('Modo Livre'),
    });
  });

  it('POST /api/telemetria: deve retornar 201 com persistido: true para Sessão Clínica', async () => {
    const mockEvento = {
      id: 'evt-999',
      sessao_id: 'sess-clinica-1',
      tipo_evento: 'resposta_pergunta',
      dados: { id_metrica: 'tempo_resposta', valor: 3.4 },
      data_hora: '2026-09-01T15:30:00Z',
    };

    vi.spyOn(TelemetriaService, 'persistirEvento').mockResolvedValue({
      persistido: true,
      dados: mockEvento,
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      sessao_id: 'sess-clinica-1',
      tipo_evento: 'resposta_pergunta',
      dados: { id_metrica: 'tempo_resposta', valor: 3.4 },
    });

    await TelemetriaController.registrar(mockReq, mockRes);
    expect(getStatus()).toBe(201);
    expect(getJson()).toMatchObject({
      persistido: true,
      data: mockEvento,
    });
  });

  it('POST /api/telemetria: deve retornar 500 se o serviço lançar exceção não tratada', async () => {
    vi.spyOn(TelemetriaService, 'persistirEvento').mockRejectedValue(new Error('Falha catastrófica'));

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      sessao_id: 'sess-clinica-1',
      tipo_evento: 'clique',
      dados: { id_metrica: 'm1', valor: 1 },
    });

    await TelemetriaController.registrar(mockReq, mockRes);
    expect(getStatus()).toBe(500);
    expect(getJson()).toHaveProperty('error');
  });

  it('POST /api/telemetria/lote: deve retornar 400 se array de eventos for inválido ou vazio', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      sessao_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      eventos: [],
    });

    await TelemetriaController.registrarLote(mockReq, mockRes);
    expect(getStatus()).toBe(400);
    expect(getJson()).toHaveProperty('error');
  });

  it('POST /api/telemetria/lote: deve retornar 400 se o lote exceder 500 eventos', async () => {
    const loteGigante = new Array(501).fill({
      tipo_evento: 'e',
      dados: { id_metrica: 'm', valor: 1 },
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      sessao_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      eventos: loteGigante,
    });

    await TelemetriaController.registrarLote(mockReq, mockRes);
    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('Limite máximo de 500 eventos');
  });

  it('POST /api/telemetria/lote: deve retornar 400 se algum evento do lote não tiver tipo_evento ou dados.id_metrica', async () => {
    const loteInvalido = [
      { tipo_evento: 'valido', dados: { id_metrica: 'm1', valor: 1 } },
      { tipo_evento: '', dados: { id_metrica: 'm2', valor: 2 } },
    ];

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      sessao_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      eventos: loteInvalido,
    });

    await TelemetriaController.registrarLote(mockReq, mockRes);
    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain("Campo 'tipo_evento' ausente ou inválido");
  });

  it('POST /api/telemetria/lote: deve retornar 409 Conflict se a sessão estiver inativa', async () => {
    vi.spyOn(TelemetriaService, 'persistirLote').mockResolvedValue({
      persistido: false,
      motivo: "sessao_inativa: a sessão está no status 'cancelada'",
      total: 1,
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      sessao_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      eventos: [{ tipo_evento: 'e1', dados: { id_metrica: 'm1', valor: 1 } }],
    });

    await TelemetriaController.registrarLote(mockReq, mockRes);
    expect(getStatus()).toBe(409);
    expect((getJson() as { error: string }).error).toContain('não está em andamento');
  });

  it('POST /api/telemetria/lote: deve retornar 200 com persistido: false para Modo Livre (RN01)', async () => {
    vi.spyOn(TelemetriaService, 'persistirLote').mockResolvedValue({
      persistido: false,
      motivo: 'modo_livre_sem_persistencia (RN01)',
      total: 3,
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      token_sessao: 'FREE-0001',
      eventos: [
        { tipo_evento: 'e1', dados: { id_metrica: 'm1', valor: 1 } },
        { tipo_evento: 'e2', dados: { id_metrica: 'm2', valor: 2 } },
        { tipo_evento: 'e3', dados: { id_metrica: 'm3', valor: 3 } },
      ],
    });

    await TelemetriaController.registrarLote(mockReq, mockRes);
    expect(getStatus()).toBe(200);
    expect(getJson()).toMatchObject({
      persistido: false,
      total: 3,
    });
  });

  it('POST /api/telemetria/lote: deve retornar 201 com persistido: true e total para Sessão Clínica', async () => {
    vi.spyOn(TelemetriaService, 'persistirLote').mockResolvedValue({
      persistido: true,
      total: 2,
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({
      sessao_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      eventos: [
        { tipo_evento: 'e1', dados: { id_metrica: 'm1', valor: 1 } },
        { tipo_evento: 'e2', dados: { id_metrica: 'm2', valor: 2 } },
      ],
    });

    await TelemetriaController.registrarLote(mockReq, mockRes);
    expect(getStatus()).toBe(201);
    expect(getJson()).toMatchObject({
      persistido: true,
      total: 2,
    });
  });

  it('GET /api/telemetria/sessao/:sessaoId: deve retornar 400 se sessaoId não for um UUID válido', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { sessaoId: 'uuid-invalido' });
    await TelemetriaController.listarPorSessao(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('UUID válido');
  });

  it('GET /api/telemetria/sessao/:sessaoId: deve retornar 404 se a sessão não for encontrada', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(null);

    const { mockReq, mockRes, getStatus } = criarMocks({}, { sessaoId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' });
    await TelemetriaController.listarPorSessao(mockReq, mockRes);

    expect(getStatus()).toBe(404);
  });

  it('GET /api/telemetria/sessao/:sessaoId: deve retornar 403 Forbidden se o terapeuta não for o dono da sessão (RN04)', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      terapeuta_id: 'outro-terapeuta-uuid',
      status_sessao: 'em_andamento',
    } as any);

    // Usuário logado tem id diferente e não é super admin
    const { mockReq, mockRes, getStatus, getJson } = criarMocks(
      {},
      { sessaoId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
      {},
      { id: 'meu-terapeuta-uuid', user_metadata: { is_super_admin: false } }
    );

    await TelemetriaController.listarPorSessao(mockReq, mockRes);
    expect(getStatus()).toBe(403);
    expect((getJson() as { error: string }).error).toContain('RN04');
  });

  it('GET /api/telemetria/sessao/:sessaoId: deve permitir acesso se o usuário autenticado for Super Admin', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      terapeuta_id: 'outro-terapeuta-uuid',
      status_sessao: 'em_andamento',
    } as any);

    vi.spyOn(TelemetriaService, 'listarPorSessao').mockResolvedValue([]);

    // Super Admin com id diferente
    const { mockReq, mockRes, getStatus } = criarMocks(
      {},
      { sessaoId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
      {},
      { id: 'admin-uuid', user_metadata: { is_super_admin: true } }
    );

    await TelemetriaController.listarPorSessao(mockReq, mockRes);
    expect(getStatus()).toBe(200);
  });

  it('GET /api/telemetria/sessao/:sessaoId: deve retornar 200 com lista de telemetrias e paginação', async () => {
    const mockHistorico: TelemetriaEvento[] = [
      {
        id: 'evt-1',
        sessao_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        tipo_evento: 'toque',
        dados: { id_metrica: 'coord_x', valor: 120 },
        data_hora: '2026-09-01T15:00:00Z',
      },
    ];

    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      terapeuta_id: '22222222-2222-4222-a222-222222222222',
      status_sessao: 'em_andamento',
    } as any);

    vi.spyOn(TelemetriaService, 'listarPorSessao').mockResolvedValue(mockHistorico);

    const { mockReq, mockRes, getStatus, getJson } = criarMocks(
      {},
      { sessaoId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
      { metrica: 'coord_x', limite: '10', pagina: '2' },
      { id: '22222222-2222-4222-a222-222222222222' }
    );

    await TelemetriaController.listarPorSessao(mockReq, mockRes);
    expect(getStatus()).toBe(200);
    expect(getJson()).toEqual({
      data: mockHistorico,
      limite: 10,
      pagina: 2,
      total_pagina: 1,
    });
    expect(TelemetriaService.listarPorSessao).toHaveBeenCalledWith(
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      'coord_x',
      10,
      2
    );
  });

  it('GET /api/telemetria/sessao/:sessaoId: deve retornar 500 se ocorrer erro interno no serviço', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      terapeuta_id: '22222222-2222-4222-a222-222222222222',
      status_sessao: 'em_andamento',
    } as any);

    vi.spyOn(TelemetriaService, 'listarPorSessao').mockRejectedValue(new Error('Falha no banco'));

    const { mockReq, mockRes, getStatus, getJson } = criarMocks(
      {},
      { sessaoId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
      {},
      { id: '22222222-2222-4222-a222-222222222222' }
    );

    await TelemetriaController.listarPorSessao(mockReq, mockRes);
    expect(getStatus()).toBe(500);
    expect(getJson()).toHaveProperty('error');
  });
});
