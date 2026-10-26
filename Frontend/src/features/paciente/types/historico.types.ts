/**
 * ============================================================================
 * TIPAGENS CANÔNICAS DE HISTÓRICO CLÍNICO E ENGAJAMENTO (InTEA)
 * Conformidade: RF15 (Prontuário Longitudinal), RF19 (Filtros),
 * RN01 (Modo Livre Expurgo), RN02 (Tipagem Estrita de Métricas),
 * RN04 (Vínculo Clínico), RN05 (Inalterabilidade / Soft Delete)
 * TypeScript Estrito: Sem o uso de `any`
 * ============================================================================
 */

export type TipoMetricaCanonica = "numerica" | "categorica" | "ordinal" | "booleana";

export const TIPOS_METRICA_VALIDOS = [
  "numerica",
  "categorica",
  "ordinal",
  "booleana",
] as const;

/**
 * Métricas universais consolidadas de engajamento do paciente.
 * Compartilhadas transversalmente por todos os jogos terapêuticos (Nível 1).
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
 * Ponto individual em uma série temporal de métrica de jogo.
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
 * Série temporal de métricas exclusivas de um jogo (Nível 2).
 */
export interface SerieMetricaJogo {
  id_metrica: string;
  nome_metrica?: string;
  tipo_metrica: TipoMetricaCanonica | string; // Permite string para que RN02 possa validar e rejeitar
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
 * Declaração formal de métrica no manifesto do jogo (Contrato 1).
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
 * Resumo de jogo já experimentado pelo paciente no histórico.
 */
export interface ResumoJogoPaciente {
  jogo_id: string;
  nome: string;
  versao: string;
  total_sessoes: number;
  ultima_sessao: string;
  icone?: string;
  /** @deprecated Use jogo_id */
  id?: string | number;
  /** @deprecated Use ultima_sessao */
  data_ultima_sessao?: string;
}

/**
 * Sessão resumida vinculada ao histórico do jogo.
 */
export interface SessaoHistoricoItem {
  sessao_id: string;
  data_hora_fim?: string;
  data_hora_inicio?: string;
  status_sessao: string;
  tempo_total_segundos?: number;
  duracao_segundos?: number;
  terapeuta_id?: string;
  jogo_id?: string;
}

/**
 * Resposta de histórico detalhado por jogo selecionado.
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
 * Resposta de catálogo de jogos jogados pelo paciente (sem jogoId selecionado).
 */
export interface HistoricoJogoCatalogo {
  tipo: "catalogo";
  jogos: ResumoJogoPaciente[];
}

export type HistoricoPorJogo = HistoricoJogoDetalhado | HistoricoJogoCatalogo;

/**
 * Payload completo retornado pelo backend REST para a rota de histórico.
 */
export interface RespostaHistoricoPaciente {
  paciente_id: string;
  engajamento_geral: MetricasEngajamentoGeral;
  historico_por_jogo: HistoricoPorJogo;
}

/**
 * Filtros para consultas de histórico clínico (RF19).
 */
export interface FiltrosHistorico {
  jogoId?: string;
  sessaoId?: string;
  periodo?: "7d" | "30d" | "3m" | "personalizado" | "todos";
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
}
