/**
 * ============================================================================
 * REST SERVICE FOR PATIENT DOMAIN
 * Compliance: RF06, RF10, RF18, RF19, RN04, RN05
 * ============================================================================
 */

import { http, withFallback, ENDPOINTS } from "@/core/api";
import type {
  Paciente,
  TerapeutaPaciente,
  EspecialistaVinculado,
  CriarPacienteDTO,
  AtualizarPacienteDTO,
  FiltroPacienteDTO,
  VincularTerapeutaDTO,
  PacienteRespostaApi,
  PacientesListaRespostaApi,
  HistoricoRespostaApi,
  HistoricoGeralRespostaApi,
  HistoricoJogoRespostaApi,
} from "../types/paciente.types";
import type {
  FiltrosHistorico,
  RespostaHistoricoPaciente,
  MetricasEngajamentoGeral,
  ResumoJogoPaciente,
  HistoricoJogoDetalhado,
} from "../types/historico.types";
import {
  listarPacientesMock,
  buscarPacienteMockPorId,
  criarPacienteMock,
  atualizarPacienteMock,
  inativarPacienteMock,
  reativarPacienteMock,
  listarTerapeutasPacienteMock,
  listarEspecialistasVinculadosMock,
  vincularTerapeutaMock,
  desvincularTerapeutaMock,
  buscarHistoricoPacienteMock,
  buscarHistoricoGeralMock,
  buscarHistoricoJogoMock,
} from "../types/bdmock";

/**
 * Converts filter DTO into HTTP query parameter record.
 */
function serializarFiltros(
  filtros?: FiltroPacienteDTO,
): Record<string, string> | undefined {
  if (!filtros) return undefined;

  const params: Record<string, string> = {};
  if (filtros.nome) params.nome = filtros.nome;
  if (filtros.cpf) params.cpf = filtros.cpf;
  if (filtros.idadeMin !== undefined) params.idadeMin = String(filtros.idadeMin);
  if (filtros.idadeMax !== undefined) params.idadeMax = String(filtros.idadeMax);
  if (filtros.incluirInativos !== undefined) {
    params.incluirInativos = String(filtros.incluirInativos);
  }
  if (filtros.all !== undefined) params.all = String(filtros.all);
  if (filtros.page !== undefined) params.page = String(filtros.page);
  if (filtros.limit !== undefined) params.limit = String(filtros.limit);

  return Object.keys(params).length > 0 ? params : undefined;
}

function normalizarDataInicioIso(data?: string): string | undefined {
  if (!data) return undefined;
  return data.includes("T") ? data : `${data}T00:00:00.000Z`;
}

function normalizarDataFimIso(data?: string): string | undefined {
  if (!data) return undefined;
  return data.includes("T") ? data : `${data}T23:59:59.999Z`;
}

function resolverPeriodoParaDatas(periodo: string): { dataInicio?: string; dataFim?: string } {
  const agora = new Date();
  const formatISO = (d: Date) => d.toISOString().split("T")[0];

  switch (periodo) {
    case "7d": {
      const inicio = new Date(agora);
      inicio.setDate(agora.getDate() - 7);
      return {
        dataInicio: normalizarDataInicioIso(formatISO(inicio)),
        dataFim: normalizarDataFimIso(formatISO(agora)),
      };
    }
    case "30d": {
      const inicio = new Date(agora);
      inicio.setDate(agora.getDate() - 30);
      return {
        dataInicio: normalizarDataInicioIso(formatISO(inicio)),
        dataFim: normalizarDataFimIso(formatISO(agora)),
      };
    }
    case "3m": {
      const inicio = new Date(agora);
      inicio.setMonth(agora.getMonth() - 3);
      return {
        dataInicio: normalizarDataInicioIso(formatISO(inicio)),
        dataFim: normalizarDataFimIso(formatISO(agora)),
      };
    }
    case "todos":
    case "personalizado":
    default:
      return {};
  }
}

/**
 * Converts clinical history filter DTO into HTTP query parameter record (RF19).
 */
function serializarFiltrosHistorico(
  filtros?: FiltrosHistorico,
): Record<string, string> | undefined {
  if (!filtros) return undefined;
  const params: Record<string, string> = {};

  if (filtros.periodo && filtros.periodo !== "personalizado" && filtros.periodo !== "todos") {
    const { dataInicio, dataFim } = resolverPeriodoParaDatas(filtros.periodo);
    if (dataInicio) params.dataInicio = dataInicio;
    if (dataFim) params.dataFim = dataFim;
  } else {
    const inicioNorm = normalizarDataInicioIso(filtros.dataInicio);
    const fimNorm = normalizarDataFimIso(filtros.dataFim);
    if (inicioNorm) params.dataInicio = inicioNorm;
    if (fimNorm) params.dataFim = fimNorm;
  }

  if (filtros.jogoId) params.jogoId = filtros.jogoId;
  if (filtros.sessaoId) params.sessaoId = filtros.sessaoId;
  if (filtros.page !== undefined) params.page = String(filtros.page);
  if (filtros.limit !== undefined) params.limit = String(filtros.limit);
  return Object.keys(params).length > 0 ? params : undefined;
}

/**
 * Extracts and normalizes patient data along with relational fields from an API response envelope.
 *
 * @param resposta - Raw API response payload or direct patient entity.
 * @returns Consolidated Patient object with populated relationships, or null if invalid.
 */
function extrairPaciente(resposta: PacienteRespostaApi | Paciente | null | undefined): Paciente | null {
  if (!resposta) return null;
  if ("id" in resposta && typeof (resposta as Paciente).id === "string") {
    return resposta as Paciente;
  }
  if ("data" in resposta && resposta.data) {
    const d = resposta.data;
    if ("paciente" in d && d.paciente) {
      const p = { ...d.paciente };
      if ("responsaveis" in d && d.responsaveis && !p.responsaveis) {
        p.responsaveis = d.responsaveis;
      }
      if ("dados_clinicos" in d && d.dados_clinicos && !p.dados_clinicos) {
        p.dados_clinicos = d.dados_clinicos;
      }
      return p;
    }
    if ("id" in d && typeof (d as Paciente).id === "string") {
      return d as Paciente;
    }
  }
  return null;
}

function extrairStatusErro(erro: unknown): number | undefined {
  if (!erro || typeof erro !== "object") return undefined;
  const errObj = erro as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
  };
  return errObj.status ?? errObj.statusCode ?? errObj.response?.status;
}

function criarErroSemantico(mensagem: string, status: number): Error & { status: number } {
  const err = new Error(mensagem) as Error & { status: number };
  err.status = status;
  return err;
}

function normalizarEspecialistaVinculado(
  item: TerapeutaPaciente | EspecialistaVinculado,
): EspecialistaVinculado {
  if ("terapeuta_id" in item) {
    const t = item.terapeuta;
    return {
      id: t?.id ?? item.terapeuta_id,
      nome: t?.nome ?? "Especialista da Equipe",
      email: t?.email ?? null,
      telefone: t?.telefone ?? null,
      crp: t?.crp ?? null,
      crefito: t?.crefito ?? null,
      registro_profissional: t?.registro_profissional ?? t?.crefito ?? t?.crp ?? null,
      especialidade: t?.especialidade ?? "Equipe Multidisciplinar",
      papel_equipe: item.papel_equipe ?? "Equipe Multidisciplinar",
      created_at: item.created_at,
      status_ativo: t?.status_ativo ?? true,
    };
  }
  return {
    id: item.id,
    nome: item.nome,
    email: item.email ?? null,
    telefone: item.telefone ?? null,
    crp: item.crp ?? null,
    crefito: item.crefito ?? null,
    registro_profissional:
      item.registro_profissional ?? item.crefito ?? item.crp ?? null,
    especialidade: item.especialidade ?? "Equipe Multidisciplinar",
    papel_equipe: item.papel_equipe ?? "Equipe Multidisciplinar",
    created_at: item.created_at,
    status_ativo: item.status_ativo ?? true,
  };
}

export const pacienteService = {
  /**
   * Lists registered patients applying search, age, and pagination filters (RF19, RN05).
   */
  listar: async (filtros?: FiltroPacienteDTO): Promise<Paciente[]> => {
    return await withFallback(
      async () => {
        const params = serializarFiltros(filtros);
        const resposta = await http.get<
          PacientesListaRespostaApi | Paciente[]
        >(ENDPOINTS.PACIENTE.BASE, { params });

        if (Array.isArray(resposta)) {
          return resposta;
        }
        if (resposta && "data" in resposta && resposta.data) {
          if (Array.isArray(resposta.data)) {
            return resposta.data;
          }
          if ("pacientes" in resposta.data && Array.isArray(resposta.data.pacientes)) {
            return resposta.data.pacientes;
          }
        }
        return [];
      },
      () => listarPacientesMock(filtros),
    );
  },

  /**
   * Retrieves full record and patient profile by UUID (RF06, RN04).
   */
  buscarPorId: async (id: string): Promise<Paciente | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.get<PacienteRespostaApi | Paciente>(
          ENDPOINTS.PACIENTE.BY_ID(id),
        );
        return extrairPaciente(resposta);
      },
      () => buscarPacienteMockPorId(id),
    );
  },

  /**
   * Registers a new patient along with primary guardian (RF06, RF18).
   */
  criar: async (dto: CriarPacienteDTO): Promise<Paciente> => {
    return await withFallback(
      async () => {
        const resposta = await http.post<PacienteRespostaApi | Paciente>(
          ENDPOINTS.PACIENTE.BASE,
          dto,
        );
        const p = extrairPaciente(resposta);
        if (!p) {
          throw new Error("Falha ao instanciar paciente retornado pela API.");
        }
        return p;
      },
      () => criarPacienteMock(dto),
    );
  },

  /**
   * Updates demographic and clinical profile data of patient (RF06, RN04).
   */
  atualizar: async (
    id: string,
    dto: AtualizarPacienteDTO,
  ): Promise<Paciente | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.put<PacienteRespostaApi | Paciente>(
          ENDPOINTS.PACIENTE.BY_ID(id),
          dto,
        );
        return extrairPaciente(resposta);
      },
      () => atualizarPacienteMock(id, dto),
    );
  },

  /**
   * Deactivates patient preserving clinical medical record (Soft Delete - RN05).
   */
  inativar: async (id: string): Promise<Paciente | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.delete<PacienteRespostaApi | Paciente>(
          ENDPOINTS.PACIENTE.BY_ID(id),
        );
        return extrairPaciente(resposta);
      },
      () => inativarPacienteMock(id),
    );
  },

  /**
   * Reactivates a previously deactivated patient (RN05).
   */
  reativar: async (id: string): Promise<Paciente | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.patch<PacienteRespostaApi | Paciente>(
          ENDPOINTS.PACIENTE.REATIVAR(id),
        );
        return extrairPaciente(resposta);
      },
      () => reativarPacienteMock(id),
    );
  },

  /**
   * Lists multidisciplinary team therapists associated with patient (RF18, RN04).
   */
  listarTerapeutas: async (id: string): Promise<TerapeutaPaciente[]> => {
    if (!id || !id.trim()) return [];

    return await withFallback(
      async () => {
        const resposta = await http.get<
          | { data: TerapeutaPaciente[] | { terapeutas: TerapeutaPaciente[] } }
          | TerapeutaPaciente[]
        >(ENDPOINTS.PACIENTE.TERAPEUTAS(id));

        if (Array.isArray(resposta)) {
          return resposta;
        }
        if (resposta && "data" in resposta && resposta.data) {
          if (Array.isArray(resposta.data)) {
            return resposta.data;
          }
          if ("terapeutas" in resposta.data && Array.isArray(resposta.data.terapeutas)) {
            return resposta.data.terapeutas;
          }
        }
        return [];
      },
      () => listarTerapeutasPacienteMock(id),
    );
  },

  /**
   * Retrieves the multidisciplinary team specialists linked to a patient record.
   * Enriches therapist records with professional council numbers and team role.
   * Throws 403 (Forbidden) if the requesting therapist lacks active clinic membership.
   *
   * @param pacienteId - Target patient UUID
   * @returns Array of associated specialist records with credentials
   */
  listarTerapeutasVinculados: async (
    pacienteId: string,
  ): Promise<EspecialistaVinculado[]> => {
    if (!pacienteId || !pacienteId.trim()) return [];

    let erroSemantico: (Error & { status: number }) | null = null;

    const resultado = await withFallback(
      async () => {
        try {
          const resposta = await http.get<
            | {
                data:
                  | Array<TerapeutaPaciente | EspecialistaVinculado>
                  | { terapeutas: Array<TerapeutaPaciente | EspecialistaVinculado> };
              }
            | Array<TerapeutaPaciente | EspecialistaVinculado>
          >(ENDPOINTS.PACIENTE.TERAPEUTAS(pacienteId));

          let listaBruta: Array<TerapeutaPaciente | EspecialistaVinculado> = [];
          if (Array.isArray(resposta)) {
            listaBruta = resposta;
          } else if (resposta && "data" in resposta && resposta.data) {
            if (Array.isArray(resposta.data)) {
              listaBruta = resposta.data;
            } else if (
              "terapeutas" in resposta.data &&
              Array.isArray(resposta.data.terapeutas)
            ) {
              listaBruta = resposta.data.terapeutas;
            }
          }

          return listaBruta.map(normalizarEspecialistaVinculado);
        } catch (err) {
          const status = extrairStatusErro(err);
          if (status === 403) {
            erroSemantico = criarErroSemantico(
              err instanceof Error && err.message
                ? err.message
                : "Acesso negado (403): você não possui vínculo ativo na clínica deste paciente.",
              403,
            );
          }
          throw err;
        }
      },
      async () => {
        if (erroSemantico) throw erroSemantico;
        return await listarEspecialistasVinculadosMock(pacienteId);
      },
    );

    return resultado;
  },

  /**
   * Associates a healthcare specialist with a patient's multidisciplinary team record.
   * Throws 403 (Forbidden) if the specialist belongs to a differing clinic.
   * Throws 409 (Conflict) if the specialist is already linked to this patient.
   *
   * @param pacienteId - Target patient UUID
   * @param terapeutaIdOrDto - Specialist UUID or payload containing terapeuta_id
   * @returns API confirmation message on successful link creation
   */
  vincularTerapeuta: async (
    pacienteId: string,
    terapeutaIdOrDto: string | VincularTerapeutaDTO,
  ): Promise<{ message: string }> => {
    const terapeutaId =
      typeof terapeutaIdOrDto === "string"
        ? terapeutaIdOrDto
        : terapeutaIdOrDto.terapeuta_id;
    const payload: VincularTerapeutaDTO = { terapeuta_id: terapeutaId };

    let erroSemantico: (Error & { status: number }) | null = null;

    return await withFallback(
      async () => {
        try {
          return await http.post<{ message: string }>(
            ENDPOINTS.PACIENTE.TERAPEUTAS(pacienteId),
            payload,
          );
        } catch (err) {
          const status = extrairStatusErro(err);
          if (status === 403) {
            erroSemantico = criarErroSemantico(
              err instanceof Error && err.message
                ? err.message
                : "Acesso negado (403): não é permitido vincular especialistas de outra clínica.",
              403,
            );
          } else if (status === 409) {
            erroSemantico = criarErroSemantico(
              err instanceof Error && err.message
                ? err.message
                : "Conflito (409): este especialista já integra a Equipe Multidisciplinar do paciente.",
              409,
            );
          }
          throw err;
        }
      },
      async () => {
        if (erroSemantico) throw erroSemantico;
        return await vincularTerapeutaMock(pacienteId, terapeutaId);
      },
    );
  },

  /**
   * Queries consolidated longitudinal session history and engagement metrics for a patient.
   * Returns engagement overview, active games, and session timeline.
   *
   * @param pacienteId - Target patient UUID
   * @param filtros - Optional date range query filters
   * @returns Consolidated patient history response
   */
  buscarHistorico: async (
    pacienteId: string,
    filtros?: FiltrosHistorico,
  ): Promise<RespostaHistoricoPaciente> => {
    return await withFallback(
      async () => {
        const params = serializarFiltrosHistorico(filtros);
        if (params && params.jogoId) {
          delete params.jogoId;
        }
        const resposta = await http.get<HistoricoRespostaApi | RespostaHistoricoPaciente>(
          ENDPOINTS.PACIENTE.HISTORICO(pacienteId),
          { params },
        );

        if (resposta && "data" in resposta && resposta.data) {
          const d = resposta.data;
          if ("engajamento_geral" in d) {
            return d as RespostaHistoricoPaciente;
          }
        }
        if (resposta && "engajamento_geral" in (resposta as RespostaHistoricoPaciente)) {
          return resposta as RespostaHistoricoPaciente;
        }

        throw new Error("Payload de historico longitudinal retornado em formato incompativel.");
      },
      () => buscarHistoricoPacienteMock(pacienteId, filtros),
    );
  },

  /**
   * Queries general patient engagement history and game catalog metrics (RF15, RF19).
   * Longitudinal Record (RF15): Supports temporal range filters, metric aggregates, and fallback to mock data.
   *
   * @param pacienteId - UUID of the target patient
   * @param filtros - Optional date range query filters
   * @returns Consolidated engagement history and game summary
   */
  buscarHistoricoGeral: async (
    pacienteId: string,
    filtros?: FiltrosHistorico,
  ): Promise<{
    engajamento: MetricasEngajamentoGeral;
    jogos: ResumoJogoPaciente[];
    meta?: unknown;
  }> => {
    return await withFallback(
      async () => {
        const params = serializarFiltrosHistorico(filtros);
        if (params && params.jogoId) {
          delete params.jogoId;
        }
        const resposta = await http.get<HistoricoGeralRespostaApi | {
          engajamento: MetricasEngajamentoGeral;
          jogos: ResumoJogoPaciente[];
          meta?: unknown;
        }>(
          ENDPOINTS.PACIENTE.HISTORICO(pacienteId),
          { params },
        );

        if (resposta && "data" in resposta && resposta.data) {
          const d = resposta.data;
          if ("engajamento" in d && "jogos" in d) {
            return d;
          }
        }
        if (resposta && "engajamento" in resposta && "jogos" in resposta) {
          return resposta;
        }

        throw new Error("Payload de histórico geral retornado em formato incompatível pela API.");
      },
      () => buscarHistoricoGeralMock(pacienteId, filtros),
    );
  },

  /**
   * Queries metric time series and session history for a specific game played by the patient (RF15, RN02).
   * Metric Evolution (RF15): Retrieves typed metrics from game manifest and maps trend series over time.
   *
   * @param pacienteId - UUID of the target patient
   * @param jogoId - UUID of the selected therapeutic game
   * @param filtros - Optional date range query filters
   * @returns Detailed game performance metrics and session time series
   */
  buscarHistoricoJogo: async (
    pacienteId: string,
    jogoId: string,
    filtros?: FiltrosHistorico,
  ): Promise<HistoricoJogoDetalhado> => {
    return await withFallback(
      async () => {
        const params = serializarFiltrosHistorico(filtros);
        if (params && params.jogoId) {
          delete params.jogoId;
        }
        const resposta = await http.get<HistoricoJogoRespostaApi | HistoricoJogoDetalhado>(
          ENDPOINTS.PACIENTE.HISTORICO_JOGO(pacienteId, jogoId),
          { params },
        );

        if (resposta && "data" in resposta && resposta.data) {
          const d = resposta.data as unknown as Record<string, unknown>;
          if ("series_temporais" in d && "sessoes" in d) {
            return {
              tipo: "detalhado",
              jogo: d.jogo as HistoricoJogoDetalhado["jogo"],
              sessoes: (d.sessoes || []) as HistoricoJogoDetalhado["sessoes"],
              series_temporais: (d.series_temporais || []) as HistoricoJogoDetalhado["series_temporais"],
            };
          }
        }
        if (resposta && "tipo" in (resposta as HistoricoJogoDetalhado) && (resposta as HistoricoJogoDetalhado).tipo === "detalhado") {
          return resposta as HistoricoJogoDetalhado;
        }

        throw new Error("Payload de histórico do jogo retornado em formato incompatível pela API.");
      },
      () => buscarHistoricoJogoMock(pacienteId, jogoId, filtros),
    );
  },

  /**
   * Removes an association between a specialist and a patient's multidisciplinary team.
   * Throws 409 (Conflict) if attempting to unlink the sole remaining active specialist.
   * Throws 403 (Forbidden) if user lacks permission to unlink peer specialists.
   *
   * @param pacienteId - Target patient UUID
   * @param terapeutaId - Specialist therapist UUID to unlink
   * @returns API confirmation message on successful unlinking
   */
  desvincularTerapeuta: async (
    pacienteId: string,
    terapeutaId: string,
  ): Promise<{ message: string }> => {
    let erroSemantico: (Error & { status: number }) | null = null;

    return await withFallback(
      async () => {
        try {
          return await http.delete<{ message: string }>(
            ENDPOINTS.PACIENTE.TERAPEUTA_BY_ID(pacienteId, terapeutaId),
          );
        } catch (err) {
          const status = extrairStatusErro(err);
          if (status === 409) {
            erroSemantico = criarErroSemantico(
              err instanceof Error && err.message
                ? err.message
                : "Não é possível remover o único especialista vinculado ao paciente. O prontuário exige ao menos 1 responsável ativo.",
              409,
            );
          } else if (status === 403) {
            erroSemantico = criarErroSemantico(
              err instanceof Error && err.message
                ? err.message
                : "Acesso negado (403): você não possui permissão para desvincular especialistas deste paciente.",
              403,
            );
          }
          throw err;
        }
      },
      async () => {
        if (erroSemantico) throw erroSemantico;
        return await desvincularTerapeutaMock(pacienteId, terapeutaId);
      },
    );
  },
};

export default pacienteService;
