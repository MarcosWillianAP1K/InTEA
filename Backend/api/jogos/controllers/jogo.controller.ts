import { Request, Response } from 'express';
import { JogoModel, FiltrosJogo } from '../models/jogo.model.js';
import { ManifestoValidator } from '../validators/manifesto.validator.js';
import { MetricaValidator } from '../validators/metrica.validator.js';

export class JogoController {
  /**
   * Handles GET /api/jogos to list games filtered by clinical objective with pagination (RF19).
   *
   * @param req - Express request with optional query parameters (objetivo, page, limit).
   * @param res - Express response returning paginated games catalog.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const filtros: FiltrosJogo = {
        objetivo: req.query.objetivo as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };

      const resultado = await JogoModel.listar(filtros);
      res.json(resultado);
    } catch (error) {
      console.error('[JogoController] Erro ao listar jogos:', error);
      res.status(500).json({ error: 'Erro ao listar catálogo de jogos' });
    }
  }

  /**
   * Handles GET /api/jogos/:id to retrieve full game details including its manifest JSON.
   *
   * @param req - Express request containing the game ID in URL parameter `:id`.
   * @param res - Express response returning the game details or 404 if not found.
   * @returns Resolves when the HTTP response has been sent.
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

  /**
   * Handles GET /api/jogos/:id/manifesto to inspect and validate game manifest compliance.
   *
   * @param req - Express request containing the game ID in URL parameter `:id`.
   * @param res - Express response returning the manifest data and compliance validation results.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async obterManifesto(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const jogo = await JogoModel.buscarPorId(id);

      if (!jogo) {
        res.status(404).json({ error: 'Jogo não encontrado' });
        return;
      }

      const validacao = ManifestoValidator.validar(jogo.manifesto_json);

      res.json({
        data: jogo.manifesto_json,
        validacao: {
          valido: validacao.valido,
          erros: validacao.erros
        }
      });
    } catch (error) {
      console.error('[JogoController] Erro ao obter manifesto:', error);
      res.status(500).json({ error: 'Erro ao consultar manifesto do jogo' });
    }
  }

  /**
   * Handles POST /api/jogos/validar-manifesto to validate an arbitrary game manifest against Contract 1 (RNF02).
   *
   * @param req - Express request containing the manifest object in body.
   * @param res - Express response returning status 200 on valid manifest or 400 with validation errors.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async validarManifesto(req: Request, res: Response): Promise<void> {
    try {
      // Aceita tanto payload com { manifesto: {...} } quanto o manifesto diretamente no body
      const manifesto = req.body?.manifesto ?? req.body;
      const resultado = ManifestoValidator.validar(manifesto);

      if (!resultado.valido) {
        res.status(400).json({
          valido: false,
          error: 'Manifesto do jogo inválido',
          erros: resultado.erros
        });
        return;
      }

      res.status(200).json({
        valido: true,
        data: resultado.manifestoValido
      });
    } catch (error) {
      console.error('[JogoController] Erro ao validar manifesto:', error);
      res.status(500).json({ error: 'Erro interno ao validar manifesto' });
    }
  }

  /**
   * Handles POST /api/jogos/:id/validar-telemetria to validate telemetry events against RN02 rules.
   * Blocks recording to the patient's record if the metric does not have strict and valid typing.
   *
   * @param req - Express request containing game ID in `:id` and telemetry event in body.
   * @param res - Express response returning status 200 if recordable, or 422 with rejection details.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async validarTelemetria(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const jogo = await JogoModel.buscarPorId(id);

      if (!jogo) {
        res.status(404).json({ error: 'Jogo não encontrado' });
        return;
      }

      const evento = req.body;
      const resultado = MetricaValidator.validarGravacaoProntuario(evento, jogo.manifesto_json);

      if (!resultado.podeGravar) {
        res.status(422).json({
          podeGravar: false,
          error: resultado.erro,
          regraViolada: 'RN02 - Fallback de Métrica Proibido'
        });
        return;
      }

      res.status(200).json({
        podeGravar: true,
        tipoDetectado: resultado.tipoDetectado,
        metricaHomologada: resultado.metricaHomologada
      });
    } catch (error) {
      console.error('[JogoController] Erro ao validar telemetria:', error);
      res.status(500).json({ error: 'Erro interno ao processar validação de telemetria' });
    }
  }
}
