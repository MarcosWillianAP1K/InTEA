// ==============================================================================
// InTEA: Middleware de Verificação de Sessão Clínica e Anti-IDOR
// ==============================================================================
// Responsabilidade:
// 1. Validar e extrair identificador da sessão (UUID ou PIN de pareamento).
// 2. Exigir autenticação prévia (req.user preenchido por authMiddleware).
// 3. Localizar a sessão no Supabase (buscarPorId ou buscarPorToken).
// 4. Conceder bypass imediato para SuperAdmin e para o terapeuta autor (zero queries extras).
// 5. Restringir Modo Livre (RN01) estritamente ao autor ou SuperAdmin (403 Forbidden).
// 6. Validar Sessão Clínica (RN04): terapeuta ativo, mesma clínica do paciente e vínculo ativo.
// 7. Injetar req.contextoSessao e req.pacienteAlvoId para otimização de I/O nos controllers.
// Conformidade: RF10 (Ciclo de Vida), RF21 (Autoria), RN01, RN04, OWASP API1:2023
// TypeScript Estrito: Sem 'any'
// ==============================================================================

import { Response, NextFunction } from 'express';
import { supabase } from '../supabase/supabase.client.js';
import { AuthenticatedRequest } from './auth.middleware.js';
import { validarUUID } from '../utils/validators.js';
import { SessaoModel, Sessao, MODO_SESSAO } from '../../api/sessao/models/sessao.model.js';

export const REGEX_PIN_PAREAMENTO = /^[A-Z0-9]{3,5}-?[A-Z0-9]{3,5}$/i;

/**
 * Middleware that validates access permissions to clinical game sessions.
 * Enforces RN01 (free mode restriction to creator) and RN04 (institutional multi-therapist bond).
 *
 * @param req - Authenticated Express request.
 * @param res - Express response.
 * @param next - Express next middleware function.
 */
export async function verificarSessaoMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const usuarioLogado = req.user;
    if (!usuarioLogado || !usuarioLogado.id) {
      res.status(401).json({ error: 'Acesso não autorizado: autenticação necessária para manipular a sessão.' });
      return;
    }

    const identificadorRaw = req.params?.id || req.params?.sessaoId || req.params?.token || req.body?.sessao_id || '';
    const identificador = String(identificadorRaw).trim();

    if (!identificador || identificador === 'undefined' || identificador === 'null') {
      res.status(400).json({ error: 'Identificador da sessão ausente ou não informado.' });
      return;
    }

    const isUUID = validarUUID(identificador);
    const isPIN = REGEX_PIN_PAREAMENTO.test(identificador);

    if (!isUUID && !isPIN) {
      res.status(400).json({ error: 'O identificador da sessão deve ser um UUID válido ou código PIN de pareamento.' });
      return;
    }

    const sessao: Sessao | null = isUUID
      ? await SessaoModel.buscarPorId(identificador)
      : await SessaoModel.buscarPorToken(identificador);

    if (!sessao) {
      res.status(404).json({ error: 'Sessão clínica não encontrada.' });
      return;
    }

    // Bypass SuperAdmin
    const isSuperAdmin = usuarioLogado.user_metadata?.is_super_admin === true || usuarioLogado.is_super_admin === true;
    if (isSuperAdmin) {
      req.contextoSessao = sessao;
      req.pacienteAlvoId = sessao.paciente_id || undefined;
      return next();
    }

    // Autor direto da sessão
    if (sessao.terapeuta_id === usuarioLogado.id) {
      req.contextoSessao = sessao;
      req.pacienteAlvoId = sessao.paciente_id || undefined;
      return next();
    }

    // Modo Livre (RN01) restrito ao autor
    if (sessao.modo_sessao === MODO_SESSAO.MODO_LIVRE || !sessao.paciente_id) {
      res.status(403).json({ error: 'Acesso negado: sessões em modo livre só podem ser acessadas pelo terapeuta autor ou administrador.' });
      return;
    }

    // Sessão Clínica: Validação Institucional Completa (RN04)
    const { data: terapeuta } = await supabase
      .from('terapeuta')
      .select('id, clinica_id, is_super_admin, status_ativo')
      .eq('id', usuarioLogado.id)
      .maybeSingle();

    if (!terapeuta || !terapeuta.status_ativo) {
      res.status(403).json({ error: 'Acesso negado: terapeuta inexistente ou inativo.' });
      return;
    }

    if (terapeuta.is_super_admin) {
      req.contextoSessao = sessao;
      req.pacienteAlvoId = sessao.paciente_id;
      return next();
    }

    const { data: paciente } = await supabase
      .from('paciente')
      .select('id, clinica_id, status_ativo')
      .eq('id', sessao.paciente_id)
      .maybeSingle();

    if (!paciente) {
      res.status(404).json({ error: 'Paciente vinculado à sessão não encontrado.' });
      return;
    }

    if (paciente.clinica_id && terapeuta.clinica_id && paciente.clinica_id !== terapeuta.clinica_id) {
      res.status(403).json({ error: 'Acesso negado: o terapeuta pertence a uma instituição clínica diferente da do paciente.' });
      return;
    }

    const { data: vinculo } = await supabase
      .from('terapeuta_paciente')
      .select('paciente_id')
      .eq('terapeuta_id', terapeuta.id)
      .eq('paciente_id', sessao.paciente_id)
      .maybeSingle();

    if (!vinculo) {
      res.status(403).json({ error: 'Acesso negado: o terapeuta não possui vínculo ativo com o paciente desta sessão.' });
      return;
    }

    req.contextoSessao = sessao;
    req.pacienteAlvoId = sessao.paciente_id;
    next();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Erro interno ao verificar permissões e integridade da sessão.', detalhes: errorMessage });
  }
}

export const sessaoMiddleware = verificarSessaoMiddleware;
