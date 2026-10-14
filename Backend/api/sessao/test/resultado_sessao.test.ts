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
      },
    });

    const { req, res, getStatus, getJson } = criarMockHttp({ id: sessaoId });

    await SessaoController.consultarResultado(req, res);

    expect(getStatus()).toBe(200);
    expect(getJson().data.sessao.id).toBe(sessaoId);
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
});
