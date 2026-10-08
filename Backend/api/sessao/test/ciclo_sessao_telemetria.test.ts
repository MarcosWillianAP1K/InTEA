// ==============================================================================
// InTEA: Suíte Integrada End-to-End de Ciclo de Sessão e Telemetria (Sprint 9 - Task 1.4)
// ==============================================================================
// Cobertura Integral dos Critérios de Aceite:
// 1. Ciclo Clínico Completo (iniciar -> parear -> telemetria -> finalizar -> IA -> auditoria)
// 2. Ciclo de Modo Livre (RN01: sem paciente, telemetria suprimida, sem relatório IA)
// 3. Máquina de Estados e Guardas (409 telemetria inativa, 400 finalização inválida)
// 4. Isolamento Institucional por Vínculo (RN04: 403 Forbidden em telemetria e auditoria)
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessaoController } from '../controllers/sessao.controller.js';
import { SessaoModel, STATUS_SESSAO, MODO_SESSAO, Sessao } from '../models/sessao.model.js';
import { RelatorioSessaoModel } from '../models/relatorio.model.js';
import { TelemetriaController } from '../../telemetria/controllers/telemetria.controller.js';
import { TelemetriaModel, TelemetriaEvento } from '../../telemetria/models/telemetria.model.js';
import { AuditoriaController } from '../../auditoria/controllers/auditoria.controller.js';
import { AuditoriaModel, AuditoriaSessao } from '../../auditoria/models/auditoria.model.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

function criarMocks(
  body: Record<string, unknown> = {},
  params: Record<string, string> = {},
  query: Record<string, string> = {},
  user: Record<string, unknown> | null = { id: '22222222-2222-4222-a222-222222222222' }
) {
  let statusCode = 200;
  let jsonResult: unknown = null;

  const mockReq = { body, params, query, user, headers: { 'user-agent': 'Vitest-E2E-Agent' } } as unknown as import('express').Request;
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

describe('Task 1.4: Suíte Integrada de Ciclo de Sessão e Telemetria', () => {
  const sessaoId = '11111111-1111-4111-a111-111111111111';
  const terapeutaId = '22222222-2222-4222-a222-222222222222';
  const pacienteId = '33333333-3333-4333-a333-333333333333';
  const jogoId = '44444444-4444-4444-a444-444444444444';
  const sessionToken = 'INTEA-9988';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ----------------------------------------------------------------------------
  // CENÁRIO 1: CICLO CLÍNICO COMPLETO (CAMINHO FELIZ)
  // ----------------------------------------------------------------------------
  describe('Cenário 1: Ciclo Clínico Completo com IA e Auditoria', () => {
    it('deve orquestrar com sucesso: criação -> pareamento -> telemetria contínua -> encerramento -> IA -> auditoria', async () => {
      // 1. Estado Inicial da Sessão: criada e aguardando pareamento
      let estadoSessao: Sessao = {
        id: sessaoId,
        terapeuta_id: terapeutaId,
        paciente_id: pacienteId,
        jogo_id: jogoId,
        modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
        status_sessao: STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
        session_token: sessionToken,
        data_hora_inicio: new Date().toISOString(),
        data_hora_fim: null,
        contexto_dda_json: { nivel_dificuldade: 1 },
        dispositivo_info: null,
        expira_em: new Date(Date.now() + 600000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const bancoTelemetria: TelemetriaEvento[] = [];
      const bancoAuditoria: AuditoriaSessao[] = [];
      let relatorioPersistido = false;

      // Spies do Banco de Dados em Memória
      vi.spyOn(SessaoModel, 'buscarPorId').mockImplementation(async (id: string) => {
        return id === sessaoId ? estadoSessao : null;
      });

      vi.spyOn(SessaoModel, 'buscarPorToken').mockImplementation(async (token: string) => {
        return token === sessionToken ? estadoSessao : null;
      });

      vi.spyOn(SessaoModel, 'atualizarStatus').mockImplementation(async (id: string, status) => {
        if (id === sessaoId) {
          estadoSessao = { ...estadoSessao, status_sessao: status };
          return estadoSessao;
        }
        return null;
      });

      vi.spyOn(SessaoModel, 'parearDispositivo').mockImplementation(async (id: string, dispInfo) => {
        if (id === sessaoId) {
          estadoSessao = {
            ...estadoSessao,
            status_sessao: STATUS_SESSAO.EM_ANDAMENTO,
            data_hora_inicio: new Date().toISOString(),
            dispositivo_info: dispInfo as any,
          };
          return estadoSessao;
        }
        return null;
      });

      vi.spyOn(SessaoModel, 'finalizarSessao').mockImplementation(async (id: string) => {
        if (id === sessaoId) {
          estadoSessao = {
            ...estadoSessao,
            status_sessao: STATUS_SESSAO.FINALIZADA,
            data_hora_fim: new Date().toISOString(),
          };
          return estadoSessao;
        }
        return null;
      });

      vi.spyOn(RelatorioSessaoModel, 'criar').mockImplementation(async () => {
        relatorioPersistido = true;
        return {
          id: 'relatorio-1',
          sessao_id: sessaoId,
          terapeuta_id: terapeutaId,
          paciente_id: pacienteId,
          conteudo: 'Resumo clinico',
          dados_ia_json: {} as any,
          soft_delete: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      vi.spyOn(TelemetriaModel, 'registrarLote').mockImplementation(async (dtos) => {
        const registros = dtos.map((dto, idx) => ({
          id: `tel-${idx}`,
          sessao_id: dto.sessao_id,
          tipo_evento: dto.tipo_evento,
          dados: dto.dados,
          data_hora: dto.data_hora,
        }));
        bancoTelemetria.push(...registros);
        return registros;
      });

      vi.spyOn(TelemetriaModel, 'buscarPorSessaoId').mockImplementation(async () => {
        return bancoTelemetria;
      });

      vi.spyOn(AuditoriaModel, 'registrar').mockImplementation(async (dto) => {
        const registro: AuditoriaSessao = {
          id: `audit-${bancoAuditoria.length + 1}`,
          sessao_id: dto.sessao_id,
          terapeuta_id: dto.terapeuta_id || null,
          origem: dto.origem,
          acao: dto.acao,
          detalhes_json: dto.detalhes_json || {},
          ip: dto.ip || null,
          user_agent: dto.user_agent || null,
          created_at: new Date().toISOString(),
        };
        bancoAuditoria.push(registro);
        return registro;
      });

      vi.spyOn(AuditoriaModel, 'buscarPorSessaoId').mockImplementation(async () => {
        return bancoAuditoria;
      });

      // PASSO 1: Pareamento do Tablet do Jogo
      const { mockReq: reqParear, mockRes: resParear, getStatus: statusParear } = criarMocks(
        {
          session_token: sessionToken,
          jogo_id: jogoId,
          dispositivo_info: { modelo: 'Tablet Galaxy Tab S9', os: 'Android 14' },
        }
      );
      // Simula a data de início registrada no pareamento
      estadoSessao.data_hora_inicio = new Date().toISOString();
      await SessaoController.parear(reqParear, resParear);

      expect(statusParear()).toBe(200);
      expect(estadoSessao.status_sessao).toBe(STATUS_SESSAO.EM_ANDAMENTO);
      expect(bancoAuditoria.some(a => a.acao === 'dispositivo_pareado')).toBe(true);

      // PASSO 2: Ingestão de Lote de Telemetria Contínua
      const { mockReq: reqTel, mockRes: resTel, getStatus: statusTel, getJson: jsonTel } = criarMocks(
        {
          sessao_id: sessaoId,
          eventos: [
            { tipo_evento: 'interacao_paciente', dados: { id_metrica: 'toque_alvo', valor: 1.2 } },
            { tipo_evento: 'metrica_jogo', dados: { id_metrica: 'pontuacao', valor: 100 } },
          ],
        }
      );
      await TelemetriaController.registrarLote(reqTel, resTel);

      expect(statusTel()).toBe(201);
      expect((jsonTel() as { total: number }).total).toBe(2);
      expect(bancoTelemetria).toHaveLength(2);

      // PASSO 3: Consulta dos Eventos de Telemetria pelo Terapeuta
      const { mockReq: reqListTel, mockRes: resListTel, getStatus: statusListTel, getJson: jsonListTel } = criarMocks(
        {},
        { sessaoId },
        {},
        { id: terapeutaId }
      );
      await TelemetriaController.listarPorSessao(reqListTel, resListTel);

      expect(statusListTel()).toBe(200);
      expect((jsonListTel() as { data: TelemetriaEvento[] }).data).toHaveLength(2);

      // PASSO 4: Encerramento da Sessão pelo Terapeuta
      const { mockReq: reqFim, mockRes: resFim, getStatus: statusFim, getJson: jsonFim } = criarMocks(
        {},
        { id: sessaoId },
        {},
        { id: terapeutaId }
      );
      await SessaoController.finalizar(reqFim, resFim);

      expect(statusFim()).toBe(200);
      expect(estadoSessao.status_sessao).toBe(STATUS_SESSAO.FINALIZADA);
      expect(relatorioPersistido).toBe(true);
      expect((jsonFim() as any).data.relatorio).toBeDefined();
      expect(bancoAuditoria.some(a => a.acao === 'sessao_finalizada')).toBe(true);

      // PASSO 5: Consulta da Trilha de Auditoria
      const { mockReq: reqAudit, mockRes: resAudit, getStatus: statusAudit, getJson: jsonAudit } = criarMocks(
        {},
        { sessaoId },
        {},
        { id: terapeutaId }
      );
      await AuditoriaController.consultarLinhaDoTempo(reqAudit, resAudit);

      expect(statusAudit()).toBe(200);
      const auditJson = jsonAudit() as { data: AuditoriaSessao[]; total: number };
      expect(auditJson.total).toBe(2);
      expect(auditJson.data.map(e => e.acao)).toEqual(['dispositivo_pareado', 'sessao_finalizada']);
    });
  });

  // ----------------------------------------------------------------------------
  // CENÁRIO 2: CICLO DE MODO LIVRE (RN01)
  // ----------------------------------------------------------------------------
  describe('Cenário 2: Ciclo de Modo Livre (RN01 — Sem Persistência Clínica / Sem IA)', () => {
    it('deve aceitar telemetria em memória mas NÃO persistir no prontuário e NÃO gerar relatório de IA', async () => {
      let estadoSessao: Sessao = {
        id: sessaoId,
        terapeuta_id: terapeutaId,
        paciente_id: null, // RN01: Modo livre não tem paciente
        jogo_id: jogoId,
        modo_sessao: MODO_SESSAO.MODO_LIVRE,
        status_sessao: STATUS_SESSAO.EM_ANDAMENTO,
        session_token: sessionToken,
        data_hora_inicio: new Date().toISOString(),
        data_hora_fim: null,
        contexto_dda_json: {},
        dispositivo_info: null,
        expira_em: new Date(Date.now() + 600000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const spyRegistrarLote = vi.spyOn(TelemetriaModel, 'registrarLote');
      const spyCriarRelatorio = vi.spyOn(RelatorioSessaoModel, 'criar');
      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue(estadoSessao);
      vi.spyOn(SessaoModel, 'finalizarSessao').mockResolvedValue({
        ...estadoSessao,
        status_sessao: STATUS_SESSAO.FINALIZADA,
        data_hora_fim: new Date().toISOString(),
      });

      // 1. Ingestão de Telemetria no Modo Livre
      const { mockReq: reqTel, mockRes: resTel, getStatus: statusTel, getJson: jsonTel } = criarMocks({
        sessao_id: sessaoId,
        eventos: [{ tipo_evento: 'interacao_livre', dados: { id_metrica: 'toques', valor: 5 } }],
      });
      await TelemetriaController.registrarLote(reqTel, resTel);

      // Sucesso HTTP 200, mas persistido = false conforme RN01
      expect(statusTel()).toBe(200);
      expect((jsonTel() as { persistido: boolean }).persistido).toBe(false);
      expect(spyRegistrarLote).not.toHaveBeenCalled();

      // 2. Finalização no Modo Livre
      const { mockReq: reqFim, mockRes: resFim, getStatus: statusFim, getJson: jsonFim } = criarMocks(
        {},
        { id: sessaoId },
        {},
        { id: terapeutaId }
      );
      await SessaoController.finalizar(reqFim, resFim);

      expect(statusFim()).toBe(200);
      expect((jsonFim() as any).data.relatorio).toBeUndefined();
      expect(spyCriarRelatorio).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------------------
  // CENÁRIO 3: MÁQUINA DE ESTADOS (FSM) E GUARDAS DE TRANSIÇÃO
  // ----------------------------------------------------------------------------
  describe('Cenário 3: Validação Estrita da Máquina de Estados (FSM)', () => {
    it('deve retornar 409 Conflict se tentar registrar telemetria com sessão em aguardando_pareamento', async () => {
      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
        id: sessaoId,
        status_sessao: STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
      } as Sessao);

      const { mockReq, mockRes, getStatus, getJson } = criarMocks({
        sessao_id: sessaoId,
        eventos: [{ tipo_evento: 'toque', dados: { id_metrica: 'click', valor: 1 } }],
      });
      await TelemetriaController.registrarLote(mockReq, mockRes);

      expect(getStatus()).toBe(409);
      expect((getJson() as { error: string }).error).toContain('não está em andamento');
    });

    it('deve retornar 409 Conflict se tentar registrar telemetria com sessão finalizada', async () => {
      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
        id: sessaoId,
        status_sessao: STATUS_SESSAO.FINALIZADA,
      } as Sessao);

      const { mockReq, mockRes, getStatus } = criarMocks({
        sessao_id: sessaoId,
        eventos: [{ tipo_evento: 'toque', dados: { id_metrica: 'click', valor: 1 } }],
      });
      await TelemetriaController.registrarLote(mockReq, mockRes);

      expect(getStatus()).toBe(409);
    });

    it('deve retornar 400 Bad Request ao tentar finalizar sessão já finalizada', async () => {
      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
        id: sessaoId,
        status_sessao: STATUS_SESSAO.FINALIZADA,
      } as Sessao);

      const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { id: sessaoId });
      await SessaoController.finalizar(mockReq, mockRes);

      expect(getStatus()).toBe(400);
      expect((getJson() as { error: string }).error).toContain('já se encontra finalizada');
    });

    it('deve retornar 400 Bad Request ao tentar finalizar sessão cancelada', async () => {
      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
        id: sessaoId,
        status_sessao: STATUS_SESSAO.CANCELADA,
      } as Sessao);

      const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { id: sessaoId });
      await SessaoController.finalizar(mockReq, mockRes);

      expect(getStatus()).toBe(400);
      expect((getJson() as { error: string }).error).toContain('foi cancelada');
    });

    it('deve retornar 400 Bad Request ao tentar finalizar sessão que ainda não foi pareada', async () => {
      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
        id: sessaoId,
        status_sessao: STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
      } as Sessao);

      const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { id: sessaoId });
      await SessaoController.finalizar(mockReq, mockRes);

      expect(getStatus()).toBe(400);
      expect((getJson() as { error: string }).error).toContain('aguardando pareamento');
    });

    it('deve retornar 400 Bad Request ao tentar cancelar sessão já finalizada', async () => {
      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
        id: sessaoId,
        status_sessao: STATUS_SESSAO.FINALIZADA,
      } as Sessao);

      const { mockReq, mockRes, getStatus, getJson } = criarMocks({}, { id: sessaoId });
      await SessaoController.cancelar(mockReq, mockRes);

      expect(getStatus()).toBe(400);
      expect((getJson() as { error: string }).error).toContain('não pode ser cancelada');
    });
  });

  // ----------------------------------------------------------------------------
  // CENÁRIO 4: ISOLAMENTO INSTITUCIONAL (RN04)
  // ----------------------------------------------------------------------------
  describe('Cenário 4: Conformidade com Vínculo Institucional (RN04)', () => {
    it('deve retornar 403 Forbidden ao consultar telemetria sem vínculo', async () => {
      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
        id: sessaoId,
        terapeuta_id: terapeutaId,
      } as Sessao);

      const { mockReq, mockRes, getStatus, getJson } = criarMocks(
        {},
        { sessaoId },
        {},
        { id: 'terapeuta-sem-acesso' }
      );
      await TelemetriaController.listarPorSessao(mockReq, mockRes);

      expect(getStatus()).toBe(403);
      expect((getJson() as { error: string }).error).toContain('RN04');
    });

    it('deve retornar 403 Forbidden ao consultar auditoria da sessão sem vínculo', async () => {
      vi.spyOn(SessaoModel, 'buscarPorId').mockResolvedValue({
        id: sessaoId,
        terapeuta_id: terapeutaId,
      } as Sessao);

      const { mockReq, mockRes, getStatus, getJson } = criarMocks(
        {},
        { sessaoId },
        {},
        { id: 'terapeuta-sem-acesso' }
      );
      await AuditoriaController.consultarLinhaDoTempo(mockReq, mockRes);

      expect(getStatus()).toBe(403);
      expect((getJson() as { error: string }).error).toContain('RN04');
    });
  });
});
