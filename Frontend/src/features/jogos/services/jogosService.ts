/**
 * Re-exports and delegates calls to jogos.service.ts for backwards compatibility.
 */

import { jogosService as jogosServiceCore } from "./jogos.service";
import { JOGOS_MOCK } from "../types/bdmock";
import type { Jogo, FiltrosJogos, ManifestoJogo } from "../types/jogos.types";

export { JOGOS_MOCK };

export const jogosService = {
  /**
   * Lists all available games supporting filter parameters.
   */
  listar: (filtros?: FiltrosJogos): Promise<Jogo[]> =>
    jogosServiceCore.listar(filtros),

  /**
   * Retrieves game by identifier, returning `undefined` if not found.
   */
  buscarPorId: async (id: string): Promise<Jogo | undefined> => {
    const jogo = await jogosServiceCore.buscarPorId(id);
    return jogo ?? undefined;
  },

  /**
   * Retrieves technical and clinical manifest of the game.
   */
  obterManifesto: (id: string): Promise<ManifestoJogo | null> =>
    jogosServiceCore.obterManifesto(id),
};

export default jogosService;
