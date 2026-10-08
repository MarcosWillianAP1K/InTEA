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
  config: null,
  pareamento: null,
  isModalAberto: false,
  erro: null,
  dataHoraInicio: null,
  dataHoraFim: null,
  anotacoesClinicas: null,
  isPausado: false,
  nivelDdaAtual: 1,
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialState,

  abrirModalPreSessao: (jogo: { id: string; titulo: string }) => {
    set({
      isModalAberto: true,
      status: "configurando",
      erro: null,
      config: {
        jogoId: jogo.id,
        jogoTitulo: jogo.titulo,
        pacienteId: "",
        pacienteNome: "",
        gatilhosEvitar: ["Som Alto", "Luz Intensa"],
        nivelEstresseInicial: 1,
        duracaoPlanejadaMinutos: 30,
      },
      pareamento: null,
    });
  },

  fecharModal: () => {
    set({ isModalAberto: false });
  },

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

  pausarSessao: () => {
    set({ isPausado: true });
  },

  retomarSessao: () => {
    set({ isPausado: false });
  },

  ajustarDda: (novoNivel: number) => {
    set({ nivelDdaAtual: Math.min(5, Math.max(1, novoNivel)) });
  },

  salvarAnotacoes: (anotacoes: string) => {
    set({ anotacoesClinicas: anotacoes });
  },

  finalizarSessao: (anotacoes?: string) => {
    set({
      status: "finalizada",
      isModalAberto: false,
      dataHoraFim: new Date().toISOString(),
      anotacoesClinicas: anotacoes !== undefined ? anotacoes : get().anotacoesClinicas,
    });
  },

  restaurarSessao: (dados: Partial<SessionState>) => {
    set((state) => ({
      ...state,
      ...dados,
    }));
  },

  cancelarSessao: (motivo?: string) => {
    set({
      status: "cancelada",
      isModalAberto: false,
      erro: motivo || null,
    });
  },

  expirarToken: () => {
    set({
      status: "expirada",
      erro: "O tempo de validade do código de pareamento expirou.",
    });
  },

  setErro: (mensagem: string | null) => {
    set({
      erro: mensagem,
      status: mensagem ? "erro" : get().status,
    });
  },

  reset: () => {
    set({ ...initialState });
  },
}));
