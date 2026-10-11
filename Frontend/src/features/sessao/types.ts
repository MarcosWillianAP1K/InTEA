import type { DispositivoConectadoPayload } from "@/core/web.socket";

/**
 * ============================================================================
 * TIPAGEM DE DOMÍNIO DE SESSÃO E PAREAMENTO REMOTO (Sprint 8 / RF10 / RF12)
 * TypeScript estrito sem o uso de `any`
 * ============================================================================
 */

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
  config: ConfiguracaoSessao | null;
  pareamento: DadosPareamento | null;
  isModalAberto: boolean;
  erro: string | null;
  dataHoraInicio?: string | null;
  dataHoraFim?: string | null;
  anotacoesClinicas?: string | null;
  isPausado?: boolean;
  nivelDdaAtual?: number;
}

export interface SessionActions {
  // Ações de fluxo e modal
  abrirModalPreSessao: (jogo: { id: string; titulo: string }) => void;
  fecharModal: () => void;
  selecionarPaciente: (paciente: { id: string; nome: string }) => void;
  configurarParametros: (parametros: Partial<ConfiguracaoSessao>) => void;

  // Ciclo de pareamento
  iniciarPareamento: (dados: { sessionToken: string; expiraEm?: string; tempoValidadeSegundos?: number }) => void;
  confirmarConexaoDispositivo: (dispositivo: DispositivoConectadoPayload) => void;
  notificarDesconexaoDispositivo: () => void;

  // Ciclo da sessão clínica e cockpit
  iniciarIntervencao: () => void;
  pausarSessao: () => void;
  retomarSessao: () => void;
  ajustarDda: (novoNivel: number) => void;
  salvarAnotacoes: (anotacoes: string) => void;
  finalizarSessao: (anotacoes?: string) => void;
  cancelarSessao: (motivo?: string) => void;
  expirarToken: () => void;
  setErro: (mensagem: string | null) => void;
  restaurarSessao: (dados: Partial<SessionState>) => void;
  reset: () => void;
}

export type SessionStore = SessionState & SessionActions;

/**
 * ============================================================================
 * TIPAGEM DE RELATÓRIO E RESULTADOS DE SESSÃO (Sprint 10 / RF14 / Contrato 4)
 * TypeScript estrito sem o uso de `any`
 * ============================================================================
 */

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
  momentoFormatado: string; // ex: "04:30"
  segundo: number;
  tipoIntervencao: string; // ex: "Redução de Dificuldade" | "Aumento de Dificuldade" | "Estímulo Suavizado"
  detalhes?: string;
}

export interface TentativaRespostaPonto {
  tentativa: number;
  tempoFormatado: string; // ex: "01:25"
  segundo: number;
  tempoRespostaSegundos: number; // ex: 2.4
  acerto: boolean;
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



