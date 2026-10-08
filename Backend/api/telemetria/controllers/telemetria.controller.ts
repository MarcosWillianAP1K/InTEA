// ==============================================================================
// InTEA: Controller de Telemetria Clínica (Sprint 9)
// ==============================================================================

import { Request, Response } from 'express';
import { TelemetriaService } from '../services/telemetria.service.js';

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

      const resultado = await TelemetriaService.persistirLote(identificador, eventos);

      if (!resultado.persistido && resultado.motivo?.includes('Sessão não encontrada')) {
        res.status(404).json({ error: resultado.motivo });
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
   * Consulta histórico de eventos da sessão com filtro opcional por métrica
   * GET /api/telemetria/sessao/:sessaoId
   */
  static async listarPorSessao(req: Request, res: Response): Promise<void> {
    try {
      const sessaoId = String(req.params.sessaoId || '');
      const idMetrica = req.query.metrica ? String(req.query.metrica) : undefined;

      if (!sessaoId) {
        res.status(400).json({ error: 'Parâmetro sessaoId obrigatório na rota' });
        return;
      }

      const telemetrias = await TelemetriaService.listarPorSessao(sessaoId, idMetrica);
      res.status(200).json({ data: telemetrias });
    } catch (error) {
      console.error('[TelemetriaController] Erro ao buscar telemetria:', error);
      res.status(500).json({ error: 'Erro interno ao buscar eventos de telemetria' });
    }
  }
}
