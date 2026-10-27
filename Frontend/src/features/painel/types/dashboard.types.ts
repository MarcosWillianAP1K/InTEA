/**
 * ============================================================================
 * MODELOS CANÔNICOS DO DASHBOARD CLÍNICO (dashboard.types.ts)
 * Indicadores analíticos agregados, sessões recentes, alertas clínicos e atividades.
 * Conformidade: RF19 (Painel do Terapeuta), RF20 (Relatórios), RN04 (Clínica)
 * ============================================================================
 */

export interface JogoMaisUtilizado {
  jogoId: string;
  nome: string;
  totalSessoes: number;
}

export interface DashboardMetricas {
  pacientesAtivos: number;
  sessoesNoMes: number;
  tempoMedioEngajamentoMinutos: number;
  taxaRegulacaoDDA: number;
  tempoTotalTerapiaMinutos: number;
  variacaoSessoesPercentual: number;
  variacaoPacientesPercentual: number;
  jogosMaisUtilizados?: JogoMaisUtilizado[];
}

export type StatusSessaoResumo =
  | "agendada"
  | "em_andamento"
  | "pausada"
  | "finalizada"
  | "cancelada";

export interface SessaoRecenteResumo {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  jogoId: string;
  jogoNome: string;
  jogoIcone?: string;
  dataHora: string;
  duracaoSegundos: number;
  status: StatusSessaoResumo;
  nivelEstresseMedio: number;
  engajamentoScore: number;
  ddaIntervencoes: number;
}

export type TipoAlertaClinico =
  | "estresse_elevado"
  | "queda_engajamento"
  | "gatilho_detectado"
  | "sessao_interrompida"
  | "feedback_pendente";

export type SeveridadeAlerta = "baixa" | "media" | "alta" | "critica";

export interface AlertaClinico {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  sessaoId?: string;
  tipo: TipoAlertaClinico;
  severidade: SeveridadeAlerta;
  mensagem: string;
  timestamp: string;
  lido: boolean;
}

export type TipoAtividade =
  | "inicio_sessao"
  | "fim_sessao"
  | "anotacao_adicionada"
  | "paciente_cadastrado"
  | "dda_adaptado";

export interface AtividadeRecente {
  id: string;
  tipo: TipoAtividade;
  titulo: string;
  descricao: string;
  timestamp: string;
  pacienteId?: string;
  pacienteNome?: string;
  terapeutaId: string;
}

export interface DashboardMetricasRespostaApi {
  data: DashboardMetricas;
  message?: string;
}

export interface SessoesRecentesRespostaApi {
  data: SessaoRecenteResumo[];
  total: number;
  message?: string;
}

export interface AtividadesRecentesRespostaApi {
  data: AtividadeRecente[];
  total: number;
  message?: string;
}

export interface AlertasClinicosRespostaApi {
  data: AlertaClinico[];
  total: number;
  message?: string;
}
