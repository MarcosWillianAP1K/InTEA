import { Router } from 'express';
import { PacienteController } from '../controllers/paciente.controller.js';

// ==============================================================================
// ROTAS: /api/pacientes
// Mapeia as URLs e métodos HTTP para as funções correspondentes no PacienteController.
// ==============================================================================

export const pacienteRoutes = Router();

// ------------------------------------------------------------------------------
// 1. Consultas (Leitura)
// ------------------------------------------------------------------------------
// GET /api/pacientes -> Lista pacientes (por padrão apenas ativos, suporta ?incluirInativos=true)
pacienteRoutes.get('/', PacienteController.listar);

// GET /api/pacientes/:id -> Busca dados detalhados de um paciente por UUID
pacienteRoutes.get('/:id', PacienteController.buscarPorId);

// ------------------------------------------------------------------------------
// 2. Persistência (Criação e Atualização)
// ------------------------------------------------------------------------------
// POST /api/pacientes -> Cadastra um novo paciente (nome, data_nascimento e cpf obrigatórios)
pacienteRoutes.post('/', PacienteController.criar);

// PUT /api/pacientes/:id -> Atualiza dados do paciente existente
pacienteRoutes.put('/:id', PacienteController.atualizar);

// ------------------------------------------------------------------------------
// 3. Exclusão e Reativação
// ------------------------------------------------------------------------------
// DELETE /api/pacientes/:id/hard -> Exclusão física permanente (APENAS PARA TESTES/DEV)
pacienteRoutes.delete('/:id/hard', PacienteController.deletarHard);

// DELETE /api/pacientes/:id -> SOFT DELETE (Exclusão lógica: altera status_ativo para false - RN05)
pacienteRoutes.delete('/:id', PacienteController.desativar);

// PATCH /api/pacientes/:id/reativar -> Reativa um paciente que estava inativo
pacienteRoutes.patch('/:id/reativar', PacienteController.reativar);
