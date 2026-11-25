// ============================================================================
// TIPAGENS CANÔNICAS DE HISTÓRICO CLÍNICO E ENGAJAMENTO (InTEA)
// TypeScript Estrito: Sem o uso de `any`
// ============================================================================

export type TipoMetricaCanonica = "numerica" | "categorica" | "ordinal" | "booleana";

export const TIPOS_METRICA_VALIDOS = [
  "numerica",
  "categorica",
  "ordinal",
  "booleana",
] as const;

/**
 * Consolidated universal patient engagement metrics shared across all therapeutic games (Level 1).
 */
export interface MetricasEngajamentoGeral {
  total_sessoes: number;
  total_iniciadas: number;
  sessoes_finalizadas: number;
  sessoes_interrompidas: number;
  taxa_conclusao_porcentagem: number;
  taxa_conclusao?: number; // Alias semântico
  tempo_total_segundos: number;
  tempo_medio_segundos: number;
}

/**
 * Single data point in a game metric time series.
 */
export interface PontoSerieMetrica {
  sessao_id: string;
  data_hora: string; // ISO 8601
  valor: string | number | boolean | null;
  tendencia?: "alta" | "queda" | "estavel" | string | null;
  rotulo?: string;
  observacao?: string;
}

/**
 * Game-specific metric time series (Level 2).
 */
export interface SerieMetricaJogo {
  id_metrica: string;
  nome_metrica?: string;
  tipo_metrica: TipoMetricaCanonica | string; // Permite string para permitir validação estrita e rejeição
  unidade?: string;
  valores?: string[]; // Categorias ou níveis ordinais possíveis
  pontos: PontoSerieMetrica[];
  descricao?: string;
  meta?: {
    valor_min?: number;
    valor_max?: number;
    valor_alvo?: number;
    inverter_escala?: boolean;
  };
}

/**
 * Formal metric declaration inside a game manifest (Contract 1).
 */
export interface MetricaManifestoJogo {
  id_metrica: string;
  tipo_metrica: string;
  unidade?: string;
  valores?: string[];
  nome?: string;
  descricao?: string;
}

/**
 * Summary of a therapeutic game previously played by the patient.
 */
export interface ResumoJogoPaciente {
  jogo_id: string;
  nome: string;
  versao: string;
  total_sessoes: number;
  ultima_sessao: string;
  icone?: string;
  /** @deprecated Use `jogo_id`. */
  id?: string | number;
  /** @deprecated Use `ultima_sessao`. */
  data_ultima_sessao?: string;
}

/**
 * Summarized session entry linked to a game's clinical history.
 */
export interface SessaoHistoricoItem {
  sessao_id: string;
  data_hora_fim?: string;
  data_hora_inicio?: string;
  status_sessao: string;
  tempo_total_segundos?: number;
  duracao_segundos?: number;
  terapeuta_id?: string;
  terapeuta_nome?: string;
  especialidade?: string;
  registro_profissional?: string;
  jogo_id?: string;
  jogo_nome?: string;
}

/**
 * Multidisciplinary team specialist metadata present in patient history (Issue #187).
 */
export interface EspecialistaHistorico {
  id: string;
  nome: string;
  especialidade?: string | null;
  registro_profissional?: string | null;
}

/**
 * Detailed longitudinal history response for a selected therapeutic game.
 */
export interface HistoricoJogoDetalhado {
  tipo: "detalhado";
  jogo: {
    id: string | number;
    nome: string;
    versao: string;
    metricas_suportadas: MetricaManifestoJogo[];
  };
  sessoes: SessaoHistoricoItem[];
  series_temporais: SerieMetricaJogo[];
  paginacao?: {
    page: number;
    limit: number;
    total_registros: number;
  };
}

/**
 * Catalog response of therapeutic games played by the patient (when no `jogoId` is selected).
 */
export interface HistoricoJogoCatalogo {
  tipo: "catalogo";
  jogos: ResumoJogoPaciente[];
}

export type HistoricoPorJogo = HistoricoJogoDetalhado | HistoricoJogoCatalogo;

/**
 * Complete REST backend payload returned by the patient history endpoint.
 */
export interface RespostaHistoricoPaciente {
  paciente_id: string;
  engajamento_geral: MetricasEngajamentoGeral;
  historico_por_jogo: HistoricoPorJogo;
}

/**
 * Query filters for clinical history requests.
 */
export interface FiltrosHistorico {
  jogoId?: string;
  sessaoId?: string;
  /** Specialist UUID for filtering the multidisciplinary team timeline (Issue #187). */
  terapeutaId?: string;
  periodo?: "7d" | "30d" | "3m" | "personalizado" | "todos";
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
}
