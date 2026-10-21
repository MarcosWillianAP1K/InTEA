/**
 * ============================================================================
 * TIPAGENS CANÔNICAS DO DOMÍNIO JOGOS (InTEA)
 * Conformidade: RF04, RF07, RN02 (Tipagem Estrita / Proibido Fallback Automático)
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
 */

export type TipoMetrica =
  | "tempo"
  | "acertos"
  | "toques"
  | "movimento"
  | "frequencia"
  | "numerica"
  | "categorica"
  | string;

export interface MetricaSuportada {
  nome: string;
  tipo: TipoMetrica;
  descricao: string;
  id_metrica?: string;
  tipo_metrica?: string;
  unidade?: string;
  valores?: string[];
}

export interface MetricaManifesto {
  id_metrica: string;
  tipo_metrica: "numerica" | "categorica" | string;
  unidade?: string;
  valores?: string[];
  nome?: string;
  tipo?: TipoMetrica;
  descricao?: string;
}

export interface ParametroDDA {
  nome: string;
  tipo: "range" | "enum" | "booleano" | string;
  valor_padrao: unknown;
  min?: number;
  max?: number;
  opcoes?: string[];
  descricao?: string;
}

export interface ManifestoJogo {
  id_jogo?: string;
  nome: string;
  versao: string;
  descricaoClinica?: string;
  objetivoTerapeutico?: string;
  objetivo_clinico?: string;
  faixaEtaria?: string;
  faixa_etaria?: string;
  metricasSuportadas: MetricaSuportada[];
  metricas_suportadas?: MetricaManifesto[];
  suportaVR?: boolean;
  suporta_vr?: boolean;
  parametros_dda?: ParametroDDA[];
}

export interface Jogo {
  id: string;
  titulo: string;
  nome?: string;
  versao: string;
  descricaoClinica: string;
  descricao?: string;
  objetivoTerapeutico: string;
  status_jogo?: "ativo" | "desativado" | "manutencao" | "em_breve" | string;
  bannerUrl?: string;
  manifesto: ManifestoJogo;
  manifesto_json?: ManifestoJogo;
  created_at?: string;
  updated_at?: string;
}

export interface JogoFiltroDTO {
  busca?: string;
  objetivo?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export type FiltrosJogos = JogoFiltroDTO;

export interface JogoRespostaApi {
  data: {
    jogo: Jogo;
    manifesto?: ManifestoJogo;
  } | Jogo;
  message?: string;
}

export interface JogosListaRespostaApi {
  data: {
    jogos: Jogo[];
    meta?: {
      total: number;
      pagina: number;
      limite: number;
      total_paginas: number;
    };
  } | Jogo[];
  total?: number;
  page?: number;
  totalPages?: number;
  message?: string;
}

export interface ManifestoRespostaApi {
  data: {
    manifesto: ManifestoJogo;
  } | ManifestoJogo;
  message?: string;
}
