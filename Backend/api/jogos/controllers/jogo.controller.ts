import { Request, Response } from 'express';
import { JogoModel } from '../models/jogo.model.js';

export class JogoController {
  /**
   * GET /jogos ou GET /api/jogos
   * Lista todos os jogos disponíveis com informações básicas (nome, versão, descrição, status)
   */
  static async listar(_req: Request, res: Response): Promise<void> {
    try {
      const jogos = await JogoModel.listar();
      res.json({ data: jogos });
    } catch (error) {
      console.error('[JogoController] Erro ao listar jogos:', error);
      res.status(500).json({ error: 'Erro ao listar catálogo de jogos' });
    }
  }

  /**
   * GET /jogos/:id ou GET /api/jogos/:id
   * Consulta detalhes de um jogo específico incluindo o manifesto_json
   */
  static async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const jogo = await JogoModel.buscarPorId(id);

      if (!jogo) {
        res.status(404).json({ error: 'Jogo não encontrado' });
        return;
      }

      res.json({ data: jogo });
    } catch (error) {
      console.error('[JogoController] Erro ao buscar jogo por ID:', error);
      res.status(500).json({ error: 'Erro ao buscar detalhes do jogo' });
    }
  }
}
