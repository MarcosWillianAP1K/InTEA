// ==============================================================================
// InTEA: Controller de Telemetria Clínica (Sprint 9)
// ==============================================================================

import { Request, Response } from 'express';
import { TelemetriaService } from '../services/telemetria.service.js';
import { SessaoModel } from '../../sessao/models/sessao.model.js';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import { validarUUID } from '../../../core/utils/validators.js';

export class TelemetriaController {
  /**
   * Ingestão de um evento individual de telemetria
   * POST /api/telemetria
   */
  static async registrar(req: Request, res: Response): Promise<void> {
    try {
      const { sessao_id, token_sessao, tipo_evento, dados, data_hora } = req.body || {};

      const identificador = sessao_id || token_sessao;
      if (!identificador || !tipo_evento || !dados || !dados.id_metrica) {
        res.status(400).json({
          error: 'Campos obrigatórios ausentes: sessao_id/token_sessao, tipo_evento, dados e dados.id_metrica são obrigatórios',
        });
        return;
      }

      const resultado = await TelemetriaService.persistirEvento(identificador, {
        tipo_evento,
        dados,
        data_hora: data_hora || new Date().toISOString(),
      });

      if (!resultado.persistido && resultado.motivo?.includes('Sessão não encontrada')) {
        res.status(404).json({ error: resultado.motivo });
        return;
      }

      if (!resultado.persistido && resultado.motivo?.includes('sessao_inativa')) {
        res.status(409).json({
          error: 'Não é possível registrar telemetria para uma sessão que não está em andamento.',
          detalhes: resultado.motivo,
          persistido: false,
        });
        return;
      }

      if (!resultado.persistido && resultado.motivo?.includes('RN01')) {
        res.status(200).json({
          message: 'Evento processado em memória (Modo Livre não persiste telemetria - RN01)',
          persistido: false,
        });
        return;
      }

      res.status(201).json({
        message: 'Evento de telemetria registrado com sucesso',
        data: resultado.dados,
        persistido: true,
      });
    } catch (error) {
      console.error('[TelemetriaController] Erro ao registrar telemetria:', error);
      res.status(500).json({ error: 'Erro interno ao registrar evento de telemetria' });
    }
  }

  /**
   * Ingestão em lote (batch insert) de telemetria
   * POST /api/telemetria/lote
   */
  static async registrarLote(req: Request, res: Response): Promise<void> {
    try {
      const { sessao_id, token_sessao, eventos } = req.body || {};

      const identificador = sessao_id || token_sessao;
      if (!identificador || !Array.isArray(eventos) || eventos.length === 0) {
        res.status(400).json({
          error: 'Identificador de sessão (sessao_id ou token_sessao) e array eventos são obrigatórios',
        });
        return;
      }

      if (eventos.length > 500) {
        res.status(400).json({
          error: 'Limite máximo de 500 eventos por lote excedido',
        });
        return;
      }

      // Validação detalhada de integridade de cada evento do lote
      for (let i = 0; i < eventos.length; i++) {
        const evt = eventos[i];
        if (!evt || typeof evt !== 'object') {
          res.status(400).json({ error: `Elemento no índice ${i} do lote não é um objeto válido` });
          return;
        }
        if (!evt.tipo_evento || typeof evt.tipo_evento !== 'string') {
          res.status(400).json({ error: `Campo 'tipo_evento' ausente ou inválido no índice ${i} do lote` });
          return;
        }
        if (!evt.dados || typeof evt.dados !== 'object' || !evt.dados.id_metrica) {
          res.status(400).json({ error: `Objeto 'dados' com 'id_metrica' obrigatório no índice ${i} do lote` });
          return;
        }
      }

      const resultado = await TelemetriaService.persistirLote(identificador, eventos);

      if (!resultado.persistido && resultado.motivo?.includes('Sessão não encontrada')) {
        res.status(404).json({ error: resultado.motivo });
        return;
      }

      if (!resultado.persistido && resultado.motivo?.includes('sessao_inativa')) {
        res.status(409).json({
          error: 'Não é possível registrar telemetria para uma sessão que não está em andamento.',
          detalhes: resultado.motivo,
          total: resultado.total,
          persistido: false,
        });
        return;
      }

      if (!resultado.persistido && resultado.motivo?.includes('RN01')) {
        res.status(200).json({
          message: 'Lote processado em memória (Modo Livre não persiste telemetria - RN01)',
          total: resultado.total,
          persistido: false,
        });
        return;
      }

      res.status(201).json({
        message: 'Lote de telemetria registrado com sucesso',
        total: resultado.total,
        data: resultado.dados,
        persistido: true,
      });
    } catch (error) {
      console.error('[TelemetriaController] Erro ao registrar lote de telemetria:', error);
      res.status(500).json({ error: 'Erro interno ao registrar lote de telemetria' });
    }
  }

  /**
   * Consulta histórico de eventos da sessão com filtro opcional por métrica, paginação e RN04
   * GET /api/telemetria/sessao/:sessaoId
   */
  static async listarPorSessao(req: Request, res: Response): Promise<void> {
    try {
      const sessaoId = String(req.params.sessaoId || '');
      const idMetrica = req.query.metrica ? String(req.query.metrica) : undefined;
      const limite = req.query.limite ? parseInt(String(req.query.limite), 10) : undefined;
      const pagina = req.query.pagina ? parseInt(String(req.query.pagina), 10) : 1;

      if (!sessaoId || !validarUUID(sessaoId)) {
        res.status(400).json({ error: 'Parâmetro sessaoId obrigatório e deve ser um UUID válido' });
        return;
      }

      // Validação de existência da sessão e regra RN04 (Visibilidade Institucional)
      const sessao = await SessaoModel.buscarPorId(sessaoId);
      if (!sessao) {
        res.status(404).json({ error: 'Sessão não encontrada' });
        return;
      }

      const usuarioLogado = (req as AuthenticatedRequest).user;
      const isSuperAdmin = usuarioLogado?.user_metadata?.is_super_admin === true;
      const isDonoDaSessao = sessao.terapeuta_id === usuarioLogado?.id;

      if (!isSuperAdmin && !isDonoDaSessao) {
        res.status(403).json({
          error: 'Acesso negado: você não possui vínculo institucional com esta sessão clínica (RN04).',
        });
        return;
      }

      const telemetrias = await TelemetriaService.listarPorSessao(sessaoId, idMetrica, limite, pagina);
      res.status(200).json({
        data: telemetrias,
        ...(limite ? { pagina, limite, total_pagina: telemetrias.length } : {}),
      });
    } catch (error) {
      console.error('[TelemetriaController] Erro ao buscar telemetria:', error);
      res.status(500).json({ error: 'Erro interno ao buscar eventos de telemetria' });
    }
  }
}
