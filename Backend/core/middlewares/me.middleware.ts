// ==============================================================================
// InTEA: Middleware de Titularidade e Auto-Gestão de Perfil (meMiddleware)
// ==============================================================================
// Responsabilidade:
// 1. Validar e extrair o identificador alvo da rota (padrão: req.params.id).
// 2. Exigir autenticação prévia (req.user preenchido por authMiddleware).
// 3. Consultar o perfil do requisitante no Supabase (public.terapeuta),
//    assegurando conta ativa e sincronizando is_super_admin e clinica_id.
// 4. Permitir bypass para Administrador Geral quando allowAdmin === true.
// 5. Bloqueio anti-enumeração contra IDOR: se o requisitante tentar acessar
//    o perfil de outro terapeuta, responder imediatamente com 403 Forbidden
//    SEM consultar o identificador alvo no banco de dados.
// Conformidade: RF21 (Autoria JWT), RN04, OWASP API1:2023 (BOLA/IDOR)
// TypeScript Estrito: Sem 'any'
// ==============================================================================

import { Response, NextFunction } from 'express';
import { supabase } from '../supabase/supabase.client.js';
import { AuthenticatedRequest } from './auth.middleware.js';
import { validarUUID } from '../utils/validators.js';

export interface MeMiddlewareOptions {
  allowAdmin?: boolean;
  paramName?: string;
}

/**
 * Middleware factory that enforces therapist ownership over their personal resources,
 * allowing SuperAdmin bypass when configured.
 *
 * @param options - Configuration options for admin bypass and parameter name.
 * @returns Express middleware function.
 */
export function meMiddleware(options?: MeMiddlewareOptions) {
  const allowAdmin = options?.allowAdmin ?? true;
  const paramName = options?.paramName ?? 'id';

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targetId = String(req.params?.[paramName] || '').trim();

      if (!targetId || targetId === 'undefined' || targetId === 'null') {
        res.status(400).json({ error: `O parâmetro "${paramName}" é obrigatório na rota.` });
        return;
      }

      if (!validarUUID(targetId)) {
        res.status(400).json({ error: 'ID inválido. Forneça um UUID válido.' });
        return;
      }

      const usuarioLogado = req.user;
      if (!usuarioLogado || !usuarioLogado.id) {
        res.status(401).json({ error: 'Acesso não autorizado. É necessário estar autenticado para acessar este recurso.' });
        return;
      }

      // Validação do perfil do requisitante no banco de dados (public.terapeuta)
      const { data: terapeuta, error: terError } = await supabase
        .from('terapeuta')
        .select('id, is_super_admin, status_ativo, clinica_id')
        .eq('id', usuarioLogado.id)
        .maybeSingle();

      if (terError) {
        res.status(500).json({ error: 'Erro interno ao validar permissões de acesso.', detalhes: terError.message });
        return;
      }

      if (!terapeuta) {
        res.status(403).json({ error: 'Acesso negado: perfil de terapeuta associado ao token não encontrado.' });
        return;
      }

      if (!terapeuta.status_ativo) {
        res.status(403).json({ error: 'Acesso negado: a conta do usuário encontra-se inativa.' });
        return;
      }

      const isSuperAdmin = terapeuta.is_super_admin === true || usuarioLogado.user_metadata?.is_super_admin === true;
      if (req.user) {
        req.user.is_super_admin = isSuperAdmin;
        if (terapeuta.clinica_id) {
          req.user.clinica_id = terapeuta.clinica_id;
        }
      }

      // 1. Bypass para Administrador Geral (quando configurado)
      if (allowAdmin && isSuperAdmin) {
        return next();
      }

      // 2. Bloqueio anti-enumeração contra IDOR
      if (usuarioLogado.id !== targetId) {
        res.status(403).json({ error: 'Acesso negado: você não tem permissão para alterar ou acessar recursos de outro usuário.' });
        return;
      }

      next();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Erro interno ao validar autorização de acesso.', detalhes: errorMessage });
    }
  };
}
