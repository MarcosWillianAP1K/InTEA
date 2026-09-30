// ==============================================================================
// InTEA: Controller de Sessão e Pareamento Remoto
// ==============================================================================

import { Request, Response } from 'express';
import { SessaoModel, CriarSessaoDTO } from '../models/sessao.model.js';
import { SessaoTokenService } from '../services/sessao-token.service.js';

export class SessaoController {
  /**
   * Inicia uma nova sessão clínica ou em modo livre
   * POST /api/sessao
   */
  static async iniciar(req: Request, res: Response): Promise<void> {
    try {
      const {
        terapeuta_id,
        jogo_id,
        paciente_id,
        modo_sessao = 'sessao_clinica',
        contexto_dda_json = {},
        codigo_pareamento,
      } = req.body;

      if (!terapeuta_id || !jogo_id) {
        res.status(400).json({ error: 'Os campos terapeuta_id e jogo_id são obrigatórios' });
        return;
      }

      // Validação da regra RN01 (Modo Livre sem paciente / Sessão Clínica com paciente)
      if (modo_sessao === 'sessao_clinica' && !paciente_id) {
        res.status(400).json({ error: 'O paciente_id é obrigatório para sessões clínicas (RN01)' });
        return;
      }

      if (modo_sessao === 'modo_livre' && paciente_id) {
        res.status(400).json({ error: 'Partidas em modo livre não podem ter paciente vinculado (RN01)' });
        return;
      }

      const dadosSessao: CriarSessaoDTO = {
        terapeuta_id,
        jogo_id,
        paciente_id: modo_sessao === 'modo_livre' ? null : paciente_id,
        modo_sessao,
        contexto_dda_json,
        codigo_pareamento,
      };

      const novaSessao = await SessaoModel.criar(dadosSessao);

      if (!novaSessao) {
        res.status(500).json({ error: 'Erro ao criar a sessão no banco de dados' });
        return;
      }

      res.status(201).json({ data: novaSessao });
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
  static async finalizar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const sessaoAtualizada = await SessaoModel.atualizarStatus(id, 'finalizada');
      if (!sessaoAtualizada) {
        res.status(404).json({ error: 'Sessão não encontrada para finalização' });
        return;
      }
      res.json({ data: sessaoAtualizada });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao finalizar sessão' });
    }
  }

  /**
   * Gera um código de pareamento único para a sessão
   * GET /api/sessao/gerarCodigoPareamento
   */
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