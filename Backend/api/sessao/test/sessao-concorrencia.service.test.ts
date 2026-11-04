// ==============================================================================
// InTEA: Testes Unitários de Concorrência e Permissões Multi-terapeuta
// Sprint 13 — RF13, RF18, RF21, RN01, RN04
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessaoConcorrenciaService } from '../services/sessao-concorrencia.service.js';
import { STATUS_SESSAO, Sessao } from '../models/sessao.model.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

describe('SessaoConcorrenciaService — Controle de Concorrência e Permissões (Sprint 13)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('verificarSessaoAtivaConcorrente (RF13, RF18, RN01, RN04)', () => {
    it('deve retornar conflito: false quando pacienteId for nulo ou indefinido (Modo Livre — RN01)', async () => {
      const spySupabase = vi.spyOn(supabase, 'from');

      const resNull = await SessaoConcorrenciaService.verificarSessaoAtivaConcorrente(null);
      const resUndefined = await SessaoConcorrenciaService.verificarSessaoAtivaConcorrente(undefined);
      const resVazio = await SessaoConcorrenciaService.verificarSessaoAtivaConcorrente('   ');

      expect(resNull).toEqual({ conflito: false });
      expect(resUndefined).toEqual({ conflito: false });
      expect(resVazio).toEqual({ conflito: false });
      expect(spySupabase).not.toHaveBeenCalled();
    });

    it('deve retornar conflito: false quando não existirem sessões ativas no banco para o paciente', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq = vi.fn().mockReturnValue({ in: mockIn });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const resultado = await SessaoConcorrenciaService.verificarSessaoAtivaConcorrente('paciente-uuid-1', 'terapeuta-uuid-1');

      expect(resultado).toEqual({ conflito: false });
      expect(mockEq).toHaveBeenCalledWith('paciente_id', 'paciente-uuid-1');
      expect(mockIn).toHaveBeenCalledWith('status_sessao', [
        STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
        STATUS_SESSAO.CONECTADO,
        STATUS_SESSAO.EM_ANDAMENTO,
      ]);
    });

    it('deve retornar conflito: true (409) quando existir sessão ativa conduzida por outro terapeuta da equipe', async () => {
      const sessaoAtivaMock = {
        id: 'sessao-ativa-uuid',
        terapeuta_id: 'terapeuta-colega-uuid',
        paciente_id: 'paciente-uuid-1',
        status_sessao: STATUS_SESSAO.EM_ANDAMENTO,
        expira_em: null,
        data_hora_inicio: '2026-10-27T10:00:00.000Z',
        created_at: '2026-10-27T10:00:00.000Z',
        terapeuta: {
          id: 'terapeuta-colega-uuid',
          nome_completo: 'Dra. Joana Terapeuta',
          especialidade: 'Terapia Ocupacional',
          registro_conselho: 'CREFITO-12345',
        },
      };

      const mockOrder = vi.fn().mockResolvedValue({ data: [sessaoAtivaMock], error: null });
      const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq = vi.fn().mockReturnValue({ in: mockIn });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const resultado = await SessaoConcorrenciaService.verificarSessaoAtivaConcorrente(
        'paciente-uuid-1',
        'terapeuta-solicitante-uuid'
      );

      expect(resultado.conflito).toBe(true);
      expect(resultado.statusHttp).toBe(409);
      expect(resultado.codigo).toBe('SESSAO_CLINICA_SIMULTANEA_CONFLITO');
      expect(resultado.mensagem).toContain('conduzida por outro especialista da equipe');
      expect(resultado.sessaoAtiva).toBeDefined();
      expect(resultado.sessaoAtiva?.id).toBe('sessao-ativa-uuid');
      expect(resultado.sessaoAtiva?.mesmo_terapeuta).toBe(false);
      expect(resultado.sessaoAtiva?.especialista_responsavel?.nome).toBe('Dra. Joana Terapeuta');
      expect(resultado.sessaoAtiva?.especialista_responsavel?.especialidade).toBe('Terapia Ocupacional');
    });

    it('deve retornar conflito: true (409) com mesmo_terapeuta: true quando a sessão ativa for do próprio terapeuta', async () => {
      const sessaoAtivaMock = {
        id: 'sessao-propria-uuid',
        terapeuta_id: 'meu-terapeuta-uuid',
        paciente_id: 'paciente-uuid-1',
        status_sessao: STATUS_SESSAO.CONECTADO,
        expira_em: null,
        data_hora_inicio: '2026-10-27T11:00:00.000Z',
        created_at: '2026-10-27T11:00:00.000Z',
        terapeuta: {
          id: 'meu-terapeuta-uuid',
          nome_completo: 'Dr. Marcos Silva',
          especialidade: 'Fonoaudiologia',
          registro_conselho: 'CRFa-9988',
        },
      };

      const mockOrder = vi.fn().mockResolvedValue({ data: [sessaoAtivaMock], error: null });
      const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq = vi.fn().mockReturnValue({ in: mockIn });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const resultado = await SessaoConcorrenciaService.verificarSessaoAtivaConcorrente(
        'paciente-uuid-1',
        'meu-terapeuta-uuid'
      );

      expect(resultado.conflito).toBe(true);
      expect(resultado.statusHttp).toBe(409);
      expect(resultado.sessaoAtiva?.mesmo_terapeuta).toBe(true);
      expect(resultado.mensagem).toContain('Você já possui uma sessão clínica ativa');
    });

    it('deve detectar sessão em aguardando_pareamento não expirada como conflito ativo', async () => {
      const expiraNoFuturo = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const sessaoPendenteMock = {
        id: 'sessao-pendente-uuid',
        terapeuta_id: 'terapeuta-colega-uuid',
        paciente_id: 'paciente-uuid-1',
        status_sessao: STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
        expira_em: expiraNoFuturo,
        data_hora_inicio: null,
        created_at: new Date().toISOString(),
        terapeuta: {
          id: 'terapeuta-colega-uuid',
          nome_completo: 'Dra. Luiza Psicóloga',
        },
      };

      const mockOrder = vi.fn().mockResolvedValue({ data: [sessaoPendenteMock], error: null });
      const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq = vi.fn().mockReturnValue({ in: mockIn });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const resultado = await SessaoConcorrenciaService.verificarSessaoAtivaConcorrente(
        'paciente-uuid-1',
        'terapeuta-solicitante'
      );

      expect(resultado.conflito).toBe(true);
      expect(resultado.statusHttp).toBe(409);
      expect(resultado.sessaoAtiva?.id).toBe('sessao-pendente-uuid');
    });

    it('não deve gerar bloqueio se a sessão em aguardando_pareamento já tiver expirado', async () => {
      const expiraNoPassado = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const sessaoExpiradaMock = {
        id: 'sessao-antiga-uuid',
        terapeuta_id: 'terapeuta-colega-uuid',
        paciente_id: 'paciente-uuid-1',
        status_sessao: STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
        expira_em: expiraNoPassado,
        data_hora_inicio: null,
        created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        terapeuta: null,
      };

      const mockOrder = vi.fn().mockResolvedValue({ data: [sessaoExpiradaMock], error: null });
      const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq = vi.fn().mockReturnValue({ in: mockIn });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const resultado = await SessaoConcorrenciaService.verificarSessaoAtivaConcorrente(
        'paciente-uuid-1',
        'terapeuta-solicitante'
      );

      expect(resultado.conflito).toBe(false);
    });

    it('deve lançar erro se a consulta ao Supabase falhar', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: { message: 'Database connection failed' } });
      const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq = vi.fn().mockReturnValue({ in: mockIn });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      await expect(
        SessaoConcorrenciaService.verificarSessaoAtivaConcorrente('paciente-uuid-1')
      ).rejects.toThrow('Erro ao consultar concorrência de sessão ativa: Database connection failed');
    });
  });

  describe('validarPermissaoMutacaoSessao (RF21)', () => {
    const sessaoMock: Pick<Sessao, 'id' | 'terapeuta_id'> = {
      id: 'sessao-uuid-123',
      terapeuta_id: 'terapeuta-autor-uuid',
    };

    it('deve retornar permitido: false (403) se a sessão for inválida ou ausente', () => {
      const resNull = SessaoConcorrenciaService.validarPermissaoMutacaoSessao(null, 'user-1');
      const resSemTerapeuta = SessaoConcorrenciaService.validarPermissaoMutacaoSessao({ id: 's-1', terapeuta_id: '' } as unknown as Sessao, 'user-1');

      expect(resNull.permitido).toBe(false);
      expect(resNull.statusHttp).toBe(403);
      expect(resSemTerapeuta.permitido).toBe(false);
    });

    it('deve retornar permitido: false (403) se o usuário solicitante for inválido', () => {
      const res = SessaoConcorrenciaService.validarPermissaoMutacaoSessao(sessaoMock, '');

      expect(res.permitido).toBe(false);
      expect(res.statusHttp).toBe(403);
    });

    it('deve retornar permitido: true se o usuário logado for SuperAdmin', () => {
      const res = SessaoConcorrenciaService.validarPermissaoMutacaoSessao(
        sessaoMock,
        'outro-terapeuta-admin-uuid',
        true
      );

      expect(res.permitido).toBe(true);
      expect(res.statusHttp).toBeUndefined();
    });

    it('deve retornar permitido: true se o usuário logado for o terapeuta condutor da sessão (RF21)', () => {
      const res = SessaoConcorrenciaService.validarPermissaoMutacaoSessao(
        sessaoMock,
        'terapeuta-autor-uuid',
        false
      );

      expect(res.permitido).toBe(true);
    });

    it('deve retornar permitido: false com status 403 Forbidden se outro terapeuta da equipe tentar mutar a sessão (RF21)', () => {
      const res = SessaoConcorrenciaService.validarPermissaoMutacaoSessao(
        sessaoMock,
        'segundo-terapeuta-equipe-uuid',
        false
      );

      expect(res.permitido).toBe(false);
      expect(res.statusHttp).toBe(403);
      expect(res.codigo).toBe('FORBIDDEN_MUTACAO_CONDUTOR');
      expect(res.mensagem).toContain('Apenas o terapeuta condutor da sessão ou um administrador');
      expect(res.terapeutaCondutorId).toBe('terapeuta-autor-uuid');
      expect(res.usuarioSolicitanteId).toBe('segundo-terapeuta-equipe-uuid');
    });
  });
});
