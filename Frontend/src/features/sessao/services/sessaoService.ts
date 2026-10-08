/**
 * ============================================================================
 * SERVIÇO REST DE SESSÕES CLÍNICAS (Sprint 8 & 9)
 * Requisitos: RF13 (Encerramento de Sessão), RF17 (Relatório IA), RF21
 * Regra: TypeScript estrito sem o uso de `any`
 * ============================================================================
 */

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

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:3000/api";

export const sessaoService = {
  /**
   * Finaliza formalmente uma sessão clínica no backend via PATCH /api/sessao/:id/finalizar.
   * Aciona a máquina de estados, consolida anotações, dispara a geração do relatório IA
   * e registra o evento na trilha de auditoria clínica.
   *
   * Suporta UUID ou token PIN de sessão como identificador.
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
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("token") || window.sessionStorage.getItem("token")
          : null;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

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
};
