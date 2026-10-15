/**
 * ============================================================================
 * SERVIÇO REST DE SESSÕES CLÍNICAS (Sprint 8, 9 & 10)
 * Requisitos: RF13 (Encerramento de Sessão), RF14 (Resultados), RF16 (Anotações),
 *             RF17 (Relatório IA), RF21 (Autoria do Terapeuta)
 * Regra: TypeScript estrito sem o uso de `any`
 * ============================================================================
 */

export interface MetricaAgregadaResultado {
  id_metrica: string;
  valor_dominante: string | number;
  tendencia: "estavel" | "crescente" | "decrescente" | string;
}

export interface ResumoResultadoIA {
  taxa_conclusao: number;
  intervencoes_dda: number;
}

export interface RelatorioIAResultado {
  token_sessao: string;
  duracao_segundos: number;
  resumo: ResumoResultadoIA;
  analises_ia: string[];
  metricas_agregadas: MetricaAgregadaResultado[];
}

export interface AnotacaoClinicaResultado {
  id: string;
  conteudo: string;
  terapeuta_id: string;
  terapeuta_nome?: string;
  registro_profissional?: string;
  sessao_id?: string;
  paciente_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DadosResultadoSessao {
  id: string;
  session_token: string;
  status_sessao: string;
  data_hora_inicio?: string;
  data_hora_fim?: string;
  duracao_segundos?: number;
  is_modo_livre?: boolean;
  paciente?: {
    id: string;
    nome: string;
    data_nascimento?: string;
    diagnostico?: string;
  } | null;
  jogo?: {
    id: string;
    titulo: string;
    categoria?: string;
  } | null;
  terapeuta?: {
    id: string;
    nome: string;
    registro_profissional?: string;
  } | null;
  dados_ia?: RelatorioIAResultado | null;
  anotacoes?: AnotacaoClinicaResultado[];
}

export interface FinalizarSessaoResposta {
  sucesso: boolean;
  data?: {
    id: string;
    session_token: string;
    status_sessao: string;
    data_hora_fim?: string;
    relatorio?: unknown;
  };
  error?: string;
}

export interface BuscarResultadoResposta {
  sucesso: boolean;
  data?: DadosResultadoSessao;
  error?: string;
}

export interface SalvarAnotacaoResposta {
  sucesso: boolean;
  data?: AnotacaoClinicaResultado;
  error?: string;
}

export interface SalvarAnotacaoPayload {
  sessaoId?: string;
  pacienteId?: string;
  anotacaoId?: string;
  conteudo: string;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:3000/api";

function obterAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("token") || window.sessionStorage.getItem("token")
      : null;

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

export const sessaoService = {
  /**
   * Finaliza formalmente uma sessão clínica no backend via PATCH /api/sessao/:id/finalizar.
   * Aciona a máquina de estados, consolida anotações, dispara a geração do relatório IA
   * e registra o evento na trilha de auditoria clínica.
   */
  finalizar: async (
    identificadorSessao: string,
    anotacoes?: string
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
        const errorJson = (await response.json().catch(() => null)) as { error?: string } | null;
        return {
          sucesso: false,
          error: errorJson?.error || `Falha ao finalizar sessão (status ${response.status})`,
        };
      }

      const resultado = (await response.json()) as { data?: FinalizarSessaoResposta["data"] };
      return {
        sucesso: true,
        data: resultado.data,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido ao conectar com a API";
      return {
        sucesso: false,
        error: msg,
      };
    }
  },

  /**
   * Consulta os resultados consolidados da sessão via GET /api/sessao/:id/resultado.
   * Retorna dados clínicos do paciente, jogo, métricas agregadas da IA e anotações.
   * Respeita RN01 (Modo Livre retorna paciente: null) e RN04 (Vínculo institucional).
   */
  buscarResultado: async (
    identificadorSessao: string
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
        const errorJson = (await response.json().catch(() => null)) as { error?: string } | null;
        return {
          sucesso: false,
          error: errorJson?.error || `Falha ao consultar resultado da sessão (status ${response.status})`,
        };
      }

      const resultado = (await response.json()) as { data?: DadosResultadoSessao };
      return {
        sucesso: true,
        data: resultado.data,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido ao buscar resultado";
      return {
        sucesso: false,
        error: msg,
      };
    }
  },

  /**
   * Consulta os dados estruturados de exportação clínica pós-sessão via GET /api/sessao/:id/exportar (RF20).
   * Reúne identificação sanitizada da clínica, terapeuta autor, paciente, métricas e síntese da IA.
   */
  exportarRelatorio: async (
    identificadorSessao: string
  ): Promise<{ sucesso: boolean; data?: unknown; error?: string }> => {
    if (!identificadorSessao || !identificadorSessao.trim()) {
      return { sucesso: false, error: "Identificador de sessão ausente" };
    }

    try {
      const url = `${API_BASE_URL}/sessao/${encodeURIComponent(identificadorSessao.trim())}/exportar`;
      const headers = obterAuthHeaders();

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorJson = (await response.json().catch(() => null)) as { error?: string } | null;
        return {
          sucesso: false,
          error: errorJson?.error || `Falha ao exportar relatório clínico (status ${response.status})`,
        };
      }

      const resultado = (await response.json()) as { data?: unknown };
      return {
        sucesso: true,
        data: resultado.data,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido ao conectar com a API";
      return {
        sucesso: false,
        error: msg,
      };
    }
  },

  /**
   * Salva ou atualiza uma anotação clínica pós-sessão:
   * - Se anotacaoId estiver presente: PATCH /api/anotacao/:id
   * - Caso contrário: POST /api/anotacao
   * Autoria atribuída exclusivamente ao terapeuta autenticado (RF21).
   */
  salvarAnotacao: async (
    payload: SalvarAnotacaoPayload
  ): Promise<SalvarAnotacaoResposta> => {
    if (!payload.conteudo || !payload.conteudo.trim()) {
      return { sucesso: false, error: "Conteúdo da anotação não pode ser vazio" };
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
        const errorJson = (await response.json().catch(() => null)) as { error?: string } | null;
        return {
          sucesso: false,
          error: errorJson?.error || `Falha ao salvar anotação clínica (status ${response.status})`,
        };
      }

      const resultado = (await response.json()) as { data?: AnotacaoClinicaResultado };
      return {
        sucesso: true,
        data: resultado.data,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro de comunicação ao salvar anotação";
      return {
        sucesso: false,
        error: msg,
      };
    }
  },
};

