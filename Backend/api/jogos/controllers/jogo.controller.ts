import { Request, Response } from 'express';
import { JogoModel, FiltrosJogo } from '../models/jogo.model.js';
import { ManifestoValidator } from '../validators/manifesto.validator.js';
import { MetricaValidator } from '../validators/metrica.validator.js';

export class JogoController {
  /**
   * GET /api/jogos?objetivo=foco_atencional&page=1&limit=10
   * Lista jogos com suporte a filtro por objetivo clínico e paginação (RF19)
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
   * GET /api/jogos/:id
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

  /**
   * GET /api/jogos/:id/manifesto
   * Retorna e valida a conformidade do manifesto de um jogo específico
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
   * POST /api/jogos/validar-manifesto
   * Endpoint de validação de manifesto contra o Contrato 1 (RNF02)
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
   * POST /api/jogos/:id/validar-telemetria
   * Valida evento de telemetria contra a RN02 (bloqueia gravação no prontuário se a métrica não tiver tipagem estrita)
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
