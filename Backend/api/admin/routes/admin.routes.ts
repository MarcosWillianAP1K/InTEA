import { Router } from 'express';
import { authMiddleware } from '../../../core/middlewares/auth.middleware.js';
import { superAdminMiddleware } from '../../../core/middlewares/admin.middleware.js';
import { AdminController } from '../controllers/admin.controller.js';
import { AuditoriaController } from '../../auditoria/controllers/auditoria.controller.js';

/**
 * ==============================================================================
 * InTEA: Rotas do Módulo Administrativo Global (SuperAdmin)
 * ==============================================================================
 * Conformidade: RF07, RF08, RNF06
 * Todas as rotas deste router exigem autenticação ativa e privilégio SuperAdmin.
 * ==============================================================================
 */

export const adminRoutes = Router();

// Bloqueio rigoroso: autenticação JWT + papel de Super Administrador (Critério de Aceite 1)
adminRoutes.use(authMiddleware, superAdminMiddleware);

// ==============================================================================
// 1. GESTÃO INSTITUCIONAL DE CLÍNICAS (RF07)
// ==============================================================================
adminRoutes.get('/clinicas', AdminController.listarClinicas);
adminRoutes.get('/clinica', AdminController.listarClinicas);

adminRoutes.post('/clinicas', AdminController.criarClinica);
adminRoutes.post('/clinica', AdminController.criarClinica);

adminRoutes.get('/clinicas/:id', AdminController.buscarClinicaPorId);
adminRoutes.get('/clinica/:id', AdminController.buscarClinicaPorId);

adminRoutes.patch('/clinicas/:id', AdminController.atualizarClinica);
adminRoutes.patch('/clinica/:id', AdminController.atualizarClinica);

adminRoutes.patch('/clinicas/:id/reativar', AdminController.ativarClinica);
adminRoutes.patch('/clinica/:id/reativar', AdminController.ativarClinica);

adminRoutes.patch('/clinicas/:id/ativar', AdminController.ativarClinica);
adminRoutes.patch('/clinica/:id/ativar', AdminController.ativarClinica);

adminRoutes.patch('/clinicas/:id/desativar', AdminController.desativarClinica);
adminRoutes.patch('/clinica/:id/desativar', AdminController.desativarClinica);

// ==============================================================================
// 2. GESTÃO INSTITUCIONAL DE TERAPEUTAS (RF07, RN04)
// ==============================================================================
adminRoutes.get('/terapeutas', AdminController.listarTerapeutas);
adminRoutes.get('/terapeuta', AdminController.listarTerapeutas);

adminRoutes.get('/terapeutas/:id', AdminController.buscarTerapeutaPorId);
adminRoutes.get('/terapeuta/:id', AdminController.buscarTerapeutaPorId);

adminRoutes.patch('/terapeutas/:id', AdminController.atualizarTerapeuta);
adminRoutes.patch('/terapeuta/:id', AdminController.atualizarTerapeuta);

adminRoutes.patch('/terapeutas/:id/reativar', AdminController.ativarTerapeuta);
adminRoutes.patch('/terapeuta/:id/reativar', AdminController.ativarTerapeuta);

adminRoutes.patch('/terapeutas/:id/ativar', AdminController.ativarTerapeuta);
adminRoutes.patch('/terapeuta/:id/ativar', AdminController.ativarTerapeuta);

adminRoutes.patch('/terapeutas/:id/desativar', AdminController.desativarTerapeuta);
adminRoutes.patch('/terapeuta/:id/desativar', AdminController.desativarTerapeuta);

// ==============================================================================
// 3. CONSULTA CONSOLIDADA DE LOGS DE AUDITORIA POR INSTITUIÇÃO (RF08, RNF06)
// ==============================================================================
adminRoutes.get('/auditoria/estatisticas', AuditoriaController.obterEstatisticas);
adminRoutes.get('/auditoria/sessao/:sessaoId', AuditoriaController.consultarLinhaDoTempo);
adminRoutes.get('/auditoria/instituicao/:clinicaId', AdminController.consultarAuditoriaConsolidada);
adminRoutes.get('/auditoria', AdminController.consultarAuditoriaConsolidada);
