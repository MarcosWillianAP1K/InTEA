/**
 * ============================================================================
 * SERVIÇO REST DO DOMÍNIO JOGOS (jogos.service.ts)
 * Consome os endpoints centralizados ENDPOINTS.JOGOS via http-client
 * com fallback resiliente para bdmock.ts em caso de indisponibilidade.
 * Conformidade: RF04, RF07, RN02 (Tipagem Estrita de Métricas)
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
 */

import { http, withFallback, ENDPOINTS } from "@/core/api";
import type {
  Jogo,
  ManifestoJogo,
  MetricaSuportada,
  TipoMetrica,
  JogoFiltroDTO,
  FiltrosJogos,
  JogoRespostaApi,
  JogosListaRespostaApi,
  ManifestoRespostaApi,
} from "../types/jogos.types";
import {
  listarJogosMock,
  buscarJogoMockPorId,
  obterManifestoJogoMock,
} from "../types/bdmock";

function serializarFiltros(
  filtros?: JogoFiltroDTO | FiltrosJogos,
): Record<string, string> | undefined {
  if (!filtros) return undefined;

  const params: Record<string, string> = {};
  if (filtros.busca) params.busca = filtros.busca;
  if (filtros.objetivo && filtros.objetivo !== 'todos' && filtros.objetivo !== 'all') {
    params.objetivo = filtros.objetivo;
  }
  if (filtros.status && filtros.status !== 'todos' && filtros.status !== 'all') {
    params.status = filtros.status;
  }
  if (filtros.page !== undefined) params.page = String(filtros.page);
  if (filtros.limit !== undefined) params.limit = String(filtros.limit);

  return Object.keys(params).length > 0 ? params : undefined;
}

/**
 * Normaliza campos vindos do PostgreSQL (nome, descricao, metricas_suportadas)
 * sem alterar objetos que já possuem titulo, descricaoClinica e manifesto preenchidos.
 */
function normalizarJogoSeNecessario(jogo: Jogo): Jogo {
  if (!jogo) return jogo;

  // Se já possui os campos canônicos preenchidos (formato mock/frontend), preserva o objeto original intacto
  if (jogo.titulo && jogo.descricaoClinica && jogo.manifesto) {
    return jogo;
  }

  const raw = jogo as unknown as {
    id: string;
    nome?: string;
    titulo?: string;
    descricao?: string;
    descricaoClinica?: string;
    publico_alvo?: string;
    objetivoTerapeutico?: string;
    manifesto_json?: {
      id_jogo?: string;
      nome?: string;
      versao?: string;
      objetivo_clinico?: string;
      metricas_suportadas?: Array<{ id_metrica: string; tipo_metrica: string; unidade?: string; valores?: string[] }>;
    };
    manifesto?: ManifestoJogo;
    metricas_suportadas?: Array<{ id_metrica: string; tipo_metrica: string; descricao?: string; nome?: string }>;
    versao?: string;
    status_jogo?: string;
    status_ativo?: boolean;
    bannerUrl?: string;
    created_at?: string;
    updated_at?: string;
  };

  const titulo = raw.titulo || raw.nome || "Jogo Terapêutico";
  const versao = raw.versao || "1.0.0";
  const descricaoClinica = raw.descricaoClinica || raw.descricao || "";
  const objetivoTerapeutico =
    raw.objetivoTerapeutico ||
    raw.manifesto_json?.objetivo_clinico ||
    raw.publico_alvo ||
    "Estimulação Cognitiva e Sensorial";

  const metricasRaw =
    raw.metricas_suportadas ||
    raw.manifesto_json?.metricas_suportadas ||
    [];

  const metricasSuportadas: MetricaSuportada[] = metricasRaw.map((m: { id_metrica: string; tipo_metrica?: string; tipo?: string; nome?: string; descricao?: string }) => ({
    id_metrica: m.id_metrica,
    nome: m.nome || m.id_metrica,
    tipo: (m.tipo_metrica || m.tipo) as TipoMetrica,
    tipo_metrica: m.tipo_metrica || m.tipo,
    descricao: m.descricao || m.nome || m.id_metrica,
  }));

  const manifesto: ManifestoJogo = raw.manifesto || {
    id_jogo: raw.manifesto_json?.id_jogo || String(raw.id),
    nome: titulo,
    versao,
    descricaoClinica,
    objetivoTerapeutico,
    metricasSuportadas,
  };

  return {
    ...jogo,
    id: raw.id,
    titulo,
    versao,
    descricaoClinica,
    objetivoTerapeutico,
    bannerUrl: raw.bannerUrl || "",
    status_jogo: raw.status_ativo === false ? "desativado" : (raw.status_jogo || "ativo"),
    manifesto,
  };
}

export const jogosService = {
  /**
   * Lista todos os jogos terapêuticos disponíveis aplicando filtros de busca e objetivo.
   */
  listar: async (filtros?: JogoFiltroDTO | FiltrosJogos): Promise<Jogo[]> => {
    return await withFallback(
      async () => {
        const params = serializarFiltros(filtros);
        const resposta = await http.get<
          JogosListaRespostaApi | Jogo[]
        >(ENDPOINTS.JOGOS.BASE, { params });

        let lista: Jogo[] = [];
        if (Array.isArray(resposta)) {
          lista = resposta;
        } else if ("data" in resposta && resposta.data) {
          if (Array.isArray(resposta.data)) {
            lista = resposta.data;
          } else if (
            typeof resposta.data === "object" &&
            "jogos" in (resposta.data as Record<string, unknown>) &&
            Array.isArray((resposta.data as { jogos?: Jogo[] }).jogos)
          ) {
            lista = (resposta.data as { jogos: Jogo[] }).jogos;
          }
        }
        let normalizados = lista.map(normalizarJogoSeNecessario);

        if (filtros?.busca && filtros.busca.trim()) {
          const termo = filtros.busca.trim().toLowerCase();
          normalizados = normalizados.filter(
            (j) =>
              j.titulo?.toLowerCase().includes(termo) ||
              j.descricaoClinica?.toLowerCase().includes(termo) ||
              j.objetivoTerapeutico?.toLowerCase().includes(termo)
          );
        }

        return normalizados;
      },
      () => listarJogosMock(filtros),
    );
  },

  /**
   * Consulta os dados detalhados de um jogo pelo seu ID ou slug canônico.
   */
  buscarPorId: async (id: string): Promise<Jogo | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.get<JogoRespostaApi | Jogo>(
          ENDPOINTS.JOGOS.BY_ID(id),
        );
        if ("data" in resposta && resposta.data) {
          const rawData = resposta.data as unknown as { jogo?: Jogo } & Jogo;
          const jogo = rawData.jogo || rawData;
          return normalizarJogoSeNecessario(jogo);
        }
        return resposta ? normalizarJogoSeNecessario(resposta as Jogo) : null;
      },
      () => buscarJogoMockPorId(id),
    );
  },

  /**
   * Obtém o manifesto técnico e clínico do jogo com métricas tipadas (RN02).
   */
  obterManifesto: async (id: string): Promise<ManifestoJogo | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.get<
          ManifestoRespostaApi | ManifestoJogo
        >(ENDPOINTS.JOGOS.MANIFESTO(id));

        if ("data" in resposta && resposta.data) {
          const rawData = resposta.data as unknown as { manifesto?: ManifestoJogo } & ManifestoJogo;
          return rawData.manifesto || rawData;
        }
        return (resposta as ManifestoJogo) ?? null;
      },
      () => obterManifestoJogoMock(id),
    );
  },
};

export default jogosService;
