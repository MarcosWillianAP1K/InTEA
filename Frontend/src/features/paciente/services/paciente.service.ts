/**
 * ============================================================================
 * SERVIÇO REST DO DOMÍNIO PACIENTE (paciente.service.ts)
 * Consome os endpoints centralizados ENDPOINTS.PACIENTE via http-client
 * com fallback resiliente para bdmock.ts em caso de indisponibilidade.
 * Conformidade: RF06, RF10, RF18, RF19, RN04, RN05
 * ============================================================================
 */

import { http, withFallback, ENDPOINTS } from "@/core/api";
import type {
  Paciente,
  TerapeutaPaciente,
  CriarPacienteDTO,
  AtualizarPacienteDTO,
  FiltroPacienteDTO,
  VincularTerapeutaDTO,
  PacienteRespostaApi,
  PacientesListaRespostaApi,
} from "../types/paciente.types";
import {
  listarPacientesMock,
  buscarPacienteMockPorId,
  criarPacienteMock,
  atualizarPacienteMock,
  inativarPacienteMock,
  reativarPacienteMock,
  listarTerapeutasPacienteMock,
  vincularTerapeutaMock,
  desvincularTerapeutaMock,
} from "../types/bdmock";

/**
 * Converte o DTO de filtros para Record<string, string> aceito pelo cliente HTTP.
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

export const pacienteService = {
  /**
   * Lista pacientes cadastrados aplicando filtros de busca, idade e paginação (RF19, RN05).
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
        return resposta.data ?? [];
      },
      () => listarPacientesMock(filtros),
    );
  },

  /**
   * Consulta prontuário e dados completos de um paciente por UUID (RF06, RN04).
   */
  buscarPorId: async (id: string): Promise<Paciente | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.get<PacienteRespostaApi | Paciente>(
          ENDPOINTS.PACIENTE.BY_ID(id),
        );
        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as Paciente) ?? null;
      },
      () => buscarPacienteMockPorId(id),
    );
  },

  /**
   * Cadastra um novo paciente e seu responsável principal (RF06, RF18).
   */
  criar: async (dto: CriarPacienteDTO): Promise<Paciente> => {
    return await withFallback(
      async () => {
        const resposta = await http.post<PacienteRespostaApi | Paciente>(
          ENDPOINTS.PACIENTE.BASE,
          dto,
        );
        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return resposta as Paciente;
      },
      () => criarPacienteMock(dto),
    );
  },

  /**
   * Atualiza dados cadastrais e clínicos do paciente (RF06, RN04).
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
        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as Paciente) ?? null;
      },
      () => atualizarPacienteMock(id, dto),
    );
  },

  /**
   * Desativa o paciente preservando seu prontuário clínico (Soft Delete - RN05).
   */
  inativar: async (id: string): Promise<Paciente | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.delete<PacienteRespostaApi | Paciente>(
          ENDPOINTS.PACIENTE.BY_ID(id),
        );
        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as Paciente) ?? null;
      },
      () => inativarPacienteMock(id),
    );
  },

  /**
   * Reativa um paciente previamente desativado (RN05).
   */
  reativar: async (id: string): Promise<Paciente | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.patch<PacienteRespostaApi | Paciente>(
          ENDPOINTS.PACIENTE.REATIVAR(id),
        );
        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as Paciente) ?? null;
      },
      () => reativarPacienteMock(id),
    );
  },

  /**
   * Lista terapeutas da equipe multidisciplinar vinculados ao paciente (RF18, RN04).
   */
  listarTerapeutas: async (id: string): Promise<TerapeutaPaciente[]> => {
    if (!id || !id.trim()) return [];

    return await withFallback(
      async () => {
        const resposta = await http.get<
          { data: TerapeutaPaciente[] } | TerapeutaPaciente[]
        >(ENDPOINTS.PACIENTE.TERAPEUTAS(id));

        if (Array.isArray(resposta)) {
          return resposta;
        }
        return resposta.data ?? [];
      },
      () => listarTerapeutasPacienteMock(id),
    );
  },

  /**
   * Vincula um terapeuta da mesma clínica ao paciente (RF18, RF21).
   */
  vincularTerapeuta: async (
    pacienteId: string,
    dto: VincularTerapeutaDTO,
  ): Promise<{ message: string }> => {
    return await withFallback(
      async () => {
        return await http.post<{ message: string }>(
          ENDPOINTS.PACIENTE.TERAPEUTAS(pacienteId),
          dto,
        );
      },
      () => vincularTerapeutaMock(pacienteId, dto.terapeuta_id),
    );
  },

  /**
   * Desvincula um terapeuta do paciente (RF18).
   */
  desvincularTerapeuta: async (
    pacienteId: string,
    terapeutaId: string,
  ): Promise<{ message: string }> => {
    return await withFallback(
      async () => {
        return await http.delete<{ message: string }>(
          ENDPOINTS.PACIENTE.TERAPEUTA_BY_ID(pacienteId, terapeutaId),
        );
      },
      () => desvincularTerapeutaMock(pacienteId, terapeutaId),
    );
  },
};

export default pacienteService;
