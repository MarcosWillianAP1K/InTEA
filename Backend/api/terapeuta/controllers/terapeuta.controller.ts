import { Request, Response } from 'express';
import { TerapeutaModel, CriarTerapeutaDTO, AtualizarTerapeutaDTO, LoginDTO } from '../models/terapeuta.model.js';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import { validarTelefone } from '../../../core/utils/validators.js';
import { formatarTelefone } from '../../../core/utils/formatters.js';

// ==============================================================================
// CONTROLLER: TerapeutaController
// ==============================================================================

export class TerapeutaController {
  /**
   * GET /api/terapeuta
   * Lista terapeutas cadastrados. Suporta ?incluirInativos=true.
   */
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const incluirInativos = req.query.incluirInativos === 'true';
      const terapeutas = await TerapeutaModel.listar(incluirInativos);
      res.status(200).json({ data: terapeutas });
    } catch (error: any) {
      console.error('[TerapeutaController.listar]', error);
      res.status(500).json({ error: 'Erro interno ao listar terapeutas.', detalhes: error?.message });
    }
  }

  /**
   * GET /api/terapeuta/:id
   * Busca um terapeuta por UUID.
   */
  static async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      const terapeuta = await TerapeutaModel.buscarPorId(id);

      if (!terapeuta) {
        res.status(404).json({ error: 'Terapeuta não encontrado.' });
        return;
      }

      res.status(200).json({ data: terapeuta });
    } catch (error: any) {
      console.error('[TerapeutaController.buscarPorId]', error);
      res.status(500).json({ error: 'Erro interno ao buscar terapeuta.', detalhes: error?.message });
    }
  }

  /**
   * POST /api/terapeuta
   * Cadastra um novo terapeuta e cria conta de autenticação no Supabase Auth.
   */
  static async criar(req: Request, res: Response): Promise<void> {
    try {
      const dto: CriarTerapeutaDTO = req.body;

      if (!dto.nome || dto.nome.trim() === '') {
        res.status(400).json({ error: 'O campo "nome" é obrigatório.' });
        return;
      }

      if (!dto.email || dto.email.trim() === '') {
        res.status(400).json({ error: 'O campo "email" é obrigatório.' });
        return;
      }

      if (!dto.password || dto.password.length < 6) {
        res.status(400).json({ error: 'O campo "password" é obrigatório e deve ter no mínimo 6 caracteres.' });
        return;
      }

      // Validação e formatação de telefone se informado
      if (dto.telefone && typeof dto.telefone === 'string' && dto.telefone.trim() !== '') {
        if (!validarTelefone(dto.telefone)) {
          res.status(400).json({
            error: 'O telefone informado é inválido. Deve conter DDD válido e o dígito 9 na frente (ex: +55 (11) 98765-4321 ou 11987654321).',
          });
          return;
        }
        dto.telefone = formatarTelefone(dto.telefone);
      }

      const novoTerapeuta = await TerapeutaModel.criar(dto);

      res.status(201).json({
        data: novoTerapeuta,
        message: 'Terapeuta cadastrado e conta de acesso criada com sucesso.',
      });
    } catch (error: any) {
      console.error('[TerapeutaController.criar]', error);

      if (error?.message?.includes('already registered') || error?.message?.includes('User already registered') || error?.message?.includes('duplicate key')) {
        res.status(409).json({ error: 'Este endereço de e-mail já está cadastrado para outro terapeuta.' });
        return;
      }

      res.status(500).json({ error: 'Erro interno ao cadastrar terapeuta.', detalhes: error?.message });
    }
  }

  /**
   * PUT /api/terapeuta/:id
   * Atualiza dados de um terapeuta existente.
   */
  static async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const dto: AtualizarTerapeutaDTO = req.body;

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      const existente = await TerapeutaModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ error: 'Terapeuta não encontrado para atualização.' });
        return;
      }

      // Validação e formatação de telefone se informado
      if (dto.telefone !== undefined && dto.telefone !== null && dto.telefone.trim() !== '') {
        if (!validarTelefone(dto.telefone)) {
          res.status(400).json({
            error: 'O telefone informado é inválido. Deve conter DDD válido e o dígito 9 na frente (ex: +55 (11) 98765-4321 ou 11987654321).',
          });
          return;
        }
        dto.telefone = formatarTelefone(dto.telefone);
      }

      const atualizado = await TerapeutaModel.atualizar(id, dto);

      res.status(200).json({ data: atualizado });
    } catch (error: any) {
      console.error('[TerapeutaController.atualizar]', error);
      res.status(500).json({ error: 'Erro interno ao atualizar terapeuta.', detalhes: error?.message });
    }
  }

  /**
   * DELETE /api/terapeuta/:id
   * SOFT DELETE: Inativa o terapeuta sem apagar seus dados ou histórico de sessões.
   */
  static async desativar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      const existente = await TerapeutaModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ error: 'Terapeuta não encontrado para desativação.' });
        return;
      }

      if (!existente.status_ativo) {
        res.status(200).json({ data: existente, message: 'O terapeuta já se encontra inativo.' });
        return;
      }

      const desativado = await TerapeutaModel.desativar(id);

      res.status(200).json({
        data: desativado,
        message: 'Terapeuta desativado com sucesso (soft delete aplicado).',
      });
    } catch (error: any) {
      console.error('[TerapeutaController.desativar]', error);
      res.status(500).json({ error: 'Erro interno ao desativar terapeuta.', detalhes: error?.message });
    }
  }

  /**
   * PATCH /api/terapeuta/:id/reativar
   * Reativa o cadastro de um terapeuta.
   */
  static async reativar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      const existente = await TerapeutaModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ error: 'Terapeuta não encontrado para reativação.' });
        return;
      }

      const reativado = await TerapeutaModel.reativar(id);

      res.status(200).json({
        data: reativado,
        message: 'Terapeuta reativado com sucesso.',
      });
    } catch (error: any) {
      console.error('[TerapeutaController.reativar]', error);
      res.status(500).json({ error: 'Erro interno ao reativar terapeuta.', detalhes: error?.message });
    }
  }

  /**
   * DELETE /api/terapeuta/:id/hard
   * HARD DELETE (Apenas para Testes/DEV): Remove definitivamente de auth.users e do banco.
   */
  static async deletarHard(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      const existente = await TerapeutaModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ error: 'Terapeuta não encontrado para exclusão física.' });
        return;
      }

      await TerapeutaModel.deletarHard(id);

      res.status(200).json({
        message: 'Terapeuta e credenciais excluídos fisicamente com sucesso (hard delete para testes).',
      });
    } catch (error: any) {
      console.error('[TerapeutaController.deletarHard]', error);
      res.status(500).json({ error: 'Erro interno ao realizar exclusão física.', detalhes: error?.message });
    }
  }

  /**
   * POST /api/terapeuta/login
   * Autentica o terapeuta e retorna o token JWT de acesso.
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const dto: LoginDTO = req.body;

      if (!dto.email || !dto.password) {
        res.status(400).json({ error: 'Campos "email" e "password" são obrigatórios para login.' });
        return;
      }

      const resultado = await TerapeutaModel.login(dto);

      res.status(200).json({
        data: {
          access_token: resultado.access_token,
          token_type: 'Bearer',
          expires_in: resultado.session.expires_in,
          terapeuta: resultado.terapeuta,
        },
        message: 'Login realizado com sucesso.',
      });
    } catch (error: any) {
      console.error('[TerapeutaController.login]', error);
      res.status(401).json({ error: error?.message || 'Credenciais inválidas.' });
    }
  }

  /**
   * GET /api/terapeuta/me
   * Retorna os dados do terapeuta autenticado a partir do token JWT.
   */
  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Usuário não autenticado.' });
        return;
      }

      const terapeuta = await TerapeutaModel.buscarPorId(userId);

      if (!terapeuta) {
        res.status(404).json({ error: 'Perfil de terapeuta associado ao token não encontrado.' });
        return;
      }

      res.status(200).json({ data: terapeuta });
    } catch (error: any) {
      console.error('[TerapeutaController.me]', error);
      res.status(500).json({ error: 'Erro interno ao recuperar perfil.', detalhes: error?.message });
    }
  }
}
