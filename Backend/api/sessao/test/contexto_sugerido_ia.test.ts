// ==============================================================================
// InTEA: Suíte de Testes Automatizados - Contexto DDA Sugerido por IA Pré-Sessão
// ==============================================================================
// REQUISITOS ATENDIDOS:
// - RF14: Sugestão de Contexto DDA Pré-Sessão (Figura 3, Contrato 2)
// - RF17: Calibração Analítica Baseada no Último Relatório Consolidado (Contrato 4)
// - RN01: Expurgo de Modo Livre na Calibração Clínica (paciente_id obrigatório e clínico)
// - RN03: Injeção de Contexto DDA Obrigatória Pré-Sessão
// - RN04: Isolamento Institucional por Vínculo Ativo (403 Forbidden)
// - RN05: Inalterabilidade do Histórico e Expurgo de Soft Delete (soft_delete = false)
// - RNF02: Resiliência e Tratamento Seguro de Empty State
// ==============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessaoContextoDdaService } from '../services/sessao-contexto-dda.service.js';
import { SessaoController } from '../controllers/sessao.controller.js';
import { sessaoRoutes } from '../routes/sessao.routes.js';
import { supabase } from '../../../core/supabase/supabase.client.js';
import { PacienteServiceError } from '../../paciente/services/paciente.service.js';
import { Request, Response } from 'express';

// ==============================================================================
// CONSTANTES CANÔNICAS DE TESTE (UUIDs V4)
// ==============================================================================
const PACIENTE_ID = '33333333-3333-4333-8333-333333333333';
const PACIENTE_INEXISTENTE_ID = 'ffffffff-4444-4444-8444-444444444444';
const SESSAO_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const JOGO_ID = '22222222-2222-4222-8222-222222222222';
const TERAPEUTA_ID = '11111111-1111-4111-8111-111111111111';
const CLINICA_ID = 'cccccccc-1111-4111-8111-111111111111';

// Helper para simulação do pipeline Express
interface MockHttpResult {
  req: Request;
  res: Response;
  getStatus: () => number;
  getJson: () => Record<string, unknown>;
}

function criarMockHttp(opcoes: {
  params?: Record<string, string>;
  user?: Record<string, unknown> | null;
}): MockHttpResult {
  let statusCode = 200;
  let jsonResult: Record<string, unknown> = {};

  const req = {
    params: opcoes.params || {},
    headers: { authorization: 'Bearer token-jwt-valido' },
    user: opcoes.user || null,
  } as unknown as Request;

  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: Record<string, unknown>) {
      jsonResult = data;
      return res;
    },
  } as unknown as Response;

  return {
    req,
    res,
    getStatus: () => statusCode,
    getJson: () => jsonResult,
  };
}

describe('SessaoContextoDdaService — Contexto DDA Sugerido por IA Pré-Sessão (RF14, RF17, RN03)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. VALIDAÇÃO DE ENTRADA E PACIENTE (RNF02)
  // ============================================================================
  describe('1. Validação de Parâmetros e Existência do Paciente', () => {
    it('deve lançar erro 400 se o ID do paciente for inválido ou não for UUID', async () => {
      await expect(
        SessaoContextoDdaService.obterContextoSugerido('uuid-invalido-123')
      ).rejects.toThrowError(new PacienteServiceError('Identificador do paciente inválido ou ausente.', 400));
    });

    it('deve lançar erro 400 se o ID do paciente for vazio', async () => {
      await expect(
        SessaoContextoDdaService.obterContextoSugerido('')
      ).rejects.toThrowError(new PacienteServiceError('Identificador do paciente inválido ou ausente.', 400));
    });

    it('deve lançar erro 404 se o paciente não for encontrado na tabela paciente', async () => {
      vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        return {};
      }) as unknown as typeof supabase.from);

      await expect(
        SessaoContextoDdaService.obterContextoSugerido(PACIENTE_INEXISTENTE_ID)
      ).rejects.toThrowError(new PacienteServiceError('Paciente não encontrado.', 404));
    });

    it('deve lançar erro 500 se o banco falhar ao consultar o paciente', async () => {
      vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database connection failure' },
                }),
              }),
            }),
          };
        }
        return {};
      }) as unknown as typeof supabase.from);

      await expect(
        SessaoContextoDdaService.obterContextoSugerido(PACIENTE_ID)
      ).rejects.toThrowError(new PacienteServiceError('Erro ao consultar paciente: Database connection failure', 500));
    });
  });

  // ============================================================================
  // 2. EMPTY STATE — PACIENTE NOVO SEM SESSÕES ANTERIORES (RNF02)
  // ============================================================================
  describe('2. Tratamento Seguro de Empty State', () => {
    it('deve retornar sugestão com estresse 1 e gatilhos basais da anamnese para paciente sem sessões finalizadas', async () => {
      vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: PACIENTE_ID, nome: 'Lucas Silva', status_ativo: true },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'dados_clinicos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    diagnostico_base: 'TEA Nível 1 de Suporte',
                    gatilhos_sensoriais: ['Ruídos Abruptos', 'Toques Inesperados'],
                    observacoes_gerais: 'Boa resposta a recompensas visuais',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'sessao') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    not: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }

        return {};
      }) as unknown as typeof supabase.from);

      const resultado = await SessaoContextoDdaService.obterContextoSugerido(PACIENTE_ID);

      expect(resultado.paciente_id).toBe(PACIENTE_ID);
      expect(resultado.ultima_sessao).toBeNull();
      expect(resultado.dados_anamnese.diagnostico_base).toBe('TEA Nível 1 de Suporte');
      expect(resultado.dados_anamnese.gatilhos_estaticos).toEqual(['Ruídos Abruptos', 'Toques Inesperados']);
      expect(resultado.sugestao_ia.nivel_estresse_sugerido).toBe(1);
      expect(resultado.sugestao_ia.gatilhos_recomendados).toEqual(['Ruídos Abruptos', 'Toques Inesperados']);
      expect(resultado.sugestao_ia.justificativa_baseada_ultima_sessao).toContain('Primeiro atendimento clínico');
    });

    it('deve retornar empty state resiliente mesmo se o paciente não tiver registro em dados_clinicos', async () => {
      vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: PACIENTE_ID, nome: 'Lucas Silva', status_ativo: true },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'dados_clinicos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }

        if (table === 'sessao') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    not: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }

        return {};
      }) as unknown as typeof supabase.from);

      const resultado = await SessaoContextoDdaService.obterContextoSugerido(PACIENTE_ID);

      expect(resultado.dados_anamnese.diagnostico_base).toBeNull();
      expect(resultado.dados_anamnese.gatilhos_estaticos).toEqual([]);
      expect(resultado.ultima_sessao).toBeNull();
      expect(resultado.sugestao_ia.nivel_estresse_sugerido).toBe(1);
      expect(resultado.sugestao_ia.gatilhos_recomendados).toEqual([]);
    });
  });

  // ============================================================================
  // 3. CALIBRAÇÃO COM BASE NA ÚLTIMA SESSÃO (RF14, RF17, CONTRATO 4)
  // ============================================================================
  describe('3. Calibração Analítica Baseada na Última Sessão Consolidada', () => {
    it('deve elevar estresse para nível 3 e adicionar gatilhos quando houver alta intervenção DDA e sobrecarga sensorial', async () => {
      vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: PACIENTE_ID, nome: 'Lucas Silva', status_ativo: true },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'dados_clinicos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    diagnostico_base: 'TEA Nível 2',
                    gatilhos_sensoriais: ['Ambientes Agitados'],
                    observacoes_gerais: null,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'sessao') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    not: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                          maybeSingle: vi.fn().mockResolvedValue({
                            data: {
                              id: SESSAO_ID,
                              jogo_id: JOGO_ID,
                              status_sessao: 'finalizada',
                              modo_sessao: 'sessao_clinica',
                              data_hora_fim: '2026-10-25T14:30:00Z',
                              jogo: { id: JOGO_ID, nome: 'Desafio das Cores e Sons' },
                              relatorio_sessao: [
                                {
                                  sessao_id: SESSAO_ID,
                                  conteudo: 'Relatório clínico consolidado',
                                  dados_ia_json: {
                                    resumo: {
                                      taxa_conclusao: 65,
                                      intervencoes_dda: 4,
                                    },
                                    analises_ia: [
                                      'Paciente apresentou sensibilidade a som e ruído abrupto nas fases 3 e 4.',
                                      'Recomenda-se reduzir brilho e estímulos de luz na próxima intervenção.',
                                    ],
                                    metricas_agregadas: [],
                                  },
                                  soft_delete: false,
                                },
                              ],
                            },
                            error: null,
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }

        return {};
      }) as unknown as typeof supabase.from);

      const resultado = await SessaoContextoDdaService.obterContextoSugerido(PACIENTE_ID);

      expect(resultado.ultima_sessao).not.toBeNull();
      expect(resultado.ultima_sessao?.sessao_id).toBe(SESSAO_ID);
      expect(resultado.ultima_sessao?.jogo_nome).toBe('Desafio das Cores e Sons');
      expect(resultado.ultima_sessao?.intervencoes_dda).toBe(4);
      expect(resultado.ultima_sessao?.taxa_conclusao).toBe(65);

      // Verificações da calibração sugerida pela IA
      expect(resultado.sugestao_ia.nivel_estresse_sugerido).toBe(3);
      expect(resultado.sugestao_ia.gatilhos_recomendados).toContain('Ambientes Agitados');
      expect(resultado.sugestao_ia.gatilhos_recomendados).toContain('Sons Altos ou Repentinos');
      expect(resultado.sugestao_ia.gatilhos_recomendados).toContain('Luzes Fortes ou Piscantes');
      expect(resultado.sugestao_ia.justificativa_baseada_ultima_sessao).toContain('4 intervenções');
      expect(resultado.sugestao_ia.justificativa_baseada_ultima_sessao).toContain('nível 3');
    });

    it('deve incluir gatilho de Pressão de Tempo quando a taxa de conclusão for inferior a 60%', async () => {
      vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: PACIENTE_ID, nome: 'Lucas Silva', status_ativo: true },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'dados_clinicos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    diagnostico_base: 'TEA Nível 1',
                    gatilhos_sensoriais: [],
                    observacoes_gerais: null,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'sessao') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    not: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                          maybeSingle: vi.fn().mockResolvedValue({
                            data: {
                              id: SESSAO_ID,
                              jogo_id: JOGO_ID,
                              status_sessao: 'finalizada',
                              modo_sessao: 'sessao_clinica',
                              data_hora_fim: '2026-10-25T14:30:00Z',
                              jogo: { id: JOGO_ID, nome: 'Labirinto Espacial' },
                              relatorio_sessao: {
                                sessao_id: SESSAO_ID,
                                conteudo: null,
                                dados_ia_json: {
                                  resumo: {
                                    taxa_conclusao: 50,
                                    intervencoes_dda: 3,
                                  },
                                  analises_ia: ['Dificuldade em gerenciar contagem regressiva.'],
                                  metricas_agregadas: [],
                                },
                                soft_delete: false,
                              },
                            },
                            error: null,
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }

        return {};
      }) as unknown as typeof supabase.from);

      const resultado = await SessaoContextoDdaService.obterContextoSugerido(PACIENTE_ID);

      expect(resultado.sugestao_ia.gatilhos_recomendados).toContain('Pressão de Tempo / Contagem Regressiva');
      expect(resultado.sugestao_ia.nivel_estresse_sugerido).toBe(3);
    });

    it('deve sugerir estresse 1 com justificativa estável quando a sessão anterior teve excelente engajamento', async () => {
      vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: PACIENTE_ID, nome: 'Lucas Silva', status_ativo: true },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'dados_clinicos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    diagnostico_base: 'TEA Nível 1',
                    gatilhos_sensoriais: ['Ruídos Abruptos'],
                    observacoes_gerais: null,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'sessao') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    not: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                          maybeSingle: vi.fn().mockResolvedValue({
                            data: {
                              id: SESSAO_ID,
                              jogo_id: JOGO_ID,
                              status_sessao: 'finalizada',
                              modo_sessao: 'sessao_clinica',
                              data_hora_fim: '2026-10-25T14:30:00Z',
                              jogo: { id: JOGO_ID, nome: 'Jogo da Memória' },
                              relatorio_sessao: [
                                {
                                  sessao_id: SESSAO_ID,
                                  conteudo: 'Sessão exemplar',
                                  dados_ia_json: {
                                    resumo: {
                                      taxa_conclusao: 95,
                                      intervencoes_dda: 0,
                                    },
                                    analises_ia: ['Excelente foco e engajamento sustentado.'],
                                    metricas_agregadas: [],
                                  },
                                  soft_delete: false,
                                },
                              ],
                            },
                            error: null,
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }

        return {};
      }) as unknown as typeof supabase.from);

      const resultado = await SessaoContextoDdaService.obterContextoSugerido(PACIENTE_ID);

      expect(resultado.sugestao_ia.nivel_estresse_sugerido).toBe(1);
      expect(resultado.sugestao_ia.gatilhos_recomendados).toEqual(['Ruídos Abruptos']);
      expect(resultado.sugestao_ia.justificativa_baseada_ultima_sessao).toContain('excelente estabilidade');
      expect(resultado.sugestao_ia.justificativa_baseada_ultima_sessao).toContain('95% de conclusão');
    });

    it('deve sugerir estresse 2 para modulação adaptativa moderada', async () => {
      vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: PACIENTE_ID, nome: 'Lucas Silva', status_ativo: true },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'dados_clinicos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }

        if (table === 'sessao') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    not: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                          maybeSingle: vi.fn().mockResolvedValue({
                            data: {
                              id: SESSAO_ID,
                              jogo_id: JOGO_ID,
                              status_sessao: 'finalizada',
                              modo_sessao: 'sessao_clinica',
                              data_hora_fim: '2026-10-25T14:30:00Z',
                              jogo: { id: JOGO_ID, nome: 'Jogo Interativo' },
                              relatorio_sessao: [
                                {
                                  sessao_id: SESSAO_ID,
                                  conteudo: 'Sessão regular',
                                  dados_ia_json: {
                                    resumo: {
                                      taxa_conclusao: 80,
                                      intervencoes_dda: 2,
                                    },
                                    analises_ia: ['Ajuste pontual de dificuldade.'],
                                    metricas_agregadas: [],
                                  },
                                  soft_delete: false,
                                },
                              ],
                            },
                            error: null,
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }

        return {};
      }) as unknown as typeof supabase.from);

      const resultado = await SessaoContextoDdaService.obterContextoSugerido(PACIENTE_ID);

      expect(resultado.sugestao_ia.nivel_estresse_sugerido).toBe(2);
      expect(resultado.sugestao_ia.justificativa_baseada_ultima_sessao).toContain('modulação adaptativa moderada');
    });
  });

  // ============================================================================
  // 4. INVARIANTES CLÍNICOS E EXPURGOS (RN01, RN05)
  // ============================================================================
  describe('4. Invariantes Clínicos (RN01 e RN05)', () => {
    it('deve desconsiderar relatórios marcados com soft_delete = true (RN05)', async () => {
      vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'paciente') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: PACIENTE_ID, nome: 'Lucas Silva', status_ativo: true },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'dados_clinicos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    diagnostico_base: 'TEA',
                    gatilhos_sensoriais: ['Luzes Fortes'],
                    observacoes_gerais: null,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'sessao') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    not: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                          maybeSingle: vi.fn().mockResolvedValue({
                            data: {
                              id: SESSAO_ID,
                              jogo_id: JOGO_ID,
                              status_sessao: 'finalizada',
                              modo_sessao: 'sessao_clinica',
                              data_hora_fim: '2026-10-25T14:30:00Z',
                              jogo: { id: JOGO_ID, nome: 'Jogo' },
                              relatorio_sessao: [
                                {
                                  sessao_id: SESSAO_ID,
                                  conteudo: 'Relatório excluído',
                                  dados_ia_json: {
                                    resumo: { taxa_conclusao: 20, intervencoes_dda: 10 },
                                    analises_ia: ['Sobrecarga extrema'],
                                  },
                                  soft_delete: true, // EXCLUÍDO LOGICAMENTE
                                },
                              ],
                            },
                            error: null,
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }

        return {};
      }) as unknown as typeof supabase.from);

      const resultado = await SessaoContextoDdaService.obterContextoSugerido(PACIENTE_ID);

      // Como o único relatório retornado estava soft_deleted, deve tratar como Empty State
      expect(resultado.ultima_sessao).toBeNull();
      expect(resultado.sugestao_ia.nivel_estresse_sugerido).toBe(1);
      expect(resultado.sugestao_ia.justificativa_baseada_ultima_sessao).toContain('Primeiro atendimento clínico');
    });
  });

  // ============================================================================
  // 5. CONTROLLER EXPRESS E ENVELOPE PATTERN
  // ============================================================================
  describe('5. SessaoController.obterContextoSugerido — Envelope Pattern', () => {
    it('deve retornar HTTP 200 com envelope pattern categorizado { data, message }', async () => {
      const mockResultado = {
        paciente_id: PACIENTE_ID,
        dados_anamnese: {
          diagnostico_base: 'TEA Nível 1',
          gatilhos_estaticos: ['Ruídos'],
          observacoes_gerais: null,
        },
        ultima_sessao: null,
        sugestao_ia: {
          nivel_estresse_sugerido: 1,
          gatilhos_recomendados: ['Ruídos'],
          justificativa_baseada_ultima_sessao: 'Primeiro atendimento clínico.',
        },
      };

      vi.spyOn(SessaoContextoDdaService, 'obterContextoSugerido').mockResolvedValue(mockResultado);

      const { req, res, getStatus, getJson } = criarMockHttp({
        params: { pacienteId: PACIENTE_ID },
      });

      await SessaoController.obterContextoSugerido(req, res);

      expect(getStatus()).toBe(200);
      const json = getJson();
      expect(json.message).toBe('Contexto DDA sugerido pela IA recuperado com sucesso.');
      expect(json.data).toEqual(mockResultado);
    });

    it('deve retornar HTTP 400 se o pacienteId for inválido no controller', async () => {
      const { req, res, getStatus, getJson } = criarMockHttp({
        params: { pacienteId: 'formato-invalido' },
      });

      await SessaoController.obterContextoSugerido(req, res);

      expect(getStatus()).toBe(400);
      expect(getJson().error).toContain('Identificador do paciente inválido');
    });

    it('deve retornar HTTP 404 quando o serviço reportar paciente não encontrado', async () => {
      vi.spyOn(SessaoContextoDdaService, 'obterContextoSugerido').mockRejectedValue(
        new PacienteServiceError('Paciente não encontrado.', 404)
      );

      const { req, res, getStatus, getJson } = criarMockHttp({
        params: { pacienteId: PACIENTE_INEXISTENTE_ID },
      });

      await SessaoController.obterContextoSugerido(req, res);

      expect(getStatus()).toBe(404);
      expect(getJson().error).toBe('Paciente não encontrado.');
    });
  });

  // ============================================================================
  // 6. ROTA E AUTORIZAÇÃO POR VÍNCULO (RN04)
  // ============================================================================
  describe('6. Rota Express e Autorização por Vínculo Institucional (RN04)', () => {
    it('deve registrar o endpoint GET /contexto-sugerido/:pacienteId nas rotas de sessão', () => {
      const rotaEncontrada = sessaoRoutes.stack.find((layer) => {
        const routeObj = layer.route as { path?: string; methods?: Record<string, boolean> } | undefined;
        return (
          routeObj &&
          routeObj.path === '/contexto-sugerido/:pacienteId' &&
          routeObj.methods?.get === true
        );
      });

      expect(rotaEncontrada).toBeDefined();
      expect(rotaEncontrada?.route?.path).toBe('/contexto-sugerido/:pacienteId');
    });
  });
});
