import { create } from "zustand";
import type {
  SessionStore,
  SessionState,
  ConfiguracaoSessao,
} from "../types";
import type { DispositivoConectadoPayload } from "@/core/web.socket";

/**
 * ============================================================================
 * STORE REATIVA DE SESSÃO E PAREAMENTO (Zustand) — InTEA
 * Requisitos: RF10 (Pareamento Remoto), RF12 (Ciclo de Sessão)
 * Regra: TypeScript estrito sem o uso de `any`
 * ============================================================================
 */

const initialState: SessionState = {
  status: "ocioso",
  statusAnterior: null,
  config: null,
  pareamento: null,
  isModalAberto: false,
  erro: null,
  dataHoraInicio: null,
  dataHoraFim: null,
  anotacoesClinicas: null,
  isPausado: false,
  nivelDdaAtual: 1,
  sessaoId: null,
  tempoAcumuladoPausaMs: 0,
  timestampUltimaPausa: null,
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialState,

  /** Opens pre-session modal and initializes default configuration for selected game. */
  abrirModalPreSessao: (jogo?: { id: string; titulo: string }) => {
    set({
      isModalAberto: true,
      status: "configurando",
      erro: null,
      config: {
        jogoId: jogo?.id || "",
        jogoTitulo: jogo?.titulo || "Selecione um jogo",
        pacienteId: "",
        pacienteNome: "",
        gatilhosEvitar: ["Som Alto", "Luz Intensa"],
        nivelEstresseInicial: 1,
        duracaoPlanejadaMinutos: 30,
      },
      pareamento: null,
    });
  },

  /** Associates or updates game in active session configuration. */
  selecionarJogo: (jogo: { id: string; titulo: string }) => {
    const currentConfig = get().config;
    if (!currentConfig) return;

    set({
      config: {
        ...currentConfig,
        jogoId: jogo.id,
        jogoTitulo: jogo.titulo,
      },
    });
  },

  /** Closes pre-session modal without changing session state. */
  fecharModal: () => {
    set({ isModalAberto: false });
  },

  /** Associates patient with active session configuration (RF21, RN04). */
  selecionarPaciente: (paciente: { id: string; nome: string }) => {
    const currentConfig = get().config;
    if (!currentConfig) return;

    set({
      config: {
        ...currentConfig,
        pacienteId: paciente.id,
        pacienteNome: paciente.nome,
      },
    });
  },

  /** Partially updates session clinical parameters (DDA, duration, triggers, etc.). */
  configurarParametros: (parametros: Partial<ConfiguracaoSessao>) => {
    const currentConfig = get().config;
    if (!currentConfig) return;

    set({
      config: {
        ...currentConfig,
        ...parametros,
      },
    });
  },

  /** Transitions to 'aguardando_pareamento' and saves backend session_token (RF10, RNF03). */
  iniciarPareamento: ({
    sessionToken,
    expiraEm,
    tempoValidadeSegundos = 900, // 15 minutos padrão (RNF03)
  }: {
    sessionToken: string;
    expiraEm?: string;
    tempoValidadeSegundos?: number;
  }) => {
    const dataExpiracao =
      expiraEm ||
      new Date(Date.now() + tempoValidadeSegundos * 1000).toISOString();

    set({
      status: "aguardando_pareamento",
      erro: null,
      pareamento: {
        sessionToken,
        expiraEm: dataExpiracao,
        tempoValidadeSegundos,
        dispositivo: null,
      },
    });
  },

  /** Confirma o handshake do dispositivo remoto e transiciona para 'pareado' (RF10) */
  confirmarConexaoDispositivo: (dispositivo: DispositivoConectadoPayload) => {
    const currentPareamento = get().pareamento;
    if (!currentPareamento) return;

    set({
      status: "pareado",
      erro: null,
      pareamento: {
        ...currentPareamento,
        dispositivo,
      },
    });
  },

  /** Handles remote device connection drop without interrupting active session (RNF04). */
  notificarDesconexaoDispositivo: () => {
    const currentPareamento = get().pareamento;
    const currentStatus = get().status;

    if (!currentPareamento) return;

    // Se estava pareado aguardando início, volta para aguardar reconexão
    if (currentStatus === "pareado") {
      set({
        status: "aguardando_pareamento",
        pareamento: {
          ...currentPareamento,
          dispositivo: null,
        },
      });
      return;
    }

    // Se a intervenção já estava em andamento, sinaliza erro/alerta sem perder dados
    if (currentStatus === "em_andamento") {
      set({
        erro: "Conexão perdida com o dispositivo remoto.",
        pareamento: {
          ...currentPareamento,
          dispositivo: null,
        },
      });
    }
  },

  /** Formally starts clinical intervention, transitioning to 'em_andamento' and starting timer. (RF12, RF13) */
  iniciarIntervencao: () => {
    const { status, config, pareamento } = get();

    if (status !== "pareado" || !config || !pareamento?.dispositivo) {
      set({ erro: "Não é possível iniciar intervenção sem dispositivo pareado." });
      return;
    }

    set({
      status: "em_andamento",
      erro: null,
      dataHoraInicio: get().dataHoraInicio || new Date().toISOString(),
      isPausado: false,
      nivelDdaAtual: config.nivelEstresseInicial || 1,
    });
  },

  /** Pauses timer and signals remote game that intervention is suspended (RF21). */
  pausarSessao: () => {
    const agora = Date.now();
    set({
      isPausado: true,
      timestampUltimaPausa: agora,
    });
  },

  /** Resumes timer and restarts intervention flow after pause without accumulating paused time (RF21). */
  retomarSessao: () => {
    const agora = Date.now();
    const ultima = get().timestampUltimaPausa;
    const dormido = ultima ? agora - ultima : 0;
    set({
      isPausado: false,
      timestampUltimaPausa: null,
      tempoAcumuladoPausaMs: (get().tempoAcumuladoPausaMs || 0) + dormido,
    });
  },

  /** Updates DDA level (1-5) sent to remote game for difficulty adaptation (RF17, RN03). */
  ajustarDda: (novoNivel: number) => {
    set({ nivelDdaAtual: Math.min(5, Math.max(1, novoNivel)) });
  },

  /** Sets the active session ID explicitly for synchronization across cards and Cockpit. */
  setSessaoId: (id: string | null) => {
    set({ sessaoId: id });
  },

  /** Saves therapist preliminary clinical notes during session (RF17). */
  salvarAnotacoes: (anotacoes: string) => {
    set({ anotacoesClinicas: anotacoes });
  },

  /** Formally concludes session in store, records end timestamp and consolidates notes (RF13, RN05). */
  finalizarSessao: (anotacoes?: string) => {
    set({
      status: "finalizada",
      isModalAberto: false,
      dataHoraFim: new Date().toISOString(),
      anotacoesClinicas: anotacoes !== undefined ? anotacoes : get().anotacoesClinicas,
    });
  },

  /** Rehydrates session state from sessionStorage after page refresh (RNF04). */
  restaurarSessao: (dados: Partial<SessionState>) => {
    set((state) => ({
      ...state,
      ...dados,
    }));
  },

  /** Cancels session prior to formal completion, logging reason for audit trail (RF12, RN05) */
  cancelarSessao: (motivo?: string) => {
    set({
      status: "cancelada",
      isModalAberto: false,
      erro: motivo || null,
    });
  },

  /** Transiciona para 'expirada' quando o token de pareamento ultrapassa o TTL de 15 minutos (RNF03) */
  expirarToken: () => {
    set({
      status: "expirada",
      erro: "O tempo de validade do código de pareamento expirou.",
    });
  },

  /** Define uma mensagem de erro no store, salva o status anterior e transiciona para o estado 'erro' */
  setErro: (mensagem: string | null) => {
    if (mensagem) {
      const currentStatus = get().status;
      set({
        statusAnterior: currentStatus !== "erro" ? currentStatus : get().statusAnterior,
        erro: mensagem,
        status: "erro",
      });
    } else {
      get().limparErro();
    }
  },

  /** Restores pre-failure status and clears error, unblocking state trap. */
  limparErro: () => {
    const statusAnterior = get().statusAnterior;
    set({
      erro: null,
      status: statusAnterior || (get().status === "erro" ? "ocioso" : get().status),
      statusAnterior: null,
    });
  },

  /** Resets store to initial state (useful post-completion or in testing). */
  reset: () => {
    set({ ...initialState });
  },
}));
