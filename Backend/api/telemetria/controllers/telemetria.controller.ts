// ==============================================================================
// InTEA: Controller de Telemetria Clínica (Sprint 9)
// ==============================================================================

import { Request, Response } from 'express';
import { TelemetriaService } from '../services/telemetria.service.js';
import { TelemetriaAgregacaoService } from '../services/telemetria-agregacao.service.js';
import { SessaoModel } from '../../sessao/models/sessao.model.js';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import { validarUUID } from '../../../core/utils/validators.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

export class TelemetriaController {
  /**
   * Handles POST /api/telemetria to ingest an individual clinical telemetry event.
   *
   * @param req - Express request containing session ID or token, event type, and telemetry data.
   * @param res - Express response returning the recorded telemetry event or persistence status.
   * @returns Resolves when the HTTP response has been sent.
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
   * Handles POST /api/telemetria/lote to batch ingest multiple telemetry events.
   *
   * @param req - Express request containing session ID or token and an array of telemetry events.
   * @param res - Express response returning the batch processing results and statistics.
   * @returns Resolves when the HTTP response has been sent.
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
   * Handles GET /api/telemetria/sessao/:sessaoId to list telemetry events for a session.
   *
   * @param req - Express request containing session UUID in `:sessaoId` and optional filters/pagination.
   * @param res - Express response returning the array of telemetry events.
   * @returns Resolves when the HTTP response has been sent.
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
      const isSuperAdmin =
        usuarioLogado?.user_metadata?.is_super_admin === true ||
        usuarioLogado?.is_super_admin === true;
      const isDonoDaSessao = Boolean(usuarioLogado?.id && sessao.terapeuta_id === usuarioLogado.id);

      if (!isSuperAdmin && !isDonoDaSessao) {
        const autorizado = await TelemetriaController.verificarVinculoInstitucionalRN04(
          usuarioLogado?.id,
          sessao.paciente_id
        );
        if (!autorizado) {
          res.status(403).json({
            error: 'Acesso negado: você não possui vínculo institucional com esta sessão clínica (RN04).',
          });
          return;
        }
      }

      const telemetrias = await TelemetriaService.listarPorSessao(sessaoId, idMetrica, limite, pagina);
      res.status(200).json({
        data: telemetrias,
        meta: {
          pagina,
          limite: limite ?? null,
          total_pagina: telemetrias.length,
        },
        ...(limite ? { pagina, limite, total_pagina: telemetrias.length } : {}),
      });
    } catch (error) {
      console.error('[TelemetriaController] Erro ao buscar telemetria:', error);
      res.status(500).json({ error: 'Erro interno ao buscar eventos de telemetria' });
    }
  }

  /**
   * Handles GET /api/telemetria/sessao/:sessaoId/agregada to retrieve aggregated telemetry metrics.
   *
   * @param req - Express request containing session UUID in URL parameter `:sessaoId`.
   * @param res - Express response returning aggregated session statistics.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async obterEstatisticasSessao(req: Request, res: Response): Promise<void> {
    try {
      const sessaoId = String(req.params.sessaoId || '');

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
      const isSuperAdmin =
        usuarioLogado?.user_metadata?.is_super_admin === true ||
        usuarioLogado?.is_super_admin === true;
      const isDonoDaSessao = Boolean(usuarioLogado?.id && sessao.terapeuta_id === usuarioLogado.id);

      if (!isSuperAdmin && !isDonoDaSessao) {
        const autorizado = await TelemetriaController.verificarVinculoInstitucionalRN04(
          usuarioLogado?.id,
          sessao.paciente_id
        );
        if (!autorizado) {
          res.status(403).json({
            error: 'Acesso negado: você não possui vínculo institucional com esta sessão clínica (RN04).',
          });
          return;
        }
      }

      const consolidado = await TelemetriaAgregacaoService.compilarPorSessaoId(sessaoId);
      if (!consolidado) {
        res.status(404).json({ error: 'Não foi possível consolidar a telemetria para a sessão especificada' });
        return;
      }

      res.status(200).json({
        data: consolidado,
      });
    } catch (error) {
      console.error('[TelemetriaController] Erro ao agregar telemetria da sessão:', error);
      res.status(500).json({ error: 'Erro interno ao agregar telemetria da sessão' });
    }
  }

  /**
   * Valida se o terapeuta pertence à mesma clinica_id e possui vínculo ativo em terapeuta_paciente (RN04)
   */
  private static async verificarVinculoInstitucionalRN04(
    terapeutaId?: string,
    pacienteId?: string | null
  ): Promise<boolean> {
    if (!terapeutaId || !pacienteId) return false;

    try {
      const { data: terapeuta } = await supabase
        .from('terapeuta')
        .select('id, clinica_id, is_super_admin, status_ativo')
        .eq('id', terapeutaId)
        .maybeSingle();

      if (!terapeuta || terapeuta.status_ativo === false) return false;
      if (terapeuta.is_super_admin) return true;

      const { data: paciente } = await supabase
        .from('paciente')
        .select('id, clinica_id, status_ativo')
        .eq('id', pacienteId)
        .maybeSingle();

      if (!paciente || paciente.status_ativo === false) return false;

      if (terapeuta.clinica_id && paciente.clinica_id && terapeuta.clinica_id !== paciente.clinica_id) {
        return false;
      }

      const { data: vinculo } = await supabase
        .from('terapeuta_paciente')
        .select('paciente_id')
        .eq('terapeuta_id', terapeuta.id)
        .eq('paciente_id', pacienteId)
        .maybeSingle();

      return Boolean(vinculo);
    } catch {
      return false;
    }
  }
}

