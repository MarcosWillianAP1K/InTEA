import { http, withFallback, ENDPOINTS } from "@/core/api";
import { MOCK_CLINICA } from "@/shared/types";

export interface ClinicaAdminItem {
  id: string;
  nome: string;
  cnpj?: string | null;
  status_ativo?: boolean;
}

interface RespostaListarClinicasApi {
  data?: {
    clinicas?: ClinicaAdminItem[];
    meta?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
  clinicas?: ClinicaAdminItem[];
  message?: string;
}

/**
 * Administrative service for listing clinics via `/api/admin/clinicas` with mock fallback.
 */
export const clinicaAdminService = {
  /**
   * Lists registered clinics with optional search, active-status filtering, and pagination.
   *
   * @param filtros - Optional query filters (`busca`, `status_ativo`, `page`, `limit`).
   * @returns Array of clinic items for administrative views.
   */
  listar: async (filtros?: {
    busca?: string;
    status_ativo?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ClinicaAdminItem[]> => {
    return await withFallback(
      async () => {
        const params: Record<string, string> = {};
        if (filtros?.busca) params.busca = filtros.busca;
        if (filtros?.status_ativo !== undefined) {
          params.status_ativo = String(filtros.status_ativo);
        }
        params.page = String(filtros?.page ?? 1);
        params.limit = String(filtros?.limit ?? 100);

        const resposta = await http.get<RespostaListarClinicasApi>(
          ENDPOINTS.ADMIN.CLINICAS,
          { params },
        );

        const lista = resposta?.data?.clinicas ?? resposta?.clinicas ?? [];
        return Array.isArray(lista) ? lista : [];
      },
      async () => [
        {
          id: MOCK_CLINICA.id,
          nome: MOCK_CLINICA.nome,
          cnpj: MOCK_CLINICA.cnpj,
          status_ativo: true,
        },
      ],
    );
  },
};
