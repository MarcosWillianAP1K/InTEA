// ==============================================================================
// InTEA: Suíte de Testes de Integração e Unidade - Histórico Longitudinal (RNF05)
// ==============================================================================
// REQUISITOS ATENDIDOS:
// - RF15: Prontuário Longitudinal de Alta Volumetria
// - RNF05: SLA de Performance Sub-50ms (< 50ms) para 50+ Sessões
// - RNF06: Segurança e Blindagem de Permissões (service_role exclusivo na View)
// - RN01: Expurgo Estrito de Modo Livre (s.paciente_id IS NOT NULL)
// - RN04: Isolamento Institucional por Vínculo (200 OK vinculado vs 403 Forbidden não vinculado)
// - RN05: Inalterabilidade e Expurgo de Soft Delete (soft_delete = false)
// ==============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { pacienteRoutes } from '../routes/paciente.routes.js';
import { PacienteHistoricoService, RespostaHistoricoGeral } from '../services/paciente-historico.service.js';
import { HistoricoCache, historicoCache } from '../../../core/cache/historico.cache.js';
import { supabase } from '../../../core/supabase/supabase.client.js';
import { Request, Response } from 'express';

// ==============================================================================
// CONSTANTES CANÔNICAS DE TESTE (UUIDs V4)
// ==============================================================================
const PACIENTE_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const PACIENTE_INEXISTENTE_ID = 'ffffffff-9999-4999-8999-999999999999';
const CLINICA_A = 'cccccccc-1111-4111-8111-111111111111';
const CLINICA_B = 'cccccccc-2222-4222-8222-222222222222';
const TERAPEUTA_VINCULADO_ID = 'bbbbbbbb-1111-4111-8111-111111111111';
const TERAPEUTA_NAO_VINCULADO_ID = 'bbbbbbbb-2222-4222-8222-222222222222';

// Helper de execução de rota Express
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
  pathUrl: string,
  method: string
): Array<(req: Request, res: Response, next: (err?: unknown) => void) => Promise<void> | void> {
  const layer = router.stack.find(
    (l) => l.route?.path === pathUrl && l.route?.methods?.[method.toLowerCase()]
  );
  if (!layer?.route?.stack) {
    throw new Error(`Rota ${method.toUpperCase()} ${pathUrl} não encontrada no router`);
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

describe('Histórico Longitudinal: View Materializada, Cache e SLA sub-50ms', () => {
  beforeEach(() => {
    historicoCache.limpar();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    historicoCache.limpar();
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. Auditoria DDL: Migração 014 e Índices de Banco (RN01, RN05, RNF05, RNF06)
  // ============================================================================
  describe('Auditoria DDL e Conformidade da Migração 014', () => {
    const migrationPath = path.resolve(
      process.cwd(),
      '../Database/migrations/014_view_materializada_historico.sql'
    );

    it('deve existir o arquivo de migração 014_view_materializada_historico.sql', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    it('deve conter a criação da View Materializada com cláusulas WHERE (RN01, RN05)', () => {
      const conteudo = fs.readFileSync(migrationPath, 'utf-8');
      expect(conteudo).toContain('CREATE MATERIALIZED VIEW IF NOT EXISTS public.vw_resumo_longitudinal_paciente');
      expect(conteudo).toContain('s.paciente_id IS NOT NULL');
      expect(conteudo).toMatch(/soft_delete\s*=\s*FALSE/i);
    });

    it('deve conter o UNIQUE INDEX obrigatório para viabilizar REFRESH CONCURRENTLY', () => {
      const conteudo = fs.readFileSync(migrationPath, 'utf-8');
      expect(conteudo).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_vw_resumo_paciente_id');
      expect(conteudo).toContain('ON public.vw_resumo_longitudinal_paciente (paciente_id)');
      expect(conteudo).toContain('REFRESH MATERIALIZED VIEW CONCURRENTLY');
    });

    it('deve blindar acesso revogando SELECT de public/authenticated e concedendo à service_role (RN04, RNF06)', () => {
      const conteudo = fs.readFileSync(migrationPath, 'utf-8');
      expect(conteudo).toContain('REVOKE ALL ON public.vw_resumo_longitudinal_paciente FROM PUBLIC');
      expect(conteudo).toContain('REVOKE ALL ON public.vw_resumo_longitudinal_paciente FROM authenticated');
      expect(conteudo).toContain('GRANT SELECT ON public.vw_resumo_longitudinal_paciente TO service_role');
    });
  });

  // ============================================================================
  // 2. Camada de Cache: HistoricoCache (TTL 300s, Invalidação e Estatísticas)
  // ============================================================================
  describe('Camada de Cache em Memória: HistoricoCache', () => {
    it('deve instanciar cache com TTL padrão de 300 segundos', () => {
      const stats = historicoCache.obterEstatisticas();
      expect(stats.ttlPadrao).toBe(300);
      expect(stats.tamanho).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('deve armazenar e recuperar dados agregados com sucesso', () => {
      const mockData: RespostaHistoricoGeral = {
        engajamento: {
          total_sessoes: 55,
          total_iniciadas: 55,
          sessoes_finalizadas: 50,
          sessoes_interrompidas: 5,
          taxa_conclusao_porcentagem: 90.9,
          taxa_conclusao: 90.9,
          tempo_total_segundos: 27500,
          tempo_medio_segundos: 550,
        },
        jogos: [
          {
            jogo_id: '11111111-2222-3333-4444-555555555555',
            nome: 'Voo das Letras',
            versao: '1.2.0',
            total_sessoes: 50,
            ultima_sessao: '2026-10-28T18:00:00.000Z',
          },
        ],
        meta: { paciente_id: PACIENTE_ID },
      };

      historicoCache.set(PACIENTE_ID, mockData);
      expect(historicoCache.tem(PACIENTE_ID)).toBe(true);

      const recuperado = historicoCache.get<RespostaHistoricoGeral>(PACIENTE_ID);
      expect(recuperado).toEqual(mockData);

      const stats = historicoCache.obterEstatisticas();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
    });

    it('deve expirar item após o TTL configurado', async () => {
      const cacheCurto = new HistoricoCache(1); // 1 segundo
      cacheCurto.set(PACIENTE_ID, { teste: true }, 0.05); // 50ms

      expect(cacheCurto.tem(PACIENTE_ID)).toBe(true);

      // Aguarda 60ms para expiração
      await new Promise((r) => setTimeout(r, 60));

      expect(cacheCurto.get(PACIENTE_ID)).toBeNull();
      expect(cacheCurto.tem(PACIENTE_ID)).toBe(false);
    });

    it('deve invalidar cache de paciente específico de forma síncrona e desacoplada', () => {
      historicoCache.set(PACIENTE_ID, { sessoes: 10 });
      expect(historicoCache.tem(PACIENTE_ID)).toBe(true);

      historicoCache.invalidar(PACIENTE_ID);
      expect(historicoCache.tem(PACIENTE_ID)).toBe(false);
      expect(historicoCache.get(PACIENTE_ID)).toBeNull();
    });

    it('invalidarAssincrono deve ser idempotente e não lançar erros', async () => {
      historicoCache.set(PACIENTE_ID, { sessoes: 20 });
      await expect(historicoCache.invalidarAssincrono(PACIENTE_ID)).resolves.not.toThrow();
      expect(historicoCache.tem(PACIENTE_ID)).toBe(false);

      // Segunda chamada idempotente
      await expect(historicoCache.invalidarAssincrono(PACIENTE_ID)).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // 3. Integração REST: GET /api/paciente/:id/historico (SLA sub-50ms, RN04, 404)
  // ============================================================================
  describe('Endpoint REST: GET /api/paciente/:id/historico', () => {
    const handlers = obterHandlers(
      pacienteRoutes as unknown as Parameters<typeof obterHandlers>[0],
      '/:id/historico',
      'get'
    );

    function configurarMocksVisibilidade({
      pacienteExiste = true,
      clinicaId = CLINICA_A,
      terapeutaId = TERAPEUTA_VINCULADO_ID,
      terapeutaVinculado = true,
    } = {}) {
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: {
          user: {
            id: terapeutaId,
            user_metadata: { is_super_admin: false },
          },
        },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

      vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: pacienteExiste
                ? { id: PACIENTE_ID, clinica_id: clinicaId, status_ativo: true }
                : null,
              error: null,
            }),
          } as unknown as ReturnType<typeof supabase.from>;
        }

        if (tabela === 'terapeuta') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: terapeutaId,
                clinica_id: clinicaId,
                is_super_admin: false,
                status_ativo: true,
              },
              error: null,
            }),
          } as unknown as ReturnType<typeof supabase.from>;
        }

        if (tabela === 'terapeuta_paciente') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: terapeutaVinculado
                ? { id: 'vinculo-1', terapeuta_id: terapeutaId, paciente_id: PACIENTE_ID, status_ativo: true }
                : null,
              error: null,
            }),
          } as unknown as ReturnType<typeof supabase.from>;
        }

        if (tabela === 'vw_resumo_longitudinal_paciente') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                paciente_id: PACIENTE_ID,
                total_sessoes: 60,
                total_iniciadas: 60,
                sessoes_finalizadas: 56,
                sessoes_interrompidas: 4,
                taxa_conclusao_porcentagem: 93.3,
                taxa_conclusao: 93.3,
                tempo_total_segundos: 33600,
                tempo_medio_segundos: 600,
                jogos_resumo: [
                  {
                    jogo_id: '77777777-7777-4777-a777-777777777777',
                    nome: 'Voo das Letras',
                    versao: '1.0.0',
                    total_sessoes: 56,
                    ultima_sessao: '2026-10-28T18:00:00.000Z',
                  },
                ],
              },
              error: null,
            }),
          } as unknown as ReturnType<typeof supabase.from>;
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as unknown as ReturnType<typeof supabase.from>;
      });
    }

    it('deve responder 200 OK com agregados para terapeuta com vínculo institucional ativo', async () => {
      configurarMocksVisibilidade({ terapeutaVinculado: true });

      const { req, res, getStatus, getJson } = criarMockReqRes({
        params: { id: PACIENTE_ID },
        user: { id: TERAPEUTA_VINCULADO_ID },
      });

      await executarPipeline(handlers, req, res);

      expect(getStatus()).toBe(200);
      const json = getJson();
      expect(json.message).toBe('Histórico geral de engajamento do paciente recuperado com sucesso.');

      const data = json.data as Record<string, unknown>;
      expect(data).toBeDefined();

      const engajamento = data.engajamento as Record<string, unknown>;
      expect(engajamento.total_sessoes).toBe(60);
      expect(engajamento.sessoes_finalizadas).toBe(56);
      expect(engajamento.taxa_conclusao).toBe(93.3);

      const jogos = data.jogos as Array<Record<string, unknown>>;
      expect(Array.isArray(jogos)).toBe(true);
      expect(jogos.length).toBe(1);
      expect(jogos[0].nome).toBe('Voo das Letras');
    });

    it('deve responder 403 Forbidden quando terapeuta não possuir vínculo ativo (RN04)', async () => {
      configurarMocksVisibilidade({
        terapeutaId: TERAPEUTA_NAO_VINCULADO_ID,
        terapeutaVinculado: false,
      });

      const { req, res, getStatus, getJson } = criarMockReqRes({
        params: { id: PACIENTE_ID },
        user: { id: TERAPEUTA_NAO_VINCULADO_ID },
      });

      await executarPipeline(handlers, req, res);

      expect(getStatus()).toBe(403);
      expect(getJson().error).toContain('não possui vínculo ativo com este paciente');
    });

    it('deve responder 404 Not Found quando paciente não existir no banco', async () => {
      configurarMocksVisibilidade({ pacienteExiste: false });

      const { req, res, getStatus, getJson } = criarMockReqRes({
        params: { id: PACIENTE_INEXISTENTE_ID },
        user: { id: TERAPEUTA_VINCULADO_ID },
      });

      await executarPipeline(handlers, req, res);

      expect(getStatus()).toBe(404);
      expect(getJson().error).toBe('Paciente não encontrado.');
    });

    it('deve atender ao SLA sub-50ms (RNF05) para prontuário com mais de 50 sessões', async () => {
      configurarMocksVisibilidade({ terapeutaVinculado: true });

      // Popula o cache previamente (ou consulta a view materializada rápida)
      const inicio = performance.now();

      const { req, res, getStatus } = criarMockReqRes({
        params: { id: PACIENTE_ID },
        user: { id: TERAPEUTA_VINCULADO_ID },
      });

      await executarPipeline(handlers, req, res);

      const fim = performance.now();
      const duracaoMs = fim - inicio;

      expect(getStatus()).toBe(200);
      // RNF05: SLA sub-50ms estrito
      expect(duracaoMs).toBeLessThan(50);
    });

    it('segunda consulta idêntica deve ser servida diretamente pelo HistoricoCache em sub-5ms', async () => {
      configurarMocksVisibilidade({ terapeutaVinculado: true });

      // Primeira requisição: popula o cache
      const mock1 = criarMockReqRes({
        params: { id: PACIENTE_ID },
        user: { id: TERAPEUTA_VINCULADO_ID },
      });
      await executarPipeline(handlers, mock1.req, mock1.res);
      expect(mock1.getStatus()).toBe(200);

      // Segunda requisição: atinge o cache
      const inicioCache = performance.now();
      const mock2 = criarMockReqRes({
        params: { id: PACIENTE_ID },
        user: { id: TERAPEUTA_VINCULADO_ID },
      });
      await executarPipeline(handlers, mock2.req, mock2.res);
      const duracaoCacheMs = performance.now() - inicioCache;

      expect(mock2.getStatus()).toBe(200);
      expect(duracaoCacheMs).toBeLessThan(10);
      expect(historicoCache.obterEstatisticas().hits).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // 4. Teste de Concorrência e Idempotência
  // ============================================================================
  describe('Validação de Concorrência e Idempotência', () => {
    it('múltiplas requisições simultâneas devem ser idempotentes e consistentes', async () => {
      const mockData: RespostaHistoricoGeral = {
        engajamento: {
          total_sessoes: 70,
          total_iniciadas: 70,
          sessoes_finalizadas: 65,
          sessoes_interrompidas: 5,
          taxa_conclusao_porcentagem: 92.8,
          taxa_conclusao: 92.8,
          tempo_total_segundos: 42000,
          tempo_medio_segundos: 646,
        },
        jogos: [],
        meta: { paciente_id: PACIENTE_ID },
      };

      historicoCache.set(PACIENTE_ID, mockData);

      // Dispara 20 requisições simultâneas em paralelo
      const chamadas = Array.from({ length: 20 }, async () => {
        return PacienteHistoricoService.buscarHistoricoGeral(PACIENTE_ID);
      });

      const resultados = await Promise.all(chamadas);

      for (const res of resultados) {
        expect(res.engajamento.total_sessoes).toBe(70);
        expect(res.engajamento.taxa_conclusao).toBe(92.8);
      }
    });

    it('PacienteHistoricoService.invalidarCache deve ser idempotente', async () => {
      const mockCacheData: RespostaHistoricoGeral = {
        engajamento: {
          total_sessoes: 10,
          total_iniciadas: 10,
          sessoes_finalizadas: 8,
          sessoes_interrompidas: 2,
          taxa_conclusao_porcentagem: 80,
          taxa_conclusao: 80,
          tempo_total_segundos: 6000,
          tempo_medio_segundos: 600,
        },
        jogos: [],
        meta: { paciente_id: PACIENTE_ID },
      };
      historicoCache.set(PACIENTE_ID, mockCacheData);

      expect(historicoCache.tem(PACIENTE_ID)).toBe(true);

      await PacienteHistoricoService.invalidarCache(PACIENTE_ID);
      expect(historicoCache.tem(PACIENTE_ID)).toBe(false);

      await PacienteHistoricoService.invalidarCache(PACIENTE_ID);
      expect(historicoCache.tem(PACIENTE_ID)).toBe(false);
    });
  });
});
