import type { Request, Response } from 'express';
import { AdminService, AdminServiceError } from '../services/admin.service.js';
import type { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import { eventBus } from '../../../core/events/event-bus.js';
import { extrairContextoHttp } from '../../../core/utils/http-context.js';

// ==============================================================================
// InTEA: Controller de Administração Global (SuperAdmin)
// ==============================================================================
// Padrão: Envelope Pattern estrito ({ data, message })
// ==============================================================================

export class AdminController {
  // ============================================================================
  // MÓDULO DE CLÍNICAS
  // ============================================================================

  /**
   * Handles GET /api/admin/clinicas to list registered clinics with optional filters and pagination.
   *
   * @param req - Express request containing query filters (`busca`, `status_ativo`, `page`, `limit`).
   * @param res - Express response returning paginated clinics and metadata.
   */
  static async listarClinicas(req: Request, res: Response): Promise<void> {
    try {
      const { busca, status_ativo, page, limit } = req.query;

      const resultado = await AdminService.listarClinicas({
        busca: typeof busca === 'string' ? busca : undefined,
        status_ativo:
          status_ativo !== undefined ? status_ativo === 'true' || status_ativo === '1' : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({
        data: {
          clinicas: resultado.itens,
          meta: resultado.meta,
        },
        message: 'Clínicas listadas com sucesso.',
      });
    } catch (error: unknown) {
      AdminController.tratarErro(error, res, 'listar clínicas');
    }
  }

  /**
   * Handles GET /api/admin/clinicas/:id to retrieve a single clinic by UUID.
   *
   * @param req - Express request containing the clinic UUID in `params.id`.
   * @param res - Express response returning the clinic record.
   */
  static async buscarClinicaPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const clinica = await AdminService.buscarClinicaPorId(id);

      res.status(200).json({
        data: {
          clinica,
        },
        message: 'Clínica recuperada com sucesso.',
      });
    } catch (error: unknown) {
      AdminController.tratarErro(error, res, 'buscar clínica');
    }
  }

  /**
   * Handles POST /api/admin/clinicas to register a new clinic and emit an audit event.
   *
   * @param req - Authenticated Express request containing clinic `nome` and optional `cnpj`.
   * @param res - Express response returning HTTP 201 with the created clinic record.
   */
  static async criarClinica(req: Request, res: Response): Promise<void> {
    try {
      const { nome, cnpj } = req.body;
      const clinica = await AdminService.criarClinica({ nome, cnpj });
      const { ip, userAgent } = extrairContextoHttp(req);
      const adminId = (req as AuthenticatedRequest).user?.id ?? null;

      eventBus.emitir('auditoria:evento', {
        entidade: 'clinica',
        acao: 'clinica_criada',
        origem: 'sistema_admin',
        terapeutaId: adminId,
        clinicaId: clinica.id,
        recursoId: clinica.id,
        descricao: `Clínica '${clinica.nome}' cadastrada no painel administrativo.`,
        detalhes: { clinica_id: clinica.id, nome: clinica.nome },
        ip,
        userAgent,
      });

      res.status(201).json({
        data: {
          clinica,
        },
        message: 'Clínica cadastrada com sucesso.',
      });
    } catch (error: unknown) {
      AdminController.tratarErro(error, res, 'cadastrar clínica');
    }
  }

  /**
   * Handles PATCH /api/admin/clinicas/:id to update clinic details and emit an audit event.
   *
   * @param req - Authenticated Express request containing clinic UUID and fields to update.
   * @param res - Express response returning the updated clinic record.
   */
  static async atualizarClinica(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { nome, cnpj, status_ativo } = req.body;

      const clinica = await AdminService.atualizarClinica(id, { nome, cnpj, status_ativo });
      const { ip, userAgent } = extrairContextoHttp(req);
      const adminId = (req as AuthenticatedRequest).user?.id ?? null;

      eventBus.emitir('auditoria:evento', {
        entidade: 'clinica',
        acao: 'clinica_atualizada',
        origem: 'sistema_admin',
        terapeutaId: adminId,
        clinicaId: clinica.id,
        recursoId: clinica.id,
        descricao: `Dados cadastrais da clínica '${clinica.nome}' atualizados.`,
        detalhes: { clinica_id: clinica.id, nome: clinica.nome },
        ip,
        userAgent,
      });

      res.status(200).json({
        data: {
          clinica,
        },
        message: 'Clínica atualizada com sucesso.',
      });
    } catch (error: unknown) {
      AdminController.tratarErro(error, res, 'atualizar clínica');
    }
  }

  /**
   * Handles PATCH /api/admin/clinicas/:id/ativar (or /reativar) to reactivate a clinic.
   *
   * @param req - Authenticated Express request containing the clinic UUID in `params.id`.
   * @param res - Express response returning the reactivated clinic record.
   */
  static async ativarClinica(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const clinica = await AdminService.ativarClinica(id);
      const { ip, userAgent } = extrairContextoHttp(req);
      const adminId = (req as AuthenticatedRequest).user?.id ?? null;

      eventBus.emitir('auditoria:evento', {
        entidade: 'clinica',
        acao: 'clinica_ativada',
        origem: 'sistema_admin',
        terapeutaId: adminId,
        clinicaId: clinica.id,
        recursoId: clinica.id,
        descricao: `Clínica '${clinica.nome}' ativada administrativamente.`,
        detalhes: { clinica_id: clinica.id, status_ativo: true },
        ip,
        userAgent,
      });

      res.status(200).json({
        data: {
          clinica,
        },
        message: 'Clínica ativada com sucesso no sistema.',
      });
    } catch (error: unknown) {
      AdminController.tratarErro(error, res, 'ativar clínica');
    }
  }

  /**
   * Handles PATCH /api/admin/clinicas/:id/desativar to deactivate a clinic (soft delete).
   *
   * @param req - Authenticated Express request containing the clinic UUID in `params.id`.
   * @param res - Express response returning the deactivated clinic record.
   */
  static async desativarClinica(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const clinica = await AdminService.desativarClinica(id);
      const { ip, userAgent } = extrairContextoHttp(req);
      const adminId = (req as AuthenticatedRequest).user?.id ?? null;

      eventBus.emitir('auditoria:evento', {
        entidade: 'clinica',
        acao: 'clinica_desativada',
        origem: 'sistema_admin',
        terapeutaId: adminId,
        clinicaId: clinica.id,
        recursoId: clinica.id,
        descricao: `Clínica '${clinica.nome}' desativada administrativamente.`,
        detalhes: { clinica_id: clinica.id, status_ativo: false },
        ip,
        userAgent,
      });

      res.status(200).json({
        data: {
          clinica,
        },
        message: 'Clínica desativada institucionalmente com sucesso.',
      });
    } catch (error: unknown) {
      AdminController.tratarErro(error, res, 'desativar clínica');
    }
  }

  // ============================================================================
  // MÓDULO DE TERAPEUTAS
  // ============================================================================

  /**
   * Handles GET /api/admin/terapeutas to list therapists across clinics with filters and pagination.
   *
   * @param req - Express request containing filter query params (`busca`, `clinica_id`, `status_ativo`, `is_super_admin`, `page`, `limit`).
   * @param res - Express response returning paginated therapist records and metadata.
   */
  static async listarTerapeutas(req: Request, res: Response): Promise<void> {
    try {
      const { busca, clinica_id, status_ativo, is_super_admin, page, limit } = req.query;

      const resultado = await AdminService.listarTerapeutas({
        busca: typeof busca === 'string' ? busca : undefined,
        clinica_id: typeof clinica_id === 'string' ? clinica_id : undefined,
        status_ativo:
          status_ativo !== undefined ? status_ativo === 'true' || status_ativo === '1' : undefined,
        is_super_admin:
          is_super_admin !== undefined ? is_super_admin === 'true' || is_super_admin === '1' : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({
        data: {
          terapeutas: resultado.itens,
          meta: resultado.meta,
        },
        message: 'Terapeutas listados com sucesso.',
      });
    } catch (error: unknown) {
      AdminController.tratarErro(error, res, 'listar terapeutas');
    }
  }

  /**
   * Handles GET /api/admin/terapeutas/:id to retrieve a therapist profile by UUID.
   *
   * @param req - Express request containing the therapist UUID in `params.id`.
   * @param res - Express response returning the therapist profile.
   */
  static async buscarTerapeutaPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const terapeuta = await AdminService.buscarTerapeutaPorId(id);

      res.status(200).json({
        data: {
          terapeuta,
        },
        message: 'Terapeuta recuperado com sucesso.',
      });
    } catch (error: unknown) {
      AdminController.tratarErro(error, res, 'buscar terapeuta');
    }
  }

  /**
   * Handles PATCH /api/admin/terapeutas/:id to update therapist attributes or privileges as SuperAdmin.
   *
   * @param req - Authenticated Express request containing therapist UUID and fields to update.
   * @param res - Express response returning the updated therapist record.
   */
  static async atualizarTerapeuta(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { clinica_id, especialidade, telefone, is_super_admin, crefito, nome, status_ativo } =
        req.body;

      const terapeuta = await AdminService.atualizarTerapeuta(id, {
        clinica_id,
        especialidade,
        telefone,
        is_super_admin,
        crefito,
        nome,
        status_ativo,
      });

      const { ip, userAgent } = extrairContextoHttp(req);
      eventBus.emitir('auditoria:evento', {
        entidade: 'terapeuta',
        acao: 'terapeuta_atualizado_admin',
        origem: 'sistema_admin',
        terapeutaId: (req as AuthenticatedRequest).user?.id ?? id,
        clinicaId: terapeuta.clinica_id ?? null,
        recursoId: terapeuta.id,
        descricao: `Dados de terapeuta '${terapeuta.nome}' alterados pelo SuperAdmin.`,
        detalhes: { terapeuta_alvo_id: terapeuta.id, is_super_admin: terapeuta.is_super_admin },
        ip,
        userAgent,
      });

      res.status(200).json({
        data: {
          terapeuta,
        },
        message: 'Terapeuta atualizado com sucesso.',
      });
    } catch (error: unknown) {
      AdminController.tratarErro(error, res, 'atualizar terapeuta');
    }
  }

  /**
   * Handles PATCH /api/admin/terapeutas/:id/ativar (or /reativar) to reactivate a therapist account.
   *
   * @param req - Authenticated Express request containing the therapist UUID in `params.id`.
   * @param res - Express response returning the reactivated therapist record.
   */
  static async ativarTerapeuta(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const terapeuta = await AdminService.ativarTerapeuta(id);
      const { ip, userAgent } = extrairContextoHttp(req);

      eventBus.emitir('auditoria:evento', {
        entidade: 'terapeuta',
        acao: 'terapeuta_ativado_admin',
        origem: 'sistema_admin',
        terapeutaId: (req as AuthenticatedRequest).user?.id ?? id,
        clinicaId: terapeuta.clinica_id ?? null,
        recursoId: terapeuta.id,
        descricao: `Conta do terapeuta '${terapeuta.nome}' ativada pelo SuperAdmin.`,
        detalhes: { terapeuta_alvo_id: terapeuta.id, status_ativo: true },
        ip,
        userAgent,
      });

      res.status(200).json({
        data: {
          terapeuta,
        },
        message: 'Conta de terapeuta ativada com sucesso.',
      });
    } catch (error: unknown) {
      AdminController.tratarErro(error, res, 'ativar terapeuta');
    }
  }

  /**
   * Handles PATCH /api/admin/terapeutas/:id/desativar to deactivate a therapist account.
   *
   * @param req - Authenticated Express request containing the therapist UUID in `params.id`.
   * @param res - Express response returning the deactivated therapist record.
   */
  static async desativarTerapeuta(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const terapeuta = await AdminService.desativarTerapeuta(id);
      const { ip, userAgent } = extrairContextoHttp(req);

      eventBus.emitir('auditoria:evento', {
        entidade: 'terapeuta',
        acao: 'terapeuta_desativado_admin',
        origem: 'sistema_admin',
        terapeutaId: (req as AuthenticatedRequest).user?.id ?? id,
        clinicaId: terapeuta.clinica_id ?? null,
        recursoId: terapeuta.id,
        descricao: `Conta do terapeuta '${terapeuta.nome}' desativada pelo SuperAdmin.`,
        detalhes: { terapeuta_alvo_id: terapeuta.id, status_ativo: false },
        ip,
        userAgent,
      });

      res.status(200).json({
        data: {
          terapeuta,
        },
        message: 'Conta de terapeuta desativada com sucesso.',
      });
    } catch (error: unknown) {
      AdminController.tratarErro(error, res, 'desativar terapeuta');
    }
  }

  // ============================================================================
  // MÓDULO DE AUDITORIA CONSOLIDADA
  // ============================================================================

  /**
   * Handles GET /api/admin/auditoria to query consolidated audit logs with institutional summary metrics.
   *
   * @param req - Express request containing filter query params and optional `clinicaId` route parameter.
   * @param res - Express response returning audit events, consolidated metrics, and pagination metadata.
   */
  static async consultarAuditoriaConsolidada(req: Request, res: Response): Promise<void> {
    try {
      const {
        clinicaId,
        clinica_id,
        terapeutaId,
        terapeuta_id,
        pacienteId,
        paciente_id,
        entidade,
        busca,
        dataInicio,
        dataFim,
        tipoAcao,
        origem,
        page,
        limit,
      } = req.query;

      const clinicaParam = (req.params.clinicaId || clinicaId || clinica_id) as string | undefined;
      const terapeutaParam = (terapeutaId || terapeuta_id) as string | undefined;
      const pacienteParam = (pacienteId || paciente_id) as string | undefined;

      const resultado = await AdminService.consultarAuditoriaConsolidada({
        clinicaId: clinicaParam,
        terapeutaId: terapeutaParam,
        pacienteId: pacienteParam,
        entidade: typeof entidade === 'string' ? entidade : undefined,
        busca: typeof busca === 'string' ? busca : undefined,
        dataInicio: typeof dataInicio === 'string' ? dataInicio : undefined,
        dataFim: typeof dataFim === 'string' ? dataFim : undefined,
        tipoAcao: typeof tipoAcao === 'string' ? tipoAcao : undefined,
        origem: typeof origem === 'string' ? origem : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({
        data: {
          auditoria: resultado.auditoria,
          consolidado: resultado.consolidado,
          meta: resultado.meta,
        },
        message: 'Logs de auditoria consolidados com sucesso.',
      });
    } catch (error: unknown) {
      AdminController.tratarErro(error, res, 'consultar auditoria consolidada');
    }
  }

  // ============================================================================
  // HANDLER PADRONIZADO DE ERROS
  // ============================================================================

  /**
   * Maps service-layer and unexpected errors into standardized JSON HTTP error responses.
   *
   * @param error - Thrown error instance or unknown failure value.
   * @param res - Express response object.
   * @param operacao - Human-readable operation description used in error logging and fallback messages.
   */
  private static tratarErro(error: unknown, res: Response, operacao: string): void {
    if (error instanceof AdminServiceError) {
      res.status(error.statusCode).json({
        error: error.message,
        detalhes: error.detalhes,
      });
      return;
    }

    const mensagem = error instanceof Error ? error.message : String(error);
    console.error(`[AdminController] Erro inesperado ao ${operacao}:`, error);

    res.status(500).json({
      error: `Erro interno ao ${operacao}.`,
      detalhes: mensagem,
    });
  }
}
