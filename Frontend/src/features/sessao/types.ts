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
