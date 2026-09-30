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
  observacoesIniciais?: string;
  duracaoPlanejadaMinutos?: number;
}

export interface DadosPareamento {
  sessionToken: string;
  expiraEm: string; // ISO 8601
  tempoValidadeSegundos: number;
  dispositivo?: DispositivoConectadoPayload | null;
}

export interface SessionState {
  status: StatusPareamento;
  config: ConfiguracaoSessao | null;
  pareamento: DadosPareamento | null;
  isModalAberto: boolean;
  erro: string | null;
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

  // Ciclo da sessão clínica
  iniciarIntervencao: () => void;
  finalizarSessao: () => void;
  cancelarSessao: (motivo?: string) => void;
  expirarToken: () => void;
  setErro: (mensagem: string | null) => void;
  reset: () => void;
}

export type SessionStore = SessionState & SessionActions;
