// ==============================================================================
// InTEA: Controller de Sessão e Pareamento Remoto
// ==============================================================================

import { Request, Response } from 'express';
import { SessaoModel } from '../models/sessao.model.js';
import { SessaoTokenService } from '../services/sessao-token.service.js';

export class SessaoController {
  /**
   * Inicia uma nova sessão clínica ou em modo livre
   * POST /api/sessao
   */
  static async iniciar(_req: Request, res: Response): Promise<void> {
    try {
      // Stub para desenvolvimento da lógica de criação
      res.status(501).json({ mensagem: 'Endpoint de início de sessão pronto para implementação' });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao iniciar sessão' });
    }
  }

  /**
   * Busca uma sessão pelo seu ID interno (UUID)
   * GET /api/sessao/:id
   */
  static async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const sessao = await SessaoModel.buscarPorId(id);
      if (!sessao) {
        res.status(404).json({ error: 'Sessão não encontrada' });
        return;
      }
      res.json({ data: sessao });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao buscar sessão' });
    }
  }

  /**
   * Busca sessão pelo token de pareamento (utilizado pelo jogo externo)
   * GET /api/sessao/token/:token
   */
  static async buscarPorToken(req: Request, res: Response): Promise<void> {
    try {
      const token = String(req.params.token);
      const sessao = await SessaoModel.buscarPorToken(token);
      if (!sessao) {
        res.status(404).json({ error: 'Código de sessão inválido ou expirado' });
        return;
      }
      res.json({ data: sessao });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao buscar sessão por token' });
    }
  }

  /**
   * Finaliza uma sessão clínica
   * PATCH /api/sessao/:id/finalizar
   */
  static async finalizar(_req: Request, res: Response): Promise<void> {
    try {
      // Stub para desenvolvimento da finalização
      res.status(501).json({ mensagem: 'Endpoint de finalização de sessão pronto para implementação' });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao finalizar sessão' });
    }
  }

  static async gerarCodigoPareamento(_req: Request, res: Response): Promise<void> {
    try {
      const maxTentativas = 10;
      let tentativasRestantes = maxTentativas;
      let codigo = SessaoTokenService.gerarCodigoPareamento();

      while (tentativasRestantes > 0) {
        const sessaoExistente = await SessaoModel.buscarPorToken(codigo);
        if (!sessaoExistente) {
          break;
        }
        tentativasRestantes--;
        codigo = SessaoTokenService.gerarCodigoPareamento();
      }

      if (tentativasRestantes === 0) {
        res.status(500).json({ error: `Não foi possível gerar um código de pareamento único após ${maxTentativas} tentativas` });
        return;
      }

      res.json({ codigo });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao gerar código de pareamento' });
    }
  }
}