import type { Request, Response } from 'express';
import { AdminService, AdminServiceError } from '../services/admin.service.js';

/**
 * ==============================================================================
 * InTEA: Controller de Administração Global (SuperAdmin)
 * ==============================================================================
 * Conformidade: RF07, RF08, Envelope Pattern estrito ({ data, message })
 * ==============================================================================
 */

export class AdminController {
  // ============================================================================
  // MÓDULO DE CLÍNICAS
  // ============================================================================

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

  static async criarClinica(req: Request, res: Response): Promise<void> {
    try {
      const { nome, cnpj } = req.body;
      const clinica = await AdminService.criarClinica({ nome, cnpj });

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

  static async atualizarClinica(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { nome, cnpj, status_ativo } = req.body;

      const clinica = await AdminService.atualizarClinica(id, { nome, cnpj, status_ativo });

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

  static async ativarClinica(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const clinica = await AdminService.ativarClinica(id);

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

  static async desativarClinica(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const clinica = await AdminService.desativarClinica(id);

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

  static async ativarTerapeuta(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const terapeuta = await AdminService.ativarTerapeuta(id);

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

  static async desativarTerapeuta(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const terapeuta = await AdminService.desativarTerapeuta(id);

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

  static async consultarAuditoriaConsolidada(req: Request, res: Response): Promise<void> {
    try {
      const { clinicaId, clinica_id, terapeutaId, terapeuta_id, dataInicio, dataFim, tipoAcao, origem, page, limit } =
        req.query;

      const clinicaParam = (req.params.clinicaId || clinicaId || clinica_id) as string | undefined;
      const terapeutaParam = (terapeutaId || terapeuta_id) as string | undefined;

      const resultado = await AdminService.consultarAuditoriaConsolidada({
        clinicaId: clinicaParam,
        terapeutaId: terapeutaParam,
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
