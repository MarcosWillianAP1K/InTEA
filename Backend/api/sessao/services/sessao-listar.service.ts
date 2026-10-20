// ==============================================================================
// InTEA: Serviço de Listagem de Sessões com Filtros e Visibilidade Clínica (RN04)
// ==============================================================================

import { FiltrosSessaoDTO, RespostaListagemSessao } from '../dtos/sessao.dto.js';
import { SessaoModel, Sessao } from '../models/sessao.model.js';
import { UsuarioAutenticado } from '../../../core/middlewares/auth.middleware.js';

export class SessaoListarService {
  /**
   * Lista sessões terapêuticas aplicando filtros clínicos e controle de visibilidade institucional (RN04).
   *
   * @param filtros - Filtros de status, data, paciente, jogo, modo e paginação.
   * @param usuarioLogado - Dados do usuário extraídos do token JWT verificado (RF21).
   * @param verTodasSessoes - Se true e o usuário for super admin, lista sessões de todos os terapeutas.
   * @returns Lista paginada de sessões e metadados de paginação.
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
