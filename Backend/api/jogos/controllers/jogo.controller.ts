// ==============================================================================
// InTEA: Controller de Jogos Terapêuticos (Camada HTTP / Thin Controller)
// ==============================================================================
// Conformidade: RF09, RF19 (Catálogo), RNF02 (Manifesto), RN02 (Tipagem Estrita)
// ==============================================================================

import { Request, Response } from 'express';
import { FiltrosJogo, StatusJogo } from '../models/jogo.model.js';
import { JogoService, JogoServiceError } from '../services/jogo.service.js';
import { obterMensagemErro } from '../../../core/utils/formatters.js';

export class JogoController {
  /**
   * Delegates technical slug derivation to JogoService.
   */
  static gerarSlug(nome: string): string {
    return JogoService.gerarSlug(nome);
  }

  /**
   * Handles GET /api/jogos to list games filtered by clinical objective and/or status with pagination (RF19).
   */
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const statusQuery = req.query.status as string | undefined;
      const objetivoQuery = req.query.objetivo as string | undefined;

      const filtros: FiltrosJogo = {
        objetivo: objetivoQuery && objetivoQuery !== 'todos' && objetivoQuery !== 'all' ? objetivoQuery : undefined,
        status: statusQuery as StatusJogo | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };

      const resultado = await JogoService.listar(filtros);
      res.json({
        data: resultado.data,
        meta: {
          total: resultado.total,
          page: resultado.page,
          limit: resultado.limit,
          totalPages: resultado.totalPages,
        },
      });
    } catch (error: unknown) {
      if (error instanceof JogoServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('[JogoController] Erro ao listar jogos:', error);
      res.status(500).json({ error: 'Erro ao listar catálogo de jogos' });
    }
  }

  /**
   * Handles GET /api/jogos/:id to retrieve unified game details with its clinical manifest and compliance report (RF09, RNF02).
   */
  static async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const resultado = await JogoService.buscarPorIdOuSlug(id);

      if (!resultado) {
        res.status(404).json({ error: 'Jogo não encontrado' });
        return;
      }

      const { jogo, validacao } = resultado;

      res.json({
        data: {
          id: jogo.id,
          id_jogo: jogo.manifesto_json?.id_jogo ?? String(jogo.id),
          nome: jogo.nome,
          descricao: jogo.descricao,
          versao: jogo.versao,
          status: jogo.status_jogo ?? 'ativo',
          status_jogo: jogo.status_jogo ?? 'ativo',
          objetivo_clinico: jogo.manifesto_json?.objetivo_clinico,
          metricas_suportadas: jogo.manifesto_json?.metricas_suportadas ?? [],
        },
        validacao: {
          valido: validacao.valido,
          erros: validacao.erros,
        },
      });
    } catch (error: unknown) {
      if (error instanceof JogoServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('[JogoController] Erro ao buscar jogo por ID:', error);
      res.status(500).json({ error: 'Erro ao buscar detalhes do jogo' });
    }
  }

  /**
   * Handles POST /api/jogos to register a new therapeutic game in the catalog.
   */
  static async cadastrar(req: Request, res: Response): Promise<void> {
    try {
      const { nome, descricao, versao, status, status_jogo, objetivo_clinico, metricas_suportadas } = req.body ?? {};

      const jogoCriado = await JogoService.cadastrar({
        nome,
        descricao,
        versao,
        status,
        status_jogo,
        objetivo_clinico,
        metricas_suportadas,
      });

      res.status(201).json({
        message: 'Jogo cadastrado com sucesso',
        data: {
          id: jogoCriado.id,
          id_jogo: jogoCriado.manifesto_json?.id_jogo ?? JogoService.gerarSlug(jogoCriado.nome),
          nome: jogoCriado.nome,
          descricao: jogoCriado.descricao,
          versao: jogoCriado.versao,
          status: jogoCriado.status_jogo ?? 'ativo',
          status_jogo: jogoCriado.status_jogo ?? 'ativo',
          objetivo_clinico: jogoCriado.manifesto_json?.objetivo_clinico,
          metricas_suportadas: jogoCriado.manifesto_json?.metricas_suportadas ?? [],
        },
        validacao: {
          valido: true,
          erros: [],
        },
      });
    } catch (error: unknown) {
      if (error instanceof JogoServiceError) {
        res.status(error.statusCode).json({
          error: error.message,
          erros: error.detalhes,
        });
        return;
      }
      console.error('[JogoController] Erro ao cadastrar jogo:', error);
      res.status(500).json({ error: 'Erro interno ao cadastrar jogo' });
    }
  }

  /**
   * Handles PUT/PATCH /api/jogos/:id to update game attributes and/or operational status.
   */
  static async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { nome, descricao, versao, status, status_jogo, objetivo_clinico, metricas_suportadas } = req.body ?? {};

      const jogoAtualizado = await JogoService.atualizar(id, {
        nome,
        descricao,
        versao,
        status,
        status_jogo,
        objetivo_clinico,
        metricas_suportadas,
      });

      res.status(200).json({
        message: 'Jogo atualizado com sucesso',
        data: {
          id: jogoAtualizado.id,
          id_jogo: jogoAtualizado.manifesto_json?.id_jogo ?? String(jogoAtualizado.id),
          nome: jogoAtualizado.nome,
          descricao: jogoAtualizado.descricao,
          versao: jogoAtualizado.versao,
          status: jogoAtualizado.status_jogo ?? 'ativo',
          status_jogo: jogoAtualizado.status_jogo ?? 'ativo',
          objetivo_clinico: jogoAtualizado.manifesto_json?.objetivo_clinico,
          metricas_suportadas: jogoAtualizado.manifesto_json?.metricas_suportadas ?? [],
        },
        validacao: {
          valido: true,
          erros: [],
        },
      });
    } catch (error: unknown) {
      if (error instanceof JogoServiceError) {
        res.status(error.statusCode).json({
          error: error.message,
          erros: error.detalhes,
        });
        return;
      }
      console.error('[JogoController] Erro ao atualizar jogo:', error);
      res.status(500).json({ error: 'Erro interno ao atualizar jogo' });
    }
  }

  /**
   * Handles DELETE /api/jogos/:id to execute a hard delete of a game.
   */
  static async excluir(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const idExcluido = await JogoService.excluir(id);

      res.status(200).json({
        message: 'Jogo excluído com sucesso',
        id: idExcluido,
      });
    } catch (error: unknown) {
      if (error instanceof JogoServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('[JogoController] Erro ao excluir jogo:', error);
      res.status(500).json({ error: 'Erro interno ao excluir jogo' });
    }
  }

  /**
   * Handles POST /api/jogos/validar-manifesto to validate an arbitrary game manifest against Contract 1 (RNF02).
   */
  static async validarManifesto(req: Request, res: Response): Promise<void> {
    try {
      const manifesto = req.body?.manifesto ?? req.body;
      const resultado = JogoService.validarManifesto(manifesto);

      res.status(200).json({
        valido: true,
        data: resultado.manifestoValido,
      });
    } catch (error: unknown) {
      if (error instanceof JogoServiceError) {
        res.status(error.statusCode).json({
          valido: false,
          error: error.message,
          erros: error.detalhes,
        });
        return;
      }
      console.error('[JogoController] Erro ao validar manifesto:', error);
      res.status(500).json({ error: 'Erro interno ao validar manifesto' });
    }
  }

  /**
   * Handles POST /api/jogos/:id/validar-telemetria to validate telemetry events against RN02 rules.
   */
  static async validarTelemetria(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const evento = req.body;

      const resultado = await JogoService.validarTelemetria(id, evento);

      res.status(200).json({
        podeGravar: true,
        tipoDetectado: resultado.tipoDetectado,
        metricaHomologada: resultado.metricaHomologada,
        data: {
          podeGravar: true,
          tipoDetectado: resultado.tipoDetectado,
          metricaHomologada: resultado.metricaHomologada,
        },
      });
    } catch (error: unknown) {
      if (error instanceof JogoServiceError) {
        res.status(error.statusCode).json({
          podeGravar: false,
          error: error.message,
          regraViolada: error.regraViolada,
        });
        return;
      }
      console.error('[JogoController] Erro ao validar telemetria:', error);
      res.status(500).json({ error: 'Erro interno ao processar validação de telemetria' });
    }
  }
}
