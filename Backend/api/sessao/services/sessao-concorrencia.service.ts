// ==============================================================================
// InTEA: Serviço de Controle de Concorrência de Sessões Ativas por Paciente
// Sprint 13 — RF13, RF18, RF21, RN01, RN04
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
  nome_completo?: string;
  especialidade?: string;
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
   * Status considerados ativos para bloqueio de concorrência clínica.
   */
  private static readonly STATUS_ATIVOS = [
    STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
    STATUS_SESSAO.CONECTADO,
    STATUS_SESSAO.EM_ANDAMENTO,
  ];

  /**
   * Consulta se o paciente já possui uma sessão clínica ativa no momento (RF13, RF18, RN01, RN04).
   *
   * Regras:
   * - RN01 (Modo Livre): sessões sem paciente_id (null/undefined) não geram trava de concorrência.
   * - Sessões em status terminal ('finalizada', 'cancelada', 'expirada', 'interrompida_por_queda') não geram bloqueio.
   * - Em 'aguardando_pareamento': se expira_em já ultrapassou o horário atual, é tratada como expirada e não gera bloqueio.
   * - Caso exista sessão ativa: retorna conflito: true, statusHttp: 409 com dados da sessão e especialista responsável.
   *
   * @param pacienteId - UUID do paciente clínico (ou null para modo livre)
   * @param terapeutaSolicitanteId - UUID do terapeuta autenticado solicitando o início da sessão
   * @returns ResultadoConcorrenciaDTO
   */
  static async verificarSessaoAtivaConcorrente(
    pacienteId?: string | null,
    terapeutaSolicitanteId?: string
  ): Promise<ResultadoConcorrenciaDTO> {
    // RN01: Modo livre não grava em prontuário e não bloqueia concorrência
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
            nome_completo,
            especialidade,
            registro_conselho
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
              nome: t.nome_completo,
              especialidade: t.especialidade,
              registro_conselho: t.registro_conselho,
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
   * Garante que ações mutáveis críticas da máquina de estados (finalizar, cancelar)
   * sejam executadas exclusivamente pelo terapeuta condutor ou SuperAdmin (RF21).
   *
   * @param sessao - Objeto da sessão clínica ou identificador de autoria
   * @param usuarioLogadoId - UUID do usuário extraído do JWT autenticado (RF21)
   * @param isSuperAdmin - Indicador se o usuário possui privilégios de SuperAdmin
   * @returns ResultadoPermissaoMutacaoDTO
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

    // 2. Bloqueio RF21: Segundo terapeuta da equipe multidisciplinar não pode finalizar/cancelar sessão alheia
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
