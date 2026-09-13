import { Request, Response } from 'express';
import { ExemploModel } from '../models/exemplo.model.js';

// Controller: Orquestra a requisição HTTP e interage com o Model
export class ExemploController {
  static async listar(_req: Request, res: Response): Promise<void> {
    try {
      const items = await ExemploModel.listar();
      res.json({ data: items });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar itens de exemplo' });
    }
  }

  static async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const item = await ExemploModel.buscarPorId(id);
      if (!item) {
        res.status(404).json({ error: 'Item não encontrado' });
        return;
      }
      res.json({ data: item });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar item de exemplo' });
    }
  }

  static async criar(req: Request, res: Response): Promise<void> {
    try {
      const { nome } = req.body;
      if (!nome) {
        res.status(400).json({ error: 'O campo nome é obrigatório' });
        return;
      }
      const item = await ExemploModel.criar(nome);
      res.status(201).json({ data: item });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar item de exemplo' });
    }
  }
}
