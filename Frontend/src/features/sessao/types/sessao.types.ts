import type { DispositivoConectadoPayload } from "@/core/web.socket";

/**
 * ============================================================================
 * TIPAGEM DE DOMÍNIO DE SESSÃO E PAREAMENTO REMOTO (InTEA)
 * Conformidade: RF10 (Pareamento), RF11 (Modo Livre - RN01), RF12 (Cockpit),
 *              RF13 (Finalização), RF14 (Resultados), RF17 (IA), RF20 (Exportação)
 * TypeScript estrito sem o uso de `any`
 * ============================================================================
 */

export type ModoSessao = "sessao_clinica" | "modo_livre";

export type StatusSessao =
  | "aguardando_pareamento"
  | "conectado"
  | "em_andamento"
  | "pausada"
  | "finalizada"
  | "expirada"
  | "cancelada"
  | string;

export type StatusPareamento =
  | "ocioso"
  | "configurando"
  | "aguardando_token"
  | "aguardando_pareamento"
  | "pareando"
  | "pareado"
  | "em_andamento"
  | "finalizada"
  | "cancelada"
  | "expirada"
  | "erro";

export interface ContextoDDA {
  estresse_inicial?: number;
  gatilhos_a_evitar?: string[];
  objetivo_clinico?: string;
  sensibilidade_sensorial?: string;
  dificuldade_inicial?: number;
  [key: string]: unknown;
}

export interface StatusDispositivo {
  tipo_dispositivo?: "tablet" | "vr" | "pc" | "mobile" | string;
  modelo?: string;
  bateria?: number;
  latencia_ms?: number;
  conectado?: boolean;
  resolucao?: string;
  sistema_operacional?: string;
  ultimo_heartbeat?: string;
}

export interface ContextoSugeridoDTO {
  origem: "ultima_sessao" | "anamnese";
  estresse_inicial?: number;
  nivel_estresse_autorrelatado?: "baixo" | "medio" | "alto";
  gatilhos_a_evitar?: string[];
  objetivo_terapeutico?: string;
}

export interface Sessao {
  [x: string]: unknown;
  id: string;
  terapeuta_id: string;
  paciente_id: string | null;
  jogo_id: string;
  session_token: string;
  modo_sessao: ModoSessao;
  status_sessao: StatusSessao;
  contexto_dda_json?: ContextoDDA;
  dispositivo_info?: StatusDispositivo | null;
  data_hora_inicio?: string;
  data_hora_fim?: string | null;
  expira_em?: string;
  created_at?: string;
  updated_at?: string;
  is_modo_livre?: boolean;
  jogo?: {
    id: string;
    titulo?: string;
    nome?: string;
    versao?: string;
    categoria?: string;
  };
  paciente?: {
    id: string;
    nome: string;
    data_nascimento?: string;
    diagnostico?: string;
  } | null;
  terapeuta?: {
    id: string;
    nome: string;
    registro_profissional?: string;
  } | null;
}

export interface IniciarSessaoDTO {
  terapeuta_id?: string;
  jogo_id: string;
  paciente_id?: string | null;
  modo_sessao?: ModoSessao;
  contexto_dda_json?: ContextoDDA;
  nivel_estresse_inicial?: number | string;
  gatilhos_sensoriais_evitar?: string[];
  objetivo_clinico?: string;
  usar_fallback_padrao?: boolean;
  codigo_pareamento?: string;
  session_token?: string;
  dispositivo_info?: Record<string, unknown> | null;
  status_sessao?: StatusSessao;
}

export interface FinalizarSessaoDTO {
  anotacoes_clinicas?: string;
  motivo?: string;
}

export interface StatusSessaoDTO {
  id: string;
  session_token: string;
  status_sessao: StatusSessao;
  modo_sessao: string;
  dispositivo_conectado: boolean;
  dispositivo_info?: StatusDispositivo | null;
  expirado: boolean;
  tempo_restante_segundos?: number;
  presenca_dispositivo?: {
    conectado: boolean;
    em_reconexao?: boolean;
    ultimo_heartbeat?: string;
  };
}

export interface MetricasConsolidadas {
  duracao_segundos: number;
  taxa_conclusao: number; // 0 a 100%
  intervencoes_dda: number;
  pontuacao_geral?: number | null;
  estabilidade_foco?: number | null; // 0 a 100%
  tempo_medio_resposta_ms?: number | null;
  total_acertos?: number | null;
  total_erros?: number | null;
}

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

export interface TentativaGraficoResultado {
  tentativa: number;
  segundo: number;
  tempoFormatado: string;
  tempo_resposta_segundos: number;
  acerto: boolean;
  data_hora?: string;
  id_metrica?: string;
  intervencaoDda?: {
    tipoIntervencao: string;
    momentoFormatado: string;
    segundo?: number;
    detalhes?: string;
  } | null;
}

export interface HistoricoEvolutivoResultado {
  tipo?: string;
  tempo_medio_referencia?: number;
  tentativas?: TentativaGraficoResultado[];
}

export interface ResultadoSessao {
  id: string;
  session_token: string;
  status_sessao: StatusSessao;
  data_hora_inicio?: string;
  data_hora_fim?: string | null;
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
  metricas_consolidadas?: MetricasConsolidadas;
  dados_ia?: RelatorioIAResultado | null;
  historico_evolutivo?: HistoricoEvolutivoResultado | null;
  anotacoes?: AnotacaoClinicaResultado[];
}

// Compatibilidade com DadosResultadoSessao da UI
export type DadosResultadoSessao = ResultadoSessao;

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

// ============================================================================
// TIPOS DE UI E CONTROLES DE COCKPIT (Retrocompatibilidade)
// ============================================================================

export interface ConfiguracaoSessao {
  jogoId: string;
  jogoTitulo: string;
  pacienteId: string;
  pacienteNome: string;
  objetivoClinico?: string;
  gatilhosEvitar?: string[];
  nivelEstresseInicial?: number;
  observacoesIniciais?: string;
  duracaoPlanejadaMinutos?: number;
  usarFallbackPadrao?: boolean;
}

export interface DadosPareamento {
  sessionToken: string;
  expiraEm: string; // ISO 8601
  tempoValidadeSegundos: number;
  dispositivo?: DispositivoConectadoPayload | null;
}

export interface MetricasTelemetria {
  acertos: number;
  erros: number;
  tempoMedioRespostaMs: number;
  nivelEngajamento: number; // 0 a 100%
  nivelAtencao: number; // 0 a 100%
  nivelEstresseAtual: number; // 1 a 5
  totalEventos: number;
}

export interface PontoHistoricoTelemetria {
  tempoFormatado: string;
  segundo: number;
  atencao: number;
  engajamento: number;
  estresse: number;
}

export interface DiagnosticoTablet {
  latenciaMs: number;
  bateriaNivel: number; // 0 a 100
  qualidadeSinal: "excelente" | "bom" | "fraco" | "offline";
  ultimoHeartbeat: string;
  isConectado: boolean;
}

export interface SessionState {
  status: StatusPareamento;
  statusAnterior?: StatusPareamento | null;
  config: ConfiguracaoSessao | null;
  pareamento: DadosPareamento | null;
  isModalAberto: boolean;
  erro: string | null;
  dataHoraInicio?: string | null;
  dataHoraFim?: string | null;
  anotacoesClinicas?: string | null;
  isPausado?: boolean;
  nivelDdaAtual?: number;
  sessaoId?: string | null;
  tempoAcumuladoPausaMs?: number;
  timestampUltimaPausa?: number | null;
}

export interface SessionActions {
  abrirModalPreSessao: (jogo?: { id: string; titulo: string }) => void;
  selecionarJogo: (jogo: { id: string; titulo: string }) => void;
  fecharModal: () => void;
  selecionarPaciente: (paciente: { id: string; nome: string }) => void;
  configurarParametros: (parametros: Partial<ConfiguracaoSessao>) => void;
  iniciarPareamento: (dados: {
    sessionToken: string;
    expiraEm?: string;
    tempoValidadeSegundos?: number;
  }) => void;
  confirmarConexaoDispositivo: (dispositivo: DispositivoConectadoPayload) => void;
  notificarDesconexaoDispositivo: () => void;
  iniciarIntervencao: () => void;
  pausarSessao: () => void;
  retomarSessao: () => void;
  ajustarDda: (novoNivel: number) => void;
  salvarAnotacoes: (anotacoes: string) => void;
  finalizarSessao: (anotacoes?: string) => void;
  cancelarSessao: (motivo?: string) => void;
  expirarToken: () => void;
  setErro: (mensagem: string | null) => void;
  limparErro: () => void;
  setSessaoId: (id: string | null) => void;
  restaurarSessao: (dados: Partial<SessionState>) => void;
  reset: () => void;
}

export type SessionStore = SessionState & SessionActions;

export interface MetricasConsolidadasDados {
  duracaoSegundos: number;
  taxaConclusao: number; // 0 a 100%
  intervencoesDda: number;
  pontuacaoGeral?: number | null;
  estabilidadeFoco?: number | null; // 0 a 100%
  tempoMedioRespostaMs?: number | null;
  totalAcertos?: number | null;
  totalErros?: number | null;
}

export interface IntervencaoDdaPonto {
  momentoFormatado: string;
  segundo: number;
  tipoIntervencao: string;
  detalhes?: string;
}

export interface TentativaRespostaPonto {
  tentativa: number;
  tempoFormatado: string;
  segundo: number;
  tempoRespostaSegundos: number;
  acerto: boolean;
  data_hora?: string;
  id_metrica?: string;
  intervencaoDda?: IntervencaoDdaPonto | null;
}

export type TendenciaMetrica = "estavel" | "crescente" | "decrescente";

export interface MetricaAgregadaIA {
  id_metrica: string;
  valor_dominante: string;
  tendencia: TendenciaMetrica;
}

export interface DadosIaRelatorio {
  token_sessao?: string;
  duracao_segundos?: number;
  resumo?: {
    taxa_conclusao: number;
    intervencoes_dda: number;
  };
  analises_ia?: string[];
  metricas_agregadas?: MetricaAgregadaIA[];
  recomendacoes_adaptativas?: string[];
  alerta_sensorial?: boolean;
}

export interface FiltroSessaoDTO {
  all?: boolean;
  status?: string;
  data?: string;
  dataInicio?: string;
  dataFim?: string;
  pacienteId?: string;
  jogoId?: string;
  modo?: string;
  page?: number;
  limit?: number;
}

export interface RespostaListagemSessao<T = Sessao> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message?: string;
}
