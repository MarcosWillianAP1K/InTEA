// ==============================================================================
// InTEA: Service da Trilha de Auditoria Clínica de Sessão (Sprint 9 - Task 1.3)
// ==============================================================================
// Conformidade: RF13, RNF06 (LGPD), RN04 (Vínculo Institucional), RN05
// ==============================================================================

import {
  AuditoriaModel,
  AuditoriaSessao,
  CriarAuditoriaDTO,
  FiltrosAuditoriaDTO,
  EstatisticasAuditoriaModel,
} from '../models/auditoria.model.js';
import { SessaoModel } from '../../sessao/models/sessao.model.js';
import { validarUUID } from '../../../core/utils/validators.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

export interface UsuarioAutenticadoInfo {
  id?: string;
  is_super_admin?: boolean;
  clinica_id?: string | null;
  user_metadata?: {
    is_super_admin?: boolean;
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
   * Formally records an event in the clinical audit trail.
   *
   * @param dto - Data transfer object for audit entry creation.
   * @returns Created audit record or null on validation error.
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
   *
   * @param dto - Data transfer object for audit entry creation.
   * @returns Resolves when the recording completes or fails silently.
   */
  static async registrarSilencioso(dto: CriarAuditoriaDTO): Promise<void> {
    try {
      await this.registrarEvento(dto);
    } catch (err) {
      console.error('[AuditoriaService] Falha ao registrar log de auditoria silencioso:', err);
    }
  }

  /**
   * Validates access permission to the session audit timeline based on clinical rule RN04.
   *
   * @param sessaoId - UUID of the clinical session.
   * @param usuario - Authenticated user info.
   * @returns Access validation result object.
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

    const isSuperAdmin =
      usuario?.user_metadata?.is_super_admin === true ||
      usuario?.is_super_admin === true;
    const isDonoDaSessao = Boolean(usuario?.id && sessao.terapeuta_id === usuario.id);

    if (isSuperAdmin || isDonoDaSessao) {
      return { autorizado: true };
    }

    // Regra RN04: Permite acesso se pertencer à mesma clinica_id e possuir vínculo ativo em terapeuta_paciente
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
   *
   * @param sessaoId - UUID of the clinical session.
   * @returns Array of audit records.
   */
  static async listarPorSessao(sessaoId: string): Promise<AuditoriaSessao[]> {
    if (!sessaoId || !validarUUID(sessaoId)) return [];
    return AuditoriaModel.buscarPorSessaoId(sessaoId);
  }

  /**
   * Lists audit events with filters and pagination.
   *
   * @param filtros - Search, filter, and pagination options.
   * @param usuario - Authenticated user info.
   * @returns Paginated list and total count.
   */
  static async listarComFiltros(
    filtros: FiltrosAuditoriaDTO = {},
    usuario?: UsuarioAutenticadoInfo
  ): Promise<{ auditoria: AuditoriaSessao[]; total: number }> {
    return AuditoriaModel.listarComFiltros(filtros);
  }

  /**
   * Retrieves aggregated clinical audit statistics.
   *
   * @param usuario - Authenticated user info.
   * @returns Consolidated counts for audit metric cards.
   */
  static async obterEstatisticas(
    usuario?: UsuarioAutenticadoInfo
  ): Promise<EstatisticasAuditoriaModel> {
    return AuditoriaModel.obterEstatisticas();
  }
}
