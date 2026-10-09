import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { SessaoIaAnaliseService } from '../services/sessao-ia-analise.service.js';
import { Sessao, MODO_SESSAO, STATUS_SESSAO, SessaoModel } from '../models/sessao.model.js';
import {
  TelemetriaConsolidada,
  TelemetriaAgregacaoService,
} from '../../telemetria/services/telemetria-agregacao.service.js';

describe('Card 2.2 — SessaoIaAnaliseService (Síntese Analítica do Agente de IA / Contrato 4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sessaoClinicaFinalizada: Sessao = {
    id: '11111111-1111-4111-8111-111111111111',
    terapeuta_id: '22222222-2222-4222-8222-222222222222',
    paciente_id: '33333333-3333-4333-8333-333333333333',
    jogo_id: 'game-uuid-01',
    session_token: '849-291',
    modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
    contexto_dda_json: {
      nivel_estresse_inicial: 'medio',
      gatilhos_sensoriais_evitar: ['luz_piscante', 'som_agudo'],
      objetivo_clinico: 'foco_atencional',
    },
    dispositivo_info: null,
    status_sessao: STATUS_SESSAO.FINALIZADA,
    data_hora_inicio: '2026-10-08T10:00:00Z',
    expira_em: '2026-10-08T10:15:00Z',
    data_hora_fim: '2026-10-08T10:20:00Z', // 20 minutos = 1200s
    created_at: '2026-10-08T10:00:00Z',
    updated_at: '2026-10-08T10:20:00Z',
  };

  const telemetriaConsolidadaMock: TelemetriaConsolidada = {
    total_eventos: 50,
    duracao_estimada_segundos: 1200,
    contagem_por_tipo: {
      acerto: 40,
      erro: 10,
      intervencao_dda: 4,
    },
    precisao: {
      total_toques: 50,
      total_acertos: 40,
      total_erros: 10,
      taxa_precisao_percentual: 80.0,
    },
    tempo_resposta: {
      total_amostras: 30,
      media: 2.4,
      mediana: 2.2,
      minimo: 1.1,
      maximo: 4.5,
      desvio_padrao: 0.6,
      unidade: 'segundos',
    },
    estabilidade_atencao: {
      indice_estabilidade: 85,
      classificacao: 'alta',
      coeficiente_variacao: 0.18,
      janelas: [],
    },
    metricas_agregadas: [
      {
        id_metrica: 'nivel_frustracao',
        tipo_metrica: 'categorica',
        total_amostras: 20,
        valor_dominante: 'baixo',
        distribuicao: { baixo: 16, medio: 4 },
        tendencia: 'estavel',
      },
      {
        id_metrica: 'tempo_resposta',
        tipo_metrica: 'numerica',
        unidade: 'segundos',
        total_amostras: 30,
        media: 2.4,
        mediana: 2.2,
        minimo: 1.1,
        maximo: 4.5,
        desvio_padrao: 0.6,
        tendencia: 'decrescente',
      },
    ],
    violacoes_rn02: [],
    data_hora_primeiro_evento: '2026-10-08T10:00:00Z',
    data_hora_ultimo_evento: '2026-10-08T10:20:00Z',
  };

  it('RN01: deve retornar null para sessão em modo livre (sem prontuário nem IA)', () => {
    const sessaoModoLivre: Sessao = {
      ...sessaoClinicaFinalizada,
      modo_sessao: MODO_SESSAO.MODO_LIVRE,
      paciente_id: null,
    };

    const resultado = SessaoIaAnaliseService.sintetizarRelatorio(sessaoModoLivre, telemetriaConsolidadaMock);
    expect(resultado).toBeNull();
  });

  it('RN01: deve retornar null se paciente_id for nulo mesmo em sessão clínica', () => {
    const sessaoSemPaciente: Sessao = {
      ...sessaoClinicaFinalizada,
      paciente_id: null,
    };

    const resultado = SessaoIaAnaliseService.sintetizarRelatorio(sessaoSemPaciente, telemetriaConsolidadaMock);
    expect(resultado).toBeNull();
  });

  it('deve retornar null para sessões que não estejam no status finalizada', () => {
    const statusNaoFinalizados = [
      STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
      STATUS_SESSAO.CONECTADO,
      STATUS_SESSAO.EM_ANDAMENTO,
      STATUS_SESSAO.CANCELADA,
      STATUS_SESSAO.EXPIRADA,
    ];

    for (const status of statusNaoFinalizados) {
      const sessaoIncompleta: Sessao = {
        ...sessaoClinicaFinalizada,
        status_sessao: status,
      };

      const resultado = SessaoIaAnaliseService.sintetizarRelatorio(sessaoIncompleta, telemetriaConsolidadaMock);
      expect(resultado).toBeNull();
    }
  });

  it('deve calcular a duração determinística em segundos a partir de data_hora_inicio e data_hora_fim', () => {
    const resultado = SessaoIaAnaliseService.sintetizarRelatorio(sessaoClinicaFinalizada, telemetriaConsolidadaMock);

    expect(resultado).not.toBeNull();
    // 10:00 até 10:20 = 20 min = 1200 segundos
    expect(resultado?.duracao_segundos).toBe(1200);
    expect(resultado?.token_sessao).toBe('849-291');
  });

  it('deve calcular taxa_conclusao ponderada e apurar intervencoes_dda', () => {
    const resultado = SessaoIaAnaliseService.sintetizarRelatorio(sessaoClinicaFinalizada, telemetriaConsolidadaMock);

    expect(resultado).not.toBeNull();
    expect(resultado?.resumo.intervencoes_dda).toBe(4);
    // 80 * 0.7 + 85 * 0.3 = 56 + 25.5 = 81.5
    expect(resultado?.resumo.taxa_conclusao).toBe(81.5);
  });

  it('deve gerar pareceres analíticos contextuais dinâmicos alinhados a DDA e gatilhos (RF17)', () => {
    const resultado = SessaoIaAnaliseService.sintetizarRelatorio(sessaoClinicaFinalizada, telemetriaConsolidadaMock);

    expect(resultado).not.toBeNull();
    expect(resultado?.analises_ia.length).toBeGreaterThanOrEqual(3);

    const textos = resultado?.analises_ia.join(' ') || '';

    // Deve mencionar regulação
    expect(textos).toContain('regulação comportamental');
    // Deve mencionar DDA
    expect(textos).toContain('Ajuste Dinâmico de Dificuldade');
    // Deve mencionar gatilhos a evitar do contexto
    expect(textos).toContain('luz_piscante, som_agudo');
    // Deve mencionar o objetivo clínico
    expect(textos).toContain('foco_atencional');
    // Deve mencionar tempo de resposta
    expect(textos).toContain('2.4 segundos');
  });

  it('deve mapear metricas_agregadas no formato canônico do Contrato 4', () => {
    const resultado = SessaoIaAnaliseService.sintetizarRelatorio(sessaoClinicaFinalizada, telemetriaConsolidadaMock);

    expect(resultado).not.toBeNull();
    expect(resultado?.metricas_agregadas).toHaveLength(2);

    const metricaFrustracao = resultado?.metricas_agregadas.find((m) => m.id_metrica === 'nivel_frustracao');
    expect(metricaFrustracao).toBeDefined();
    expect(metricaFrustracao?.valor_dominante).toBe('baixo');
    expect(metricaFrustracao?.tendencia).toBe('estavel');

    const metricaTempo = resultado?.metricas_agregadas.find((m) => m.id_metrica === 'tempo_resposta');
    expect(metricaTempo).toBeDefined();
    expect(metricaTempo?.valor_dominante).toBe(2.4);
    expect(metricaTempo?.tendencia).toBe('decrescente');
  });

  it('deve processar com segurança mesmo quando telemetria for nula ou vazia', () => {
    const resultado = SessaoIaAnaliseService.sintetizarRelatorio(sessaoClinicaFinalizada, null);

    expect(resultado).not.toBeNull();
    expect(resultado?.resumo.taxa_conclusao).toBe(0);
    expect(resultado?.resumo.intervencoes_dda).toBe(0);
    expect(resultado?.metricas_agregadas).toEqual([]);
    expect(resultado?.analises_ia.length).toBeGreaterThanOrEqual(1);
  });

  it('processarPorSessaoId: deve buscar no banco, compilar telemetria e sintetizar relatório', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoClinicaFinalizada);
    vi.spyOn(TelemetriaAgregacaoService, 'compilarPorSessaoId').mockResolvedValue(telemetriaConsolidadaMock);

    const resultado = await SessaoIaAnaliseService.processarPorSessaoId(sessaoClinicaFinalizada.id);

    expect(resultado).not.toBeNull();
    expect(resultado?.token_sessao).toBe('849-291');
    expect(resultado?.resumo.intervencoes_dda).toBe(4);
    expect(resultado?.metricas_agregadas.length).toBe(2);
  });

  it('processarPorSessaoId: deve retornar null se sessão não existir ou estiver em modo livre', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(null);

    const resultadoInexistente = await SessaoIaAnaliseService.processarPorSessaoId('id-inexistente');
    expect(resultadoInexistente).toBeNull();

    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      ...sessaoClinicaFinalizada,
      modo_sessao: MODO_SESSAO.MODO_LIVRE,
      paciente_id: null,
    });

    const resultadoLivre = await SessaoIaAnaliseService.processarPorSessaoId('id-livre');
    expect(resultadoLivre).toBeNull();
  });
});

describe('Card 2.4 — Validação Estrita do Schema Zod do Contrato 4 (docs/ModelosDeContratos/relatorio.json)', () => {
  const contrato4ZodSchema = z
    .object({
      token_sessao: z.string().min(1),
      duracao_segundos: z.number().int().nonnegative(),
      resumo: z.object({
        taxa_conclusao: z.number().min(0).max(100),
        intervencoes_dda: z.number().int().nonnegative(),
      }),
      analises_ia: z.array(z.string().min(1)).min(1),
      metricas_agregadas: z.array(
        z.object({
          id_metrica: z.string().min(1),
          valor_dominante: z.union([z.string(), z.number()]),
          tendencia: z.enum(['estavel', 'crescente', 'decrescente']),
        })
      ),
    })
    .strict();

  const sessaoExemplo: Sessao = {
    id: '11111111-1111-4111-8111-111111111111',
    terapeuta_id: '22222222-2222-4222-8222-222222222222',
    paciente_id: '33333333-3333-4333-8333-333333333333',
    jogo_id: 'game-uuid-01',
    session_token: 'a1b2c3d4-token',
    modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
    contexto_dda_json: {
      nivel_estresse_inicial: 'baixo',
      gatilhos_sensoriais_evitar: ['luz_piscante'],
      objetivo_clinico: 'coordenacao_motora',
    },
    dispositivo_info: null,
    status_sessao: STATUS_SESSAO.FINALIZADA,
    data_hora_inicio: '2026-10-08T10:00:00Z',
    expira_em: '2026-10-08T10:15:00Z',
    data_hora_fim: '2026-10-08T10:20:00Z',
    created_at: '2026-10-08T10:00:00Z',
    updated_at: '2026-10-08T10:20:00Z',
  };

  const telemetriaExemplo: TelemetriaConsolidada = {
    total_eventos: 20,
    duracao_estimada_segundos: 1200,
    contagem_por_tipo: { acerto: 18, erro: 2 },
    precisao: {
      total_toques: 20,
      total_acertos: 18,
      total_erros: 2,
      taxa_precisao_percentual: 90,
    },
    tempo_resposta: {
      total_amostras: 15,
      media: 1.8,
      mediana: 1.7,
      minimo: 1.0,
      maximo: 3.2,
      desvio_padrao: 0.4,
      unidade: 'segundos',
    },
    estabilidade_atencao: {
      indice_estabilidade: 92,
      classificacao: 'alta',
      coeficiente_variacao: 0.1,
      janelas: [],
    },
    metricas_agregadas: [
      {
        id_metrica: 'nivel_frustracao',
        tipo_metrica: 'categorica',
        total_amostras: 10,
        valor_dominante: 'baixo',
        distribuicao: { baixo: 10 },
        tendencia: 'estavel',
      },
    ],
    violacoes_rn02: [],
    data_hora_primeiro_evento: '2026-10-08T10:00:00Z',
    data_hora_ultimo_evento: '2026-10-08T10:20:00Z',
  };

  it('deve validar estritamente o modelo de referência oficial em docs/ModelosDeContratos/relatorio.json', () => {
    const modeloReferencia = {
      token_sessao: 'a1b2c3d4-token',
      duracao_segundos: 1200,
      resumo: {
        taxa_conclusao: 85.5,
        intervencoes_dda: 4,
      },
      analises_ia: [
        'O paciente demonstrou excelente regulação após os primeiros 5 minutos.',
        'Houve necessidade de redução de dificuldade em estímulos sonoros.',
      ],
      metricas_agregadas: [
        {
          id_metrica: 'nivel_frustracao',
          valor_dominante: 'baixo',
          tendencia: 'estavel',
        },
      ],
    };

    const resultado = contrato4ZodSchema.safeParse(modeloReferencia);
    expect(resultado.success).toBe(true);
  });

  it('deve validar que a saída de SessaoIaAnaliseService.sintetizarRelatorio satisfaz 100% o schema Zod estrito', () => {
    const relatorioSintetizado = SessaoIaAnaliseService.sintetizarRelatorio(sessaoExemplo, telemetriaExemplo);
    expect(relatorioSintetizado).not.toBeNull();

    const resultadoZod = contrato4ZodSchema.safeParse(relatorioSintetizado);
    expect(resultadoZod.success).toBe(true);

    if (resultadoZod.success) {
      expect(resultadoZod.data.token_sessao).toBe('a1b2c3d4-token');
      expect(resultadoZod.data.duracao_segundos).toBe(1200);
      expect(resultadoZod.data.resumo.taxa_conclusao).toBeGreaterThan(0);
      expect(resultadoZod.data.analises_ia.length).toBeGreaterThan(0);
      expect(resultadoZod.data.metricas_agregadas.length).toBeGreaterThan(0);
    }
  });

  it('deve rejeitar com erro Zod payloads contendo campos espúrios não autorizados (strict)', () => {
    const payloadComCampoExtra = {
      token_sessao: 'token-teste',
      duracao_segundos: 600,
      resumo: { taxa_conclusao: 70, intervencoes_dda: 1 },
      analises_ia: ['Análise ok'],
      metricas_agregadas: [],
      campo_fantasma_invalido: true,
    };

    const validacao = contrato4ZodSchema.safeParse(payloadComCampoExtra);
    expect(validacao.success).toBe(false);
  });

  it('deve rejeitar com erro Zod payloads onde taxa_conclusao for fora do intervalo 0-100', () => {
    const payloadTaxaInvalida = {
      token_sessao: 'token-teste',
      duracao_segundos: 600,
      resumo: { taxa_conclusao: 150, intervencoes_dda: 1 },
      analises_ia: ['Análise ok'],
      metricas_agregadas: [],
    };

    const validacao = contrato4ZodSchema.safeParse(payloadTaxaInvalida);
    expect(validacao.success).toBe(false);
  });
});
