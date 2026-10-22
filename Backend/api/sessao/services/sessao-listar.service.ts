// ==============================================================================
// InTEA: Serviço de Listagem de Sessões com Filtros e Visibilidade Clínica (RN04)
// ==============================================================================

import { FiltrosSessaoDTO, RespostaListagemSessao } from '../dtos/sessao.dto.js';
import { SessaoModel, Sessao } from '../models/sessao.model.js';
import { UsuarioAutenticado } from '../../../core/middlewares/auth.middleware.js';

export class SessaoListarService {
  /**
   * Lists therapeutic sessions applying clinical filters and institutional visibility controls (RN04).
   *
   * @param filtros - Status, date, patient, game, mode, and pagination filters.
   * @param usuarioLogado - User data extracted from verified JWT token (RF21).
   * @param verTodasSessoes - If true and user is super admin, lists sessions across all therapists.
   * @returns Paginated list of sessions with pagination metadata.
   */
  static async listar(
    filtros: FiltrosSessaoDTO,
    usuarioLogado?: UsuarioAutenticado,
    verTodasSessoes: boolean = false
  ): Promise<RespostaListagemSessao<Sessao>> {
    const isSuperAdmin =
      usuarioLogado?.is_super_admin === true ||
      usuarioLogado?.user_metadata?.is_super_admin === true;

    // Regra RN04: Terapeuta comum visualiza somente as sessões das quais participou
    if (usuarioLogado && !(isSuperAdmin && verTodasSessoes)) {
      filtros.terapeutaId = usuarioLogado.id;
    }

    return await SessaoModel.listar(filtros);
  }
}
