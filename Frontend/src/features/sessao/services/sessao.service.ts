/**
 * ============================================================================
 * SERVIÇO REST DO DOMÍNIO SESSÃO (sessao.service.ts)
 * Consome os endpoints centralizados ENDPOINTS.SESSAO via http-client
 * com fallback resiliente para bdmock.ts em caso de indisponibilidade.
 * Conformidade: RF10, RF11 (RN01), RF12, RF13, RF14, RF16, RF17, RF20
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
 */

import { http, withFallback, ENDPOINTS } from "@/core/api";
import type {
  Sessao,
  IniciarSessaoDTO,
  FinalizarSessaoDTO,
  StatusSessaoDTO,
  ResultadoSessao,
  FinalizarSessaoResposta,
  BuscarResultadoResposta,
  SalvarAnotacaoPayload,
  SalvarAnotacaoResposta,
  AnotacaoClinicaResultado,
  FiltroSessaoDTO,
  RespostaListagemSessao,
} from "../types/sessao.types";
import {
  iniciarSessaoMock,
  buscarSessaoMockPorId,
  buscarSessaoMockPorToken,
  consultarStatusMock,
  atualizarStatusSessaoMock,
  finalizarSessaoMock,
  cancelarSessaoMock,
  obterResultadoSessaoMock,
  exportarRelatorioSessaoMock,
  listarSessoesMock,
} from "../types/bdmock";

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:3000/api";

function obterAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("access_token") ||
        window.localStorage.getItem("token") ||
        window.sessionStorage.getItem("access_token") ||
        window.sessionStorage.getItem("token")
      : null;

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

export const sessaoService = {
  /**
   * Inicia uma nova sessão clínica ou em Modo Livre (RN01, RF10).
   */
  iniciarSessao: async (dto: IniciarSessaoDTO): Promise<Sessao> => {
    return await withFallback(
      async () => {
        const resposta = await http.post<{ data: Sessao } | Sessao>(
          ENDPOINTS.SESSAO.INICIAR,
          dto,
        );
        let dados: Sessao;
        if ("data" in resposta && resposta.data) {
          dados = resposta.data;
        } else {
          dados = resposta as Sessao;
        }
        const dadosRaw = dados as unknown as { id?: string; session_id?: string };
        const idNormalizado = dadosRaw.id || dadosRaw.session_id;
        if (idNormalizado && !dados.id) {
          dados = {
            ...dados,
            id: idNormalizado,
          };
        }
        return dados;
      },
      () => iniciarSessaoMock(dto),
    );
  },

  /**
   * Consulta uma sessão por UUID.
   */
  buscarPorId: async (id: string): Promise<Sessao | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.get<{ data: Sessao } | Sessao>(
          ENDPOINTS.SESSAO.BY_ID(id),
        );
        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as Sessao) ?? null;
      },
      () => buscarSessaoMockPorId(id),
    );
  },

  /**
   * Consulta uma sessão pelo session_token de pareamento.
   */
  buscarPorToken: async (token: string): Promise<Sessao | null> => {
    if (!token || !token.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.get<{ data: Sessao } | Sessao>(
          ENDPOINTS.SESSAO.BY_TOKEN(token),
        );
        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as Sessao) ?? null;
      },
      () => buscarSessaoMockPorToken(token),
    );
  },

  /**
   * Consulta o status de conexão do tablet ou VR pelo PIN/Token de pareamento.
   */
  consultarStatusPorPin: async (
    tokenOuPin: string,
  ): Promise<StatusSessaoDTO | null> => {
    if (!tokenOuPin || !tokenOuPin.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.get<
          { data: StatusSessaoDTO } | StatusSessaoDTO
        >(ENDPOINTS.SESSAO.STATUS_BY_TOKEN(tokenOuPin));

        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as StatusSessaoDTO) ?? null;
      },
      () => consultarStatusMock(tokenOuPin),
    );
  },

  /**
   * Atualiza o status operacional da sessão (FSM).
   */
  atualizarStatus: async (
    id: string,
    status: string,
  ): Promise<Sessao | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.patch<{ data: Sessao } | Sessao>(
          ENDPOINTS.SESSAO.STATUS(id),
          { status },
        );
        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as Sessao) ?? null;
      },
      () => atualizarStatusSessaoMock(id, status),
    );
  },

  /**
   * Finaliza sessão clínica e sintetiza laudo IA (RF13, RF14, RF17).
   */
  finalizarSessao: async (
    id: string,
    dto?: FinalizarSessaoDTO | string,
  ): Promise<ResultadoSessao> => {
    const payload =
      typeof dto === "string"
        ? { anotacoes_clinicas: dto }
        : dto || { anotacoes_clinicas: "" };

    return await withFallback(
      async () => {
        const resposta = await http.patch<
          { data: ResultadoSessao } | ResultadoSessao
        >(ENDPOINTS.SESSAO.FINALIZAR(id), payload);

        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return resposta as ResultadoSessao;
      },
      () => finalizarSessaoMock(id, dto),
    );
  },

  /**
   * Cancela a sessão clínica em andamento.
   */
  cancelarSessao: async (
    id: string,
    motivo?: string,
  ): Promise<{ sucesso: boolean; message?: string }> => {
    if (!id || !id.trim()) return { sucesso: false, message: "ID ausente" };

    return await withFallback(
      async () => {
        return await http.delete<{ sucesso: boolean; message?: string }>(
          ENDPOINTS.SESSAO.CANCELAR(id),
          { data: { motivo } },
        );
      },
      async () => {
        await cancelarSessaoMock(id, motivo);
        return { sucesso: true, message: "Sessão cancelada em modo mock" };
      },
    );
  },

  /**
   * Obtém resultados consolidados da sessão pós-intervenção (RF14).
   */
  obterResultado: async (id: string): Promise<ResultadoSessao | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.get<
          { data: ResultadoSessao } | ResultadoSessao
        >(ENDPOINTS.SESSAO.RESULTADO(id));

        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as ResultadoSessao) ?? null;
      },
      () => obterResultadoSessaoMock(id),
    );
  },

  /**
   * Exporta dados clínicos estruturados da sessão (RF20).
   */
  exportarRelatorio: async (
    id: string,
  ): Promise<{ sucesso: boolean; data?: unknown; error?: string }> => {
    if (!id || !id.trim()) {
      return { sucesso: false, error: "Identificador de sessão ausente" };
    }

    try {
      const url = `${API_BASE_URL}/sessao/${encodeURIComponent(id.trim())}/exportar`;
      const headers = obterAuthHeaders();

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorJson = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        return {
          sucesso: false,
          error:
            errorJson?.error ||
            `Falha ao exportar relatório clínico (status ${response.status})`,
        };
      }

      const resultado = (await response.json()) as { data?: unknown };
      return {
        sucesso: true,
        data: resultado.data,
      };
    } catch {
      // Fallback gracioso para bdmock
      const dadosMock = await exportarRelatorioSessaoMock(id);
      return {
        sucesso: true,
        data: dadosMock,
      };
    }
  },

  // ==========================================================================
  // MÉTODOS DE COMPATIBILIDADE RETROATIVA (UI & Testes Existentes)
  // ==========================================================================

  /**
   * Finaliza sessão mantendo o contrato esperado pelos testes de Cockpit e sessaoService.test.ts.
   */
  finalizar: async (
    identificadorSessao: string,
    anotacoes?: string,
  ): Promise<FinalizarSessaoResposta> => {
    if (!identificadorSessao || !identificadorSessao.trim()) {
      return { sucesso: false, error: "Identificador de sessão ausente" };
    }

    try {
      const url = `${API_BASE_URL}/sessao/${encodeURIComponent(identificadorSessao.trim())}/finalizar`;
      const headers = obterAuthHeaders();

      const response = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          anotacoes_clinicas: anotacoes || "",
        }),
      });

      if (!response.ok) {
        const errorJson = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        return {
          sucesso: false,
          error:
            errorJson?.error ||
            `Falha ao finalizar sessão (status ${response.status})`,
        };
      }

      const resultado = (await response.json()) as {
        data?: FinalizarSessaoResposta["data"];
      };
      return {
        sucesso: true,
        data: resultado.data,
      };
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro desconhecido ao conectar com a API";
      return {
        sucesso: false,
        error: msg,
      };
    }
  },

  /**
   * Consulta resultado consolidado com o formato BuscarResultadoResposta.
   */
  buscarResultado: async (
    identificadorSessao: string,
  ): Promise<BuscarResultadoResposta> => {
    if (!identificadorSessao || !identificadorSessao.trim()) {
      return { sucesso: false, error: "Identificador de sessão ausente" };
    }

    try {
      const url = `${API_BASE_URL}/sessao/${encodeURIComponent(identificadorSessao.trim())}/resultado`;
      const headers = obterAuthHeaders();

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorJson = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        return {
          sucesso: false,
          error:
            errorJson?.error ||
            `Falha ao consultar resultado da sessão (status ${response.status})`,
        };
      }

      const resultado = (await response.json()) as {
        data?: ResultadoSessao;
      };
      return {
        sucesso: true,
        data: resultado.data,
      };
    } catch {
      const dadosMock = await obterResultadoSessaoMock(identificadorSessao);
      if (dadosMock) {
        return {
          sucesso: true,
          data: dadosMock,
        };
      }
      return {
        sucesso: false,
        error: "Erro desconhecido ao buscar resultado",
      };
    }
  },

  /**
   * Salva anotação clínica mantendo contrato consumido pelo BlocoAnotacoesClinicas.
   */
  salvarAnotacao: async (
    payload: SalvarAnotacaoPayload,
  ): Promise<SalvarAnotacaoResposta> => {
    if (!payload.conteudo || !payload.conteudo.trim()) {
      return {
        sucesso: false,
        error: "Conteúdo da anotação não pode ser vazio",
      };
    }

    try {
      const isEdicao = Boolean(payload.anotacaoId);
      const url = isEdicao
        ? `${API_BASE_URL}/anotacao/${encodeURIComponent(payload.anotacaoId!)}`
        : `${API_BASE_URL}/anotacao`;

      const method = isEdicao ? "PATCH" : "POST";
      const headers = obterAuthHeaders();

      const bodyPayload = isEdicao
        ? { conteudo: payload.conteudo.trim() }
        : {
            sessao_id: payload.sessaoId,
            paciente_id: payload.pacienteId,
            conteudo: payload.conteudo.trim(),
          };

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        const errorJson = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        return {
          sucesso: false,
          error:
            errorJson?.error ||
            `Falha ao salvar anotação clínica (status ${response.status})`,
        };
      }

      const resultado = (await response.json()) as {
        data?: AnotacaoClinicaResultado;
      };
      return {
        sucesso: true,
        data: resultado.data,
      };
    } catch {
      return {
        sucesso: true,
        data: {
          id: payload.anotacaoId || `anot-mock-${Date.now()}`,
          conteudo: payload.conteudo.trim(),
          terapeuta_id: "a9849163-613f-4492-90cf-89985902d16e",
          sessao_id: payload.sessaoId,
          paciente_id: payload.pacienteId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }
  },

  /**
   * Lista sessões com suporte a filtros de status, data, paciente, jogo e paginação.
   */
  listar: async (filtros?: FiltroSessaoDTO): Promise<RespostaListagemSessao<Sessao>> => {
    return await withFallback(
      async () => {
        const params: Record<string, string> = {};
        if (filtros?.all !== undefined) params.all = String(filtros.all);
        if (filtros?.status) params.status = filtros.status;
        if (filtros?.data) params.data = filtros.data;
        if (filtros?.dataInicio) params.dataInicio = filtros.dataInicio;
        if (filtros?.dataFim) params.dataFim = filtros.dataFim;
        if (filtros?.pacienteId) params.pacienteId = filtros.pacienteId;
        if (filtros?.jogoId) params.jogoId = filtros.jogoId;
        if (filtros?.modo) params.modo = filtros.modo;
        if (filtros?.page !== undefined) params.page = String(filtros.page);
        if (filtros?.limit !== undefined) params.limit = String(filtros.limit);

        const resposta = await http.get<RespostaListagemSessao<Sessao>>(
          ENDPOINTS.SESSAO.BASE,
          { params }
        );
        return resposta;
      },
      () => listarSessoesMock(filtros)
    );
  },
};

export default sessaoService;
