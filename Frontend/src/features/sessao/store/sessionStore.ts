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

  /** Abre o modal de pré-sessão e inicializa a configuração padrão para o jogo selecionado */
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

  /** Fecha o modal de pré-sessão sem alterar o estado da sessão */
  fecharModal: () => {
    set({ isModalAberto: false });
  },

  /** Associa um paciente à configuração ativa da sessão (exigido por RF21 e RN04) */
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

  /** Atualiza parcialmente os parâmetros clínicos da sessão (DDA, duração, gatilhos, etc.) */
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

  /** Transiciona para 'aguardando_pareamento' e persiste o session_token gerado pelo backend (RF10, RNF03) */
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

  /** Reage à queda de conexão do dispositivo remoto sem interromper a sessão ativa (RNF04) */
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

  /** Inicia formalmente a intervenção clínica, transitando para 'em_andamento' e disparando o cronômetro (RF12, RF13) */
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

  /** Pausa o cronômetro e sinaliza ao jogo remoto que a intervenção está suspensa (RF21) */
  pausarSessao: () => {
    set({ isPausado: true });
  },

  /** Retoma o cronômetro e reinicia o fluxo de intervenção após pausa (RF21) */
  retomarSessao: () => {
    set({ isPausado: false });
  },

  /** Atualiza o nível DDA (1-5) enviado ao jogo remoto para adaptar a dificuldade (RF17, RN03) */
  ajustarDda: (novoNivel: number) => {
    set({ nivelDdaAtual: Math.min(5, Math.max(1, novoNivel)) });
  },

  /** Persiste as anotações clínicas preliminares do terapeuta durante a sessão (RF17) */
  salvarAnotacoes: (anotacoes: string) => {
    set({ anotacoesClinicas: anotacoes });
  },

  /** Encerra formalmente a sessão no store, registra data/hora de fim e consolida anotações (RF13, RN05) */
  finalizarSessao: (anotacoes?: string) => {
    set({
      status: "finalizada",
      isModalAberto: false,
      dataHoraFim: new Date().toISOString(),
      anotacoesClinicas: anotacoes !== undefined ? anotacoes : get().anotacoesClinicas,
    });
  },

  /** Reidrata o estado da sessão a partir do sessionStorage após um refresh F5 (RNF04) */
  restaurarSessao: (dados: Partial<SessionState>) => {
    set((state) => ({
      ...state,
      ...dados,
    }));
  },

  /** Cancela a sessão antes do encerramento formal, registrando o motivo para a trilha de auditoria (RF12, RN05) */
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

  /** Define uma mensagem de erro no store e transiciona para o estado 'erro' quando aplicável */
  setErro: (mensagem: string | null) => {
    set({
      erro: mensagem,
      status: mensagem ? "erro" : get().status,
    });
  },

  /** Reseta o store para o estado inicial (útil após encerramento ou para testes) */
  reset: () => {
    set({ ...initialState });
  },
}));
