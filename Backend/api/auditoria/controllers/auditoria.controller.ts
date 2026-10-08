// ==============================================================================
// InTEA: Controller da Trilha de Auditoria Clínica de Sessão (Sprint 9 - Task 1.3)
// ==============================================================================
// Conformidade: RF13, RNF06 (LGPD / Segurança), RN04, RN05
// ==============================================================================

import { Request, Response } from 'express';
import { AuditoriaService } from '../services/auditoria.service.js';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';

export class AuditoriaController {
  /**
   * Consulta a linha do tempo e eventos de auditoria da sessão.
   * GET /api/auditoria/sessao/:sessaoId
   */
  static async consultarLinhaDoTempo(req: Request, res: Response): Promise<void> {
    try {
      const sessaoId = String(req.params.sessaoId || '');
      const usuarioLogado = (req as AuthenticatedRequest).user;

      const validacao = await AuditoriaService.validarAcessoLinhaDoTempo(sessaoId, usuarioLogado);
      if (!validacao.autorizado) {
        res.status(validacao.statusHttp || 403).json({ error: validacao.motivo });
        return;
      }

      const eventos = await AuditoriaService.listarPorSessao(sessaoId);

      res.status(200).json({
        data: eventos,
        total: eventos.length,
      });
    } catch (error) {
      console.error('[AuditoriaController] Erro ao consultar trilha de auditoria:', error);
      res.status(500).json({ error: 'Erro interno ao consultar trilha de auditoria' });
    }
  }
}
