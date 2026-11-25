// ==============================================================================
// InTEA: Controller da Trilha Unificada de Auditoria Clínica e Ecossistema (Item 3)
// ==============================================================================
// Padrão Arquitetural: Envelope Pattern Categorizado Estrito ({ data: { ... }, message })
// Leitura 100% restrita a SuperAdmins; escrita de eventos de sessão via POST validada por vínculo institucional.
// ==============================================================================

import { Request, Response } from 'express';
import { AuditoriaService } from '../services/auditoria.service.js';
import { AuditoriaProntuarioService } from '../auditoria-prontuario.service.js';
import { AuditoriaSessao } from '../models/auditoria.model.js';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import { validarUUID } from '../../../core/utils/validators.js';
import { extrairContextoHttp } from '../../../core/utils/http-context.js';

export class AuditoriaController {
  /**
   * Recursively sanitizes JSON details by removing tokens, secrets, and sensitive data (LGPD).
   */
  static sanitizarDetalhesJson(detalhes?: Record<string, unknown>): Record<string, unknown> {
    if (!detalhes || typeof detalhes !== 'object') return {};
    const chavesSensiveis = [
      'senha',
      'password',
      'token',
      'secret',
      'hash',
      'access_token',
      'refresh_token',
      'service_role',
    ];
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
   * Sanitizes an audit event record by expunging potentially sensitive data.
   */
  static sanitizarEvento(evento: AuditoriaSessao): AuditoriaSessao {
    return {
      id: evento.id,
      entidade: evento.entidade,
      sessao_id: evento.sessao_id,
      terapeuta_id: evento.terapeuta_id,
      terapeuta_nome: evento.terapeuta_nome,
      terapeuta_email: evento.terapeuta_email,
      paciente_id: evento.paciente_id,
      paciente_nome: evento.paciente_nome,
      clinica_id: evento.clinica_id,
      clinica_nome: evento.clinica_nome,
      recurso_id: evento.recurso_id,
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
   * Handles GET /api/auditoria/sessao/:sessaoId (SuperAdmin only).
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
   * Handles GET /api/auditoria (SuperAdmin only) to list unified audit events with pagination and filters.
   */
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const usuarioLogado = (req as AuthenticatedRequest).user;
      const isSuperAdmin = await AuditoriaService.verificarSuperAdmin(usuarioLogado);

      if (!isSuperAdmin) {
        res.status(403).json({
          error: 'Acesso negado: a consulta à trilha global de auditoria é restrita exclusivamente a SuperAdmins (RF07 / RF08).',
        });
        return;
      }

      const query = (req.query || {}) as Record<string, string | undefined>;

      const pacienteIdRaw = query.pacienteId || query.paciente_id;
      const pacienteId =
        typeof pacienteIdRaw === 'string' && pacienteIdRaw.trim() !== ''
          ? pacienteIdRaw.trim()
          : undefined;

      if (pacienteId && !validarUUID(pacienteId)) {
        res.status(400).json({ error: 'O parâmetro pacienteId deve ser um UUID válido.' });
        return;
      }

      const clinicaIdRaw = query.clinicaId || query.clinica_id;
      const clinicaId =
        typeof clinicaIdRaw === 'string' && clinicaIdRaw.trim() !== ''
          ? clinicaIdRaw.trim()
          : undefined;

      if (clinicaId && !validarUUID(clinicaId)) {
        res.status(400).json({ error: 'O parâmetro clinicaId deve ser um UUID válido.' });
        return;
      }

      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));

      const { auditoria, total } = await AuditoriaService.listarComFiltros(
        {
          busca: query.busca,
          entidade: query.entidade,
          terapeutaId: query.terapeutaId,
          ...(pacienteId ? { pacienteId } : {}),
          ...(clinicaId ? { clinicaId } : {}),
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
   * Handles GET /api/auditoria/estatisticas (SuperAdmin only).
   */
  static async obterEstatisticas(req: Request, res: Response): Promise<void> {
    try {
      const usuarioLogado = (req as AuthenticatedRequest).user;
      const isSuperAdmin = await AuditoriaService.verificarSuperAdmin(usuarioLogado);

      if (!isSuperAdmin) {
        res.status(403).json({
          error: 'Acesso negado: as estatísticas de auditoria são restritas exclusivamente a SuperAdmins (RF07 / RF08).',
        });
        return;
      }

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
   * Handles POST /api/auditoria to formally record an immutable audit event for a clinical session.
   */
  static async registrarEvento(req: Request, res: Response): Promise<void> {
    try {
      const usuarioLogado = (req as AuthenticatedRequest).user;
      const body = (req.body || {}) as Record<string, unknown>;
      const { sessao_id, origem, acao, entidade, detalhes_json, terapeuta_id: terapeutaIdBody } = body;

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

      // Guarda Anti-Spoofing de terapeuta
      if (
        terapeutaIdBody &&
        typeof terapeutaIdBody === 'string' &&
        usuarioLogado?.id &&
        terapeutaIdBody !== usuarioLogado.id
      ) {
        const isSuperAdmin = await AuditoriaService.verificarSuperAdmin(usuarioLogado);
        if (!isSuperAdmin) {
          res.status(403).json({
            error: 'Acesso negado: tentativa de registrar auditoria para outro terapeuta não autorizada (RF21).',
          });
          return;
        }
      }

      // Validação de acesso e vínculo institucional com a sessão clínica
      const validacao = await AuditoriaService.validarAcessoRegistroEvento(sessao_id, usuarioLogado);
      if (!validacao.autorizado) {
        res.status(validacao.statusHttp || 403).json({ error: validacao.motivo });
        return;
      }

      const contextoHttp = extrairContextoHttp(req);
      const clientIp = contextoHttp.ip || (typeof body.ip === 'string' ? body.ip : null);
      const clientUserAgent =
        contextoHttp.userAgent || (typeof body.user_agent === 'string' ? body.user_agent : null);

      const detalhesSanitizados = AuditoriaController.sanitizarDetalhesJson(
        typeof detalhes_json === 'object' && detalhes_json !== null
          ? (detalhes_json as Record<string, unknown>)
          : {}
      );

      const novoEvento = await AuditoriaService.registrarEvento({
        entidade: typeof entidade === 'string' && entidade.trim() !== '' ? entidade.trim() : 'sessao',
        sessao_id,
        terapeuta_id: usuarioLogado?.id || (typeof terapeutaIdBody === 'string' ? terapeutaIdBody : null),
        recurso_id: sessao_id,
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

  /**
   * Handles GET /api/auditoria/prontuario to query patient health record access audit logs (SuperAdmin only).
   *
   * @param req - Express request containing filter query params (`paciente_id`, `terapeuta_id`, `operacao`, `periodo`, `page`, `limit`).
   * @param res - Express response returning paginated access audit records.
   */
  static async consultarAcessosProntuario(req: Request, res: Response): Promise<void> {
    try {
      const {
        paciente_id,
        pacienteId,
        terapeuta_id,
        terapeutaId,
        operacao,
        data_inicio,
        dataInicio,
        data_fim,
        dataFim,
        periodo,
        page,
        limit,
      } = req.query as Record<string, string | undefined>;

      const resultado = await AuditoriaProntuarioService.consultarAcessos({
        paciente_id: paciente_id || pacienteId,
        terapeuta_id: terapeuta_id || terapeutaId,
        operacao,
        data_inicio: data_inicio || dataInicio,
        data_fim: data_fim || dataFim,
        periodo,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      });

      res.status(200).json({
        data: {
          acessos: resultado.data,
          meta: {
            total: resultado.total,
            pagina: resultado.page,
            limite: resultado.limit,
            total_paginas: resultado.totalPages,
          },
        },
        message: 'Registros de auditoria de prontuário recuperados com sucesso.',
      });
    } catch (error) {
      console.error('[AuditoriaController] Erro ao consultar acessos a prontuário:', error);
      res.status(500).json({ error: 'Erro interno ao consultar auditoria de prontuário' });
    }
  }
}
