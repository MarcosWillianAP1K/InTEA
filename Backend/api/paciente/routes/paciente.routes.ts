import { Router } from 'express';
import { PacienteController } from '../controllers/paciente.controller.js';
// Middlewares de segurança (podem ser reativados na integração final com Auth/Sprint 13):
import { authMiddleware } from '../../../core/middlewares/auth.middleware.js';
import { verificarVisibilidadePaciente } from '../../../core/middlewares/visibilidade.middleware.js';
import { adminMiddleware } from '../../../core/middlewares/admin.middleware.js';

// ==============================================================================
// ROTAS: /api/paciente
// ==============================================================================

export const pacienteRoutes = Router();

// ------------------------------------------------------------------------------
// 1. Consultas, Busca e Filtros
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/paciente:
 *   get:
 *     summary: Lista pacientes com busca, filtros e paginação
 *     tags: [Paciente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: nome
 *         schema:
 *           type: string
 *         description: Busca parcial por nome (case-insensitive)
 *       - in: query
 *         name: cpf
 *         schema:
 *           type: string
 *         description: Busca por CPF
 *       - in: query
 *         name: idadeMin
 *         schema:
 *           type: integer
 *         description: Idade mínima (anos)
 *       - in: query
 *         name: idadeMax
 *         schema:
 *           type: integer
 *         description: Idade máxima (anos)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página (padrão 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Quantidade de itens por página (padrão 10)
 *       - in: query
 *         name: incluirInativos
 *         schema:
 *           type: boolean
 *         description: Se true, inclui também pacientes inativos (soft delete)
 *       - in: query
 *         name: all
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Se true, solicita listagem de todos os pacientes cadastrados (requer privilégios de administrador - RN04)
 *     responses:
 *       200:
 *         description: Lista de pacientes e metadados de paginação retornados com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 - id: "123e4567-e89b-12d3-a456-426614174000"
 *                   nome: "Pedro Henrique Silveira"
 *                   data_nascimento: "2018-06-15"
 *                   cpf: "529.982.247-25"
 *                   telefone: "(11) 98765-4321"
 *                   cep: "01310-100"
 *                   cidade: "São Paulo"
 *                   estado: "SP"
 *                   status_ativo: true
 *                   created_at: "2026-09-27T21:41:27.762Z"
 *               meta:
 *                 total: 1
 *                 pagina: 1
 *                 limite: 10
 *                 total_paginas: 1
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso proibido (tentativa de listar todos os pacientes sem privilégios de administrador - RN04)
 *         content:
 *           application/json:
 *             example:
 *               error: "Acesso negado: apenas administradores podem visualizar todos os pacientes."
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao listar pacientes."
 */
pacienteRoutes.get('/', authMiddleware, PacienteController.listar);

/**
 * @swagger
 * /api/paciente/{id}:
 *   get:
 *     summary: Busca dados e prontuário do paciente (com verificação de vínculo)
 *     tags: [Paciente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do paciente
 *     responses:
 *       200:
 *         description: Paciente encontrado com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 id: "123e4567-e89b-12d3-a456-426614174000"
 *                 nome: "Pedro Henrique Silveira"
 *                 data_nascimento: "2018-06-15"
 *                 cpf: "529.982.247-25"
 *                 telefone: "(11) 98765-4321"
 *                 cep: "01310-100"
 *                 cidade: "São Paulo"
 *                 estado: "SP"
 *                 status_ativo: true
 *                 responsaveis:
 *                   - id: "223e4567-e89b-12d3-a456-426614174001"
 *                     nome: "Juliana Silveira"
 *                     telefone: "(11) 99887-6655"
 *                     cpf: "364.721.890-50"
 *                     parentesco: "Mãe"
 *                     principal: true
 *                 terapeutas:
 *                   - id: "323e4567-e89b-12d3-a456-426614174002"
 *                     nome: "Dra. Mariana Costa"
 *                     email: "mariana.costa@intea.com.br"
 *                     registro_profissional: "CREFITO-3/12345-TO"
 *                     crefito: "CREFITO-3/12345-TO"
 *                     especialidade: "Terapia Ocupacional e Integração Sensorial"
 *       400:
 *         description: Identificador UUID inválido
 *         content:
 *           application/json:
 *             example:
 *               error: "ID do paciente inválido."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso negado (sem vínculo ativo com o paciente)
 *         content:
 *           application/json:
 *             example:
 *               error: "Acesso negado: terapeuta não possui vínculo com este paciente (RN04)."
 *       404:
 *         description: Paciente não encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Paciente não encontrado."
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao buscar paciente."
 */
pacienteRoutes.get('/:id', authMiddleware, verificarVisibilidadePaciente, PacienteController.buscarPorId);

/**
 * @swagger
 * /api/paciente/{id}/historico:
 *   get:
 *     summary: Recupera prontuário longitudinal com engajamento geral e séries por jogo (RF15, RF19, RN01, RN02, RN04, RN05)
 *     tags: [Paciente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID do paciente
 *       - in: query
 *         name: jogoId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID do jogo para extração detalhada de métricas. Se omitido, retorna catálogo de jogos jogados.
 *       - in: query
 *         name: dataInicio
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data inicial do filtro de sessões
 *       - in: query
 *         name: dataFim
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data final do filtro de sessões
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Página de paginação para as sessões do jogo
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Quantidade máxima de sessões por página
 *     responses:
 *       200:
 *         description: Prontuário longitudinal e séries recuperados com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 paciente_id: "123e4567-e89b-12d3-a456-426614174000"
 *                 engajamento_geral:
 *                   total_sessoes: 10
 *                   total_iniciadas: 10
 *                   sessoes_finalizadas: 8
 *                   sessoes_interrompidas: 2
 *                   taxa_conclusao_porcentagem: 80
 *                   tempo_total_segundos: 4800
 *                   tempo_medio_segundos: 600
 *                 historico_por_jogo:
 *                   tipo: "detalhado"
 *                   series_temporais: []
 *       400:
 *         description: Erro de validação nos filtros ou UUID inválido
 *       401:
 *         description: Não autorizado (token ausente ou expirado)
 *       403:
 *         description: Proibido por ausência de vínculo clínico institucional (RN04)
 *       404:
 *         description: Paciente ou jogo não encontrado
 *       422:
 *         description: Violação de tipagem estrita de métricas no manifesto (RN02)
 *       500:
 *         description: Erro interno no servidor
 */
/**
 * Rota 1: Histórico Geral de Engajamento do Paciente (RF15).
 * Retorna dados limpos e simples de engajamento e catálogo de jogos para cards de perfil.
 */
pacienteRoutes.get('/:id/historico', authMiddleware, verificarVisibilidadePaciente, PacienteController.buscarHistoricoGeral);

/**
 * @swagger
 * /api/paciente/{id}/historico/jogo/{jogoId}:
 *   get:
 *     summary: Recupera séries evolutivas de um jogo específico para o paciente (RF15, RN02, RN04, RN05)
 *     description: Retorna as métricas homologadas do jogo. Se informado sessaoId, limita o histórico até a data da sessão.
 *     tags: [Paciente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID do paciente
 *       - in: path
 *         name: jogoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID do jogo terapêutico
 *       - in: query
 *         name: sessaoId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID da sessão de referência para delimitar o histórico até sua conclusão
 *       - in: query
 *         name: dataInicio
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: dataFim
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Histórico evolutivo do jogo retornado com sucesso
 *       400:
 *         description: Parâmetros inválidos ou sessão não pertencente ao paciente/jogo
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Vínculo clínico não autorizado (RN04)
 *       404:
 *         description: Paciente, jogo ou sessão de referência não encontrado
 *       422:
 *         description: Violação de tipagem estrita de métricas no manifesto (RN02)
 *       500:
 *         description: Erro interno no servidor
 */
pacienteRoutes.get('/:id/historico/jogo/:jogoId', authMiddleware, verificarVisibilidadePaciente, PacienteController.buscarHistoricoJogo);

// ------------------------------------------------------------------------------
// 2. Persistência (Criação e Atualização de Pacientes)
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/paciente:
 *   post:
 *     summary: Cadastra um novo paciente e opcionalmente seu responsável
 *     tags: [Paciente]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nome: "Pedro Henrique Silveira"
 *             data_nascimento: "2018-06-15"
 *             cpf: "529.982.247-25"
 *             telefone: "(11) 98765-4321"
 *             cep: "01310-100"
 *             cidade: "São Paulo"
 *             estado: "SP"
 *             responsavel:
 *               nome: "Juliana Silveira"
 *               telefone: "(11) 99887-6655"
 *               cpf: "364.721.890-50"
 *               parentesco: "Mãe"
 *     responses:
 *       201:
 *         description: Paciente cadastrado com sucesso
 *         content:
 *           application/json:
 *             example:
 *               message: "Paciente cadastrado com sucesso"
 *               data:
 *                 id: "123e4567-e89b-12d3-a456-426614174000"
 *                 nome: "Pedro Henrique Silveira"
 *                 data_nascimento: "2018-06-15"
 *                 cpf: "529.982.247-25"
 *                 status_ativo: true
 *       400:
 *         description: Erro de validação nos dados do paciente ou CPF inválido
 *         content:
 *           application/json:
 *             example:
 *               error: "O campo 'nome' é obrigatório."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       409:
 *         description: CPF já cadastrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Já existe um paciente cadastrado com este CPF."
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao cadastrar paciente."
 */
pacienteRoutes.post('/', authMiddleware, PacienteController.criar);

/**
 * @swagger
 * /api/paciente/{id}:
 *   put:
 *     summary: Atualiza os dados de um paciente existente (com verificação de vínculo)
 *     tags: [Paciente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do paciente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nome: "Pedro Henrique Silveira Lima"
 *             telefone: "(11) 99999-8888"
 *             cidade: "Campinas"
 *     responses:
 *       200:
 *         description: Paciente atualizado com sucesso
 *         content:
 *           application/json:
 *             example:
 *               message: "Paciente atualizado com sucesso"
 *               data:
 *                 id: "123e4567-e89b-12d3-a456-426614174000"
 *                 nome: "Pedro Henrique Silveira Lima"
 *                 telefone: "(11) 99999-8888"
 *                 cidade: "Campinas"
 *                 status_ativo: true
 *       400:
 *         description: Erro de validação nos dados fornecidos
 *         content:
 *           application/json:
 *             example:
 *               error: "ID do paciente inválido."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso negado (sem vínculo ativo com o paciente)
 *         content:
 *           application/json:
 *             example:
 *               error: "Acesso negado: terapeuta não possui vínculo com este paciente (RN04)."
 *       404:
 *         description: Paciente não encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Paciente não encontrado."
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao atualizar paciente."
 */
pacienteRoutes.put('/:id', authMiddleware, verificarVisibilidadePaciente, PacienteController.atualizar);
pacienteRoutes.patch('/:id', authMiddleware, verificarVisibilidadePaciente, PacienteController.atualizar);

// ------------------------------------------------------------------------------
// 3. Exclusão e Reativação (Soft Delete e Hard Delete)
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/paciente/{id}/hard:
 *   delete:
 *     summary: "[DEV/TESTES] Exclusão física permanente do paciente"
 *     tags: [Paciente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do paciente
 *     responses:
 *       200:
 *         description: Paciente excluído fisicamente com sucesso
 *         content:
 *           application/json:
 *             example:
 *               message: "Paciente excluído fisicamente com sucesso"
 *       400:
 *         description: Identificador UUID inválido
 *         content:
 *           application/json:
 *             example:
 *               error: "ID do paciente inválido."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso negado (operação restrita a administradores ativos)
 *         content:
 *           application/json:
 *             example:
 *               error: "Acesso negado. Perfil de administrador ativo obrigatório."
 *       404:
 *         description: Paciente não encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Paciente não encontrado."
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao excluir paciente."
 */
pacienteRoutes.delete('/:id/hard', authMiddleware, adminMiddleware, PacienteController.deletarHard);

/**
 * @swagger
 * /api/paciente/{id}:
 *   delete:
 *     summary: Soft Delete — Desativa um paciente (status_ativo = false)
 *     tags: [Paciente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do paciente
 *     responses:
 *       200:
 *         description: Paciente desativado com sucesso (soft delete)
 *         content:
 *           application/json:
 *             example:
 *               message: "Paciente desativado com sucesso (soft delete)"
 *               data:
 *                 id: "123e4567-e89b-12d3-a456-426614174000"
 *                 nome: "Pedro Henrique Silveira"
 *                 status_ativo: false
 *       400:
 *         description: Identificador UUID inválido
 *         content:
 *           application/json:
 *             example:
 *               error: "ID do paciente inválido."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso negado (operação restrita a administradores ativos)
 *         content:
 *           application/json:
 *             example:
 *               error: "Acesso negado. Perfil de administrador ativo obrigatório."
 *       404:
 *         description: Paciente não encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Paciente não encontrado."
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao desativar paciente."
 */
pacienteRoutes.delete('/:id', authMiddleware, adminMiddleware, PacienteController.desativar);

/**
 * @swagger
 * /api/paciente/{id}/reativar:
 *   patch:
 *     summary: Reativa um paciente previamente inativado
 *     tags: [Paciente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do paciente
 *     responses:
 *       200:
 *         description: Paciente reativado com sucesso
 *         content:
 *           application/json:
 *             example:
 *               message: "Paciente reativado com sucesso"
 *               data:
 *                 id: "123e4567-e89b-12d3-a456-426614174000"
 *                 nome: "Pedro Henrique Silveira"
 *                 status_ativo: true
 *       400:
 *         description: Identificador UUID inválido
 *         content:
 *           application/json:
 *             example:
 *               error: "ID do paciente inválido."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso negado (operação restrita a administradores ativos)
 *         content:
 *           application/json:
 *             example:
 *               error: "Acesso negado. Perfil de administrador ativo obrigatório."
 *       404:
 *         description: Paciente não encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Paciente não encontrado."
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao reativar paciente."
 */
pacienteRoutes.patch('/:id/reativar', authMiddleware, adminMiddleware, PacienteController.reativar);

// ------------------------------------------------------------------------------
// 4. Gestão de Vínculos Terapeuta-Paciente
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/paciente/{id}/terapeutas:
 *   get:
 *     summary: Lista todos os terapeutas vinculados ao paciente (com verificação de vínculo)
 *     tags: [Paciente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do paciente
 *     responses:
 *       200:
 *         description: Lista de terapeutas vinculados retornada com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 - id: "323e4567-e89b-12d3-a456-426614174002"
 *                   nome: "Dra. Mariana Costa"
 *                   email: "mariana.costa@intea.com.br"
 *                   registro_profissional: "CREFITO-3/12345-TO"
 *                   crefito: "CREFITO-3/12345-TO"
 *                   especialidade: "Terapia Ocupacional e Integração Sensorial"
 *       400:
 *         description: Identificador UUID inválido
 *         content:
 *           application/json:
 *             example:
 *               error: "ID do paciente inválido."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso negado (sem vínculo ativo com o paciente - RN04)
 *         content:
 *           application/json:
 *             example:
 *               error: "Acesso negado: terapeuta não possui vínculo com este paciente (RN04)."
 *       404:
 *         description: Paciente não encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Paciente não encontrado."
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao listar terapeutas do paciente."
 */
pacienteRoutes.get('/:id/terapeutas', authMiddleware, verificarVisibilidadePaciente, PacienteController.listarTerapeutas);

/**
 * @swagger
 * /api/paciente/{id}/terapeutas:
 *   post:
 *     summary: Vincula um novo terapeuta ao paciente (equipe multidisciplinar)
 *     tags: [Paciente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do paciente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             terapeuta_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *     responses:
 *       201:
 *         description: Terapeuta vinculado com sucesso
 *         content:
 *           application/json:
 *             example:
 *               message: "Terapeuta vinculado ao paciente com sucesso"
 *               data:
 *                 paciente_id: "123e4567-e89b-12d3-a456-426614174000"
 *                 terapeuta_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *       400:
 *         description: Terapeuta de clínica diferente, paciente inativo ou IDs inválidos
 *         content:
 *           application/json:
 *             example:
 *               error: "O campo 'terapeuta_id' é obrigatório e deve ser um UUID válido."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso negado (sem vínculo ativo com o paciente ou clínica divergente - RN04)
 *         content:
 *           application/json:
 *             example:
 *               error: "Acesso negado: terapeuta não possui vínculo com este paciente (RN04)."
 *       404:
 *         description: Paciente ou terapeuta não encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Paciente ou terapeuta não encontrado."
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao vincular terapeuta ao paciente."
 */
pacienteRoutes.post('/:id/terapeutas', authMiddleware, verificarVisibilidadePaciente, PacienteController.vincularTerapeuta);

/**
 * @swagger
 * /api/paciente/{id}/terapeutas/{terapeutaId}:
 *   delete:
 *     summary: Remove o vínculo de um terapeuta com o paciente
 *     tags: [Paciente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do paciente
 *       - in: path
 *         name: terapeutaId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do terapeuta a ser desvinculado
 *     responses:
 *       200:
 *         description: Vínculo removido com sucesso
 *         content:
 *           application/json:
 *             example:
 *               message: "Vínculo do terapeuta com o paciente removido com sucesso"
 *       400:
 *         description: Parâmetros UUID inválidos
 *         content:
 *           application/json:
 *             example:
 *               error: "IDs fornecidos são inválidos."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso negado (sem vínculo ativo com o paciente ou clínica divergente - RN04)
 *         content:
 *           application/json:
 *             example:
 *               error: "Acesso negado: terapeuta não possui vínculo com este paciente (RN04)."
 *       404:
 *         description: Paciente não encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Paciente não encontrado."
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao desvincular terapeuta."
 */
pacienteRoutes.delete('/:id/terapeutas/:terapeutaId', authMiddleware, verificarVisibilidadePaciente, PacienteController.desvincularTerapeuta);
