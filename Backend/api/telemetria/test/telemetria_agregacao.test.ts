import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  TelemetriaAgregacaoService,
  calcularMedia,
  calcularMediana,
  calcularDesvioPadrao,
  calcularTendenciaNumerica,
  calcularTendenciaCategorica,
  obterModaCategorica,
  TelemetriaConsolidada,
} from '../services/telemetria-agregacao.service.js';
import { TelemetriaModel, TelemetriaEvento } from '../models/telemetria.model.js';
import { SessaoModel, Sessao, STATUS_SESSAO, MODO_SESSAO } from '../../sessao/models/sessao.model.js';
import { JogoModel, ManifestoJogo } from '../../jogos/models/jogo.model.js';
import { TelemetriaController } from '../controllers/telemetria.controller.js';

// Helper para mock de Request e Response do Express
function criarMocks(
  params: Record<string, string> = {},
  query: Record<string, string> = {},
  user: Record<string, unknown> | null = { id: '11111111-1111-4111-8111-111111111111' }
) {
  let statusCode = 200;
  let jsonResult: unknown = null;

  const mockReq = {
    params,
    query,
    user,
    headers: {},
  } as unknown as import('express').Request;

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

describe('Card 2.1 — Funções Matemáticas Puras de Agregação', () => {
  it('calcularMedia: deve calcular corretamente a média e evitar divisão por zero', () => {
    expect(calcularMedia([])).toBe(0);
    expect(calcularMedia([10])).toBe(10);
    expect(calcularMedia([2, 4, 6, 8])).toBe(5);
    expect(calcularMedia([1.555, 2.444])).toBe(2);
  });

  it('calcularMediana: deve calcular mediana para listas pares e ímpares', () => {
    expect(calcularMediana([])).toBe(0);
    expect(calcularMediana([7])).toBe(7);
    // Ímpar: [1, 3, 5] -> 3
    expect(calcularMediana([5, 1, 3])).toBe(3);
    // Par: [1, 2, 4, 10] -> (2 + 4) / 2 = 3
    expect(calcularMediana([10, 1, 4, 2])).toBe(3);
  });

  it('calcularDesvioPadrao: deve calcular desvio padrão populacional com segurança', () => {
    expect(calcularDesvioPadrao([])).toBe(0);
    expect(calcularDesvioPadrao([5])).toBe(0);
    // [2, 4, 4, 4, 5, 5, 7, 9] -> média 5, variância 4, desvio 2
    expect(calcularDesvioPadrao([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
  });

  it('calcularTendenciaNumerica: deve detectar crescimento, queda e estabilidade', () => {
    expect(calcularTendenciaNumerica([])).toBe('estavel');
    expect(calcularTendenciaNumerica([5])).toBe('estavel');
    // Estável (pouca variação)
    expect(calcularTendenciaNumerica([10, 10, 10, 10])).toBe('estavel');
    // Crescente: [2, 2, 10, 10]
    expect(calcularTendenciaNumerica([2, 2, 10, 10])).toBe('crescente');
    // Decrescente: [10, 10, 2, 2]
    expect(calcularTendenciaNumerica([10, 10, 2, 2])).toBe('decrescente');
  });

  it('calcularTendenciaCategorica e obterModaCategorica: devem apurar moda e estabilidade', () => {
    expect(obterModaCategorica([])).toBe('indeterminado');
    expect(obterModaCategorica(['baixo', 'medio', 'baixo', 'alto'])).toBe('baixo');
    expect(calcularTendenciaCategorica(['baixo', 'baixo', 'baixo', 'baixo'])).toBe('estavel');
    expect(calcularTendenciaCategorica(['baixo', 'baixo', 'alto', 'alto'])).toBe('decrescente');
  });
});

describe('Card 2.1 — TelemetriaAgregacaoService.agregarEventos (Pura em Memória)', () => {
  const manifestoExemplo: ManifestoJogo = {
    id_jogo: 'game-teste-01',
    nome: 'Jogo Teste Cognitivo',
    versao: '1.0.0',
    metricas_suportadas: [
      {
        id_metrica: 'tempo_resposta',
        tipo_metrica: 'numerica',
        unidade: 'segundos',
      },
      {
        id_metrica: 'nivel_frustracao',
        tipo_metrica: 'categorica',
        valores: ['baixo', 'medio', 'alto'],
      },
    ],
  };

  it('deve retornar estrutura padrão com zeros ao receber lista vazia (proteção divisão por zero)', () => {
    const consolidado = TelemetriaAgregacaoService.agregarEventos([]);

    expect(consolidado.total_eventos).toBe(0);
    expect(consolidado.duracao_estimada_segundos).toBe(0);
    expect(consolidado.precisao.total_acertos).toBe(0);
    expect(consolidado.precisao.total_erros).toBe(0);
    expect(consolidado.precisao.taxa_precisao_percentual).toBe(0);
    expect(consolidado.tempo_resposta.media).toBe(0);
    expect(consolidado.tempo_resposta.mediana).toBe(0);
    expect(consolidado.estabilidade_atencao.classificacao).toBe('sem_dados');
    expect(consolidado.metricas_agregadas).toHaveLength(0);
    expect(consolidado.violacoes_rn02).toHaveLength(0);
  });

  it('deve calcular taxa de precisão e toques a partir de eventos de acerto e erro', () => {
    const eventos: TelemetriaEvento[] = [
      {
        sessao_id: 'sessao-1',
        tipo_evento: 'acerto',
        dados: { id_metrica: 'acerto', valor: true },
        data_hora: '2026-10-08T10:00:00Z',
      },
      {
        sessao_id: 'sessao-1',
        tipo_evento: 'acerto',
        dados: { id_metrica: 'acerto', valor: true },
        data_hora: '2026-10-08T10:00:10Z',
      },
      {
        sessao_id: 'sessao-1',
        tipo_evento: 'acerto',
        dados: { id_metrica: 'acerto', valor: true },
        data_hora: '2026-10-08T10:00:20Z',
      },
      {
        sessao_id: 'sessao-1',
        tipo_evento: 'erro',
        dados: { id_metrica: 'erro', valor: false },
        data_hora: '2026-10-08T10:00:30Z',
      },
      {
        sessao_id: 'sessao-1',
        tipo_evento: 'interacao_paciente',
        dados: { id_metrica: '', valor: 0 },
        data_hora: '2026-10-08T10:00:40Z',
      },
    ];

    const consolidado = TelemetriaAgregacaoService.agregarEventos(eventos);

    expect(consolidado.total_eventos).toBe(5);
    expect(consolidado.precisao.total_acertos).toBe(3);
    expect(consolidado.precisao.total_erros).toBe(1);
    // 3 acertos em 4 avaliados = 75%
    expect(consolidado.precisao.taxa_precisao_percentual).toBe(75);
    expect(consolidado.precisao.total_toques).toBe(5);
    expect(consolidado.contagem_por_tipo['acerto']).toBe(3);
    expect(consolidado.contagem_por_tipo['erro']).toBe(1);
    expect(consolidado.contagem_por_tipo['interacao_paciente']).toBe(1);
  });

  it('deve agregar métricas numéricas com média, mediana, min, max e desvio padrão', () => {
    const eventos: TelemetriaEvento[] = [
      {
        sessao_id: 'sessao-1',
        tipo_evento: 'interacao_paciente',
        dados: { id_metrica: 'tempo_resposta', valor: 2.0 },
        data_hora: '2026-10-08T10:00:00Z',
      },
      {
        sessao_id: 'sessao-1',
        tipo_evento: 'interacao_paciente',
        dados: { id_metrica: 'tempo_resposta', valor: 4.0 },
        data_hora: '2026-10-08T10:00:10Z',
      },
      {
        sessao_id: 'sessao-1',
        tipo_evento: 'interacao_paciente',
        dados: { id_metrica: 'tempo_resposta', valor: 6.0 },
        data_hora: '2026-10-08T10:00:20Z',
      },
    ];

    const consolidado = TelemetriaAgregacaoService.agregarEventos(eventos, manifestoExemplo);

    expect(consolidado.tempo_resposta.total_amostras).toBe(3);
    expect(consolidado.tempo_resposta.media).toBe(4.0);
    expect(consolidado.tempo_resposta.mediana).toBe(4.0);
    expect(consolidado.tempo_resposta.minimo).toBe(2.0);
    expect(consolidado.tempo_resposta.maximo).toBe(6.0);
    expect(consolidado.tempo_resposta.unidade).toBe('segundos');
  });

  it('deve agregar métricas categóricas com moda dominante, frequências e tendência', () => {
    const eventos: TelemetriaEvento[] = [
      {
        sessao_id: 'sessao-1',
        tipo_evento: 'metrica_jogo',
        dados: { id_metrica: 'nivel_frustracao', valor: 'baixo' },
        data_hora: '2026-10-08T10:00:00Z',
      },
      {
        sessao_id: 'sessao-1',
        tipo_evento: 'metrica_jogo',
        dados: { id_metrica: 'nivel_frustracao', valor: 'baixo' },
        data_hora: '2026-10-08T10:00:10Z',
      },
      {
        sessao_id: 'sessao-1',
        tipo_evento: 'metrica_jogo',
        dados: { id_metrica: 'nivel_frustracao', valor: 'medio' },
        data_hora: '2026-10-08T10:00:20Z',
      },
    ];

    const consolidado = TelemetriaAgregacaoService.agregarEventos(eventos, manifestoExemplo);
    const metricaCat = consolidado.metricas_agregadas.find((m) => m.id_metrica === 'nivel_frustracao');

    expect(metricaCat).toBeDefined();
    if (metricaCat && metricaCat.tipo_metrica === 'categorica') {
      expect(metricaCat.valor_dominante).toBe('baixo');
      expect(metricaCat.distribuicao).toEqual({ baixo: 2, medio: 1 });
      expect(metricaCat.total_amostras).toBe(3);
    }
  });

  it('RN02: deve registrar violação estrita e NÃO converter para categórica se a métrica não estiver no manifesto', () => {
    const eventos: TelemetriaEvento[] = [
      {
        sessao_id: 'sessao-1',
        tipo_evento: 'interacao_paciente',
        dados: { id_metrica: 'metrica_inexistente', valor: 42 },
        data_hora: '2026-10-08T10:00:00Z',
      },
    ];

    const consolidado = TelemetriaAgregacaoService.agregarEventos(eventos, manifestoExemplo);

    // RN02: Não pode criar fallback categórico automático para metrica_inexistente
    const encontrouAgregada = consolidado.metricas_agregadas.some((m) => m.id_metrica === 'metrica_inexistente');
    expect(encontrouAgregada).toBe(false);

    // Deve registrar a infração em violacoes_rn02
    expect(consolidado.violacoes_rn02).toHaveLength(1);
    expect(consolidado.violacoes_rn02[0].id_metrica).toBe('metrica_inexistente');
    expect(consolidado.violacoes_rn02[0].motivo).toContain('RN02');
  });

  it('RN02: deve rejeitar valor não numérico para métrica declarada como numérica', () => {
    const eventos: TelemetriaEvento[] = [
      {
        sessao_id: 'sessao-1',
        tipo_evento: 'interacao_paciente',
        dados: { id_metrica: 'tempo_resposta', valor: 'valor_invalido_texto' },
        data_hora: '2026-10-08T10:00:00Z',
      },
    ];

    const consolidado = TelemetriaAgregacaoService.agregarEventos(eventos, manifestoExemplo);

    expect(consolidado.tempo_resposta.total_amostras).toBe(0);
    expect(consolidado.violacoes_rn02).toHaveLength(1);
    expect(consolidado.violacoes_rn02[0].id_metrica).toBe('tempo_resposta');
  });

  it('RN02: deve rejeitar valor fora do domínio de valores para métrica categórica', () => {
    const eventos: TelemetriaEvento[] = [
      {
        sessao_id: 'sessao-1',
        tipo_evento: 'metrica_jogo',
        dados: { id_metrica: 'nivel_frustracao', valor: 'extremo_nao_permitido' },
        data_hora: '2026-10-08T10:00:00Z',
      },
    ];

    const consolidado = TelemetriaAgregacaoService.agregarEventos(eventos, manifestoExemplo);

    const encontrou = consolidado.metricas_agregadas.some((m) => m.id_metrica === 'nivel_frustracao');
    expect(encontrou).toBe(false);
    expect(consolidado.violacoes_rn02).toHaveLength(1);
    expect(consolidado.violacoes_rn02[0].motivo).toContain('fora do domínio');
  });

  it('deve calcular janelas temporais de estabilidade de atenção', () => {
    const eventos: TelemetriaEvento[] = [
      {
        sessao_id: 'sessao-1',
        tipo_evento: 'acerto',
        dados: { id_metrica: 'acerto', valor: true },
        data_hora: '2026-10-08T10:00:00Z',
      },
      {
        sessao_id: 'sessao-1',
        tipo_evento: 'acerto',
        dados: { id_metrica: 'acerto', valor: true },
        data_hora: '2026-10-08T10:01:00Z',
      },
      {
        sessao_id: 'sessao-1',
        tipo_evento: 'acerto',
        dados: { id_metrica: 'acerto', valor: true },
        data_hora: '2026-10-08T10:02:00Z',
      },
    ];

    const consolidado = TelemetriaAgregacaoService.agregarEventos(eventos);

    expect(consolidado.estabilidade_atencao.janelas.length).toBeGreaterThanOrEqual(3);
    expect(consolidado.estabilidade_atencao.indice_estabilidade).toBeGreaterThanOrEqual(0);
    expect(consolidado.estabilidade_atencao.indice_estabilidade).toBeLessThanOrEqual(100);
  });
});

describe('Card 2.1 — TelemetriaAgregacaoService.compilarPorSessaoId (Banco Mockado)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sessaoMock: Sessao = {
    id: '33333333-3333-4333-8333-333333333333',
    terapeuta_id: '11111111-1111-4111-8111-111111111111',
    paciente_id: '44444444-4444-4444-8444-444444444444',
    jogo_id: 'game-uuid-01',
    session_token: '4M5S-8U7B',
    modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
    contexto_dda_json: {},
    dispositivo_info: null,
    status_sessao: STATUS_SESSAO.FINALIZADA,
    data_hora_inicio: '2026-10-08T10:00:00Z',
    expira_em: '2026-10-08T10:15:00Z',
    data_hora_fim: '2026-10-08T10:20:00Z',
    created_at: '2026-10-08T10:00:00Z',
    updated_at: '2026-10-08T10:20:00Z',
  };

  it('deve retornar null se o sessaoId for vazio ou se a sessão não existir', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(null);

    const resultado = await TelemetriaAgregacaoService.compilarPorSessaoId('invalido');
    expect(resultado).toBeNull();
  });

  it('deve buscar eventos e manifesto e compilar estatísticas com sucesso', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoMock);

    vi.spyOn(TelemetriaModel, 'buscarPorSessaoId').mockResolvedValue([
      {
        sessao_id: sessaoMock.id,
        tipo_evento: 'acerto',
        dados: { id_metrica: 'tempo_resposta', valor: 1.5 },
        data_hora: '2026-10-08T10:05:00Z',
      },
      {
        sessao_id: sessaoMock.id,
        tipo_evento: 'acerto',
        dados: { id_metrica: 'tempo_resposta', valor: 2.5 },
        data_hora: '2026-10-08T10:10:00Z',
      },
    ]);

    vi.spyOn(JogoModel, 'buscarPorId').mockResolvedValue({
      id: 'game-uuid-01',
      nome: 'Labirinto Cognitivo',
      descricao: 'Teste',
      versao: '1.0.0',
      status_instalacao: 'instalado',
      manifesto_json: {
        id_jogo: 'game-uuid-01',
        nome: 'Labirinto Cognitivo',
        versao: '1.0.0',
        metricas_suportadas: [
          { id_metrica: 'tempo_resposta', tipo_metrica: 'numerica', unidade: 'segundos' },
        ],
      },
    });

    const resultado = await TelemetriaAgregacaoService.compilarPorSessaoId(sessaoMock.id);

    expect(resultado).not.toBeNull();
    expect(resultado?.total_eventos).toBe(2);
    expect(resultado?.tempo_resposta.media).toBe(2.0);
    expect(resultado?.precisao.total_acertos).toBe(2);
    expect(resultado?.precisao.taxa_precisao_percentual).toBe(100);
  });
});

describe('Card 2.1 — TelemetriaController.obterEstatisticasSessao (Endpoint REST e RN04)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sessaoIdValido = '33333333-3333-4333-8333-333333333333';
  const terapeutaIdDono = '11111111-1111-4111-8111-111111111111';

  it('deve retornar 400 Bad Request se sessaoId não for um UUID válido', async () => {
    const { mockReq, mockRes, getStatus, getJson } = criarMocks({ sessaoId: 'token-nao-uuid' });

    await TelemetriaController.obterEstatisticasSessao(mockReq, mockRes);

    expect(getStatus()).toBe(400);
    expect((getJson() as { error: string }).error).toContain('UUID válido');
  });

  it('deve retornar 404 Not Found se a sessão não for encontrada', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(null);

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({ sessaoId: sessaoIdValido });

    await TelemetriaController.obterEstatisticasSessao(mockReq, mockRes);

    expect(getStatus()).toBe(404);
    expect((getJson() as { error: string }).error).toContain('Sessão não encontrada');
  });

  it('deve retornar 403 Forbidden se terapeuta não tiver vínculo com a sessão (RN04)', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: sessaoIdValido,
      terapeuta_id: 'outro-terapeuta-dono',
      paciente_id: 'paciente-1',
      jogo_id: 'jogo-1',
      session_token: '123-456',
      modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
      contexto_dda_json: {},
      dispositivo_info: null,
      status_sessao: STATUS_SESSAO.FINALIZADA,
      data_hora_inicio: '2026-10-08T10:00:00Z',
      expira_em: '2026-10-08T10:15:00Z',
      data_hora_fim: '2026-10-08T10:20:00Z',
      created_at: '2026-10-08T10:00:00Z',
      updated_at: '2026-10-08T10:20:00Z',
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks(
      { sessaoId: sessaoIdValido },
      {},
      { id: 'terapeuta-sem-vinculo', user_metadata: { is_super_admin: false } }
    );

    await TelemetriaController.obterEstatisticasSessao(mockReq, mockRes);

    expect(getStatus()).toBe(403);
    expect((getJson() as { error: string }).error).toContain('RN04');
  });

  it('deve retornar 200 OK com os dados agregados para o terapeuta dono da sessão', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      id: sessaoIdValido,
      terapeuta_id: terapeutaIdDono,
      paciente_id: 'paciente-1',
      jogo_id: 'jogo-1',
      session_token: '123-456',
      modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
      contexto_dda_json: {},
      dispositivo_info: null,
      status_sessao: STATUS_SESSAO.FINALIZADA,
      data_hora_inicio: '2026-10-08T10:00:00Z',
      expira_em: '2026-10-08T10:15:00Z',
      data_hora_fim: '2026-10-08T10:20:00Z',
      created_at: '2026-10-08T10:00:00Z',
      updated_at: '2026-10-08T10:20:00Z',
    });

    vi.spyOn(TelemetriaAgregacaoService, 'compilarPorSessaoId').mockResolvedValue({
      total_eventos: 10,
      duracao_estimada_segundos: 600,
      contagem_por_tipo: { acerto: 8, erro: 2 },
      precisao: {
        total_toques: 10,
        total_acertos: 8,
        total_erros: 2,
        taxa_precisao_percentual: 80,
      },
      tempo_resposta: {
        total_amostras: 10,
        media: 2.5,
        mediana: 2.4,
        minimo: 1.2,
        maximo: 4.1,
        desvio_padrao: 0.8,
        unidade: 'segundos',
      },
      estabilidade_atencao: {
        indice_estabilidade: 85,
        classificacao: 'alta',
        coeficiente_variacao: 0.15,
        janelas: [],
      },
      metricas_agregadas: [],
      violacoes_rn02: [],
      data_hora_primeiro_evento: '2026-10-08T10:00:00Z',
      data_hora_ultimo_evento: '2026-10-08T10:10:00Z',
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks(
      { sessaoId: sessaoIdValido },
      {},
      { id: terapeutaIdDono, user_metadata: { is_super_admin: false } }
    );

    await TelemetriaController.obterEstatisticasSessao(mockReq, mockRes);

    expect(getStatus()).toBe(200);
    const json = getJson() as { data: TelemetriaConsolidada };
    expect(json.data).toBeDefined();
    expect(json.data.precisao.taxa_precisao_percentual).toBe(80);
    expect(json.data.tempo_resposta.media).toBe(2.5);
  });
});

describe('Card 2.4 — Validação Matemática Estrita e Schema Zod da Telemetria Consolidada', () => {
  const telemetriaConsolidadaSchema = z
    .object({
      total_eventos: z.number().int().nonnegative(),
      duracao_estimada_segundos: z.number().int().nonnegative(),
      contagem_por_tipo: z.record(z.string(), z.number().int().nonnegative()),
      precisao: z.object({
        total_toques: z.number().int().nonnegative(),
        total_acertos: z.number().int().nonnegative(),
        total_erros: z.number().int().nonnegative(),
        taxa_precisao_percentual: z.number().min(0).max(100),
      }),
      tempo_resposta: z.object({
        total_amostras: z.number().int().nonnegative(),
        media: z.number().nonnegative(),
        mediana: z.number().nonnegative(),
        minimo: z.number().nonnegative(),
        maximo: z.number().nonnegative(),
        desvio_padrao: z.number().nonnegative(),
        unidade: z.string(),
      }),
      estabilidade_atencao: z.object({
        indice_estabilidade: z.number().min(0).max(100),
        classificacao: z.enum(['alta', 'moderada', 'baixa', 'sem_dados']),
        coeficiente_variacao: z.number().nonnegative(),
        janelas: z.array(
          z.object({
            indice: z.number().int().nonnegative(),
            inicio_segundos: z.number().nonnegative(),
            fim_segundos: z.number().nonnegative(),
            total_eventos: z.number().int().nonnegative(),
            taxa_precisao: z.number().min(0).max(100),
            tempo_resposta_medio: z.number().nonnegative(),
          })
        ),
      }),
      metricas_agregadas: z.array(
        z.union([
          z.object({
            id_metrica: z.string(),
            tipo_metrica: z.literal('numerica'),
            unidade: z.string().optional(),
            total_amostras: z.number().int().nonnegative(),
            media: z.number(),
            mediana: z.number(),
            minimo: z.number(),
            maximo: z.number(),
            desvio_padrao: z.number().nonnegative(),
            tendencia: z.enum(['estavel', 'crescente', 'decrescente']),
          }),
          z.object({
            id_metrica: z.string(),
            tipo_metrica: z.literal('categorica'),
            total_amostras: z.number().int().nonnegative(),
            valor_dominante: z.string(),
            distribuicao: z.record(z.string(), z.number().int().nonnegative()),
            tendencia: z.enum(['estavel', 'crescente', 'decrescente']),
          }),
        ])
      ),
      violacoes_rn02: z.array(
        z.object({
          id_metrica: z.string(),
          motivo: z.string(),
          total_rejeitados: z.number().int().nonnegative(),
        })
      ),
      data_hora_primeiro_evento: z.string().nullable(),
      data_hora_ultimo_evento: z.string().nullable(),
    })
    .strict();

  it('exatidão matemática: cálculo de média com arredondamento preciso para duas casas decimais', () => {
    const amostras = [1.111, 2.222, 3.333];
    // (1.111 + 2.222 + 3.333) / 3 = 6.666 / 3 = 2.222 -> arredonda para 2.22
    expect(calcularMedia(amostras)).toBe(2.22);

    const amostrasGrande = [100.5, 200.75, 300.25];
    // soma = 601.5 / 3 = 200.5
    expect(calcularMedia(amostrasGrande)).toBe(200.5);
  });

  it('exatidão matemática: mediana em distribuição com valores repetidos e ímpares/pares', () => {
    // Lista ímpar com números repetidos
    expect(calcularMediana([1, 2, 2, 9, 10])).toBe(2);
    // Lista par: média dos dois centrais [2, 4, 6, 8] -> (4 + 6) / 2 = 5
    expect(calcularMediana([8, 2, 6, 4])).toBe(5);
    // Lista par com centrais fracionários: [1, 2] -> 1.5
    expect(calcularMediana([1, 2])).toBe(1.5);
  });

  it('exatidão matemática: desvio padrão populacional contra fórmula teórica conhecida', () => {
    // População clássica: [10, 12, 23, 23, 16, 23, 21, 16]
    // Média = 18.0 | Variância populacional = 24.0 | Desvio padrão = sqrt(24) ≈ 4.8989... -> 4.9
    const populacao = [10, 12, 23, 23, 16, 23, 21, 16];
    expect(calcularDesvioPadrao(populacao)).toBe(4.9);

    // Amostras com valores idênticos devem ter variância e desvio exatamente 0
    expect(calcularDesvioPadrao([7, 7, 7, 7, 7])).toBe(0);
  });

  it('exatidão matemática: limiares de tendência com tolerância estrita de 5%', () => {
    // Variação de 4% (inferior a 5%) -> deve ser estável
    // Primeira metade: [100, 100] (média 100). Segunda metade: [104, 104] (média 104). Diff = 4%
    expect(calcularTendenciaNumerica([100, 100, 104, 104])).toBe('estavel');

    // Variação de 6% (superior a 5%) -> deve ser crescente
    expect(calcularTendenciaNumerica([100, 100, 106, 106])).toBe('crescente');

    // Variação de -6% -> deve ser decrescente
    expect(calcularTendenciaNumerica([100, 100, 94, 94])).toBe('decrescente');
  });

  it('conformidade Zod: a estrutura compilada por agregarEventos é 100% válida no schema Zod estrito', () => {
    const eventosMistos: TelemetriaEvento[] = [
      {
        sessao_id: 'sessao-zod-1',
        tipo_evento: 'acerto',
        dados: { id_metrica: 'tempo_resposta', valor: 1.8 },
        data_hora: '2026-10-08T10:00:00Z',
      },
      {
        sessao_id: 'sessao-zod-1',
        tipo_evento: 'acerto',
        dados: { id_metrica: 'tempo_resposta', valor: 2.2 },
        data_hora: '2026-10-08T10:00:15Z',
      },
      {
        sessao_id: 'sessao-zod-1',
        tipo_evento: 'erro',
        dados: { id_metrica: 'tempo_resposta', valor: 3.5 },
        data_hora: '2026-10-08T10:00:30Z',
      },
      {
        sessao_id: 'sessao-zod-1',
        tipo_evento: 'metrica_jogo',
        dados: { id_metrica: 'nivel_engajamento', valor: 'alto' },
        data_hora: '2026-10-08T10:00:45Z',
      },
    ];

    const manifesto: ManifestoJogo = {
      id_jogo: 'game-zod',
      nome: 'Game Zod Test',
      versao: '1.0.0',
      metricas_suportadas: [
        { id_metrica: 'tempo_resposta', tipo_metrica: 'numerica', unidade: 'segundos' },
        { id_metrica: 'nivel_engajamento', tipo_metrica: 'categorica', valores: ['baixo', 'medio', 'alto'] },
      ],
    };

    const consolidado = TelemetriaAgregacaoService.agregarEventos(eventosMistos, manifesto);

    // Validação Zod estrita (lança erro se campos estiverem divergentes ou ausentes)
    const validacao = telemetriaConsolidadaSchema.safeParse(consolidado);
    expect(validacao.success).toBe(true);

    if (validacao.success) {
      expect(validacao.data.total_eventos).toBe(4);
      expect(validacao.data.precisao.total_acertos).toBe(2);
      expect(validacao.data.precisao.total_erros).toBe(1);
      expect(validacao.data.precisao.taxa_precisao_percentual).toBe(66.67);
      expect(validacao.data.metricas_agregadas.length).toBeGreaterThanOrEqual(1);
    }
  });
});
