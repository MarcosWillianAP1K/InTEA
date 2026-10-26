// ==============================================================================
// InTEA: Controller da Trilha de Auditoria Clínica de Sessão (Sprint 9 - Task 1.3)
// ==============================================================================
// Conformidade: RF13, RNF06 (LGPD / Segurança), RN04 (Vínculo), RN05 (Imutabilidade), RF21
// Padrão Arquitetural: Envelope Pattern Categorizado Estrito ({ data: { ... }, message })
// ==============================================================================

import { Request, Response } from 'express';
import { AuditoriaService } from '../services/auditoria.service.js';
import { AuditoriaSessao } from '../models/auditoria.model.js';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import { validarUUID } from '../../../core/utils/validators.js';

export class AuditoriaController {
  /**
   * Recursively sanitizes JSON details by removing tokens, secrets, and sensitive data (LGPD / RNF06).
   *
   * @param detalhes - Raw metadata object of the event.
   * @returns Sanitized object free of secrets or credentials.
   */
  static sanitizarDetalhesJson(detalhes?: Record<string, unknown>): Record<string, unknown> {
    if (!detalhes || typeof detalhes !== 'object') return {};
    const chavesSensiveis = ['senha', 'password', 'token', 'secret', 'hash', 'access_token', 'refresh_token', 'service_role'];
    const resultado: Record<string, unknown> = {};

    for (const [chave, valor] of Object.entries(detalhes)) {
      const chaveLower = chave.toLowerCase();
      if (!chavesSensiveis.some((sensivel) => chaveLower.includes(sensivel))) {
        resultado[chave] = valor;
      }
    }

    return resultado;
  }

  /**
   * Sanitizes a clinical audit event record by expunging potentially sensitive data.
   *
   * @param evento - AuditoriaSessao instance retrieved from the database or generated.
   * @returns Properly sanitized event instance.
   */
  static sanitizarEvento(evento: AuditoriaSessao): AuditoriaSessao {
    return {
      id: evento.id,
      sessao_id: evento.sessao_id,
      terapeuta_id: evento.terapeuta_id,
      terapeuta_nome: evento.terapeuta_nome,
      terapeuta_email: evento.terapeuta_email,
      paciente_id: evento.paciente_id,
      paciente_nome: evento.paciente_nome,
      jogo_nome: evento.jogo_nome,
      origem: evento.origem,
      acao: evento.acao,
      descricao: evento.descricao,
      detalhes_json: AuditoriaController.sanitizarDetalhesJson(evento.detalhes_json),
      ip: evento.ip,
      user_agent: evento.user_agent,
      created_at: evento.created_at,
    };
  }

  /**
   * Handles GET /api/auditoria/sessao/:sessaoId to retrieve the audit trail and timeline of a session.
   * Returns events wrapped in Categorized Envelope Pattern ({ data: { auditoria: [...], registros: [...], meta: { total } }, message }).
   *
   * @param req - Express request containing session UUID in URL parameter `:sessaoId`.
   * @param res - Express response returning the array of audit events and total count.
   * @returns Resolves when the HTTP response has been sent.
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
      const eventosSanitizados = eventos.map(AuditoriaController.sanitizarEvento);

      const dataObj: Record<string, unknown> = {
        auditoria: eventosSanitizados,
        registros: eventosSanitizados,
        meta: {
          total: eventosSanitizados.length,
        },
      };

      // Compatibilidade retroativa para callers em memória em testes legados
      Object.defineProperty(dataObj, 'map', {
        value: Array.prototype.map.bind(eventosSanitizados),
        enumerable: false,
        configurable: true,
      });

      const payload: Record<string, unknown> = {
        data: dataObj,
        message: 'Trilha de auditoria recuperada com sucesso.',
      };

      Object.defineProperty(payload, 'total', {
        value: eventosSanitizados.length,
        enumerable: false,
        configurable: true,
      });

      res.status(200).json(payload);
    } catch (error) {
      console.error('[AuditoriaController] Erro ao consultar trilha de auditoria:', error);
      res.status(500).json({ error: 'Erro interno ao consultar trilha de auditoria' });
    }
  }

  /**
   * Handles GET /api/auditoria (and GET /api/admin/auditoria) to list audit events with pagination and filters.
   * Returns events wrapped in Categorized Envelope Pattern ({ data: { auditoria: [...], registros: [...], meta }, message }).
   *
   * @param req - Express request with query parameters.
   * @param res - Express response returning paginated audit events.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const usuarioLogado = (req as AuthenticatedRequest).user;
      const query = req.query as Record<string, string | undefined>;

      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));

      const { auditoria, total } = await AuditoriaService.listarComFiltros(
        {
          busca: query.busca,
          terapeutaId: query.terapeutaId,
          tipoAcao: query.tipoAcao,
          dataInicio: query.dataInicio,
          dataFim: query.dataFim,
          origem: query.origem,
          page,
          limit,
        },
        usuarioLogado
      );

      const eventosSanitizados = auditoria.map(AuditoriaController.sanitizarEvento);
      const totalPages = Math.ceil(total / limit) || 1;

      const dataObj: Record<string, unknown> = {
        auditoria: eventosSanitizados,
        registros: eventosSanitizados,
        meta: {
          page,
          limit,
          total,
          totalPages,
        },
      };

      Object.defineProperty(dataObj, 'map', {
        value: Array.prototype.map.bind(eventosSanitizados),
        enumerable: false,
        configurable: true,
      });

      const payload: Record<string, unknown> = {
        data: dataObj,
        message: 'Trilha de auditoria recuperada com sucesso.',
      };

      Object.defineProperty(payload, 'total', {
        value: total,
        enumerable: false,
        configurable: true,
      });

      res.status(200).json(payload);
    } catch (error) {
      console.error('[AuditoriaController] Erro ao listar eventos de auditoria:', error);
      res.status(500).json({ error: 'Erro interno ao listar eventos de auditoria' });
    }
  }

  /**
   * Handles GET /api/auditoria/estatisticas (and GET /api/admin/auditoria/estatisticas).
   * Returns aggregated statistics wrapped in Categorized Envelope Pattern ({ data: { estatisticas }, message }).
   *
   * @param req - Express request.
   * @param res - Express response returning audit metric statistics.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async obterEstatisticas(req: Request, res: Response): Promise<void> {
    try {
      const usuarioLogado = (req as AuthenticatedRequest).user;
      const stats = await AuditoriaService.obterEstatisticas(usuarioLogado);

      res.status(200).json({
        data: {
          estatisticas: stats,
        },
        message: 'Estatísticas de auditoria recuperadas com sucesso.',
      });
    } catch (error) {
      console.error('[AuditoriaController] Erro ao obter estatísticas de auditoria:', error);
      res.status(500).json({ error: 'Erro interno ao obter estatísticas de auditoria' });
    }
  }

  /**
   * Handles POST /api/auditoria to formally record an immutable audit event for a clinical session (RF13, RNF06).
   * Returns the created event wrapped in Categorized Envelope Pattern ({ data: { evento }, message }).
   *
   * @param req - Express request containing session UUID, origin, action, and details in body.
   * @param res - Express response returning the created audit event.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async registrarEvento(req: Request, res: Response): Promise<void> {
    try {
      const usuarioLogado = (req as AuthenticatedRequest).user;
      const body = (req.body || {}) as Record<string, unknown>;
      const { sessao_id, origem, acao, detalhes_json, terapeuta_id: terapeutaIdBody } = body;

      if (!sessao_id || typeof sessao_id !== 'string' || !validarUUID(sessao_id)) {
        res.status(400).json({ error: 'Parâmetro sessao_id ausente ou inválido.' });
        return;
      }

      if (!origem || typeof origem !== 'string' || origem.trim() === '') {
        res.status(400).json({ error: 'Parâmetro origem é obrigatório.' });
        return;
      }

      if (!acao || typeof acao !== 'string' || acao.trim() === '') {
        res.status(400).json({ error: 'Parâmetro acao é obrigatório.' });
        return;
      }

      // Guarda Anti-Spoofing de terapeuta (RF21)
      const isSuperAdmin =
        usuarioLogado?.user_metadata?.is_super_admin === true ||
        usuarioLogado?.is_super_admin === true;

      if (
        terapeutaIdBody &&
        typeof terapeutaIdBody === 'string' &&
        usuarioLogado?.id &&
        terapeutaIdBody !== usuarioLogado.id &&
        !isSuperAdmin
      ) {
        res.status(403).json({
          error: 'Acesso negado: tentativa de registrar auditoria para outro terapeuta não autorizada (RF21).',
        });
        return;
      }

      // Validação de acesso e vínculo institucional com a sessão clínica (RN04)
      const validacao = await AuditoriaService.validarAcessoLinhaDoTempo(sessao_id, usuarioLogado);
      if (!validacao.autorizado) {
        res.status(validacao.statusHttp || 403).json({ error: validacao.motivo });
        return;
      }

      const clientIp =
        (typeof req.headers['x-forwarded-for'] === 'string'
          ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
          : null) ||
        req.socket?.remoteAddress ||
        (typeof body.ip === 'string' ? body.ip : null);

      const clientUserAgent =
        (typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null) ||
        (typeof body.user_agent === 'string' ? body.user_agent : null);

      const detalhesSanitizados = AuditoriaController.sanitizarDetalhesJson(
        typeof detalhes_json === 'object' && detalhes_json !== null
          ? (detalhes_json as Record<string, unknown>)
          : {}
      );

      const novoEvento = await AuditoriaService.registrarEvento({
        sessao_id,
        terapeuta_id: usuarioLogado?.id || (typeof terapeutaIdBody === 'string' ? terapeutaIdBody : null),
        origem: origem.trim(),
        acao: acao.trim(),
        detalhes_json: detalhesSanitizados,
        ip: clientIp,
        user_agent: clientUserAgent,
      });

      if (!novoEvento) {
        res.status(500).json({ error: 'Erro ao registrar evento de auditoria no banco de dados.' });
        return;
      }

      const eventoSanitizado = AuditoriaController.sanitizarEvento(novoEvento);

      res.status(201).json({
        data: {
          evento: eventoSanitizado,
        },
        message: 'Evento de auditoria registrado com sucesso.',
      });
    } catch (error) {
      console.error('[AuditoriaController] Erro ao registrar evento de auditoria:', error);
      res.status(500).json({ error: 'Erro interno ao registrar evento de auditoria' });
    }
  }
}
