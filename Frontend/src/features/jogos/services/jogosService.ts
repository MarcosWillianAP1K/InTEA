/**
 * Re-exporta e delega chamadas para jogos.service.ts, mantendo compatibilidade
 * retroativa com os testes e componentes existentes do projeto InTEA.
 */

import { jogosService as jogosServiceCore } from "./jogos.service";
import { JOGOS_MOCK } from "../types/bdmock";
import type { Jogo, FiltrosJogos, ManifestoJogo } from "../types/jogos.types";

export { JOGOS_MOCK };

export const jogosService = {
  /**
   * Lista todos os jogos disponíveis com suporte a filtros.
   */
  listar: (filtros?: FiltrosJogos): Promise<Jogo[]> =>
    jogosServiceCore.listar(filtros),

  /**
   * Busca jogo por identificador, retornando `undefined` se não encontrado
   * para compatibilidade com testes legados.
   */
  buscarPorId: async (id: string): Promise<Jogo | undefined> => {
    const jogo = await jogosServiceCore.buscarPorId(id);
    return jogo ?? undefined;
  },

  /**
   * Obtém manifesto técnico e clínico do jogo.
   */
  obterManifesto: (id: string): Promise<ManifestoJogo | null> =>
    jogosServiceCore.obterManifesto(id),
};

export default jogosService;
