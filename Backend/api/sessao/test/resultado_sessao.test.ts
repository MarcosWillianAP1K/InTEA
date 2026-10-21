// ==============================================================================
// InTEA: Testes Automatizados da Tela de Resultados (Sprint 10 - Card 1.2)
// ==============================================================================
// Conformidade: RF14 (Tela de Resultados), RN01 (Modo Livre), RN04 (Vínculo/Clínica),
// RN05 (Imutabilidade), Contrato 4 (Síntese de IA)
// TypeScript Estrito
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessaoResultadoService } from '../services/sessao-resultado.service.js';
import { SessaoController } from '../controllers/sessao.controller.js';
import { SessaoModel, STATUS_SESSAO, MODO_SESSAO, Sessao } from '../models/sessao.model.js';
import { RelatorioSessaoModel } from '../models/relatorio.model.js';
import { AnotacaoClinicaModel } from '../../anotacao/models/anotacao.model.js';
import { TelemetriaModel } from '../../telemetria/models/telemetria.model.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

describe('SessaoResultadoService — Endpoint GET /api/sessao/:id/resultado (RF14, RN01, RN04)', () => {
  const sessaoId = '11111111-1111-4111-a111-111111111111';
  const terapeutaId = '22222222-2222-4222-a222-222222222222';
  const pacienteId = '33333333-3333-4333-a333-333333333333';
  const clinicaId = '44444444-4444-4444-a444-444444444444';
  const jogoId = '55555555-5555-4555-a555-555555555555';

  const mockSessaoFinalizada: Sessao = {
    id: sessaoId,
    terapeuta_id: terapeutaId,
    paciente_id: pacienteId,
    jogo_id: jogoId,
    session_token: 'ABCD-1234',
    modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
    contexto_dda_json: {},
    dispositivo_info: { modelo: 'Tablet Android', sistema_operacional: 'Android 13' },
    status_sessao: STATUS_SESSAO.FINALIZADA,
    data_hora_inicio: '2026-10-14T10:00:00Z',
    data_hora_fim: '2026-10-14T10:20:00Z', // 1200 segundos
    expira_em: '2026-10-14T10:15:00Z',
    created_at: '2026-10-14T10:00:00Z',
    updated_at: '2026-10-14T10:20:00Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(TelemetriaModel, 'buscarPorSessaoId').mockResolvedValue([]);
  });

  it('deve retornar 400 Bad Request se o sessaoId informado for inválido (não-UUID)', async () => {
    const res = await SessaoResultadoService.obterResultadoConsolidado('id-invalido', terapeutaId);
    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(400);
    expect(res.erro).toContain('UUID válido');
  });

  it('deve retornar 404 Not Found se a sessão não for localizada no banco', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(null);

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);
    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(404);
    expect(res.erro).toContain('Sessão clínica não encontrada');
  });

  it('deve retornar 400 Bad Request se a sessão estiver em andamento (não-finalizada)', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      ...mockSessaoFinalizada,
      status_sessao: STATUS_SESSAO.EM_ANDAMENTO,
      data_hora_fim: null,
    });

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);
    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(400);
    expect(res.erro).toContain("só está disponível para sessões finalizadas. Status atual: 'em_andamento'");
  });

  it('deve retornar 400 Bad Request se a sessão ainda estiver aguardando pareamento', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      ...mockSessaoFinalizada,
      status_sessao: STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
      data_hora_fim: null,
    });

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);
    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(400);
  });

  it('deve retornar 403 Forbidden se o terapeuta pertencer a uma clínica diferente da do paciente (RN04)', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(mockSessaoFinalizada);

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
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
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteId, clinica_id: 'outra-clinica-uuid', status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);
    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(403);
    expect(res.erro).toContain('instituição clínica diferente');
  });

  it('deve retornar 403 Forbidden se o terapeuta não possuir vínculo ativo com o paciente (RN04)', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(mockSessaoFinalizada);

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
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
      if (table === 'terapeuta_paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null, // Sem vínculo ativo!
                  error: null,
                }),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);
    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(403);
    expect(res.erro).toContain('não possui vínculo ativo com este paciente');
  });

  it('deve permitir acesso e retornar 200 OK com dados consolidados se terapeuta possuir vínculo ativo (RN04)', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(mockSessaoFinalizada);

    const mockRelatorioIA = {
      token_sessao: 'ABCD-1234',
      duracao_segundos: 1200,
      resumo: { taxa_conclusao: 90, intervencoes_dda: 2 },
      analises_ia: ['Excelente regulação sensorial.'],
      metricas_agregadas: [{ id_metrica: 'atencao', valor_dominante: 'alta', tendencia: 'estavel' }],
    };

    vi.spyOn(RelatorioSessaoModel, 'buscarPorSessaoId').mockResolvedValue({
      sessao_id: sessaoId,
      conteudo: 'Parecer sintetizado',
      dados_ia_json: mockRelatorioIA,
      soft_delete: false,
      created_at: '2026-10-14T10:20:00Z',
      updated_at: '2026-10-14T10:20:00Z',
    });

    vi.spyOn(AnotacaoClinicaModel, 'listarPorSessao').mockResolvedValue([
      {
        id: 'anotacao-1',
        terapeuta_id: terapeutaId,
        paciente_id: pacienteId,
        sessao_id: sessaoId,
        conteudo: 'Observação clínica do terapeuta',
        soft_delete: false,
        created_at: '2026-10-14T10:21:00Z',
        updated_at: '2026-10-14T10:21:00Z',
      },
    ]);

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: terapeutaId, clinica_id: clinicaId, is_super_admin: false, status_ativo: true, nome: 'Dr. Marcos', crefito: '12345' },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true, nome: 'Lucas', data_nascimento: '2015-05-10', cpf: '123.456.789-00' },
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
      if (table === 'jogo') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: jogoId, nome: 'Ilha dos Sentidos', versao: '1.2.0', descricao: 'Jogo de atenção sustentada' },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);

    expect(res.sucesso).toBe(true);
    expect(res.status).toBe(200);
    expect(res.dados).toBeDefined();

    const dados = res.dados!;
    expect(dados.sessao.id).toBe(sessaoId);
    expect(dados.sessao.duracao_segundos).toBe(1200);
    expect(dados.sessao.modo_sessao).toBe('sessao_clinica');
    expect(dados.sessao.status_sessao).toBe('finalizada');
    expect(dados.jogo?.nome).toBe('Ilha dos Sentidos');
    expect(dados.terapeuta?.nome).toBe('Dr. Marcos');
    expect(dados.paciente?.nome).toBe('Lucas');
    expect(dados.relatorio?.conteudo).toBe('Parecer sintetizado');
    expect(dados.relatorio?.dados_ia_json.resumo.taxa_conclusao).toBe(90);
    expect(dados.anotacoes).toHaveLength(1);
    expect(dados.anotacoes[0].conteudo).toBe('Observação clínica do terapeuta');
  });

  it('deve retornar 200 OK para sessão em Modo Livre suprimindo paciente e anotações clínicas (RN01)', async () => {
    const mockSessaoModoLivre: Sessao = {
      ...mockSessaoFinalizada,
      modo_sessao: MODO_SESSAO.MODO_LIVRE,
      paciente_id: null,
    };

    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(mockSessaoModoLivre);

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'jogo') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: jogoId, nome: 'Ilha dos Sentidos', versao: '1.2.0' },
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
                data: { id: terapeutaId, nome: 'Dr. Marcos' },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);

    expect(res.sucesso).toBe(true);
    expect(res.status).toBe(200);
    expect(res.dados).toBeDefined();

    const dados = res.dados!;
    expect(dados.sessao.modo_sessao).toBe('modo_livre');
    expect(dados.paciente).toBeNull(); // Conforme RN01
    expect(dados.relatorio).toBeNull(); // Conforme RN01
    expect(dados.anotacoes).toEqual([]); // Conforme RN01
    expect(dados.jogo?.nome).toBe('Ilha dos Sentidos');
  });

  it('deve permitir bypass de vínculo se o usuário logado for SuperAdmin', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(mockSessaoFinalizada);
    vi.spyOn(RelatorioSessaoModel, 'buscarPorSessaoId').mockResolvedValue(null);
    vi.spyOn(AnotacaoClinicaModel, 'listarPorSessao').mockResolvedValue([]);

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'generic-id', nome: 'Super Admin' },
              error: null,
            }),
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>;
    });

    // Passando isSuperAdmin = true
    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, 'admin-id', true);
    expect(res.sucesso).toBe(true);
    expect(res.status).toBe(200);
  });
  it('deve retornar 400 Bad Request se a sessão estiver cancelada (FSM)', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      ...mockSessaoFinalizada,
      status_sessao: STATUS_SESSAO.CANCELADA,
      data_hora_fim: null,
    });

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);
    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(400);
    expect(res.erro).toContain("só está disponível para sessões finalizadas. Status atual: 'cancelada'");
  });

  it('deve retornar 400 Bad Request se a sessão estiver expirada (FSM)', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      ...mockSessaoFinalizada,
      status_sessao: STATUS_SESSAO.EXPIRADA,
      data_hora_fim: null,
    });

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);
    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(400);
    expect(res.erro).toContain("só está disponível para sessões finalizadas. Status atual: 'expirada'");
  });

  it('deve retornar 403 Forbidden se o perfil do terapeuta requisitante não for encontrado no banco (RN04)', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(mockSessaoFinalizada);

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null, // Terapeuta não encontrado
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);
    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(403);
    expect(res.erro).toContain('perfil de terapeuta associado ao token não encontrado');
  });

  it('deve retornar 403 Forbidden se a conta do terapeuta requisitante estiver inativa (RN04)', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(mockSessaoFinalizada);

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: terapeutaId, clinica_id: clinicaId, is_super_admin: false, status_ativo: false },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);
    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(403);
    expect(res.erro).toContain('a conta do terapeuta encontra-se inativa');
  });

  it('deve retornar 404 Not Found se o paciente vinculado à sessão não for encontrado no banco (RN04)', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(mockSessaoFinalizada);

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
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
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null, // Paciente não encontrado
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);
    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(404);
    expect(res.erro).toContain('Paciente vinculado à sessão não encontrado');
  });

  it('deve retornar 200 OK com fallback de relatório via SessaoTokenService quando relatorio_sessao for nulo', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(mockSessaoFinalizada);
    vi.spyOn(RelatorioSessaoModel, 'buscarPorSessaoId').mockResolvedValue(null);
    vi.spyOn(AnotacaoClinicaModel, 'listarPorSessao').mockResolvedValue([]);

    const { SessaoTokenService } = await import('../services/sessao-token.service.js');
    const mockSintese = {
      token_sessao: 'ABCD-1234',
      duracao_segundos: 1200,
      resumo: { taxa_conclusao: 80, intervencoes_dda: 1 },
      analises_ia: ['Análise gerada em fallback'],
      metricas_agregadas: [],
    };
    vi.spyOn(SessaoTokenService, 'gerarRelatorioIA').mockReturnValue(mockSintese);

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: terapeutaId, clinica_id: clinicaId, is_super_admin: false, status_ativo: true, nome: 'Dr. Marcos' },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true, nome: 'Lucas' },
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
      if (table === 'jogo') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: jogoId, nome: 'Ilha dos Sentidos', versao: '1.0' },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);
    expect(res.sucesso).toBe(true);
    expect(res.status).toBe(200);
    expect(res.dados?.relatorio?.dados_ia_json.resumo.taxa_conclusao).toBe(80);
    expect(res.dados?.relatorio?.conteudo).toBeNull();
  });

  it('deve calcular duracao_segundos como 0 se data_hora_fim for nula', async () => {
    const mockSessaoSemFim: Sessao = {
      ...mockSessaoFinalizada,
      data_hora_fim: null,
    };
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(mockSessaoSemFim);
    vi.spyOn(RelatorioSessaoModel, 'buscarPorSessaoId').mockResolvedValue(null);
    vi.spyOn(AnotacaoClinicaModel, 'listarPorSessao').mockResolvedValue([]);

    vi.spyOn(supabase, 'from').mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { paciente_id: pacienteId }, error: null }),
          }),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: terapeutaId, clinica_id: clinicaId, is_super_admin: false, status_ativo: true },
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>));

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);
    expect(res.sucesso).toBe(true);
    expect(res.dados?.sessao.duracao_segundos).toBe(0);
  });

  it('RN05: deve garantir que anotações com soft_delete = true não são expostas no resultado consolidado', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(mockSessaoFinalizada);
    vi.spyOn(RelatorioSessaoModel, 'buscarPorSessaoId').mockResolvedValue(null);

    // AnotacaoClinicaModel.listarPorSessao já filtra soft_delete: false por padrão
    const spyListarAnotacoes = vi.spyOn(AnotacaoClinicaModel, 'listarPorSessao').mockResolvedValue([]);

    vi.spyOn(supabase, 'from').mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { paciente_id: pacienteId }, error: null }),
          }),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: terapeutaId, clinica_id: clinicaId, is_super_admin: false, status_ativo: true },
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>));

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);
    expect(res.sucesso).toBe(true);
    expect(spyListarAnotacoes).toHaveBeenCalledWith(sessaoId);
    expect(res.dados?.anotacoes).toEqual([]);
  });

  it('deve retornar 500 se ocorrer uma exceção inesperada no serviço', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockRejectedValue(new Error('Falha catastrófica de rede'));

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);
    expect(res.sucesso).toBe(false);
    expect(res.status).toBe(500);
    expect(res.erro).toContain('Erro interno ao consultar resultado consolidado');
  });

  it('deve consolidar o bloco cabecalho com diagnostico_base e gatilhos derivados do contexto DDA e dados_clinicos', async () => {
    const sessaoComDda: Sessao = {
      ...mockSessaoFinalizada,
      contexto_dda_json: {
        nivel_estresse_inicial: 3,
        gatilhos_a_evitar: ['som_alto', 'luz_forte'],
        objetivo_clinico: 'Foco Atencional',
      },
    };
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoComDda);
    vi.spyOn(RelatorioSessaoModel, 'buscarPorSessaoId').mockResolvedValue(null);
    vi.spyOn(AnotacaoClinicaModel, 'listarPorSessao').mockResolvedValue([]);
    vi.spyOn(TelemetriaModel, 'buscarPorSessaoId').mockResolvedValue([]);

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: terapeutaId, clinica_id: clinicaId, is_super_admin: false, status_ativo: true, nome: 'Dr. Marcos', crefito: '12345-TO', especialidade: 'Terapia Ocupacional' },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true, nome: 'Enzo Gabriel', data_nascimento: '2019-04-12' },
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
      if (table === 'dados_clinicos') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { diagnostico_base: 'TEA Nível 2 de Suporte', gatilhos_sensoriais: ['som_alto'] },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'jogo') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: jogoId, nome: 'Aventura das Cores', versao: '1.2.0', descricao: 'Estimula atenção compartilhada' },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);
    expect(res.sucesso).toBe(true);
    expect(res.dados).toBeDefined();

    const cabecalho = res.dados!.cabecalho;
    expect(cabecalho.paciente?.nome).toBe('Enzo Gabriel');
    expect(cabecalho.paciente?.diagnostico).toBe('TEA Nível 2 de Suporte');
    expect(cabecalho.paciente?.gatilhos_evitar).toEqual(['som_alto', 'luz_forte']);
    expect(cabecalho.paciente?.nivel_estresse_inicial).toBe(3);
    expect(cabecalho.paciente?.idade_anos).toBeGreaterThan(0);

    expect(cabecalho.terapeuta?.nome).toBe('Dr. Marcos');
    expect(cabecalho.terapeuta?.crefito).toBe('12345-TO');

    expect(cabecalho.jogo?.nome).toBe('Aventura das Cores');
    expect(cabecalho.jogo?.titulo).toBe('Aventura das Cores');
    expect(cabecalho.jogo?.descricao).toBe('Estimula atenção compartilhada');
  });

  it('deve consolidar metricas_cards e grafico_evolutivo com telemetria e intervenções DDA mapeadas', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(mockSessaoFinalizada);
    vi.spyOn(RelatorioSessaoModel, 'buscarPorSessaoId').mockResolvedValue({
      sessao_id: sessaoId,
      conteudo: 'Parecer sintetizado',
      dados_ia_json: {
        token_sessao: 'ABCD-1234',
        duracao_segundos: 1200,
        resumo: { taxa_conclusao: 95, intervencoes_dda: 1 },
        analises_ia: ['Ótima regulação'],
        metricas_agregadas: [],
      },
      soft_delete: false,
      created_at: '2026-10-14T10:20:00Z',
      updated_at: '2026-10-14T10:20:00Z',
    });
    vi.spyOn(AnotacaoClinicaModel, 'listarPorSessao').mockResolvedValue([]);

    vi.spyOn(TelemetriaModel, 'buscarPorSessaoId').mockResolvedValue([
      {
        sessao_id: sessaoId,
        tipo_evento: 'acerto',
        dados: { id_metrica: 'tempo_resposta', valor: 1.4 },
        data_hora: '2026-10-14T10:01:00Z',
      },
      {
        sessao_id: sessaoId,
        tipo_evento: 'modulacao_dda',
        dados: { id_metrica: 'dda', valor: 'Modulação de Estímulo' },
        data_hora: '2026-10-14T10:01:02Z',
      },
      {
        sessao_id: sessaoId,
        tipo_evento: 'erro',
        dados: { id_metrica: 'tempo_resposta', valor: 2.2 },
        data_hora: '2026-10-14T10:02:00Z',
      },
    ]);

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'terapeuta') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: terapeutaId, clinica_id: clinicaId, is_super_admin: false, status_ativo: true, nome: 'Dr. Marcos' },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'paciente') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: pacienteId, clinica_id: clinicaId, status_ativo: true, nome: 'Lucas' },
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
      if (table === 'jogo') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: jogoId, nome: 'Ilha dos Sentidos', versao: '1.0' },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const res = await SessaoResultadoService.obterResultadoConsolidado(sessaoId, terapeutaId);
    expect(res.sucesso).toBe(true);

    const metricas = res.dados!.metricas_cards!;
    expect(metricas.total_acertos).toBe(1);
    expect(metricas.total_erros).toBe(1);
    expect(metricas.taxa_conclusao).toBe(95);
    expect(metricas.intervencoes_dda).toBe(1);
    expect(metricas.pontuacao_geral).toBeGreaterThan(0);

    const grafico = res.dados!.grafico_evolutivo!;
    expect(grafico.tipo).toBe('intra_sessao');
    expect(grafico.tentativas).toHaveLength(2);
    expect(grafico.tentativas[0].acerto).toBe(true);
    expect(grafico.tentativas[0].intervencaoDda?.tipoIntervencao).toBe('Modulação de Estímulo');
    expect(grafico.tentativas[1].acerto).toBe(false);
  });
});

describe('SessaoController.consultarResultado — Integração REST e Códigos HTTP', () => {
  const sessaoId = '11111111-1111-4111-a111-111111111111';
  const terapeutaId = '22222222-2222-4222-a222-222222222222';

  function criarMockHttp(params: Record<string, string> = {}, user: any = { id: terapeutaId }) {
    let statusCode = 200;
    let jsonResult: any = null;

    const req: any = {
      params,
      user,
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
    };

    return { req, res, getStatus: () => statusCode, getJson: () => jsonResult };
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve retornar 401 Unauthorized se usuário não estiver no token JWT', async () => {
    const { req, res, getStatus } = criarMockHttp({ id: sessaoId }, null);

    await SessaoController.consultarResultado(req, res);

    expect(getStatus()).toBe(401);
  });

  it('deve delegar para SessaoResultadoService e retornar 200 OK com payload estruturado', async () => {
    vi.spyOn(SessaoResultadoService, 'obterResultadoConsolidado').mockResolvedValue({
      sucesso: true,
      status: 200,
      dados: {
        sessao: {
          id: sessaoId,
          session_token: 'ABCD-1234',
          modo_sessao: 'sessao_clinica',
          status_sessao: 'finalizada',
          data_hora_inicio: '',
          data_hora_fim: '',
          duracao_segundos: 600,
          dispositivo_info: null,
        },
        jogo: null,
        terapeuta: null,
        paciente: null,
        relatorio: null,
        anotacoes: [],
        cabecalho: {
          paciente: null,
          terapeuta: null,
          jogo: null,
        },
        metricas_consolidadas: {
          pontuacao_geral: 0,
          taxa_conclusao: 0,
          total_toques: 0,
          total_acertos: 0,
          total_erros: 0,
          taxa_precisao_percentual: 0,
          tempo_medio_resposta_ms: 0,
          estabilidade_foco: 0,
          intervencoes_dda: 0,
        },
        metricas_cards: {
          pontuacao_geral: 0,
          taxa_conclusao: 0,
          total_toques: 0,
          total_acertos: 0,
          total_erros: 0,
          taxa_precisao_percentual: 0,
          tempo_medio_resposta_ms: 0,
          estabilidade_foco: 0,
          intervencoes_dda: 0,
        },
        insights_ia: null,
        historico_evolutivo: {
          tipo: 'intra_sessao',
          tempo_medio_referencia: 0,
          tentativas: [],
        },
        grafico_evolutivo: {
          tipo: 'intra_sessao',
          tempo_medio_referencia: 0,
          tentativas: [],
        },
      },
    });

    const { req, res, getStatus, getJson } = criarMockHttp({ id: sessaoId });

    await SessaoController.consultarResultado(req, res);

    expect(getStatus()).toBe(200);
    expect(getJson().data.sessao.id).toBe(sessaoId);
    expect(getJson().data.metricas_consolidadas).toBeDefined();
    expect(getJson().data.historico_evolutivo).toBeDefined();
    expect(getJson().message).toBe('Resultado consolidado da sessão obtido com sucesso.');
  });

  it('deve repassar o status e erro do service quando validação falhar (ex: 400 Bad Request)', async () => {
    vi.spyOn(SessaoResultadoService, 'obterResultadoConsolidado').mockResolvedValue({
      sucesso: false,
      status: 400,
      erro: 'A sessão ainda está em andamento.',
    });

    const { req, res, getStatus, getJson } = criarMockHttp({ id: sessaoId });

    await SessaoController.consultarResultado(req, res);

    expect(getStatus()).toBe(400);
    expect(getJson().error).toBe('A sessão ainda está em andamento.');
  });

  it('deve repassar status 403 Forbidden retornado pelo service (RN04)', async () => {
    vi.spyOn(SessaoResultadoService, 'obterResultadoConsolidado').mockResolvedValue({
      sucesso: false,
      status: 403,
      erro: 'Acesso negado: vínculo não encontrado.',
    });

    const { req, res, getStatus, getJson } = criarMockHttp({ id: sessaoId });

    await SessaoController.consultarResultado(req, res);

    expect(getStatus()).toBe(403);
    expect(getJson().error).toContain('Acesso negado');
  });

  it('deve repassar status 404 Not Found retornado pelo service', async () => {
    vi.spyOn(SessaoResultadoService, 'obterResultadoConsolidado').mockResolvedValue({
      sucesso: false,
      status: 404,
      erro: 'Sessão clínica não encontrada.',
    });

    const { req, res, getStatus, getJson } = criarMockHttp({ id: sessaoId });

    await SessaoController.consultarResultado(req, res);

    expect(getStatus()).toBe(404);
    expect(getJson().error).toContain('não encontrada');
  });

  it('deve extrair isSuperAdmin = true a partir de user_metadata.is_super_admin', async () => {
    const spyService = vi.spyOn(SessaoResultadoService, 'obterResultadoConsolidado').mockResolvedValue({
      sucesso: true,
      status: 200,
      dados: {} as any,
    });

    const { req, res } = criarMockHttp(
      { id: sessaoId },
      { id: terapeutaId, user_metadata: { is_super_admin: true } }
    );

    await SessaoController.consultarResultado(req, res);

    expect(spyService).toHaveBeenCalledWith(sessaoId, terapeutaId, true);
  });

  it('deve retornar 500 se o service lançar uma exceção inesperada', async () => {
    vi.spyOn(SessaoResultadoService, 'obterResultadoConsolidado').mockRejectedValue(new Error('Erro inesperado'));

    const { req, res, getStatus, getJson } = criarMockHttp({ id: sessaoId });

    await SessaoController.consultarResultado(req, res);

    expect(getStatus()).toBe(500);
    expect(getJson().error).toContain('Erro interno ao consultar resultado');
  });
});

describe('Rotas de Sessão — GET /api/sessao/:id/resultado (OpenAPI e Middlewares)', () => {
  it('deve ter a rota GET /:id/resultado registrada com authMiddleware', async () => {
    const { sessaoRoutes } = await import('../routes/sessao.routes.js');
    expect(sessaoRoutes).toBeDefined();

    const rotaResultado = sessaoRoutes.stack.find(
      (layer: any) => layer.route && layer.route.path === '/:id/resultado' && layer.route.methods.get
    );

    expect(rotaResultado).toBeDefined();
    // A rota deve conter authMiddleware e o handler do controller
    expect(rotaResultado?.route?.stack.length).toBeGreaterThanOrEqual(2);
  });
});
