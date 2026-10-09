import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  SessaoExportarService,
  mascararCPF,
  calcularIdadeAnos,
  formatarDuracao,
  LaudoClinicoExportavel,
} from '../services/sessao-exportar.service.js';
import { Sessao, MODO_SESSAO, STATUS_SESSAO, SessaoModel } from '../models/sessao.model.js';
import { PacienteModel, Paciente } from '../../paciente/models/paciente.model.js';
import { TerapeutaModel, Terapeuta } from '../../terapeuta/models/terapeuta.model.js';
import { JogoModel } from '../../jogos/models/jogo.model.js';
import {
  TelemetriaAgregacaoService,
  TelemetriaConsolidada,
} from '../../telemetria/services/telemetria-agregacao.service.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

// Helper para mock de Request e Response do Express
function criarMocks(
  params: Record<string, string> = {},
  user: Record<string, unknown> | null = { id: '11111111-1111-4111-8111-111111111111' }
) {
  let statusCode = 200;
  let jsonResult: unknown = null;

  const mockReq = {
    params,
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

describe('Card 2.3 — Funções Auxiliares de Formatação e Sanitização (RNF06 / LGPD)', () => {
  it('mascararCPF: deve ocultar dígitos sensíveis do CPF para privacidade', () => {
    expect(mascararCPF(null)).toBe('Não informado');
    expect(mascararCPF('')).toBe('Não informado');
    expect(mascararCPF('12345678901')).toBe('***.456.***-01');
    expect(mascararCPF('123.456.789-01')).toBe('***.456.***-01');
    expect(mascararCPF('123')).toBe('***.***.***-**');
  });

  it('calcularIdadeAnos: deve calcular corretamente a idade em anos a partir da data de nascimento', () => {
    expect(calcularIdadeAnos('')).toBe(0);
    expect(calcularIdadeAnos('data-invalida')).toBe(0);

    const hoje = new Date();
    const anoNascimento = hoje.getFullYear() - 8;
    const mesNascimento = String(hoje.getMonth() + 1).padStart(2, '0');
    const diaNascimento = String(hoje.getDate()).padStart(2, '0');

    const idade = calcularIdadeAnos(`${anoNascimento}-${mesNascimento}-${diaNascimento}`);
    expect(idade).toBe(8);
  });

  it('formatarDuracao: deve converter segundos para texto humanizado', () => {
    expect(formatarDuracao(0)).toBe('0 min');
    expect(formatarDuracao(45)).toBe('45s');
    expect(formatarDuracao(1200)).toBe('20 min');
    expect(formatarDuracao(1230)).toBe('20 min 30s');
  });
});

describe('Card 2.3 — SessaoExportarService.gerarLaudoExportacao (Regras de Negócio e RN04)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sessaoIdValido = '11111111-1111-4111-8111-111111111111';
  const terapeutaIdValido = '22222222-2222-4222-8222-222222222222';
  const pacienteIdValido = '33333333-3333-4333-8333-333333333333';

  const sessaoFinalizadaMock: Sessao = {
    id: sessaoIdValido,
    terapeuta_id: terapeutaIdValido,
    paciente_id: pacienteIdValido,
    jogo_id: 'jogo-uuid-1',
    session_token: '849-291',
    modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
    contexto_dda_json: {
      nivel_estresse_inicial: 'medio',
      objetivo_clinico: 'foco_atencional',
    },
    dispositivo_info: null,
    status_sessao: STATUS_SESSAO.FINALIZADA,
    data_hora_inicio: '2026-10-08T10:00:00Z',
    expira_em: '2026-10-08T10:15:00Z',
    data_hora_fim: '2026-10-08T10:20:00Z',
    created_at: '2026-10-08T10:00:00Z',
    updated_at: '2026-10-08T10:20:00Z',
  };

  const pacienteMock: Paciente = {
    id: pacienteIdValido,
    nome: 'Enzo Gabriel Santos',
    data_nascimento: '2018-05-12',
    status_ativo: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    clinica_id: 'clinica-uuid-1',
    telefone: '(86) 99999-0000',
    cpf: '12345678901',
    cep: '64000-000',
    cidade: 'Teresina',
    estado: 'PI',
    endereco: 'Rua das Flores',
    bairro: 'Centro',
    numero: '123',
    complemento: null,
    responsaveis: [
      {
        responsavel: {
          nome: 'Maria Silva Santos',
          parentesco: 'Mãe',
          telefone: '(86) 99999-1111',
        },
      },
    ],
  };

  const terapeutaMock: Terapeuta = {
    id: terapeutaIdValido,
    nome: 'Dra. Carolina Mendes',
    email: 'carolina.mendes@intea.com.br',
    telefone: '(86) 98888-2222',
    crefito: 'CREFITO-12345-TO',
    registro_profissional: 'CREFITO-12345-TO',
    especialidade: 'Terapia Ocupacional e Integração Sensorial',
    tempo_experiencia_anos: 8,
    clinica_id: 'clinica-uuid-1',
    is_super_admin: false,
    status_ativo: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const telemetriaConsolidadaMock: TelemetriaConsolidada = {
    total_eventos: 30,
    duracao_estimada_segundos: 1200,
    contagem_por_tipo: { acerto: 25, erro: 5 },
    precisao: {
      total_toques: 30,
      total_acertos: 25,
      total_erros: 5,
      taxa_precisao_percentual: 83.3,
    },
    tempo_resposta: {
      total_amostras: 20,
      media: 2.1,
      mediana: 2.0,
      minimo: 1.0,
      maximo: 3.8,
      desvio_padrao: 0.5,
      unidade: 'segundos',
    },
    estabilidade_atencao: {
      indice_estabilidade: 88,
      classificacao: 'alta',
      coeficiente_variacao: 0.12,
      janelas: [],
    },
    metricas_agregadas: [
      {
        id_metrica: 'tempo_resposta',
        tipo_metrica: 'numerica',
        unidade: 'segundos',
        total_amostras: 20,
        media: 2.1,
        mediana: 2.0,
        minimo: 1.0,
        maximo: 3.8,
        desvio_padrao: 0.5,
        tendencia: 'estavel',
      },
    ],
    violacoes_rn02: [],
    data_hora_primeiro_evento: '2026-10-08T10:00:00Z',
    data_hora_ultimo_evento: '2026-10-08T10:20:00Z',
  };

  it('deve retornar 400 Bad Request se sessaoId for inválido (não for UUID)', async () => {
    const res = await SessaoExportarService.gerarLaudoExportacao('token-pin-invalido', { id: terapeutaIdValido });

    expect(res.sucesso).toBe(false);
    expect(res.statusHttp).toBe(400);
    expect(res.erro).toContain('UUID válido');
  });

  it('deve retornar 404 Not Found se a sessão não for encontrada', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(null);

    const res = await SessaoExportarService.gerarLaudoExportacao(sessaoIdValido, { id: terapeutaIdValido });

    expect(res.sucesso).toBe(false);
    expect(res.statusHttp).toBe(404);
    expect(res.erro).toContain('não encontrada');
  });

  it('deve retornar 400 Bad Request se a sessão ainda não estiver com status finalizada', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      ...sessaoFinalizadaMock,
      status_sessao: STATUS_SESSAO.EM_ANDAMENTO,
    });

    const res = await SessaoExportarService.gerarLaudoExportacao(sessaoIdValido, { id: terapeutaIdValido });

    expect(res.sucesso).toBe(false);
    expect(res.statusHttp).toBe(400);
    expect(res.erro).toContain('não está finalizada');
  });

  it('RN01: deve retornar 400 Bad Request se a sessão for em Modo Livre', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
      ...sessaoFinalizadaMock,
      modo_sessao: MODO_SESSAO.MODO_LIVRE,
      paciente_id: null,
    });

    const res = await SessaoExportarService.gerarLaudoExportacao(sessaoIdValido, { id: terapeutaIdValido });

    expect(res.sucesso).toBe(false);
    expect(res.statusHttp).toBe(400);
    expect(res.erro).toContain('RN01');
  });

  it('RN04: deve retornar 403 Forbidden se terapeuta não for o dono nem tiver vínculo institucional', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoFinalizadaMock);

    // Mock do Supabase para busca na tabela associativa terapeuta_paciente retornando vazio
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    const res = await SessaoExportarService.gerarLaudoExportacao(sessaoIdValido, {
      id: 'outro-terapeuta-sem-acesso',
      user_metadata: { is_super_admin: false },
    });

    expect(res.sucesso).toBe(false);
    expect(res.statusHttp).toBe(403);
    expect(res.erro).toContain('RN04');
  });

  it('RN04: deve permitir exportação se terapeuta não for o autor da sessão mas possuir vínculo ativo com o paciente', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoFinalizadaMock);
    vi.spyOn(SessaoExportarService, 'verificarVinculoInstitucional').mockResolvedValue(true);
    vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue(pacienteMock);
    vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue(terapeutaMock);
    vi.spyOn(TelemetriaAgregacaoService, 'compilarPorSessaoId').mockResolvedValue(telemetriaConsolidadaMock);

    const res = await SessaoExportarService.gerarLaudoExportacao(sessaoIdValido, {
      id: 'outro-terapeuta-com-vinculo',
      user_metadata: { is_super_admin: false },
    });

    expect(res.sucesso).toBe(true);
    expect(res.statusHttp).toBe(200);
    expect(res.dados).toBeDefined();
  });

  it('deve gerar o laudo clínico completo (200 OK) para o terapeuta autor da sessão', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoFinalizadaMock);
    vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue(pacienteMock);
    vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue(terapeutaMock);
    vi.spyOn(JogoModel, 'buscarPorId').mockResolvedValue({
      id: 'jogo-uuid-1',
      nome: 'Labirinto Cognitivo Sensorial',
      descricao: 'Teste',
      versao: '1.2.0',
      status_instalacao: 'instalado',
      manifesto_json: {
        id_jogo: 'jogo-uuid-1',
        nome: 'Labirinto Cognitivo Sensorial',
        versao: '1.2.0',
        metricas_suportadas: [],
      },
    });
    vi.spyOn(TelemetriaAgregacaoService, 'compilarPorSessaoId').mockResolvedValue(telemetriaConsolidadaMock);

    const res = await SessaoExportarService.gerarLaudoExportacao(sessaoIdValido, { id: terapeutaIdValido });

    expect(res.sucesso).toBe(true);
    expect(res.statusHttp).toBe(200);
    expect(res.dados).toBeDefined();

    const laudo = res.dados as LaudoClinicoExportavel;

    // Cabeçalho e Autenticidade
    expect(laudo.cabecalho.codigo_autenticidade).toContain('INTEA-LAUDO-');
    expect(laudo.cabecalho.emissao_em).toBeDefined();

    // Paciente com CPF mascarado (LGPD)
    expect(laudo.paciente.nome).toBe('Enzo Gabriel Santos');
    expect(laudo.paciente.cpf_mascarado).toBe('***.456.***-01');
    expect(laudo.paciente.idade_anos).toBeGreaterThan(0);
    expect(laudo.paciente.responsavel_legal?.nome).toBe('Maria Silva Santos');

    // Terapeuta com registro profissional
    expect(laudo.terapeuta.nome).toBe('Dra. Carolina Mendes');
    expect(laudo.terapeuta.registro_profissional).toBe('CREFITO-12345-TO');

    // Sessão
    expect(laudo.sessao.token_pareamento).toBe('849-291');
    expect(laudo.sessao.duracao_segundos).toBe(1200);
    expect(laudo.sessao.duracao_formatada).toBe('20 min');
    expect(laudo.sessao.jogo.nome).toBe('Labirinto Cognitivo Sensorial');

    // Desempenho e Tabela de Métricas
    expect(laudo.desempenho_clinico.tempo_resposta_medio).toBe(2.1);
    expect(laudo.desempenho_clinico.taxa_precisao_percentual).toBe(83.3);
    expect(laudo.desempenho_clinico.metricas_tabela.length).toBeGreaterThan(0);

    // Parecer da IA
    expect(laudo.parecer_ia.motor_ia).toBe('InTEA AI Contextual Engine (DDA)');
    expect(laudo.parecer_ia.sintese_analises.length).toBeGreaterThan(0);

    // Assinatura e Carimbo
    expect(laudo.assinatura_formal.terapeuta_responsavel).toBe('Dra. Carolina Mendes');
    expect(laudo.assinatura_formal.registro_conselho).toBe('CREFITO-12345-TO');
  });

  it('deve permitir exportação por super admin mesmo que não seja o autor direto', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoFinalizadaMock);
    vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue(pacienteMock);
    vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue(terapeutaMock);
    vi.spyOn(TelemetriaAgregacaoService, 'compilarPorSessaoId').mockResolvedValue(telemetriaConsolidadaMock);

    const res = await SessaoExportarService.gerarLaudoExportacao(sessaoIdValido, {
      id: 'super-admin-uuid',
      user_metadata: { is_super_admin: true },
    });

    expect(res.sucesso).toBe(true);
    expect(res.statusHttp).toBe(200);
    expect(res.dados).toBeDefined();
  });
});

describe('Card 2.3 — SessaoExportarService.handlerExportarHttp (Controller Express)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve responder com status HTTP correspondente e payload JSON em sucesso', async () => {
    vi.spyOn(SessaoExportarService, 'gerarLaudoExportacao').mockResolvedValue({
      sucesso: true,
      statusHttp: 200,
      dados: {
        cabecalho: {
          instituicao: 'Clínica InTEA',
          cnpj_clinica: '00.000.000/0001-00',
          emissao_em: new Date().toISOString(),
          codigo_autenticidade: 'AUT-123',
        },
      } as unknown as LaudoClinicoExportavel,
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({ id: '11111111-1111-4111-8111-111111111111' });

    await SessaoExportarService.handlerExportarHttp(mockReq, mockRes);

    expect(getStatus()).toBe(200);
    const json = getJson() as { data: LaudoClinicoExportavel };
    expect(json.data).toBeDefined();
    expect(json.data.cabecalho.codigo_autenticidade).toBe('AUT-123');
  });

  it('deve responder com status de erro quando a validação de regras falhar', async () => {
    vi.spyOn(SessaoExportarService, 'gerarLaudoExportacao').mockResolvedValue({
      sucesso: false,
      statusHttp: 403,
      erro: 'Acesso negado (RN04)',
    });

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({ id: '11111111-1111-4111-8111-111111111111' });

    await SessaoExportarService.handlerExportarHttp(mockReq, mockRes);

    expect(getStatus()).toBe(403);
    const json = getJson() as { error: string };
    expect(json.error).toContain('RN04');
  });

  it('deve responder com 500 se o serviço lançar uma exceção não tratada', async () => {
    vi.spyOn(SessaoExportarService, 'gerarLaudoExportacao').mockRejectedValue(new Error('Falha catastrófica'));

    const { mockReq, mockRes, getStatus, getJson } = criarMocks({ id: '11111111-1111-4111-8111-111111111111' });

    await SessaoExportarService.handlerExportarHttp(mockReq, mockRes);

    expect(getStatus()).toBe(500);
    const json = getJson() as { error: string };
    expect(json.error).toContain('Erro interno ao emitir laudo');
  });
});

describe('Card 2.4 — Validação Estrita de Schema Zod e Conformidade de Exportação (RF20 / RNF06)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(TelemetriaAgregacaoService, 'compilarPorSessaoId').mockResolvedValue({
      total_eventos: 15,
      duracao_estimada_segundos: 1500,
      contagem_por_tipo: { acerto: 15 },
      precisao: { total_toques: 15, total_acertos: 15, total_erros: 0, taxa_precisao_percentual: 100 },
      tempo_resposta: { total_amostras: 15, media: 1.5, mediana: 1.5, minimo: 1.0, maximo: 2.0, desvio_padrao: 0.2, unidade: 'segundos' },
      estabilidade_atencao: { indice_estabilidade: 95, classificacao: 'alta', coeficiente_variacao: 0.05, janelas: [] },
      metricas_agregadas: [],
      violacoes_rn02: [],
      data_hora_primeiro_evento: '2026-10-08T14:00:00Z',
      data_hora_ultimo_evento: '2026-10-08T14:25:00Z',
    });
  });

  const laudoClinicoZodSchema = z
    .object({
      cabecalho: z.object({
        instituicao: z.string().min(1),
        cnpj_clinica: z.string(),
        emissao_em: z.string(),
        codigo_autenticidade: z.string().regex(/^INTEA-LAUDO-/),
      }),
      paciente: z.object({
        id: z.string().uuid(),
        nome: z.string().min(1),
        data_nascimento: z.string(),
        idade_anos: z.number().int().nonnegative(),
        cpf_mascarado: z.string(),
        diagnostico_base: z.string().min(1),
        responsavel_legal: z
          .object({
            nome: z.string(),
            parentesco: z.string().optional(),
            telefone: z.string().optional(),
          })
          .nullable(),
      }),
      terapeuta: z.object({
        id: z.string().uuid(),
        nome: z.string().min(1),
        registro_profissional: z.string().min(1),
        especialidade: z.string().min(1),
        email_contato: z.string(),
      }),
      sessao: z.object({
        id: z.string().uuid(),
        token_pareamento: z.string(),
        jogo: z.object({
          nome: z.string().min(1),
          versao: z.string().min(1),
        }),
        data_hora_inicio: z.string(),
        data_hora_fim: z.string(),
        duracao_segundos: z.number().int().nonnegative(),
        duracao_formatada: z.string(),
        modo: z.string(),
      }),
      desempenho_clinico: z.object({
        taxa_conclusao: z.number().min(0).max(100),
        intervencoes_dda: z.number().int().nonnegative(),
        taxa_precisao_percentual: z.number().min(0).max(100),
        total_toques: z.number().int().nonnegative(),
        total_acertos: z.number().int().nonnegative(),
        total_erros: z.number().int().nonnegative(),
        tempo_resposta_medio: z.number().nonnegative(),
        estabilidade_atencao: z.object({
          indice: z.number().min(0).max(100),
          classificacao: z.string(),
        }),
        metricas_tabela: z.array(
          z.object({
            indicador: z.string(),
            tipo: z.string(),
            valor: z.union([z.string(), z.number()]),
            tendencia: z.string(),
          })
        ),
      }),
      parecer_ia: z.object({
        sintese_analises: z.array(z.string()).min(1),
        motor_ia: z.string(),
      }),
      observacoes_clinicas: z.string().nullable(),
      assinatura_formal: z.object({
        termo_responsabilidade: z.string(),
        terapeuta_responsavel: z.string(),
        registro_conselho: z.string(),
        linha_assinatura: z.string(),
      }),
    })
    .strict();

  const sessaoMock: Sessao = {
    id: '55555555-5555-4555-8555-555555555555',
    terapeuta_id: '66666666-6666-4666-8666-666666666666',
    paciente_id: '77777777-7777-4777-8777-777777777777',
    jogo_id: 'game-uuid-99',
    session_token: '999-888',
    modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
    contexto_dda_json: {},
    dispositivo_info: null,
    status_sessao: STATUS_SESSAO.FINALIZADA,
    data_hora_inicio: '2026-10-08T14:00:00Z',
    expira_em: '2026-10-08T14:15:00Z',
    data_hora_fim: '2026-10-08T14:25:00Z',
    created_at: '2026-10-08T14:00:00Z',
    updated_at: '2026-10-08T14:25:00Z',
  };

  const pacienteMock: Paciente = {
    id: '77777777-7777-4777-8777-777777777777',
    nome: 'Clarice Lispector Silva',
    data_nascimento: '2017-03-10',
    telefone: '(86) 99999-8888',
    cpf: '98765432100',
    cep: '64000-000',
    cidade: 'Teresina',
    estado: 'PI',
    endereco: 'Rua das Letras',
    bairro: 'Centro',
    numero: '456',
    complemento: null,
    status_ativo: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    clinica_id: 'clinica-uuid-99',
    responsaveis: [],
  };

  const terapeutaMock: Terapeuta = {
    id: '66666666-6666-4666-8666-666666666666',
    nome: 'Dr. Roberto Freire',
    email: 'roberto@intea.com.br',
    telefone: '(86) 98888-7777',
    crefito: 'CREFITO-9988-TO',
    registro_profissional: 'CREFITO-9988-TO',
    especialidade: 'Psicologia Comportamental',
    tempo_experiencia_anos: 12,
    clinica_id: 'clinica-uuid-99',
    is_super_admin: false,
    status_ativo: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('conformidade Zod: laudo gerado em caso de sucesso passa com 100% de precisão no schema estrito', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoMock);
    vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue(pacienteMock);
    vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue(terapeutaMock);
    vi.spyOn(TelemetriaAgregacaoService, 'compilarPorSessaoId').mockResolvedValue({
      total_eventos: 15,
      duracao_estimada_segundos: 1500,
      contagem_por_tipo: { acerto: 15 },
      precisao: { total_toques: 15, total_acertos: 15, total_erros: 0, taxa_precisao_percentual: 100 },
      tempo_resposta: { total_amostras: 15, media: 1.5, mediana: 1.5, minimo: 1.0, maximo: 2.0, desvio_padrao: 0.2, unidade: 'segundos' },
      estabilidade_atencao: { indice_estabilidade: 95, classificacao: 'alta', coeficiente_variacao: 0.05, janelas: [] },
      metricas_agregadas: [],
      violacoes_rn02: [],
      data_hora_primeiro_evento: '2026-10-08T14:00:00Z',
      data_hora_ultimo_evento: '2026-10-08T14:25:00Z',
    });

    const res = await SessaoExportarService.gerarLaudoExportacao(sessaoMock.id, { id: terapeutaMock.id });

    expect(res.sucesso).toBe(true);
    expect(res.statusHttp).toBe(200);

    const validacao = laudoClinicoZodSchema.safeParse(res.dados);
    expect(validacao.success).toBe(true);
  });

  it('RNF06 / LGPD: protege dados sensíveis do paciente mascarando CPF e omitindo credenciais', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoMock);
    vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue(pacienteMock);
    vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue(terapeutaMock);

    const res = await SessaoExportarService.gerarLaudoExportacao(sessaoMock.id, { id: terapeutaMock.id });

    expect(res.sucesso).toBe(true);
    const laudo = res.dados as LaudoClinicoExportavel;

    // CPF deve estar estritamente no padrão mascarado: ***.XXX.***-XX
    expect(laudo.paciente.cpf_mascarado).toBe('***.654.***-00');

    // Nenhuma chave privada ou URL interna deve estar presente no payload serializado
    const payloadJson = JSON.stringify(laudo);
    expect(payloadJson).not.toContain('supabase');
    expect(payloadJson).not.toContain('service_role');
    expect(payloadJson).not.toContain('jwt');
  });

  it('deve lidar com ausência de responsáveis legais retornando responsavel_legal como null', async () => {
    vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(sessaoMock);
    vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue({
      ...pacienteMock,
      responsaveis: [],
    });
    vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue(terapeutaMock);

    const res = await SessaoExportarService.gerarLaudoExportacao(sessaoMock.id, { id: terapeutaMock.id });

    expect(res.sucesso).toBe(true);
    expect(res.dados?.paciente.responsavel_legal).toBeNull();
  });

  it('deve converter tempos e durações extremas com formatação consistente', () => {
    expect(formatarDuracao(1)).toBe('1s');
    expect(formatarDuracao(59)).toBe('59s');
    expect(formatarDuracao(60)).toBe('1 min');
    expect(formatarDuracao(3665)).toBe('61 min 5s');
  });
});
