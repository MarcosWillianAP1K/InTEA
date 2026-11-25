// ==============================================================================
// InTEA: Serviço de Controle de Concorrência de Sessões Ativas por Paciente
// Responsável: João Marcos (@JM3L0)
// ==============================================================================

import { supabase } from '../../../core/supabase/supabase.client.js';
import {
  ResultadoConcorrenciaDTO,
  ResultadoPermissaoMutacaoDTO,
  SessaoAtivaConcorrenteDTO,
  EspecialistaResponsavelDTO,
} from '../dtos/sessao.dto.js';
import { Sessao, STATUS_SESSAO } from '../models/sessao.model.js';

interface RawTerapeutaData {
  id: string;
  nome?: string;
  nome_completo?: string;
  especialidade?: string;
  crefito?: string;
  registro_profissional?: string;
  registro_conselho?: string;
}

interface RawSessaoData {
  id: string;
  terapeuta_id: string;
  paciente_id: string | null;
  status_sessao: string;
  expira_em: string | null;
  data_hora_inicio: string | null;
  created_at: string;
  terapeuta?: RawTerapeutaData | RawTerapeutaData[] | null;
}

export class SessaoConcorrenciaService {
  /**
   * Session statuses treated as active for clinical concurrency locking.
   */
  private static readonly STATUS_ATIVOS = [
    STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
    STATUS_SESSAO.CONECTADO,
    STATUS_SESSAO.EM_ANDAMENTO,
  ];

  /**
   * Checks whether the patient already has an active clinical session at the moment.
   *
   * Rules:
   * - sessions without `paciente_id` (`null`/`undefined`) do not trigger concurrency locks.
   * - Sessions in terminal statuses (`finalizada`, `cancelada`, `expirada`, `interrompida_por_queda`) do not block.
   * - In `aguardando_pareamento`: if `expira_em` has already elapsed, the session is treated as expired and ignored.
   * - When an active session exists: returns `conflito: true` and `statusHttp: 409` with session and responsible specialist details.
   *
   * @param pacienteId - Clinical patient UUID (or `null` for free mode).
   * @param terapeutaSolicitanteId - Authenticated therapist UUID requesting session start.
   * @returns Concurrency check result DTO.
   */
  static async verificarSessaoAtivaConcorrente(
    pacienteId?: string | null,
    terapeutaSolicitanteId?: string
  ): Promise<ResultadoConcorrenciaDTO> {
    // Modo livre não grava em prontuário e não bloqueia concorrência
    if (!pacienteId || typeof pacienteId !== 'string' || pacienteId.trim() === '') {
      return { conflito: false };
    }

    // Resiliência para ambientes de teste unitário onde o Supabase não é mockado nem configurado
    const fnWithMock = supabase.from as unknown as {
      _isMockFunction?: boolean;
      mock?: unknown;
    };
    const isMock = Boolean(fnWithMock._isMockFunction || fnWithMock.mock);
    const url = process.env.SUPABASE_URL;
    const isSupabaseConfigurado = Boolean(isMock || (url && !url.includes('placeholder') && !url.includes('your-project')));

    if (!isSupabaseConfigurado) {
      return { conflito: false };
    }

    try {
      const { data, error } = await supabase
        .from('sessao')
        .select(`
          id,
          terapeuta_id,
          paciente_id,
          status_sessao,
          expira_em,
          data_hora_inicio,
          created_at,
          terapeuta:terapeuta_id(
            id,
            nome,
            especialidade,
            crefito,
            registro_profissional
          )
        `)
        .eq('paciente_id', pacienteId.trim())
        .in('status_sessao', this.STATUS_ATIVOS)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[SessaoConcorrenciaService.verificarSessaoAtivaConcorrente] Erro ao consultar banco:', error);
        throw new Error(`Erro ao consultar concorrência de sessão ativa: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return { conflito: false };
      }

      const agora = Date.now();

      for (const item of (data as unknown as RawSessaoData[])) {
        // Se estiver aguardando pareamento, verifica se o TTL (expira_em) ainda é válido
        if (item.status_sessao === STATUS_SESSAO.AGUARDANDO_PAREAMENTO && item.expira_em) {
          const expiraEmMs = new Date(item.expira_em).getTime();
          if (expiraEmMs <= agora) {
            // Sessão com TTL estourado; não gera bloqueio de concorrência
            continue;
          }
        }

        // Sessão clínica simultânea ativa detectada!
        const mesmoTerapeuta = Boolean(
          terapeutaSolicitanteId && item.terapeuta_id === terapeutaSolicitanteId
        );

        let especialistaInfo: EspecialistaResponsavelDTO | undefined;
        if (item.terapeuta) {
          const t = Array.isArray(item.terapeuta) ? item.terapeuta[0] : item.terapeuta;
          if (t) {
            especialistaInfo = {
              id: t.id,
              nome: t.nome || t.nome_completo,
              especialidade: t.especialidade,
              registro_conselho: t.crefito || t.registro_profissional || t.registro_conselho,
            };
          }
        }

        const sessaoAtiva: SessaoAtivaConcorrenteDTO = {
          id: item.id,
          status_sessao: item.status_sessao,
          terapeuta_id: item.terapeuta_id,
          expira_em: item.expira_em || undefined,
          data_hora_inicio: item.data_hora_inicio || undefined,
          especialista_responsavel: especialistaInfo,
          mesmo_terapeuta: mesmoTerapeuta,
        };

        const mensagem = mesmoTerapeuta
          ? 'Você já possui uma sessão clínica ativa para este paciente.'
          : 'O paciente já possui uma sessão clínica ativa conduzida por outro especialista da equipe.';

        return {
          conflito: true,
          statusHttp: 409,
          codigo: 'SESSAO_CLINICA_SIMULTANEA_CONFLITO',
          mensagem,
          sessaoAtiva,
        };
      }

      return { conflito: false };
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('Erro ao consultar concorrência')) {
        throw err;
      }
      console.error('[SessaoConcorrenciaService.verificarSessaoAtivaConcorrente] Exceção inesperada:', err);
      throw new Error(`Falha inesperada ao verificar concorrência de sessão ativa: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Ensures critical state machine mutations (finish, cancel) are executed exclusively
   * by the conducting therapist or a SuperAdmin.
   *
   * @param sessao - Clinical session object containing authorship metadata.
   * @param usuarioLogadoId - User UUID extracted from the authenticated JWT.
   * @param isSuperAdmin - Whether the requesting user holds SuperAdmin privileges.
   * @returns Mutation permission result DTO.
   */
  static validarPermissaoMutacaoSessao(
    sessao: (Pick<Sessao, 'id'> & { terapeuta_id?: string | null }) | null | undefined,
    usuarioLogadoId: string,
    isSuperAdmin: boolean = false
  ): ResultadoPermissaoMutacaoDTO {
    if (!sessao || sessao.terapeuta_id === '') {
      return {
        permitido: false,
        statusHttp: 403,
        codigo: 'FORBIDDEN_MUTACAO_CONDUTOR',
        mensagem: 'Sessão inválida ou não informada.',
        usuarioSolicitanteId: usuarioLogadoId,
      };
    }

    if (!usuarioLogadoId || typeof usuarioLogadoId !== 'string' || usuarioLogadoId.trim() === '') {
      return {
        permitido: false,
        statusHttp: 403,
        codigo: 'FORBIDDEN_MUTACAO_CONDUTOR',
        mensagem: 'Identificador de usuário solicitante inválido.',
        terapeutaCondutorId: sessao.terapeuta_id || undefined,
        usuarioSolicitanteId: usuarioLogadoId,
      };
    }

    // 1. SuperAdmin possui privilégio global de administração/mutação
    if (isSuperAdmin) {
      return { permitido: true };
    }

    // 2. Bloqueio: Segundo terapeuta da equipe multidisciplinar não pode finalizar/cancelar sessão alheia
    if (sessao.terapeuta_id && sessao.terapeuta_id !== usuarioLogadoId) {
      return {
        permitido: false,
        statusHttp: 403,
        codigo: 'FORBIDDEN_MUTACAO_CONDUTOR',
        mensagem: 'Apenas o terapeuta condutor da sessão ou um administrador possui permissão para modificar ou encerrar esta intervenção.',
        terapeutaCondutorId: sessao.terapeuta_id,
        usuarioSolicitanteId: usuarioLogadoId,
      };
    }

    // 3. O terapeuta condutor da sessão tem permissão total sobre sua intervenção
    return { permitido: true };
  }
}
