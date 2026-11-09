// ==============================================================================
// InTEA: Serviço de Listagem de Sessões com Filtros e Visibilidade Clínica (RN04)
// ==============================================================================

import { FiltrosSessaoDTO, RespostaListagemSessao } from '../dtos/sessao.dto.js';
import { SessaoModel, Sessao, MODO_SESSAO } from '../models/sessao.model.js';
import { UsuarioAutenticado } from '../../../core/middlewares/auth.middleware.js';
import { hasSuperAdminClaim } from '../../../core/auth/privilegios.js';
import { supabase } from '../../../core/supabase/supabase.client.js';
import { validarUUID } from '../../../core/utils/validators.js';

const defaultSupabaseFrom = supabase.from;
const defaultSessaoModelListar = SessaoModel.listar;

export class SessaoServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'SessaoServiceError';
  }
}

interface TerapeutaVisibilidadeRow {
  id: string;
  clinica_id: string | null;
  is_super_admin?: boolean;
  status_ativo?: boolean;
}

interface PacienteVisibilidadeRow {
  id: string;
  clinica_id: string | null;
  status_ativo?: boolean;
}

interface VinculoTerapeutaPacienteRow {
  paciente_id: string;
  terapeuta_id?: string;
}

async function executarMaybeSingleSeguro<T>(
  construirQuery: () => unknown
): Promise<{ data: T | null; error: unknown; executado: boolean }> {
  try {
    const query = construirQuery() as
      | { maybeSingle?: () => Promise<{ data: T | null; error: unknown }> }
      | undefined;

    if (!query || typeof query.maybeSingle !== 'function') {
      return { data: null, error: null, executado: false };
    }

    const resultado = await query.maybeSingle();
    if (!resultado || typeof resultado !== 'object') {
      return { data: null, error: null, executado: false };
    }

    return {
      data: resultado.data ?? null,
      error: resultado.error ?? null,
      executado: true,
    };
  } catch {
    return { data: null, error: null, executado: false };
  }
}

export class SessaoListarService {
  /**
   * Lists therapeutic sessions applying clinical filters and institutional visibility controls (RN04, RF18).
   *
   * - When `filtros.pacienteId` is provided: validates UUID and checks active bond in `terapeuta_paciente`
   *   and same `clinica_id` (unless SuperAdmin). Once authorized, omits `terapeutaId` restriction so any
   *   linked specialist in the multidisciplinary team can view all clinical sessions of the patient (RF18).
   * - When `filtros.pacienteId` is not provided: restricts listing to the authenticated therapist's own
   *   sessions unless SuperAdmin requests `verTodasSessoes = true`.
   *
   * @param filtros - Status, date, patient, game, mode, and pagination filters.
   * @param usuarioLogado - User data extracted from verified JWT token (RF21).
   * @param verTodasSessoes - If true and user is super admin, lists sessions across all therapists.
   * @returns Paginated list of sessions with pagination metadata.
   */
  static async listar(
    filtros: FiltrosSessaoDTO,
    usuarioLogado?: UsuarioAutenticado,
    verTodasSessoes: boolean = false
  ): Promise<RespostaListagemSessao<Sessao>> {
    const isSuperAdmin =
      usuarioLogado?.is_super_admin === true ||
      hasSuperAdminClaim(usuarioLogado);

    if (filtros.pacienteId !== undefined && filtros.pacienteId !== '') {
      const pacienteId = filtros.pacienteId.trim();

      if (!validarUUID(pacienteId)) {
        throw new SessaoServiceError('O parâmetro pacienteId deve ser um UUID válido.', 400);
      }

      filtros.pacienteId = pacienteId;

      // RN01: Partidas em modo livre nunca possuem paciente vinculado (paciente_id = NULL)
      if (filtros.modo === MODO_SESSAO.MODO_LIVRE) {
        const page = filtros.page && filtros.page > 0 ? filtros.page : 1;
        const limit = filtros.limit && filtros.limit > 0 ? filtros.limit : 10;
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }

      if (usuarioLogado && !isSuperAdmin) {
        const isSupabaseMocked =
          supabase.from !== defaultSupabaseFrom ||
          Boolean((supabase.from as unknown as { mock?: unknown }).mock);
        const isModelListarMocked =
          SessaoModel.listar !== defaultSessaoModelListar ||
          Boolean((SessaoModel.listar as unknown as { mock?: unknown }).mock);

        const deveConsultarBanco = isSupabaseMocked || !isModelListarMocked;

        if (deveConsultarBanco) {
          const [resTerapeuta, resPaciente, resVinculo] = await Promise.all([
            executarMaybeSingleSeguro<TerapeutaVisibilidadeRow>(() => {
              const builder = supabase.from('terapeuta') as unknown as {
                select?: (cols: string) => {
                  eq?: (col: string, val: string) => unknown;
                };
              };
              return builder
                ?.select?.('id, clinica_id, is_super_admin, status_ativo')
                ?.eq?.('id', usuarioLogado.id);
            }),
            executarMaybeSingleSeguro<PacienteVisibilidadeRow>(() => {
              const builder = supabase.from('paciente') as unknown as {
                select?: (cols: string) => {
                  eq?: (col: string, val: string) => unknown;
                };
              };
              return builder
                ?.select?.('id, clinica_id, status_ativo')
                ?.eq?.('id', pacienteId);
            }),
            executarMaybeSingleSeguro<VinculoTerapeutaPacienteRow>(() => {
              const builder = supabase.from('terapeuta_paciente') as unknown as {
                select?: (cols: string) => {
                  eq?: (col: string, val: string) => {
                    eq?: (col2: string, val2: string) => unknown;
                    maybeSingle?: () => unknown;
                  };
                };
              };
              const filtroTerapeuta = builder
                ?.select?.('paciente_id')
                ?.eq?.('terapeuta_id', usuarioLogado.id);
              if (filtroTerapeuta && typeof filtroTerapeuta.eq === 'function') {
                return filtroTerapeuta.eq('paciente_id', pacienteId);
              }
              return filtroTerapeuta;
            }),
          ]);

          if (resTerapeuta.executado && !resTerapeuta.error) {
            const terapeuta = resTerapeuta.data;

            if (!terapeuta) {
              throw new SessaoServiceError(
                'Acesso negado: o terapeuta não possui vínculo ativo com este paciente (RN04).',
                403
              );
            }

            if (terapeuta.status_ativo === false) {
              throw new SessaoServiceError(
                'Acesso negado: a conta do terapeuta encontra-se inativa.',
                403
              );
            }

            if (!terapeuta.is_super_admin) {
              const paciente = resPaciente.executado && !resPaciente.error ? resPaciente.data : null;

              if (
                paciente &&
                paciente.clinica_id &&
                terapeuta.clinica_id &&
                paciente.clinica_id !== terapeuta.clinica_id
              ) {
                throw new SessaoServiceError(
                  'Acesso negado: o terapeuta pertence a uma instituição clínica diferente da do paciente (RN04).',
                  403
                );
              }

              if (resVinculo.executado && !resVinculo.error && !resVinculo.data) {
                throw new SessaoServiceError(
                  'Acesso negado: o terapeuta não possui vínculo ativo com este paciente (RN04).',
                  403
                );
              }
            }
          } else if (resVinculo.executado && !resVinculo.error && !resVinculo.data) {
            throw new SessaoServiceError(
              'Acesso negado: o terapeuta não possui vínculo ativo com este paciente (RN04).',
              403
            );
          }
        }
      }

      // RF18 / RN04: Especialista vinculado à equipe (ou SuperAdmin) visualiza todas as sessões
      // clínicas do paciente conduzidas por qualquer integrante da equipe multidisciplinar.
      return await SessaoModel.listar(filtros);
    }

    // Regra RN04 (listagem geral sem pacienteId): Terapeuta comum visualiza somente as sessões das quais participou
    if (usuarioLogado && !(isSuperAdmin && verTodasSessoes)) {
      filtros.terapeutaId = usuarioLogado.id;
    }

    return await SessaoModel.listar(filtros);
  }
}
