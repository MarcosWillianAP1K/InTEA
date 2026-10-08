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
   * Registra formalmente um evento na trilha de auditoria clínica.
   */
  static async registrarEvento(dto: CriarAuditoriaDTO): Promise<AuditoriaSessao | null> {
    if (!dto.sessao_id || !validarUUID(dto.sessao_id)) {
      console.warn('[AuditoriaService] sessao_id invalido para registro de auditoria');
      return null;
    }

    return AuditoriaModel.registrar(dto);
  }

  /**
   * Invocação silenciosa e desacoplada para ser utilizada em hooks de controllers de sessão.
   * Não lança exceções para não interromper a resposta da requisição principal.
   */
  static async registrarSilencioso(dto: CriarAuditoriaDTO): Promise<void> {
    try {
      await this.registrarEvento(dto);
    } catch (err) {
      console.error('[AuditoriaService] Falha ao registrar log de auditoria silencioso:', err);
    }
  }

  /**
   * Valida permissão de acesso à linha do tempo da sessão conforme a regra RN04.
   * SuperAdmin e o terapeuta responsável pela sessão possuem acesso garantido.
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
   * Retorna os eventos de auditoria cronológicos de uma sessão.
   */
  static async listarPorSessao(sessaoId: string): Promise<AuditoriaSessao[]> {
    if (!sessaoId || !validarUUID(sessaoId)) return [];
    return AuditoriaModel.buscarPorSessaoId(sessaoId);
  }
}
