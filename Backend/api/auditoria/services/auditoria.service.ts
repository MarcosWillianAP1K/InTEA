// ==============================================================================
// InTEA: Service da Trilha Unificada de Auditoria do Ecossistema (Item 3)
// ==============================================================================
// ==============================================================================

import {
  AuditoriaModel,
  AuditoriaSessao,
  AuditoriaVinculoRegistro,
  CriarAuditoriaDTO,
  CriarAuditoriaEventoDTO,
  CriarAuditoriaVinculoDTO,
  FiltrosAuditoriaDTO,
  EstatisticasAuditoriaModel,
} from '../models/auditoria.model.js';
import { SessaoModel } from '../../sessao/models/sessao.model.js';
import { validarUUID } from '../../../core/utils/validators.js';
import { supabase } from '../../../core/supabase/supabase.client.js';
import { hasSuperAdminClaim } from '../../../core/auth/privilegios.js';

export interface UsuarioAutenticadoInfo {
  id?: string;
  is_super_admin?: boolean;
  clinica_id?: string | null;
  app_metadata?: {
    is_super_admin?: boolean;
    [key: string]: unknown;
  };
  user_metadata?: {
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ResultadoValidacaoAcesso {
  autorizado: boolean;
  statusHttp?: number;
  motivo?: string;
}

export class AuditoriaService {
  /**
   * Verifies via server-signed claims or database whether the user is an active SuperAdmin.
   */
  static async verificarSuperAdmin(usuario?: UsuarioAutenticadoInfo): Promise<boolean> {
    if (!usuario) return false;
    if (usuario.is_super_admin === true || hasSuperAdminClaim(usuario)) {
      return true;
    }

    if (!usuario.id || !validarUUID(usuario.id)) {
      return false;
    }

    try {
      const { data } = await supabase
        .from('terapeuta')
        .select('id, is_super_admin, status_ativo')
        .eq('id', usuario.id)
        .maybeSingle();

      return Boolean(data && data.status_ativo !== false && data.is_super_admin === true);
    } catch {
      return false;
    }
  }

  /**
   * Formally records a unified ecosystem event in `public.auditoria_evento`.
   */
  static async registrarEventoUnificado(dto: CriarAuditoriaEventoDTO): Promise<AuditoriaSessao | null> {
    if (!dto.entidade || !dto.acao || !dto.origem) {
      return null;
    }

    const dtoSanitizado: CriarAuditoriaEventoDTO = {
      ...dto,
      terapeuta_id: dto.terapeuta_id && validarUUID(dto.terapeuta_id) ? dto.terapeuta_id : null,
      paciente_id: dto.paciente_id && validarUUID(dto.paciente_id) ? dto.paciente_id : null,
      sessao_id: dto.sessao_id && validarUUID(dto.sessao_id) ? dto.sessao_id : null,
      clinica_id: dto.clinica_id && validarUUID(dto.clinica_id) ? dto.clinica_id : null,
      recurso_id: dto.recurso_id && validarUUID(dto.recurso_id) ? dto.recurso_id : null,
    };

    return AuditoriaModel.registrarEventoUnificado(dtoSanitizado);
  }

  /**
   * Silently records a unified ecosystem event without propagating errors to callers.
   */
  static async registrarEventoUnificadoSilencioso(dto: CriarAuditoriaEventoDTO): Promise<void> {
    try {
      await this.registrarEventoUnificado(dto);
    } catch (err) {
      console.error('[AuditoriaService] Falha ao registrar evento unificado silencioso:', err);
    }
  }

  /**
   * Formally records an event in the clinical audit trail.
   */
  static async registrarEvento(dto: CriarAuditoriaDTO): Promise<AuditoriaSessao | null> {
    if (!dto.sessao_id || !validarUUID(dto.sessao_id)) {
      console.warn('[AuditoriaService] sessao_id invalido para registro de auditoria');
      return null;
    }

    return AuditoriaModel.registrar(dto);
  }

  /**
   * Silently and asynchronously records an audit event without throwing errors to the caller.
   */
  static async registrarSilencioso(dto: CriarAuditoriaDTO): Promise<void> {
    try {
      await this.registrarEvento(dto);
    } catch (err) {
      console.error('[AuditoriaService] Falha ao registrar log de auditoria silencioso:', err);
    }
  }

  /**
   * Formally records an immutable team link audit event in `public.auditoria_evento`.
   */
  static async registrarVinculo(dto: CriarAuditoriaVinculoDTO): Promise<AuditoriaVinculoRegistro | null> {
    if (
      !dto.paciente_id ||
      !validarUUID(dto.paciente_id) ||
      !dto.terapeuta_autor_id ||
      !validarUUID(dto.terapeuta_autor_id) ||
      !dto.terapeuta_alvo_id ||
      !validarUUID(dto.terapeuta_alvo_id)
    ) {
      console.warn('[AuditoriaService] UUIDs invalidos para registro de auditoria de vinculo');
      return null;
    }

    if (dto.acao !== 'vinculo_equipe_criado' && dto.acao !== 'vinculo_equipe_removido') {
      console.warn('[AuditoriaService] Acao invalida para registro de auditoria de vinculo');
      return null;
    }

    return AuditoriaModel.registrarVinculo(dto);
  }

  /**
   * Silently and asynchronously records a team link audit event without throwing errors to the caller.
   */
  static async registrarVinculoSilencioso(dto: CriarAuditoriaVinculoDTO): Promise<void> {
    try {
      await this.registrarVinculo(dto);
    } catch (err) {
      console.error('[AuditoriaService] Falha ao registrar log de auditoria de vinculo silencioso:', err);
    }
  }

  /**
   * Validates SuperAdmin-only read access to the chronological session audit timeline.
   */
  static async validarAcessoLinhaDoTempo(
    sessaoId: string,
    usuario?: UsuarioAutenticadoInfo
  ): Promise<ResultadoValidacaoAcesso> {
    if (!sessaoId || !validarUUID(sessaoId)) {
      return { autorizado: false, statusHttp: 400, motivo: 'ID da sessão inválido' };
    }

    const sessao = await SessaoModel.buscarPorId(sessaoId);
    if (!sessao) {
      return { autorizado: false, statusHttp: 404, motivo: 'Sessão clínica não encontrada' };
    }

    const isSuperAdmin = await this.verificarSuperAdmin(usuario);
    if (!isSuperAdmin) {
      return {
        autorizado: false,
        statusHttp: 403,
        motivo: 'Acesso negado: a visualização da trilha de auditoria é restrita exclusivamente a SuperAdmins (RF07 / RF08).',
      };
    }

    return { autorizado: true };
  }

  /**
   * Validates permission for recording a clinical session audit event via POST /api/auditoria.
   */
  static async validarAcessoRegistroEvento(
    sessaoId: string,
    usuario?: UsuarioAutenticadoInfo
  ): Promise<ResultadoValidacaoAcesso> {
    if (!sessaoId || !validarUUID(sessaoId)) {
      return { autorizado: false, statusHttp: 400, motivo: 'ID da sessão inválido' };
    }

    const sessao = await SessaoModel.buscarPorId(sessaoId);
    if (!sessao) {
      return { autorizado: false, statusHttp: 404, motivo: 'Sessão clínica não encontrada' };
    }

    const isDonoDaSessao = Boolean(usuario?.id && sessao.terapeuta_id === usuario.id);
    if (isDonoDaSessao || (await this.verificarSuperAdmin(usuario))) {
      return { autorizado: true };
    }

    if (!sessao.paciente_id || !usuario?.id) {
      return {
        autorizado: false,
        statusHttp: 403,
        motivo: 'Acesso negado: você não possui vínculo institucional com esta sessão clínica (RN04).',
      };
    }

    try {
      const { data: terapeuta } = await supabase
        .from('terapeuta')
        .select('id, clinica_id, is_super_admin, status_ativo')
        .eq('id', usuario.id)
        .maybeSingle();

      if (!terapeuta || terapeuta.status_ativo === false) {
        return {
          autorizado: false,
          statusHttp: 403,
          motivo: 'Acesso negado: terapeuta inexistente ou inativo (RN04).',
        };
      }

      if (terapeuta.is_super_admin) {
        return { autorizado: true };
      }

      const { data: paciente } = await supabase
        .from('paciente')
        .select('id, clinica_id, status_ativo')
        .eq('id', sessao.paciente_id)
        .maybeSingle();

      if (!paciente || paciente.status_ativo === false) {
        return {
          autorizado: false,
          statusHttp: 403,
          motivo: 'Acesso negado: paciente associado não encontrado ou inativo (RN04).',
        };
      }

      if (terapeuta.clinica_id && paciente.clinica_id && terapeuta.clinica_id !== paciente.clinica_id) {
        return {
          autorizado: false,
          statusHttp: 403,
          motivo: 'Acesso negado: o terapeuta pertence a uma instituição clínica diferente da do paciente (RN04).',
        };
      }

      const { data: vinculo } = await supabase
        .from('terapeuta_paciente')
        .select('paciente_id')
        .eq('terapeuta_id', terapeuta.id)
        .eq('paciente_id', sessao.paciente_id)
        .maybeSingle();

      if (!vinculo) {
        return {
          autorizado: false,
          statusHttp: 403,
          motivo: 'Acesso negado: você não possui vínculo ativo com o paciente desta sessão (RN04).',
        };
      }

      return { autorizado: true };
    } catch {
      return {
        autorizado: false,
        statusHttp: 403,
        motivo: 'Acesso negado: você não possui vínculo institucional com esta sessão clínica (RN04).',
      };
    }
  }

  /**
   * Lists chronological audit events for a clinical session.
   */
  static async listarPorSessao(sessaoId: string): Promise<AuditoriaSessao[]> {
    if (!sessaoId || !validarUUID(sessaoId)) return [];
    return AuditoriaModel.buscarPorSessaoId(sessaoId);
  }

  /**
   * Lists unified audit events with filters and pagination (SuperAdmin only at route/controller boundary).
   */
  static async listarComFiltros(
    filtros: FiltrosAuditoriaDTO = {},
    _usuario?: UsuarioAutenticadoInfo
  ): Promise<{ auditoria: AuditoriaSessao[]; total: number }> {
    return AuditoriaModel.listarComFiltros(filtros);
  }

  /**
   * Retrieves aggregated clinical and ecosystem audit statistics.
   */
  static async obterEstatisticas(
    _usuario?: UsuarioAutenticadoInfo
  ): Promise<EstatisticasAuditoriaModel> {
    return AuditoriaModel.obterEstatisticas();
  }
}
