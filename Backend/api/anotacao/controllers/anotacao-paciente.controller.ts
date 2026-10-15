// ==============================================================================
// InTEA: Controller de Anotações Clínicas de Paciente (sessao_id IS NULL)
// ==============================================================================
// Responsabilidade Única (Thin Controller):
// - Validação de JWT e parâmetros básicos
// - Delegação da regra de negócio para AnotacaoService
// - Mapeamento das respostas HTTP
// ==============================================================================

import { Response } from 'express';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import { AnotacaoService } from '../services/anotacao.service.js';

export class AnotacaoPacienteController {
  /**
   * POST /api/anotacao/paciente
   * Registra parecer clínico geral para um paciente
   */
  static async criar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const usuarioLogadoId = req.user?.id;
      if (!usuarioLogadoId) {
        res.status(401).json({
          error: 'Acesso não autorizado: identificação do terapeuta não encontrada no token de autenticação.',
        });
        return;
      }

      const { terapeuta_id: terapeutaIdBody, paciente_id, conteudo } = req.body || {};

      // Guarda Anti-Spoofing (RF21)
      if (terapeutaIdBody && terapeutaIdBody !== usuarioLogadoId) {
        res.status(403).json({
          error: 'Acesso negado: tentativa de registrar anotação para outro terapeuta não autorizada.',
        });
        return;
      }

      const resultado = await AnotacaoService.criarAnotacaoPaciente(usuarioLogadoId, String(paciente_id || ''), conteudo);

      if (!resultado.sucesso) {
        res.status(resultado.status).json({ error: resultado.erro });
        return;
      }

      res.status(201).json({ data: resultado.dados });
    } catch (error) {
      console.error('[AnotacaoPacienteController.criar]', error);
      res.status(500).json({ error: 'Erro interno ao criar anotação clínica de paciente.' });
    }
  }

  /**
   * GET /api/anotacao/paciente/:pacienteId
   * Lista histórico de anotações gerais de um paciente
   */
  static async listarPorPaciente(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params.pacienteId || '');
      const resultado = await AnotacaoService.listarAnotacoesPaciente(pacienteId);

      res.status(200).json({ data: resultado.dados });
    } catch (error) {
      console.error('[AnotacaoPacienteController.listarPorPaciente]', error);
      res.status(500).json({ error: 'Erro interno ao consultar anotações do paciente.' });
    }
  }

  /**
   * PATCH /api/anotacao/paciente/:id
   * Atualiza o conteúdo da anotação de paciente (exclusivo do autor)
   */
  static async atualizar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const usuarioLogadoId = req.user?.id;
      if (!usuarioLogadoId) {
        res.status(401).json({
          error: 'Acesso não autorizado: identificação do terapeuta não encontrada no token de autenticação.',
        });
        return;
      }

      const anotacao = req.contextoAnotacao;
      const { conteudo } = req.body || {};

      if (conteudo === undefined || typeof conteudo !== 'string') {
        res.status(400).json({ error: 'O campo conteudo é obrigatório para atualização.' });
        return;
      }

      const resultado = await AnotacaoService.atualizarConteudo(anotacao, usuarioLogadoId, conteudo);

      if (!resultado.sucesso) {
        res.status(resultado.status).json({ error: resultado.erro });
        return;
      }

      res.status(200).json({ data: resultado.dados });
    } catch (error) {
      console.error('[AnotacaoPacienteController.atualizar]', error);
      res.status(500).json({ error: 'Erro interno ao atualizar anotação de paciente.' });
    }
  }

  /**
   * DELETE /api/anotacao/paciente/:id
   * Soft delete da anotação de paciente (RN05, exclusivo do autor)
   */
  static async deletar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const usuarioLogadoId = req.user?.id;
      if (!usuarioLogadoId) {
        res.status(401).json({
          error: 'Acesso não autorizado: identificação do terapeuta não encontrada no token de autenticação.',
        });
        return;
      }

      const anotacao = req.contextoAnotacao;
      const resultado = await AnotacaoService.softDelete(anotacao, usuarioLogadoId);

      if (!resultado.sucesso) {
        res.status(resultado.status).json({ error: resultado.erro });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('[AnotacaoPacienteController.deletar]', error);
      res.status(500).json({ error: 'Erro interno ao excluir anotação de paciente.' });
    }
  }

  /**
   * DELETE /api/anotacao/paciente/:id/hard
   * [DEV/TESTES] Exclusão física permanente (admin only)
   */
  static async deletarHard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || '');
      const resultado = await AnotacaoService.hardDeleteDev(id);

      if (!resultado.sucesso) {
        res.status(resultado.status).json({ error: resultado.erro });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('[AnotacaoPacienteController.deletarHard]', error);
      res.status(500).json({ error: 'Erro interno ao executar exclusão física de anotação.' });
    }
  }
}
