// ==============================================================================
// InTEA: Suíte de Testes de Integração do Histórico Clínico (Sprint 11)
// ==============================================================================
// REQUISITOS ATENDIDOS:
// - RF15: Prontuário Longitudinal (Separação: Engajamento Geral vs Séries por Jogo)
// - RF19: Filtros Temporais e Paginação (dataInicio, dataFim, page, limit)
// - RN01: Expurgo Estrito de Modo Livre (paciente_id = NULL)
// - RN02: Fallback Proibido e Tipagem Estrita (Rejeição 422 Unprocessable Entity)
// - RN04: Isolamento Institucional por Vínculo Ativo e Mesma Clínica (403 Forbidden)
// - RN05: Inalterabilidade do Histórico Clínico e Soft Delete de Relatórios
// - RNF02: Resiliência e Integridade de Dados
// ==============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pacienteRoutes } from '../routes/paciente.routes.js';
import { HistoricoSessaoModel } from '../models/historico.model.js';
import { JogoModel } from '../../jogos/models/jogo.model.js';
import { SessaoModel } from '../../sessao/models/sessao.model.js';
import { supabase } from '../../../core/supabase/supabase.client.js';
import { Request, Response } from 'express';
import type {
  EnvelopeResposta,
  RespostaDataHistoricoGeral,
  RespostaDataHistoricoJogo,
} from './historico.test.types.js';

// ==============================================================================
// CONSTANTES CANÔNICAS DE TESTE (UUIDs V4)
// ==============================================================================
const PACIENTE_ID = '11111111-1111-4111-a111-111111111111';
const OUTRO_PACIENTE_ID = '12222222-2222-4222-a222-222222222222';
const CLINICA_A = '22222222-2222-4222-a222-222222222222';
const CLINICA_B = '33333333-3333-4333-a333-333333333333';
const TERAPEUTA_VINCULADO_ID = '44444444-4444-4444-a444-444444444444';
const SUPER_ADMIN_ID = '66666666-6666-4666-a666-666666666666';
const JOGO_HOMOLOGADO_ID = '77777777-7777-4777-a777-777777777777';
const JOGO_INCONFORME_RN02_ID = '88888888-8888-4888-a888-888888888888';
const SESSAO_REF_ID = '99999999-9999-4999-a999-999999999999';

// ==============================================================================
// HELPERS DE EXECUÇÃO DE PIPELINE EXPRESS
// ==============================================================================
interface MockReqResResult {
  req: Request;
  res: Response;
  getStatus: () => number;
  getJson: () => Record<string, unknown>;
  isSent: () => boolean;
}

function criarMockReqRes(opcoes: {
  params?: Record<string, string>;
  query?: Record<string, string | number>;
  headers?: Record<string, string>;
  user?: Record<string, unknown> | null;
}): MockReqResResult {
  let statusCode = 200;
  let jsonResult: Record<string, unknown> = {};
  let sent = false;

  const req = {
    params: opcoes.params || {},
    query: opcoes.query || {},
    headers: opcoes.headers || { authorization: 'Bearer token-jwt-valido' },
    user: opcoes.user || null,
  } as unknown as Request;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: Record<string, unknown>) {
      jsonResult = data;
      sent = true;
      return this;
    },
    send(data?: Record<string, unknown>) {
      jsonResult = data || {};
      sent = true;
      return this;
    },
  } as unknown as Response;

  return {
    req,
    res,
    getStatus: () => statusCode,
    getJson: () => jsonResult,
    isSent: () => sent,
  };
}

function obterHandlers(
  router: { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: (req: Request, res: Response, next: (err?: unknown) => void) => Promise<void> | void }> } }> },
  path: string,
  method: string
): Array<(req: Request, res: Response, next: (err?: unknown) => void) => Promise<void> | void> {
  const layer = router.stack.find(
    (l) => l.route?.path === path && l.route?.methods?.[method.toLowerCase()]
  );
  if (!layer?.route?.stack) {
    throw new Error(`Rota ${method.toUpperCase()} ${path} não encontrada no router`);
  }
  return layer.route.stack.map((s) => s.handle);
}

function executarPipeline(
  handlers: Array<(req: Request, res: Response, next: (err?: unknown) => void) => Promise<void> | void>,
  req: Request,
  res: Response
): Promise<void> {
  return new Promise((resolve, reject) => {
    let idx = 0;

    const originalJson = res.json?.bind(res);
    const originalSend = res.send?.bind(res);

    res.json = (data: unknown) => {
      const ret = originalJson ? originalJson(data as Record<string, unknown>) : res;
      resolve();
      return ret;
    };

    res.send = (data?: unknown) => {
      const ret = originalSend ? originalSend(data as Record<string, unknown>) : res;
      resolve();
      return ret;
    };

    function next(err?: unknown) {
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

function mockSupabaseFluent(data: unknown) {
  const queryObj: Record<string, unknown> = {};
  queryObj.select = vi.fn().mockReturnValue(queryObj);
  queryObj.eq = vi.fn().mockReturnValue(queryObj);
  queryObj.not = vi.fn().mockReturnValue(queryObj);
  queryObj.order = vi.fn().mockReturnValue(queryObj);
  queryObj.range = vi.fn().mockReturnValue(queryObj);
  queryObj.gte = vi.fn().mockReturnValue(queryObj);
  queryObj.lte = vi.fn().mockReturnValue(queryObj);
  queryObj.maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  queryObj.single = vi.fn().mockResolvedValue({ data, error: null });
  queryObj.then = (resolve: (val: unknown) => void) =>
    Promise.resolve({ data, error: null }).then(resolve);
  return queryObj;
}

/**
 * Configura os mocks padrão do Supabase para que a verificação de visibilidade clínica (RN04)
 * responda de forma determinística em cada caso de teste.
 */
function configurarVisibilidadeMock({
  pacienteExiste = true,
  pacienteClinicaId = CLINICA_A,
  pacienteAtivo = true,
  terapeutaId = TERAPEUTA_VINCULADO_ID,
  terapeutaExiste = true,
  terapeutaClinicaId = CLINICA_A,
  terapeutaAtivo = true,
  isSuperAdmin = false,
  temVinculo = true,
}: {
  pacienteExiste?: boolean;
  pacienteClinicaId?: string;
  pacienteAtivo?: boolean;
  terapeutaId?: string;
  terapeutaExiste?: boolean;
  terapeutaClinicaId?: string;
  terapeutaAtivo?: boolean;
  isSuperAdmin?: boolean;
  temVinculo?: boolean;
} = {}) {
  // Simula usuário JWT autenticado no Supabase Auth
  vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
    data: {
      user: {
        id: terapeutaId,
        user_metadata: { is_super_admin: isSuperAdmin },
      },
    },
    error: null,
  } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

  // Simula consultas de banco de visibilidade clínica
  vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
    if (tabela === 'paciente') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: pacienteExiste
                ? { id: PACIENTE_ID, clinica_id: pacienteClinicaId, status_ativo: pacienteAtivo }
                : null,
              error: null,
            }),
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>;
    }

    if (tabela === 'terapeuta') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: terapeutaExiste
                ? {
                    id: terapeutaId,
                    clinica_id: terapeutaClinicaId,
                    is_super_admin: isSuperAdmin,
                    status_ativo: terapeutaAtivo,
                  }
                : null,
              error: null,
            }),
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>;
    }

    if (tabela === 'terapeuta_paciente') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: temVinculo ? { paciente_id: PACIENTE_ID } : null,
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>;
    }

    return {} as unknown as ReturnType<typeof supabase.from>;
  });
}

// ==============================================================================
// SUÍTE DE TESTES DE INTEGRAÇÃO
// ==============================================================================
describe('Suíte de Testes de Integração do Histórico Longitudinal (RF15, RF19, RN01, RN02, RN04, RN05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. COBERTURA DE CÓDIGOS HTTP CANÔNICOS: 401, 400, 403, 404, 422, 200
  // ============================================================================
  describe('1. Códigos de Status HTTP Canônicos da API REST do InTEA', () => {
    it('HTTP 401 Unauthorized: deve rejeitar requisição sem cabeçalho Authorization', async () => {
      const handlers = obterHandlers(pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0], '/:id/historico', 'get');
      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID },
        headers: {}, // Sem Authorization
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(401);
      expect(mockHttp.getJson().error).toContain('Acesso não autorizado');
    });

    it('HTTP 400 Bad Request: deve rejeitar UUID de paciente inválido', async () => {
      const handlers = obterHandlers(pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0], '/:id/historico', 'get');
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: TERAPEUTA_VINCULADO_ID } },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

      const mockHttp = criarMockReqRes({
        params: { id: 'uuid-invalido-123' },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(400);
      expect(mockHttp.getJson().error).toContain('UUID válido');
    });

    it('HTTP 400 Bad Request: deve rejeitar filtro temporal inconsistente (dataInicio > dataFim)', async () => {
      configurarVisibilidadeMock();
      const handlers = obterHandlers(pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0], '/:id/historico', 'get');

      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID },
        query: {
          dataInicio: '2026-10-20T00:00:00.000Z',
          dataFim: '2026-10-10T00:00:00.000Z',
        },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(400);
      expect(mockHttp.getJson().error).toContain('A data inicial não pode ser posterior à data final');
    });

    it('HTTP 403 Forbidden: deve bloquear terapeuta de instituição clínica diferente (RN04)', async () => {
      // Terapeuta pertence à CLINICA_B enquanto paciente pertence à CLINICA_A
      configurarVisibilidadeMock({
        pacienteClinicaId: CLINICA_A,
        terapeutaClinicaId: CLINICA_B,
        temVinculo: true,
      });

      const handlers = obterHandlers(pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0], '/:id/historico', 'get');
      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(403);
      expect(mockHttp.getJson().error).toContain('instituição clínica diferente');
    });

    it('HTTP 403 Forbidden: deve bloquear terapeuta da mesma clínica mas sem vínculo ativo (RN04)', async () => {
      configurarVisibilidadeMock({
        pacienteClinicaId: CLINICA_A,
        terapeutaClinicaId: CLINICA_A,
        temVinculo: false, // Sem vínculo ativo
      });

      const handlers = obterHandlers(pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0], '/:id/historico', 'get');
      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(403);
      expect(mockHttp.getJson().error).toContain('não possui vínculo ativo');
    });

    it('HTTP 404 Not Found: deve retornar 404 quando paciente não existir no banco de dados', async () => {
      configurarVisibilidadeMock({ pacienteExiste: false });

      const handlers = obterHandlers(pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0], '/:id/historico', 'get');
      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(404);
      expect(mockHttp.getJson().error).toContain('Paciente não encontrado');
    });

    it('HTTP 422 Unprocessable Entity: deve rejeitar jogo com métrica sem tipo homologado no manifesto (RN02)', async () => {
      configurarVisibilidadeMock();

      // Mock de jogo com métrica sem tipagem válida no manifesto
      vi.spyOn(JogoModel, 'buscarPorId').mockResolvedValue({
        id: JOGO_INCONFORME_RN02_ID,
        nome: 'Jogo Não Homologado',
        descricao: 'Jogo com métricas corrompidas',
        versao: '1.0.0',
        manifesto_json: {
          id_jogo: 'jogo-nao-homologado',
          nome: 'Jogo Não Homologado',
          versao: '1.0.0',
          metricas_suportadas: [
            {
              id_metrica: 'metrica_sem_tipo',
              tipo_metrica: '' as unknown as string, // Violação frontal da RN02
            },
          ],
        },
      });

      const handlers = obterHandlers(pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0], '/:id/historico/jogo/:jogoId', 'get');
      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID, jogoId: JOGO_INCONFORME_RN02_ID },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(422);
      expect(mockHttp.getJson().error).toContain('Violação da RN02');
      expect(mockHttp.getJson()).toEqual(
        expect.objectContaining({
          regraViolada: 'RN02 - Fallback de Métrica Proibido',
        })
      );
    });

    it('HTTP 200 OK: deve retornar dados com sucesso quando terapeuta possui vínculo ativo', async () => {
      configurarVisibilidadeMock({ temVinculo: true });

      vi.spyOn(HistoricoSessaoModel, 'buscarMetricasEngajamentoGeral').mockResolvedValue({
        total_sessoes: 10,
        total_iniciadas: 10,
        sessoes_finalizadas: 8,
        sessoes_interrompidas: 2,
        taxa_conclusao_porcentagem: 80.0,
        taxa_conclusao: 80.0,
        tempo_total_segundos: 4800,
        tempo_medio_segundos: 600,
      });

      vi.spyOn(HistoricoSessaoModel, 'listarJogosDoPaciente').mockResolvedValue([
        {
          jogo_id: JOGO_HOMOLOGADO_ID,
          nome: 'Aventura Espacial',
          versao: '1.0.0',
          total_sessoes: 5,
          ultima_sessao: '2026-10-18T14:30:00Z',
        },
      ]);

      const handlers = obterHandlers(pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0], '/:id/historico', 'get');
      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(200);
      const json = mockHttp.getJson();
      expect(json.message).toBe('Histórico geral de engajamento do paciente recuperado com sucesso.');
      const dataGeral = (json as unknown as EnvelopeResposta<RespostaDataHistoricoGeral>).data;
      expect(dataGeral.engajamento.taxa_conclusao_porcentagem).toBe(80.0);
      expect(dataGeral.jogos).toHaveLength(1);
    });
  });

  // ============================================================================
  // 2. VALIDAÇÃO MATEMÁTICA DO CÔMPUTO DE ENGAJAMENTO GLOBAL (RF15)
  // ============================================================================
  describe('2. Validação Matemática do Engajamento Global e Estatísticas (RF15)', () => {
    it('deve calcular taxa de conclusão exata: 8 finalizadas de 10 iniciadas = 80%', async () => {
      // Simula sessões no banco para o model
      const sessoesBanco = [
        ...Array(8).fill({
          id: 'sess-fin',
          paciente_id: PACIENTE_ID,
          status_sessao: 'finalizada',
          modo_sessao: 'sessao_clinica',
          data_hora_inicio: '2026-10-01T10:00:00Z',
          data_hora_fim: '2026-10-01T10:20:00Z', // 1200s cada
        }),
        ...Array(2).fill({
          id: 'sess-int',
          paciente_id: PACIENTE_ID,
          status_sessao: 'cancelada', // 'cancelada' é contabilizada como interrupção clínica
          modo_sessao: 'sessao_clinica',
          data_hora_inicio: '2026-10-02T10:00:00Z',
          data_hora_fim: null,
        }),
      ];

      vi.spyOn(supabase, 'from').mockReturnValue(mockSupabaseFluent(sessoesBanco) as unknown as ReturnType<typeof supabase.from>);

      const engajamento = await HistoricoSessaoModel.buscarMetricasEngajamentoGeral(PACIENTE_ID);

      expect(engajamento).not.toBeNull();
      expect(engajamento?.total_iniciadas).toBe(10);
      expect(engajamento?.sessoes_finalizadas).toBe(8);
      expect(engajamento?.sessoes_interrompidas).toBe(2);
      expect(engajamento?.taxa_conclusao_porcentagem).toBe(80.0);
      expect(engajamento?.tempo_total_segundos).toBe(8 * 1200); // 9600s
      expect(engajamento?.tempo_medio_segundos).toBe(1200); // 9600 / 8
    });

    it('deve lidar com caso de borda de 0 sessões retornando taxa 0% sem NaN ou divisão por zero', async () => {
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>);

      const engajamento = await HistoricoSessaoModel.buscarMetricasEngajamentoGeral(PACIENTE_ID);

      expect(engajamento).not.toBeNull();
      expect(engajamento?.total_iniciadas).toBe(0);
      expect(engajamento?.sessoes_finalizadas).toBe(0);
      expect(engajamento?.taxa_conclusao_porcentagem).toBe(0);
      expect(engajamento?.tempo_total_segundos).toBe(0);
      expect(engajamento?.tempo_medio_segundos).toBe(0);
      expect(isNaN(engajamento!.taxa_conclusao_porcentagem)).toBe(false);
    });
  });

  // ============================================================================
  // 3. SUPRESSÃO COMPROVADA DE MODO LIVRE (RN01)
  // ============================================================================
  describe('3. Garantia Inviolável da RN01: Supressão Estrita de Modo Livre', () => {
    it('RN01: sessões com paciente_id = NULL ou modo_sessao = modo_livre jamais devem ser computadas no prontuário', async () => {
      // Simula uma resposta suja do banco contendo sessão clínica legítima e partida em modo livre
      const sessoesContaminadas = [
        {
          id: 'sess-clinica-valida',
          paciente_id: PACIENTE_ID,
          status_sessao: 'finalizada',
          modo_sessao: 'sessao_clinica',
          data_hora_inicio: '2026-10-01T10:00:00Z',
          data_hora_fim: '2026-10-01T10:30:00Z',
        },
        {
          id: 'sess-modo-livre-invalida',
          paciente_id: null, // Violação de Modo Livre
          status_sessao: 'finalizada',
          modo_sessao: 'modo_livre',
          data_hora_inicio: '2026-10-01T11:00:00Z',
          data_hora_fim: '2026-10-01T11:30:00Z',
        },
      ];

      // Filtro aplicado pelo model deve expurgar modo livre
      const mockNotPaciente = vi.fn().mockResolvedValue({
        data: [sessoesContaminadas[0]],
        error: null,
      });

      const mockEqModo = vi.fn().mockReturnValue({
        not: mockNotPaciente,
      });

      const mockEqPaciente = vi.fn().mockReturnValue({
        eq: mockEqModo,
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEqPaciente,
        }),
      } as unknown as ReturnType<typeof supabase.from>);

      const engajamento = await HistoricoSessaoModel.buscarMetricasEngajamentoGeral(PACIENTE_ID);

      expect(engajamento?.total_iniciadas).toBe(1);
      expect(engajamento?.sessoes_finalizadas).toBe(1);
      expect(mockEqModo).toHaveBeenCalledWith('modo_sessao', 'sessao_clinica');
      expect(mockNotPaciente).toHaveBeenCalledWith('paciente_id', 'is', null);
    });
  });

  // ============================================================================
  // 4. INALTERABILIDADE E SOFT DELETE DE RELATÓRIOS CLÍNICOS (RN05)
  // ============================================================================
  describe('4. Inalterabilidade do Histórico Clínico e Soft Delete (RN05)', () => {
    it('RN05: sessões cujo relatório clínico possui soft_delete = true devem ser excluídas das séries temporais', async () => {
      const sessoesComRelatorio = [
        {
          id: 'sess-ativa',
          terapeuta_id: TERAPEUTA_VINCULADO_ID,
          paciente_id: PACIENTE_ID,
          jogo_id: JOGO_HOMOLOGADO_ID,
          modo_sessao: 'sessao_clinica',
          status_sessao: 'finalizada',
          data_hora_inicio: '2026-10-01T10:00:00Z',
          data_hora_fim: '2026-10-01T10:30:00Z',
          relatorio_sessao: {
            sessao_id: 'sess-ativa',
            conteudo: 'Evolução clínica positiva',
            dados_ia_json: { metricas_agregadas: [] },
            soft_delete: false,
          },
        },
        {
          id: 'sess-soft-deleted',
          terapeuta_id: TERAPEUTA_VINCULADO_ID,
          paciente_id: PACIENTE_ID,
          jogo_id: JOGO_HOMOLOGADO_ID,
          modo_sessao: 'sessao_clinica',
          status_sessao: 'finalizada',
          data_hora_inicio: '2026-10-02T10:00:00Z',
          data_hora_fim: '2026-10-02T10:30:00Z',
          relatorio_sessao: {
            sessao_id: 'sess-soft-deleted',
            conteudo: 'Registro clínico cancelado por auditoria',
            dados_ia_json: { metricas_agregadas: [] },
            soft_delete: true, // Soft delete ativo
          },
        },
      ];

      vi.spyOn(supabase, 'from').mockReturnValue(
        mockSupabaseFluent(sessoesComRelatorio) as unknown as ReturnType<typeof supabase.from>
      );

      const resultado = await HistoricoSessaoModel.buscarHistoricoPorJogo(PACIENTE_ID, JOGO_HOMOLOGADO_ID);

      // Apenas a sessão ativa (soft_delete = false) deve ser mantida
      expect(resultado).toHaveLength(1);
      expect(resultado![0].sessao_id).toBe('sess-ativa');
    });
  });

  // ============================================================================
  // 5. ISOLAMENTO INSTITUCIONAL E PERMISSÕES (RN04)
  // ============================================================================
  describe('5. Isolamento Institucional e Permissões de Acesso (RN04)', () => {
    it('RN04: Super Administrador deve conseguir acessar histórico mesmo com clínicas divergentes', async () => {
      configurarVisibilidadeMock({
        pacienteClinicaId: CLINICA_A,
        terapeutaClinicaId: CLINICA_B,
        terapeutaId: SUPER_ADMIN_ID,
        isSuperAdmin: true,
        temVinculo: false, // Super admin não precisa de vínculo
      });

      vi.spyOn(HistoricoSessaoModel, 'buscarMetricasEngajamentoGeral').mockResolvedValue({
        total_sessoes: 5,
        total_iniciadas: 5,
        sessoes_finalizadas: 5,
        sessoes_interrompidas: 0,
        taxa_conclusao_porcentagem: 100,
        taxa_conclusao: 100,
        tempo_total_segundos: 5000,
        tempo_medio_segundos: 1000,
      });
      vi.spyOn(HistoricoSessaoModel, 'listarJogosDoPaciente').mockResolvedValue([]);

      const handlers = obterHandlers(pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0], '/:id/historico', 'get');
      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(200);
      expect(mockHttp.getJson().message).toContain('recuperado com sucesso');
    });

    it('RN04: terapeuta inativo deve ter acesso rejeitado com 403 Forbidden', async () => {
      configurarVisibilidadeMock({
        terapeutaAtivo: false,
      });

      const handlers = obterHandlers(pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0], '/:id/historico', 'get');
      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(403);
      expect(mockHttp.getJson().error).toContain('encontra-se inativa');
    });
  });

  // ============================================================================
  // 6. PROTEÇÃO DE CONTRATO REST E ISOLAMENTO DE ROTAS (T1-P1 / Correção 3A)
  // ============================================================================
  describe('6. Rejeição de jogoId como query param na Rota 1 (Proteção de Contrato Canônico)', () => {
    it('deve retornar 400 Bad Request orientando o terapeuta a utilizar a rota dedicada de jogos', async () => {
      configurarVisibilidadeMock();

      const handlers = obterHandlers(
        pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0],
        '/:id/historico',
        'get'
      );
      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID },
        query: {
          jogoId: JOGO_HOMOLOGADO_ID,
        },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(400);
      expect(mockHttp.getJson().error).toContain('/api/paciente/:id/historico/jogo/:jogoId');
    });
  });

  // ============================================================================
  // 7. ROTA ESPECÍFICA POR JOGO: GET /api/paciente/:id/historico/jogo/:jogoId
  // ============================================================================
  describe('7. Rota Especializada GET /api/paciente/:id/historico/jogo/:jogoId', () => {
    it('deve retornar 200 OK com séries temporais isoladas e sessões mapeadas', async () => {
      configurarVisibilidadeMock();

      vi.spyOn(JogoModel, 'buscarPorId').mockResolvedValue({
        id: JOGO_HOMOLOGADO_ID,
        nome: 'Aventura Espacial',
        descricao: 'Treino de atenção',
        versao: '1.0.0',
        manifesto_json: {
          id_jogo: 'aventura-espacial',
          nome: 'Aventura Espacial',
          versao: '1.0.0',
          metricas_suportadas: [
            {
              id_metrica: 'pontuacao',
              tipo_metrica: 'numerica',
              unidade: 'pts',
            },
          ],
        },
      });

      vi.spyOn(HistoricoSessaoModel, 'contarHistoricoPorJogo').mockResolvedValue(1);
      vi.spyOn(HistoricoSessaoModel, 'buscarHistoricoPorJogo').mockResolvedValue([
        {
          sessao_id: 'sessao-1',
          terapeuta_id: TERAPEUTA_VINCULADO_ID,
          paciente_id: PACIENTE_ID,
          jogo_id: JOGO_HOMOLOGADO_ID,
          modo_sessao: 'sessao_clinica',
          status_sessao: 'finalizada',
          data_hora_inicio: '2026-10-10T14:00:00Z',
          data_hora_fim: '2026-10-10T14:20:00Z',
          duracao_segundos: 1200,
          conteudo_relatorio: 'OK',
          dados_ia_json: {
            metricas_agregadas: [
              { id_metrica: 'pontuacao', valor_dominante: 95 },
            ],
          },
        },
      ]);

      const handlers = obterHandlers(
        pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0],
        '/:id/historico/jogo/:jogoId',
        'get'
      );
      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID, jogoId: JOGO_HOMOLOGADO_ID },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(200);
      const json = mockHttp.getJson();
      expect(json.message).toBe('Histórico do jogo para o paciente recuperado com sucesso.');
      const data = (json as unknown as EnvelopeResposta<RespostaDataHistoricoJogo>).data;
      expect(data.jogo.id).toBe(JOGO_HOMOLOGADO_ID);
      expect(data.series_temporais).toHaveLength(1);
      expect(data.series_temporais[0].pontos[0].valor).toBe(95);
    });

    it('deve retornar 404 Not Found caso o jogo não seja localizado no catálogo', async () => {
      configurarVisibilidadeMock();
      vi.spyOn(JogoModel, 'buscarPorId').mockResolvedValue(undefined);

      const handlers = obterHandlers(
        pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0],
        '/:id/historico/jogo/:jogoId',
        'get'
      );
      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID, jogoId: '00000000-0000-4000-a000-000000000000' },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(404);
      expect(mockHttp.getJson().error).toContain('não encontrado');
    });

    it('deve retornar 400 Bad Request se a sessaoId de referência pertencer a outro paciente', async () => {
      configurarVisibilidadeMock();

      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
        id: SESSAO_REF_ID,
        paciente_id: OUTRO_PACIENTE_ID, // Pertence a outro paciente
        jogo_id: JOGO_HOMOLOGADO_ID,
        terapeuta_id: TERAPEUTA_VINCULADO_ID,
        session_token: 'token-ref-1',
        modo_sessao: 'sessao_clinica',
        contexto_dda_json: {},
        status_sessao: 'finalizada',
        data_hora_inicio: '2026-10-10T10:00:00Z',
        data_hora_fim: '2026-10-10T10:30:00Z',
        expira_em: '2026-10-10T11:00:00Z',
        created_at: '2026-10-10T10:00:00Z',
        updated_at: '2026-10-10T10:30:00Z',
      });

      const handlers = obterHandlers(
        pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0],
        '/:id/historico/jogo/:jogoId',
        'get'
      );
      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID, jogoId: JOGO_HOMOLOGADO_ID },
        query: { sessaoId: SESSAO_REF_ID },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(400);
      expect(mockHttp.getJson().error).toContain('não pertence ao paciente especificado');
    });

    it('P4: deve retornar total_registros como count real do banco (não apenas o tamanho da página)', async () => {
      configurarVisibilidadeMock();

      vi.spyOn(JogoModel, 'buscarPorId').mockResolvedValue({
        id: JOGO_HOMOLOGADO_ID,
        nome: 'Aventura Espacial',
        descricao: 'Treino de atenção',
        versao: '1.0.0',
        manifesto_json: {
          id_jogo: 'aventura-espacial',
          nome: 'Aventura Espacial',
          versao: '1.0.0',
          metricas_suportadas: [{ id_metrica: 'pontuacao', tipo_metrica: 'numerica' }],
        },
      });

      // Simula banco com 15 sessões no total, mas a página 2 (limit 5) traz 5
      vi.spyOn(HistoricoSessaoModel, 'buscarHistoricoPorJogo').mockResolvedValue(
        Array(5).fill({
          sessao_id: 'sessao-pag-2',
          terapeuta_id: TERAPEUTA_VINCULADO_ID,
          paciente_id: PACIENTE_ID,
          jogo_id: JOGO_HOMOLOGADO_ID,
          modo_sessao: 'sessao_clinica',
          status_sessao: 'finalizada',
          data_hora_inicio: '2026-10-10T14:00:00Z',
          data_hora_fim: '2026-10-10T14:20:00Z',
          duracao_segundos: 1200,
          conteudo_relatorio: 'OK',
          dados_ia_json: { metricas_agregadas: [{ id_metrica: 'pontuacao', valor_dominante: 80 }] },
        })
      );
      vi.spyOn(HistoricoSessaoModel, 'contarHistoricoPorJogo').mockResolvedValue(15);

      const handlers = obterHandlers(
        pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0],
        '/:id/historico/jogo/:jogoId',
        'get'
      );
      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID, jogoId: JOGO_HOMOLOGADO_ID },
        query: { page: 2, limit: 5 },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(200);
      const data = (mockHttp.getJson() as unknown as EnvelopeResposta<RespostaDataHistoricoJogo>).data;
      expect(data.sessoes).toHaveLength(5);
      expect(data.meta.paginacao.total_registros).toBe(15);
      expect(data.meta.paginacao.page).toBe(2);
      expect(data.meta.paginacao.limit).toBe(5);
    });

    it('P5: deve filtrar pontos por intervalo temporal (dataInicio e dataFim)', async () => {
      configurarVisibilidadeMock();

      vi.spyOn(JogoModel, 'buscarPorId').mockResolvedValue({
        id: JOGO_HOMOLOGADO_ID,
        nome: 'Aventura Espacial',
        descricao: 'Treino de atenção',
        versao: '1.0.0',
        manifesto_json: {
          id_jogo: 'aventura-espacial',
          nome: 'Aventura Espacial',
          versao: '1.0.0',
          metricas_suportadas: [{ id_metrica: 'pontuacao', tipo_metrica: 'numerica' }],
        },
      });

      const spyBuscar = vi.spyOn(HistoricoSessaoModel, 'buscarHistoricoPorJogo').mockResolvedValue([]);
      const spyContar = vi.spyOn(HistoricoSessaoModel, 'contarHistoricoPorJogo').mockResolvedValue(0);

      const handlers = obterHandlers(
        pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0],
        '/:id/historico/jogo/:jogoId',
        'get'
      );
      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID, jogoId: JOGO_HOMOLOGADO_ID },
        query: { dataInicio: '2026-01-01', dataFim: '2026-06-30' },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(200);
      expect(spyBuscar).toHaveBeenCalledWith(
        PACIENTE_ID,
        JOGO_HOMOLOGADO_ID,
        20,
        0,
        expect.objectContaining({ dataInicio: '2026-01-01', dataFim: '2026-06-30' })
      );
      expect(spyContar).toHaveBeenCalledWith(
        PACIENTE_ID,
        JOGO_HOMOLOGADO_ID,
        expect.objectContaining({ dataInicio: '2026-01-01', dataFim: '2026-06-30' })
      );
    });

    it('P5: deve retornar 400 Bad Request se dataInicio for posterior a dataFim na Rota 2', async () => {
      configurarVisibilidadeMock();

      const handlers = obterHandlers(
        pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0],
        '/:id/historico/jogo/:jogoId',
        'get'
      );
      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID, jogoId: JOGO_HOMOLOGADO_ID },
        query: { dataInicio: '2026-12-31', dataFim: '2026-01-01' },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(400);
      expect(mockHttp.getJson().error).toContain('data inicial não pode ser posterior');
    });
  });

  // ============================================================================
  // 8. AUDITORIA REST: ENVELOPE PATTERN E SANITIZAÇÃO ESTRITA
  // ============================================================================
  describe('8. Conformidade do Envelope Pattern e Sanitização Estrita de Dados', () => {
    it('toda resposta 200 OK deve possuir estritamente { data: { ... }, message: "..." }', async () => {
      configurarVisibilidadeMock();

      vi.spyOn(HistoricoSessaoModel, 'buscarMetricasEngajamentoGeral').mockResolvedValue({
        total_sessoes: 1,
        total_iniciadas: 1,
        sessoes_finalizadas: 1,
        sessoes_interrompidas: 0,
        taxa_conclusao_porcentagem: 100,
        taxa_conclusao: 100,
        tempo_total_segundos: 1000,
        tempo_medio_segundos: 1000,
      });
      vi.spyOn(HistoricoSessaoModel, 'listarJogosDoPaciente').mockResolvedValue([]);

      const handlers = obterHandlers(pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0], '/:id/historico', 'get');
      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(200);
      const json = mockHttp.getJson();

      // Envelope canônico
      expect(Object.keys(json).sort()).toEqual(['data', 'message'].sort());
      expect(typeof json.message).toBe('string');
      expect(typeof json.data).toBe('object');
      expect(json.data).not.toBeNull();

      // Propriedades categorizadas dentro de data
      const dataKeys = Object.keys(json.data as Record<string, unknown>);
      expect(dataKeys).toContain('engajamento');
      expect(dataKeys).toContain('jogos');
      expect(dataKeys).toContain('meta');
    });

    it('P6: Rota 2 deve possuir estritamente { data: { jogo, metricas_declaradas, series_temporais, sessoes, meta }, message: "..." }', async () => {
      configurarVisibilidadeMock();

      vi.spyOn(JogoModel, 'buscarPorId').mockResolvedValue({
        id: JOGO_HOMOLOGADO_ID,
        nome: 'Aventura Espacial',
        descricao: 'Treino',
        versao: '1.0.0',
        manifesto_json: {
          id_jogo: 'aventura-espacial',
          nome: 'Aventura Espacial',
          versao: '1.0.0',
          metricas_suportadas: [{ id_metrica: 'pontuacao', tipo_metrica: 'numerica' }],
        },
      });
      vi.spyOn(HistoricoSessaoModel, 'buscarHistoricoPorJogo').mockResolvedValue([]);
      vi.spyOn(HistoricoSessaoModel, 'contarHistoricoPorJogo').mockResolvedValue(0);

      const handlers = obterHandlers(
        pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0],
        '/:id/historico/jogo/:jogoId',
        'get'
      );
      const mockHttp = criarMockReqRes({
        params: { id: PACIENTE_ID, jogoId: JOGO_HOMOLOGADO_ID },
      });

      await executarPipeline(handlers, mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(200);
      const json = mockHttp.getJson();

      expect(Object.keys(json).sort()).toEqual(['data', 'message'].sort());
      expect(typeof json.message).toBe('string');
      expect(typeof json.data).toBe('object');
      expect(json.data).not.toBeNull();

      const dataKeys = Object.keys(json.data as Record<string, unknown>);
      expect(dataKeys).toContain('jogo');
      expect(dataKeys).toContain('metricas_declaradas');
      expect(dataKeys).toContain('series_temporais');
      expect(dataKeys).toContain('sessoes');
      expect(dataKeys).toContain('meta');
      expect(dataKeys).not.toContain('engajamento');
      expect(dataKeys).not.toContain('jogos');
    });
  });
});
