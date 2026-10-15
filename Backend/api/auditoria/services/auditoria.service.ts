// ==============================================================================
// InTEA: Service da Trilha de Auditoria Clínica de Sessão (Sprint 9 - Task 1.3)
// ==============================================================================
// Conformidade: RF13, RNF06 (LGPD), RN04 (Vínculo Institucional), RN05
// ==============================================================================

import { AuditoriaModel, AuditoriaSessao, CriarAuditoriaDTO } from '../models/auditoria.model.js';
import { SessaoModel } from '../../sessao/models/sessao.model.js';
import { validarUUID } from '../../../core/utils/validators.js';

export interface UsuarioAutenticadoInfo {
  id?: string;
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

    const isSuperAdmin = usuario?.user_metadata?.is_super_admin === true;
    const isDonoDaSessao = Boolean(usuario?.id && sessao.terapeuta_id === usuario.id);

    if (!isSuperAdmin && !isDonoDaSessao) {
      return {
        autorizado: false,
        statusHttp: 403,
        motivo: 'Acesso negado: você não possui vínculo institucional com esta sessão clínica (RN04).',
      };
    }

    return { autorizado: true };
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
}
