// ==============================================================================
// InTEA: Testes Automatizados de Contexto Clínico Pré-Sessão DDA e RN03
// ==============================================================================
// Conformidade: RF12, RF17, RF21, RN01, RN03, RN04, RNF02
// Contrato 2: docs/ModelosDeContratos/contextoPreSessao.json
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessaoContextoDdaService } from '../services/sessao-contexto-dda.service.js';
import { SessaoController } from '../controllers/sessao.controller.js';
import { SessaoModel, STATUS_SESSAO, MODO_SESSAO } from '../models/sessao.model.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

describe('SessaoContextoDdaService — Validação e Normalização (Contrato 2 / RN01 / RN03)', () => {
  const pacienteId = '22222222-2222-4222-a222-222222222222';
  const jogoId = '33333333-3333-4333-a333-333333333333';
  const terapeutaId = '11111111-1111-4111-a111-111111111111';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('validarENormalizarEstresse', () => {
    it('deve mapear deterministicamente valores numéricos de 1 a 5 para a escala canônica', () => {
      expect(SessaoContextoDdaService.validarENormalizarEstresse(1)).toBe('baixo');
      expect(SessaoContextoDdaService.validarENormalizarEstresse(2)).toBe('baixo');
      expect(SessaoContextoDdaService.validarENormalizarEstresse(3)).toBe('medio');
      expect(SessaoContextoDdaService.validarENormalizarEstresse(4)).toBe('alto');
      expect(SessaoContextoDdaService.validarENormalizarEstresse(5)).toBe('alto');
    });

    it('deve aceitar strings diretas válidas e insensíveis a maiúsculas/acentos', () => {
      expect(SessaoContextoDdaService.validarENormalizarEstresse('baixo')).toBe('baixo');
      expect(SessaoContextoDdaService.validarENormalizarEstresse('BAIXO')).toBe('baixo');
      expect(SessaoContextoDdaService.validarENormalizarEstresse('medio')).toBe('medio');
      expect(SessaoContextoDdaService.validarENormalizarEstresse('médio')).toBe('medio');
      expect(SessaoContextoDdaService.validarENormalizarEstresse('alto')).toBe('alto');
      expect(SessaoContextoDdaService.validarENormalizarEstresse('2')).toBe('baixo');
      expect(SessaoContextoDdaService.validarENormalizarEstresse('3')).toBe('medio');
      expect(SessaoContextoDdaService.validarENormalizarEstresse('5')).toBe('alto');
    });

    it('deve rejeitar valores numéricos fora do domínio permitido de 1 a 5', () => {
      expect(() => SessaoContextoDdaService.validarENormalizarEstresse(0)).toThrow(/domínio permitido é de 1 a 5/i);
      expect(() => SessaoContextoDdaService.validarENormalizarEstresse(6)).toThrow(/domínio permitido é de 1 a 5/i);
      expect(() => SessaoContextoDdaService.validarENormalizarEstresse(-1)).toThrow(/domínio permitido é de 1 a 5/i);
    });

    it('deve rejeitar strings e tipos inválidos com mensagem de erro clara', () => {
      expect(() => SessaoContextoDdaService.validarENormalizarEstresse('extremo')).toThrow(/Nível de estresse inicial inválido/i);
      expect(() => SessaoContextoDdaService.validarENormalizarEstresse('')).toThrow(/é obrigatório/i);
      expect(() => SessaoContextoDdaService.validarENormalizarEstresse(null)).toThrow(/é obrigatório/i);
      expect(() => SessaoContextoDdaService.validarENormalizarEstresse(undefined)).toThrow(/é obrigatório/i);
    });
  });

  describe('validarGatilhos', () => {
    it('deve sanitizar array de strings, removendo espaços e duplicatas', () => {
      const entrada = ['  luz_piscante ', 'som_agudo', 'luz_piscante', '  '];
      const resultado = SessaoContextoDdaService.validarGatilhos(entrada);
      expect(resultado).toEqual(['luz_piscante', 'som_agudo']);
    });

    it('deve aceitar string única e converter para array', () => {
      expect(SessaoContextoDdaService.validarGatilhos('luz_piscante')).toEqual(['luz_piscante']);
    });

    it('deve retornar array vazio para entradas nulas ou indefinidas', () => {
      expect(SessaoContextoDdaService.validarGatilhos(null)).toEqual([]);
      expect(SessaoContextoDdaService.validarGatilhos(undefined)).toEqual([]);
    });
  });

  describe('validarEFormatarContexto (Regras RN01 e Fallback)', () => {
    it('RN01: deve lançar erro se tentar injetar contexto clínico em modo_livre', async () => {
      await expect(
        SessaoContextoDdaService.validarEFormatarContexto(
          { nivel_estresse_inicial: 3 },
          null,
          jogoId,
          MODO_SESSAO.MODO_LIVRE
        )
      ).rejects.toThrow(/Partidas em modo livre não admitem calibração de contexto clínico DDA/i);
    });

    it('RN01: deve retornar null quando sessão for em modo_livre sem contexto', async () => {
      const res = await SessaoContextoDdaService.validarEFormatarContexto(
        {},
        null,
        jogoId,
        MODO_SESSAO.MODO_LIVRE
      );
      expect(res).toBeNull();
    });

    it('deve formatar contexto customizado completo para sessão clínica', async () => {
      const res = await SessaoContextoDdaService.validarEFormatarContexto(
        {
          nivel_estresse_inicial: 4,
          gatilhos_sensoriais_evitar: ['luz_forte', 'toque_inesperado'],
          objetivo_clinico: 'regulacao_emocional',
        },
        pacienteId,
        jogoId,
        MODO_SESSAO.SESSAO_CLINICA
      );

      expect(res).toEqual({
        nivel_estresse_inicial: 'alto',
        gatilhos_sensoriais_evitar: ['luz_forte', 'toque_inesperado'],
        objetivo_clinico: 'regulacao_emocional',
      });
    });

    it('deve acionar o Fallback Clínico Parametrizado (Figura 5) quando usar_fallback_padrao for true', async () => {
      vi.spyOn(SessaoContextoDdaService, 'obterGatilhosPaciente').mockResolvedValue(['luz_piscante', 'som_alto']);
      vi.spyOn(SessaoContextoDdaService, 'obterObjetivoPadraoJogo').mockResolvedValue('coordenacao_motora');

      const res = await SessaoContextoDdaService.validarEFormatarContexto(
        { usar_fallback_padrao: true },
        pacienteId,
        jogoId,
        MODO_SESSAO.SESSAO_CLINICA
      );

      expect(res).toEqual({
        nivel_estresse_inicial: 'baixo',
        gatilhos_sensoriais_evitar: ['luz_piscante', 'som_alto'],
        objetivo_clinico: 'coordenacao_motora',
      });
    });
  });

  describe('montarPacoteContrato2', () => {
    it('deve montar o pacote exato do Contrato 2 (contextoPreSessao.json)', () => {
      const contextoFormatado = {
        nivel_estresse_inicial: 'medio' as const,
        gatilhos_sensoriais_evitar: ['luz_piscante', 'som_agudo'],
        objetivo_clinico: 'foco_atencional',
      };

      const pacote = SessaoContextoDdaService.montarPacoteContrato2(
        '4M5S-8U7B',
        terapeutaId,
        pacienteId,
        contextoFormatado
      );

      expect(pacote).toEqual({
        token_sessao: '4M5S-8U7B',
        id_terapeuta: terapeutaId,
        id_paciente: pacienteId,
        contexto_paciente: {
          nivel_estresse_inicial: 'medio',
          gatilhos_sensoriais_evitar: ['luz_piscante', 'som_agudo'],
          objetivo_clinico: 'foco_atencional',
        },
      });
    });

    it('deve retornar null se contextoPaciente for nulo (modo livre)', () => {
      expect(SessaoContextoDdaService.montarPacoteContrato2('TOKEN', terapeutaId, null, null)).toBeNull();
    });
  });
});

describe('SessaoController — Iniciar, Parear e Sugestão DDA (Integração HTTP / RN03 / Contrato 2)', () => {
  const pacienteId = '22222222-2222-4222-a222-222222222222';
  const jogoId = '33333333-3333-4333-a333-333333333333';
  const outroJogoId = '44444444-4444-4444-a444-444444444444';
  const terapeutaId = '11111111-1111-4111-a111-111111111111';
  const sessaoId = '55555555-5555-4555-a555-555555555555';

  function criarMocks(body: Record<string, unknown> = {}, params: Record<string, string> = {}, user: { id: string } = { id: terapeutaId }) {
    let statusCode = 200;
    let jsonData: unknown = null;

    const mockReq = {
      body,
      params,
      user,
      headers: {},
      ip: '127.0.0.1',
    } as any;

    const mockRes = {
      status(code: number) {
        statusCode = code;
        return mockRes;
      },
      json(data: unknown) {
        jsonData = data;
        return mockRes;
      },
    } as any;

    return {
      mockReq,
      mockRes,
      getStatus: () => statusCode,
      getJson: () => jsonData,
    };
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/sessao/iniciar — Injeção de Contexto DDA (Contrato 2)', () => {
    it('deve iniciar sessão clínica com contexto normalizado e retornar pacote do Contrato 2 (201 Created)', async () => {
      vi.spyOn(SessaoModel, 'criar').mockResolvedValue({
        id: sessaoId,
        session_token: '4M5S-8U7B',
        status_sessao: STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
        modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
        paciente_id: pacienteId,
        terapeuta_id: terapeutaId,
        jogo_id: jogoId,
        data_hora_inicio: new Date().toISOString(),
        expira_em: new Date(Date.now() + 15 * 60000).toISOString(),
        contexto_dda_json: {
          nivel_estresse_inicial: 'medio',
          gatilhos_sensoriais_evitar: ['luz_piscante'],
          objetivo_clinico: 'foco_atencional',
        },
      } as any);

      const { mockReq, mockRes, getStatus, getJson } = criarMocks({
        jogo_id: jogoId,
        codigo_pareamento: '4M5S-8U7B',
        modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
        paciente_id: pacienteId,
        nivel_estresse_inicial: 3,
        gatilhos_sensoriais_evitar: ['luz_piscante'],
        objetivo_clinico: 'foco_atencional',
      });

      await SessaoController.iniciar(mockReq, mockRes);

      expect(getStatus()).toBe(201);
      const json = getJson() as any;
      expect(json.data.contexto_pre_sessao).toBeDefined();
      expect(json.data.contexto_pre_sessao.contexto_paciente.nivel_estresse_inicial).toBe('medio');
      expect(json.data.contexto_pre_sessao.contexto_paciente.gatilhos_sensoriais_evitar).toEqual(['luz_piscante']);
      expect(json.data.contexto_pre_sessao.contexto_paciente.objetivo_clinico).toBe('foco_atencional');
    });

    it('deve rejeitar com 400 Bad Request se nivel_estresse_inicial for inválido', async () => {
      const { mockReq, mockRes, getStatus, getJson } = criarMocks({
        jogo_id: jogoId,
        codigo_pareamento: '4M5S-8U7B',
        modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
        paciente_id: pacienteId,
        nivel_estresse_inicial: 9, // Fora de 1..5
      });

      await SessaoController.iniciar(mockReq, mockRes);

      expect(getStatus()).toBe(400);
      expect((getJson() as any).error).toMatch(/estresse/i);
    });

    it('RN01: deve rejeitar com 400 Bad Request tentativas de injetar contexto em modo_livre', async () => {
      const { mockReq, mockRes, getStatus, getJson } = criarMocks({
        jogo_id: jogoId,
        codigo_pareamento: '4M5S-8U7B',
        modo_sessao: MODO_SESSAO.MODO_LIVRE,
        nivel_estresse_inicial: 2,
      });

      await SessaoController.iniciar(mockReq, mockRes);

      expect(getStatus()).toBe(400);
      expect((getJson() as any).error).toMatch(/RN01/i);
    });
  });

  describe('POST /api/sessao/parear — Validação de Jogo e Envio de Pré-Contexto ao Game (RN03)', () => {
    it('deve rejeitar com 409 Conflict quando o jogo a ser pareado for diferente do selecionado na sessão', async () => {
      vi.spyOn(SessaoModel, 'buscarPorToken').mockResolvedValue({
        id: sessaoId,
        session_token: '4M5S-8U7B',
        status_sessao: STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
        jogo_id: jogoId,
        expira_em: new Date(Date.now() + 10 * 60000).toISOString(),
      } as any);

      const { mockReq, mockRes, getStatus, getJson } = criarMocks({
        session_token: '4M5S-8U7B',
        jogo_id: outroJogoId, // Jogo divergente
      });

      await SessaoController.parear(mockReq, mockRes);

      expect(getStatus()).toBe(409);
      expect((getJson() as any).error).toContain('não corresponde ao jogo selecionado');
    });

    it('RN03: deve entregar o contexto pré-sessão do Contrato 2 diretamente na resposta de pareamento do game', async () => {
      const sessaoMock = {
        id: sessaoId,
        session_token: '4M5S-8U7B',
        status_sessao: STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
        modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
        paciente_id: pacienteId,
        terapeuta_id: terapeutaId,
        jogo_id: jogoId,
        expira_em: new Date(Date.now() + 10 * 60000).toISOString(),
        contexto_dda_json: {
          nivel_estresse_inicial: 'baixo',
          gatilhos_sensoriais_evitar: ['luz_piscante'],
          objetivo_clinico: 'foco_atencional',
        },
      };

      vi.spyOn(SessaoModel, 'buscarPorToken').mockResolvedValue(sessaoMock as any);
      vi.spyOn(SessaoModel, 'parearDispositivo').mockResolvedValue({
        ...sessaoMock,
        status_sessao: STATUS_SESSAO.EM_ANDAMENTO,
        data_hora_inicio: new Date().toISOString(),
      } as any);

      const { mockReq, mockRes, getStatus, getJson } = criarMocks({
        session_token: '4M5S-8U7B',
        jogo_id: jogoId, // Mesmo jogo
        dispositivo_info: { tipo_dispositivo: 'tablet', modelo: 'iPad Air' },
      });

      await SessaoController.parear(mockReq, mockRes);

      expect(getStatus()).toBe(200);
      const json = getJson() as any;
      expect(json.data.contexto_pre_sessao).toBeDefined();
      expect(json.data.contexto_pre_sessao.token_sessao).toBe('4M5S-8U7B');
      expect(json.data.contexto_pre_sessao.contexto_paciente.nivel_estresse_inicial).toBe('baixo');
      expect(json.data.contexto_pre_sessao.contexto_paciente.gatilhos_sensoriais_evitar).toEqual(['luz_piscante']);
    });
  });

  describe('GET /api/sessao/contexto-sugerido/:pacienteId', () => {
    it('deve retornar 200 OK com as sugestões clínicas de gatilhos e estresse para o paciente', async () => {
      vi.spyOn(SessaoContextoDdaService, 'obterContextoSugerido').mockResolvedValue({
        nivel_estresse_sugerido: 'baixo',
        gatilhos_sensoriais_cadastrados: ['som_agudo', 'toque_repentino'],
        objetivo_clinico_sugerido: 'foco_atencional',
        origem: 'anamnese_padrao',
      });

      const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { pacienteId });

      await SessaoController.obterContextoSugerido(mockReq, mockRes);

      expect(getStatus()).toBe(200);
      const json = getJson() as any;
      expect(json.data.sugestao_contexto.nivel_estresse_sugerido).toBe('baixo');
      expect(json.data.sugestao_contexto.gatilhos_sensoriais_cadastrados).toEqual(['som_agudo', 'toque_repentino']);
    });

    it('deve retornar 400 Bad Request para pacienteId que não seja UUID válido', async () => {
      const { mockReq, mockRes, getStatus } = criarMocks({}, { pacienteId: 'invalido-123' });

      await SessaoController.obterContextoSugerido(mockReq, mockRes);

      expect(getStatus()).toBe(400);
    });
  });
});
