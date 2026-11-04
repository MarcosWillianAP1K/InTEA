// ==============================================================================
// InTEA: Testes Unitários — SessaoListarService e SessaoController.listar
// ==============================================================================
// Cobertura: RF18 (Visibilidade Compartilhada de Equipe), RN01 (Modo Livre),
//            RN04 (Vínculo Institucional e Isolamento por Clínica)
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { SessaoListarService, SessaoServiceError } from '../services/sessao-listar.service.js';
import { SessaoController } from '../controllers/sessao.controller.js';
import { SessaoModel, MODO_SESSAO, STATUS_SESSAO, type Sessao } from '../models/sessao.model.js';
import { supabase } from '../../../core/supabase/supabase.client.js';
import type { AuthenticatedRequest, UsuarioAutenticado } from '../../../core/middlewares/auth.middleware.js';

interface RespostaEnvelopeSessao {
  data?: {
    sessoes: Sessao[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
  message?: string;
  error?: string;
  detalhes?: string;
}

function criarMockReqResSessao(opcoes: {
  query?: Record<string, string | undefined>;
  user?: UsuarioAutenticado;
}): {
  req: Request;
  res: Response;
  getStatus: () => number;
  getJson: () => RespostaEnvelopeSessao;
} {
  let statusCode = 200;
  let jsonBody: RespostaEnvelopeSessao = {};

  const req = {
    query: opcoes.query ?? {},
    user: opcoes.user,
    headers: { authorization: 'Bearer token-teste' },
  } as unknown as AuthenticatedRequest;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: RespostaEnvelopeSessao) {
      jsonBody = payload;
      return this;
    },
  } as unknown as Response;

  return {
    req,
    res,
    getStatus: () => statusCode,
    getJson: () => jsonBody,
  };
}

function configurarMockSupabaseVisibilidade(opcoes: {
  terapeuta: {
    id: string;
    clinica_id: string | null;
    is_super_admin?: boolean;
    status_ativo?: boolean;
  } | null;
  paciente: {
    id: string;
    clinica_id: string | null;
    status_ativo?: boolean;
  } | null;
  vinculo: { paciente_id: string } | null;
}): void {
  vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
    if (tabela === 'terapeuta') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: opcoes.terapeuta,
              error: null,
            }),
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>;
    }

    if (tabela === 'paciente') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: opcoes.paciente,
              error: null,
            }),
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>;
    }

    if (tabela === 'terapeuta_paciente') {
      const chainVinculo = {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: opcoes.vinculo,
            error: null,
          }),
        }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: opcoes.vinculo,
          error: null,
        }),
      };

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(chainVinculo),
        }),
      } as unknown as ReturnType<typeof supabase.from>;
    }

    return {} as unknown as ReturnType<typeof supabase.from>;
  });
}

describe('SessaoListarService.listar e SessaoController.listar — Visibilidade e RN04/RF18', () => {
  const clinica1Id = '11111111-1111-4111-8111-111111111111';
  const clinica2Id = '22222222-2222-4222-8222-222222222222';
  const terapeutaAId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const terapeutaBId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const superAdminId = '99999999-9999-4999-8999-999999999999';
  const pacienteXId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const jogoId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

  const sessaoTerapeutaA: Sessao = {
    id: 'e1111111-1111-4111-8111-111111111111',
    terapeuta_id: terapeutaAId,
    paciente_id: pacienteXId,
    jogo_id: jogoId,
    session_token: '4M5S-8U7B',
    modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
    contexto_dda_json: {},
    status_sessao: STATUS_SESSAO.FINALIZADA,
    data_hora_inicio: '2026-10-20T10:00:00.000Z',
    expira_em: '2026-10-20T10:15:00.000Z',
    data_hora_fim: '2026-10-20T10:25:00.000Z',
    created_at: '2026-10-20T10:00:00.000Z',
    updated_at: '2026-10-20T10:25:00.000Z',
    terapeuta: {
      id: terapeutaAId,
      nome: 'Dr. Terapeuta A',
      especialidade: 'Terapia Ocupacional',
      crefito: 'CREFITO-111',
      registro_profissional: 'CREFITO-111',
    },
  };

  const sessaoTerapeutaB: Sessao = {
    id: 'e2222222-2222-4222-8222-222222222222',
    terapeuta_id: terapeutaBId,
    paciente_id: pacienteXId,
    jogo_id: jogoId,
    session_token: '9K2L-3P4Q',
    modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
    contexto_dda_json: {},
    status_sessao: STATUS_SESSAO.FINALIZADA,
    data_hora_inicio: '2026-10-21T14:00:00.000Z',
    expira_em: '2026-10-21T14:15:00.000Z',
    data_hora_fim: '2026-10-21T14:30:00.000Z',
    created_at: '2026-10-21T14:00:00.000Z',
    updated_at: '2026-10-21T14:30:00.000Z',
    terapeuta: {
      id: terapeutaBId,
      nome: 'Dra. Terapeuta B',
      especialidade: 'Fonoaudiologia',
      crefito: 'CRFa-222',
      registro_profissional: 'CRFa-222',
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Ramo 1: Sem pacienteId -> filtra por terapeutaId = usuarioLogado.id
  // ============================================================================
  describe('1. Listagem geral sem pacienteId (escopo individual)', () => {
    it('deve injetar filtros.terapeutaId = usuarioLogado.id quando pacienteId não for informado', async () => {
      const spyModelListar = vi.spyOn(SessaoModel, 'listar').mockResolvedValue({
        data: [sessaoTerapeutaA],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const usuario: UsuarioAutenticado = { id: terapeutaAId, is_super_admin: false };
      const resultado = await SessaoListarService.listar({}, usuario, false);

      expect(spyModelListar).toHaveBeenCalledWith(
        expect.objectContaining({ terapeutaId: terapeutaAId })
      );
      expect(resultado.data).toHaveLength(1);
    });
  });

  // ============================================================================
  // Ramo 2: SuperAdmin com verTodasSessoes = true -> não filtra por terapeutaId
  // ============================================================================
  describe('2. SuperAdmin com verTodasSessoes = true', () => {
    it('não deve definir filtros.terapeutaId para SuperAdmin com verTodasSessoes = true', async () => {
      const spyModelListar = vi.spyOn(SessaoModel, 'listar').mockResolvedValue({
        data: [sessaoTerapeutaA, sessaoTerapeutaB],
        meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
      });

      const admin: UsuarioAutenticado = { id: superAdminId, is_super_admin: true };
      const filtros = {};
      await SessaoListarService.listar(filtros, admin, true);

      expect(spyModelListar).toHaveBeenCalledTimes(1);
      expect(spyModelListar.mock.calls[0]?.[0]?.terapeutaId).toBeUndefined();
    });

    it('SessaoController.listar deve repassar all=true para SuperAdmin e responder 200 OK', async () => {
      const spyModelListar = vi.spyOn(SessaoModel, 'listar').mockResolvedValue({
        data: [sessaoTerapeutaA, sessaoTerapeutaB],
        meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
      });

      const mockHttp = criarMockReqResSessao({
        query: { all: 'true' },
        user: { id: superAdminId, is_super_admin: true },
      });

      await SessaoController.listar(mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(200);
      expect(mockHttp.getJson().data?.sessoes).toHaveLength(2);
      expect(spyModelListar.mock.calls[0]?.[0]?.terapeutaId).toBeUndefined();
    });
  });

  // ============================================================================
  // Ramo 3: Com pacienteId inválido -> SessaoServiceError 400 -> Controller 400
  // ============================================================================
  describe('3. Validação de pacienteId inválido (400 Bad Request)', () => {
    it('deve lançar SessaoServiceError(400) quando pacienteId não for UUID válido', async () => {
      const usuario: UsuarioAutenticado = { id: terapeutaAId, is_super_admin: false };

      await expect(
        SessaoListarService.listar({ pacienteId: 'id-malformado' }, usuario, false)
      ).rejects.toThrow(SessaoServiceError);

      await expect(
        SessaoListarService.listar({ pacienteId: 'id-malformado' }, usuario, false)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'O parâmetro pacienteId deve ser um UUID válido.',
      });
    });

    it('SessaoController.listar deve responder 400 Bad Request quando pacienteId for inválido', async () => {
      const mockHttp = criarMockReqResSessao({
        query: { pacienteId: 'nao-e-uuid' },
        user: { id: terapeutaAId, is_super_admin: false },
      });

      await SessaoController.listar(mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(400);
      expect(mockHttp.getJson().error).toBe('O parâmetro pacienteId deve ser um UUID válido.');
    });
  });

  // ============================================================================
  // Ramo 4: Com pacienteId válido + vínculo ativo na mesma clínica -> 200 OK (RF18)
  // ============================================================================
  describe('4. Visibilidade compartilhada da equipe multidisciplinar (RF18)', () => {
    it('não deve definir filtros.terapeutaId quando terapeuta possuir vínculo ativo na mesma clínica', async () => {
      configurarMockSupabaseVisibilidade({
        terapeuta: {
          id: terapeutaBId,
          clinica_id: clinica1Id,
          is_super_admin: false,
          status_ativo: true,
        },
        paciente: {
          id: pacienteXId,
          clinica_id: clinica1Id,
          status_ativo: true,
        },
        vinculo: { paciente_id: pacienteXId },
      });

      const spyModelListar = vi.spyOn(SessaoModel, 'listar').mockResolvedValue({
        data: [sessaoTerapeutaA, sessaoTerapeutaB],
        meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
      });

      const mockHttp = criarMockReqResSessao({
        query: { pacienteId: pacienteXId },
        user: { id: terapeutaBId, is_super_admin: false },
      });

      await SessaoController.listar(mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(200);
      expect(spyModelListar).toHaveBeenCalledTimes(1);
      const filtrosRecebidos = spyModelListar.mock.calls[0]?.[0];
      expect(filtrosRecebidos?.pacienteId).toBe(pacienteXId);
      expect(filtrosRecebidos?.terapeutaId).toBeUndefined();

      const sessoesRetornadas = mockHttp.getJson().data?.sessoes ?? [];
      expect(sessoesRetornadas).toHaveLength(2);
      expect(sessoesRetornadas[0]?.terapeuta?.nome).toBe('Dr. Terapeuta A');
      expect(sessoesRetornadas[1]?.terapeuta?.nome).toBe('Dra. Terapeuta B');
    });

    it('deve retornar lista vazia imediatamente se modo=modo_livre for combinado com pacienteId (RN01)', async () => {
      const spyModelListar = vi.spyOn(SessaoModel, 'listar');

      const resultado = await SessaoListarService.listar(
        { pacienteId: pacienteXId, modo: MODO_SESSAO.MODO_LIVRE },
        { id: terapeutaAId, is_super_admin: false },
        false
      );

      expect(resultado.data).toEqual([]);
      expect(resultado.meta.total).toBe(0);
      expect(spyModelListar).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Ramo 5: Com pacienteId válido mas sem permissão -> SessaoServiceError 403
  // ============================================================================
  describe('5. Bloqueio de acesso indevido ao histórico de sessões do paciente (RN04 -> 403)', () => {
    it('deve lançar SessaoServiceError(403) e Controller responder 403 quando terapeuta estiver inativo', async () => {
      configurarMockSupabaseVisibilidade({
        terapeuta: {
          id: terapeutaBId,
          clinica_id: clinica1Id,
          is_super_admin: false,
          status_ativo: false,
        },
        paciente: {
          id: pacienteXId,
          clinica_id: clinica1Id,
          status_ativo: true,
        },
        vinculo: { paciente_id: pacienteXId },
      });

      const mockHttp = criarMockReqResSessao({
        query: { pacienteId: pacienteXId },
        user: { id: terapeutaBId, is_super_admin: false },
      });

      await SessaoController.listar(mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(403);
      expect(mockHttp.getJson().error).toContain('inativa');
    });

    it('deve lançar SessaoServiceError(403) e Controller responder 403 quando terapeuta pertencer a outra clínica (RN04)', async () => {
      configurarMockSupabaseVisibilidade({
        terapeuta: {
          id: terapeutaBId,
          clinica_id: clinica2Id,
          is_super_admin: false,
          status_ativo: true,
        },
        paciente: {
          id: pacienteXId,
          clinica_id: clinica1Id,
          status_ativo: true,
        },
        vinculo: null,
      });

      const mockHttp = criarMockReqResSessao({
        query: { pacienteId: pacienteXId },
        user: { id: terapeutaBId, is_super_admin: false },
      });

      await SessaoController.listar(mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(403);
      expect(mockHttp.getJson().error).toContain('RN04');
    });

    it('deve lançar SessaoServiceError(403) e Controller responder 403 quando terapeuta for da mesma clínica mas sem vínculo em terapeuta_paciente (RN04)', async () => {
      configurarMockSupabaseVisibilidade({
        terapeuta: {
          id: terapeutaBId,
          clinica_id: clinica1Id,
          is_super_admin: false,
          status_ativo: true,
        },
        paciente: {
          id: pacienteXId,
          clinica_id: clinica1Id,
          status_ativo: true,
        },
        vinculo: null,
      });

      const mockHttp = criarMockReqResSessao({
        query: { pacienteId: pacienteXId },
        user: { id: terapeutaBId, is_super_admin: false },
      });

      await SessaoController.listar(mockHttp.req, mockHttp.res);

      expect(mockHttp.getStatus()).toBe(403);
      expect(mockHttp.getJson().error).toBe(
        'Acesso negado: o terapeuta não possui vínculo ativo com este paciente (RN04).'
      );
    });
  });
});
