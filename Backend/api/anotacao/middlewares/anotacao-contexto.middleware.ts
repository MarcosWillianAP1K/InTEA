// ==============================================================================
// InTEA: Middleware de Resolução de Contexto de Anotações Clínicas
// ==============================================================================
// Responsabilidade:
// 1. Extrair e validar parâmetros e escopos (paciente vs sessão).
// 2. Localizar a entidade alvo (paciente, sessão ou anotação) e preencher req.pacienteAlvoId
//    para consumo transparente e estrito pelo verificarVisibilidadePaciente (RN04).
// 3. Garantir que anotações de sessão não sejam acessadas via rotas de paciente e vice-versa.
// 4. Bloquear registro de anotação para sessão cancelada ou modo livre (RN01).
// ==============================================================================

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import { validarUUID } from '../../../core/utils/validators.js';
import { AnotacaoClinicaModel } from '../models/anotacao.model.js';
import { SessaoModel, STATUS_SESSAO } from '../../sessao/models/sessao.model.js';

/**
 * Middleware that resolves patient context for `/api/anotacao/paciente` routes.
 *
 * @param req - Authenticated Express request being enriched with target patient context.
 * @param res - Express response.
 * @param next - Express next middleware function.
 * @returns Resolves when the next middleware has been called or an HTTP error response is returned.
 */
export async function resolverContextoPaciente(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const metodo = req.method;
    const url = req.path; // relativo ao router montado em /paciente

    // 1. POST /api/anotacao/paciente
    if (metodo === 'POST') {
      const pacienteId = req.body?.paciente_id;
      if (!pacienteId) {
        res.status(400).json({ error: 'O campo paciente_id é obrigatório para anotações de paciente.' });
        return;
      }
      if (!validarUUID(pacienteId)) {
        res.status(400).json({ error: 'O paciente_id informado deve ser um UUID válido.' });
        return;
      }
      // Rejeita tentativa de passar sessao_id na rota exclusiva de paciente
      if (req.body?.sessao_id) {
        res.status(400).json({ error: 'A rota /api/anotacao/paciente não aceita sessao_id. Utilize /api/anotacao/sessao.' });
        return;
      }

      req.pacienteAlvoId = pacienteId;
      return next();
    }

    // 2. GET /api/anotacao/paciente/:pacienteId
    if (metodo === 'GET' && req.params.pacienteId) {
      const pacienteId = String(req.params.pacienteId || '');
      if (!validarUUID(pacienteId)) {
        res.status(400).json({ error: 'O pacienteId deve ser um UUID válido.' });
        return;
      }

      req.pacienteAlvoId = pacienteId;
      return next();
    }

    // 3. PATCH ou DELETE /api/anotacao/paciente/:id (ou /:id/hard)
    if (req.params.id) {
      const id = String(req.params.id || '');
      if (!validarUUID(id)) {
        res.status(400).json({ error: 'O identificador da anotação deve ser um UUID válido.' });
        return;
      }

      const anotacao = await AnotacaoClinicaModel.buscarPorId(id);
      if (!anotacao) {
        res.status(404).json({ error: 'Anotação clínica não encontrada.' });
        return;
      }

      // Validação estrita de escopo: anotação de paciente possui sessao_id === null
      if (anotacao.sessao_id !== null) {
        res.status(404).json({ error: 'Anotação clínica não encontrada no escopo de paciente (pertence a uma sessão).' });
        return;
      }

      req.pacienteAlvoId = anotacao.paciente_id;
      req.contextoAnotacao = anotacao;
      return next();
    }

    next();
  } catch (error) {
    console.error('[resolverContextoPaciente] Erro inesperado:', error);
    res.status(500).json({ error: 'Erro interno ao resolver contexto da anotação de paciente.' });
  }
}

/**
 * Middleware that resolves session context for `/api/anotacao/sessao` routes.
 *
 * @param req - Authenticated Express request being enriched with target session and patient context.
 * @param res - Express response.
 * @param next - Express next middleware function.
 * @returns Resolves when the next middleware has been called or an HTTP error response is returned.
 */
export async function resolverContextoSessao(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const metodo = req.method;

    // 1. POST /api/anotacao/sessao
    if (metodo === 'POST') {
      const sessaoId = String(req.body?.sessao_id || '');
      if (!sessaoId) {
        res.status(400).json({ error: 'O campo sessao_id é obrigatório para anotações de sessão.' });
        return;
      }
      if (!validarUUID(sessaoId)) {
        res.status(400).json({ error: 'O sessao_id informado deve ser um UUID válido.' });
        return;
      }

      const sessao = await SessaoModel.buscarPorId(sessaoId);
      if (!sessao) {
        res.status(404).json({ error: 'Sessão clínica não encontrada.' });
        return;
      }

      // Regra de status aprovada: não é permitido anotar em sessão cancelada
      if (sessao.status_sessao === STATUS_SESSAO.CANCELADA) {
        res.status(400).json({ error: 'Não é possível registrar anotação para sessão cancelada.' });
        return;
      }

      // Regra RN01: modo livre não possui paciente vinculado e não admite anotação clínica
      if (!sessao.paciente_id || sessao.modo_sessao === 'modo_livre') {
        res.status(400).json({ error: 'Sessões em modo livre ou sem paciente não admitem anotações clínicas (RN01).' });
        return;
      }

      req.pacienteAlvoId = sessao.paciente_id;
      req.contextoSessao = sessao;
      return next();
    }

    // 2. GET /api/anotacao/sessao/:sessaoId
    if (metodo === 'GET' && req.params.sessaoId) {
      const sessaoId = String(req.params.sessaoId || '');
      if (!validarUUID(sessaoId)) {
        res.status(400).json({ error: 'O sessaoId deve ser um UUID válido.' });
        return;
      }

      const sessao = await SessaoModel.buscarPorId(sessaoId);
      if (!sessao) {
        res.status(404).json({ error: 'Sessão clínica não encontrada.' });
        return;
      }

      if (!sessao.paciente_id || sessao.modo_sessao === 'modo_livre') {
        res.status(400).json({ error: 'Sessões em modo livre ou sem paciente não admitem anotações clínicas (RN01).' });
        return;
      }

      req.pacienteAlvoId = sessao.paciente_id;
      req.contextoSessao = sessao;
      return next();
    }

    // 3. PATCH ou DELETE /api/anotacao/sessao/:id (ou /:id/hard)
    if (req.params.id) {
      const id = String(req.params.id || '');
      if (!validarUUID(id)) {
        res.status(400).json({ error: 'O identificador da anotação deve ser um UUID válido.' });
        return;
      }

      const anotacao = await AnotacaoClinicaModel.buscarPorId(id);
      if (!anotacao) {
        res.status(404).json({ error: 'Anotação clínica não encontrada.' });
        return;
      }

      // Validação estrita de escopo: anotação de sessão possui sessao_id preenchido
      if (!anotacao.sessao_id) {
        res.status(404).json({ error: 'Anotação clínica não encontrada no escopo de sessão (é uma anotação geral de paciente).' });
        return;
      }

      req.pacienteAlvoId = anotacao.paciente_id;
      req.contextoAnotacao = anotacao;
      return next();
    }

    next();
  } catch (error) {
    console.error('[resolverContextoSessao] Erro inesperado:', error);
    res.status(500).json({ error: 'Erro interno ao resolver contexto da anotação de sessão.' });
  }
}

/**
 * Resolves context for unified /api/anotacao route by delegating to session or patient resolver.
 */
export async function resolverContextoAnotacaoUnificada(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (req.body?.sessao_id) {
    return resolverContextoSessao(req, res, next);
  }
  return resolverContextoPaciente(req, res, next);
}

/**
 * Middleware that resolves clinical note context by note ID for canonical root routes (/api/anotacao/:id).
 * Injects req.pacienteAlvoId = anotacao.paciente_id and req.contextoAnotacao = anotacao.
 *
 * @param req - Authenticated Express request.
 * @param res - Express response.
 * @param next - Express next middleware function.
 */
export async function resolverContextoAnotacaoPorId(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params.id || '').trim();

    if (!id || !validarUUID(id)) {
      res.status(400).json({ error: 'ID de anotação inválido. Forneça um UUID válido.' });
      return;
    }

    const anotacao = await AnotacaoClinicaModel.buscarPorId(id);
    if (!anotacao) {
      res.status(404).json({ error: 'Anotação clínica não encontrada.' });
      return;
    }

    req.pacienteAlvoId = anotacao.paciente_id;
    req.contextoAnotacao = anotacao;
    next();
  } catch (error: unknown) {
    res.status(500).json({ error: 'Erro interno ao resolver contexto da anotação clínica.' });
  }
}

/**
 * Middleware that resolves clinical note context specifically for reactivation routes,
 * allowing loading notes with `soft_delete: true` so institutional visibility (RN04) can be verified.
 * Injects req.pacienteAlvoId = anotacao.paciente_id and req.contextoAnotacao = anotacao.
 *
 * @param req - Authenticated Express request.
 * @param res - Express response.
 * @param next - Express next middleware function.
 */
export async function resolverContextoAnotacaoParaReativar(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params.id || '').trim();

    if (!id || !validarUUID(id)) {
      res.status(400).json({ error: 'ID de anotação inválido. Forneça um UUID válido.' });
      return;
    }

    const anotacao = await AnotacaoClinicaModel.buscarPorId(id, true);
    if (!anotacao) {
      res.status(404).json({ error: 'Anotação clínica não encontrada.' });
      return;
    }

    req.pacienteAlvoId = anotacao.paciente_id;
    req.contextoAnotacao = anotacao;
    next();
  } catch (error: unknown) {
    res.status(500).json({ error: 'Erro interno ao resolver contexto da anotação clínica para reativação.' });
  }
}
