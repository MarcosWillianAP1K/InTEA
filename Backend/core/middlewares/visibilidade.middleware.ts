import { Response, NextFunction } from 'express';
import { supabase } from '../supabase/supabase.client.js';
import { AuthenticatedRequest } from './auth.middleware.js';
import { validarUUID } from '../utils/validators.js';

/**
 * Middleware de autorização para controle de visibilidade de dados clínicos e prontuário do paciente.
 * 
 * Regras de autorização:
 * 1. O usuário requisitante deve estar autenticado via JWT (authMiddleware).
 * 2. O identificador do paciente (UUID) é extraído dos parâmetros da rota (:id ou :pacienteId).
 * 3. Se o paciente não existir no banco de dados, retorna status 404 Not Found.
 * 4. SuperAdministrador (is_super_admin = true) possui acesso irrestrito para auditoria institucional.
 * 5. Caso o terapeuta não seja SuperAdmin:
 *    - Deve ser um terapeuta ativo (status_ativo = true).
 *    - Deve pertencer à mesma clínica do paciente (se clínica estiver definida).
 *    - Deve possuir vínculo ativo cadastrado na tabela `terapeuta_paciente`.
 * 6. Caso não possua vínculo, retorna status 403 Forbidden.
 */
export async function verificarVisibilidadePaciente(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Extração do identificador do paciente a partir dos parâmetros da requisição
    const pacienteId = String(req.params.id || req.params.pacienteId || req.body?.paciente_id || '');

    if (!pacienteId || pacienteId === 'undefined') {
      res.status(400).json({ error: 'O parâmetro ID do paciente é obrigatório.' });
      return;
    }

    if (!validarUUID(pacienteId)) {
      res.status(400).json({ error: 'O identificador do paciente deve ser um UUID válido.' });
      return;
    }

    // 2. Verificação de autenticação do usuário
    const usuarioLogado = req.user;
    if (!usuarioLogado || !usuarioLogado.id) {
      res.status(401).json({
        error: 'Acesso não autorizado. É necessário estar autenticado para acessar os dados deste paciente.',
      });
      return;
    }

    // 3. Verificação de existência do paciente no banco de dados
    const { data: paciente, error: pacError } = await supabase
      .from('paciente')
      .select('id, clinica_id, status_ativo')
      .eq('id', pacienteId)
      .maybeSingle();

    if (pacError) {
      console.error('[verificarVisibilidadePaciente] Erro ao consultar paciente:', pacError);
      res.status(500).json({ error: 'Erro interno ao validar dados do paciente.', detalhes: pacError.message });
      return;
    }

    if (!paciente) {
      res.status(404).json({ error: 'Paciente não encontrado.' });
      return;
    }

    // 4. Verificação de privilégios de SuperAdministrador
    const isSuperAdminMetadata = usuarioLogado.user_metadata?.is_super_admin === true;
    if (isSuperAdminMetadata) {
      return next();
    }

    // Consulta perfil do terapeuta no banco para conferência de permissões e integridade
    const { data: terapeuta, error: terError } = await supabase
      .from('terapeuta')
      .select('id, clinica_id, is_super_admin, status_ativo')
      .eq('id', usuarioLogado.id)
      .maybeSingle();

    if (terError) {
      console.error('[verificarVisibilidadePaciente] Erro ao consultar terapeuta:', terError);
      res.status(500).json({ error: 'Erro interno ao consultar perfil do terapeuta.', detalhes: terError.message });
      return;
    }

    if (!terapeuta) {
      res.status(403).json({ error: 'Acesso negado: perfil de terapeuta associado ao token não encontrado.' });
      return;
    }

    if (terapeuta.is_super_admin) {
      return next();
    }

    if (!terapeuta.status_ativo) {
      res.status(403).json({ error: 'Acesso negado: a conta do terapeuta encontra-se inativa.' });
      return;
    }

    // 5. Bloqueio institucional entre clínicas distintas
    if (paciente.clinica_id && terapeuta.clinica_id && paciente.clinica_id !== terapeuta.clinica_id) {
      res.status(403).json({
        error: 'Acesso negado: o terapeuta pertence a uma instituição clínica diferente da do paciente.',
      });
      return;
    }

    // 6. Verificação de vínculo ativo na tabela associativa N:N
    const { data: vinculo, error: vinculoError } = await supabase
      .from('terapeuta_paciente')
      .select('paciente_id')
      .eq('terapeuta_id', terapeuta.id)
      .eq('paciente_id', pacienteId)
      .maybeSingle();

    if (vinculoError) {
      console.error('[verificarVisibilidadePaciente] Erro ao consultar vínculo:', vinculoError);
      res.status(500).json({ error: 'Erro interno ao validar vínculo com paciente.', detalhes: vinculoError.message });
      return;
    }

    if (!vinculo) {
      res.status(403).json({
        error: 'Acesso negado: o terapeuta não possui vínculo ativo com este paciente.',
      });
      return;
    }

    // Vínculo validado com sucesso
    next();
  } catch (error: any) {
    console.error('[verificarVisibilidadePaciente] Erro inesperado:', error);
    res.status(500).json({
      error: 'Erro interno ao verificar visibilidade e permissões do paciente.',
      detalhes: error?.message || String(error),
    });
  }
}
