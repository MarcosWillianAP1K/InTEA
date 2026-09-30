import { describe, it, expect, beforeEach } from "vitest";
import { useSessionStore } from "../store/sessionStore";
import { DispositivoConectadoPayload } from "@/core/web.socket";

describe("Card 4.2 — Store Reativa de Sessão e Pareamento (features/sessao/store/sessionStore.ts)", () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  describe("Estado Inicial e Abertura do Modal", () => {
    it("deve inicializar com valores padrão e status ocioso", () => {
      const state = useSessionStore.getState();

      expect(state.status).toBe("ocioso");
      expect(state.config).toBeNull();
      expect(state.pareamento).toBeNull();
      expect(state.isModalAberto).toBe(false);
      expect(state.erro).toBeNull();
    });

    it("deve abrir o modal de pré-sessão e preencher os dados do jogo selecionado", () => {
      const store = useSessionStore.getState();
      const jogo = { id: "jogo-cores", titulo: "Aventura das Cores" };

      store.abrirModalPreSessao(jogo);

      const state = useSessionStore.getState();
      expect(state.isModalAberto).toBe(true);
      expect(state.status).toBe("configurando");
      expect(state.config?.jogoId).toBe("jogo-cores");
      expect(state.config?.jogoTitulo).toBe("Aventura das Cores");
      expect(state.config?.pacienteId).toBe("");
    });

    it("deve fechar o modal alterando isModalAberto para false", () => {
      const store = useSessionStore.getState();
      store.abrirModalPreSessao({ id: "jogo-1", titulo: "Jogo 1" });
      expect(useSessionStore.getState().isModalAberto).toBe(true);

      store.fecharModal();
      expect(useSessionStore.getState().isModalAberto).toBe(false);
    });
  });

  describe("Seleção de Paciente e Parâmetros Pré-Sessão", () => {
    it("deve associar o paciente selecionado à configuração da sessão", () => {
      const store = useSessionStore.getState();
      store.abrirModalPreSessao({ id: "jogo-1", titulo: "Jogo 1" });

      const paciente = {
        id: "paciente-uuid-1234",
        nome: "Henrique Silveira",
      };

      store.selecionarPaciente(paciente);

      const state = useSessionStore.getState();
      expect(state.config?.pacienteId).toBe("paciente-uuid-1234");
      expect(state.config?.pacienteNome).toBe("Henrique Silveira");
    });

    it("deve permitir configurar parâmetros clínicos adicionais", () => {
      const store = useSessionStore.getState();
      store.abrirModalPreSessao({ id: "jogo-1", titulo: "Jogo 1" });

      store.configurarParametros({
        duracaoPlanejadaMinutos: 40,
        gatilhosEvitar: ["luzes_piscantes", "sons_agudos"],
        observacoesIniciais: "Paciente agitado no início da tarde.",
      });

      const state = useSessionStore.getState();
      expect(state.config?.duracaoPlanejadaMinutos).toBe(40);
      expect(state.config?.gatilhosEvitar).toEqual(["luzes_piscantes", "sons_agudos"]);
      expect(state.config?.observacoesIniciais).toBe(
        "Paciente agitado no início da tarde."
      );
    });
  });

  describe("Ciclo de Pareamento Remoto (RF10)", () => {
    it("deve iniciar o pareamento definindo token, expiração e status 'aguardando_pareamento'", () => {
      const store = useSessionStore.getState();
      store.abrirModalPreSessao({ id: "jogo-1", titulo: "Jogo 1" });

      store.iniciarPareamento({
        sessionToken: "TEA-9042",
        tempoValidadeSegundos: 900,
      });

      const state = useSessionStore.getState();
      expect(state.status).toBe("aguardando_pareamento");
      expect(state.pareamento?.sessionToken).toBe("TEA-9042");
      expect(state.pareamento?.dispositivo).toBeNull();
      expect(state.pareamento?.tempoValidadeSegundos).toBe(900);
      expect(state.pareamento?.expiraEm).toBeDefined();
    });

    it("deve confirmar conexão do dispositivo e transitar para 'pareado'", () => {
      const store = useSessionStore.getState();
      store.abrirModalPreSessao({ id: "jogo-1", titulo: "Jogo 1" });
      store.iniciarPareamento({ sessionToken: "TEA-9042" });

      const dispositivo: DispositivoConectadoPayload = {
        deviceId: "tablet-lenovo-m10",
        tipoDispositivo: "tablet",
        modelo: "Lenovo Tab M10",
        bateria: 92,
        latenciaMs: 38,
        conectadoEm: "2026-09-30T17:50:00.000Z",
      };

      store.confirmarConexaoDispositivo(dispositivo);

      const state = useSessionStore.getState();
      expect(state.status).toBe("pareado");
      expect(state.pareamento?.dispositivo).toEqual(dispositivo);
      expect(state.erro).toBeNull();
    });

    it("deve voltar para 'aguardando_pareamento' se o dispositivo desconectar antes do início", () => {
      const store = useSessionStore.getState();
      store.abrirModalPreSessao({ id: "jogo-1", titulo: "Jogo 1" });
      store.iniciarPareamento({ sessionToken: "TEA-9042" });

      const dispositivo: DispositivoConectadoPayload = {
        deviceId: "tablet-lenovo-m10",
        conectadoEm: "2026-09-30T17:50:00.000Z",
      };

      store.confirmarConexaoDispositivo(dispositivo);
      expect(useSessionStore.getState().status).toBe("pareado");

      store.notificarDesconexaoDispositivo();

      const state = useSessionStore.getState();
      expect(state.status).toBe("aguardando_pareamento");
      expect(state.pareamento?.dispositivo).toBeNull();
    });

    it("deve sinalizar erro se a desconexão ocorrer com a intervenção em andamento", () => {
      const store = useSessionStore.getState();
      store.abrirModalPreSessao({ id: "jogo-1", titulo: "Jogo 1" });
      store.selecionarPaciente({ id: "p1", nome: "Paciente 1" });
      store.iniciarPareamento({ sessionToken: "TEA-9042" });

      const dispositivo: DispositivoConectadoPayload = {
        deviceId: "tablet-lenovo-m10",
        conectadoEm: "2026-09-30T17:50:00.000Z",
      };
      store.confirmarConexaoDispositivo(dispositivo);
      store.iniciarIntervencao();

      expect(useSessionStore.getState().status).toBe("em_andamento");

      store.notificarDesconexaoDispositivo();

      const state = useSessionStore.getState();
      expect(state.erro).toContain("Conexão perdida");
      expect(state.pareamento?.dispositivo).toBeNull();
    });
  });

  describe("Início, Finalização, Cancelamento e Reset (RF12)", () => {
    it("deve bloquear o início da intervenção se o status não for 'pareado'", () => {
      const store = useSessionStore.getState();
      store.abrirModalPreSessao({ id: "jogo-1", titulo: "Jogo 1" });
      store.iniciarPareamento({ sessionToken: "TEA-9042" });

      // Sem dispositivo conectado
      store.iniciarIntervencao();

      const state = useSessionStore.getState();
      expect(state.status).toBe("aguardando_pareamento");
      expect(state.erro).toBeDefined();
    });

    it("deve transitar para 'em_andamento' quando iniciar com dispositivo conectado", () => {
      const store = useSessionStore.getState();
      store.abrirModalPreSessao({ id: "jogo-1", titulo: "Jogo 1" });
      store.selecionarPaciente({ id: "p1", nome: "Paciente 1" });
      store.iniciarPareamento({ sessionToken: "TEA-9042" });

      const dispositivo: DispositivoConectadoPayload = {
        deviceId: "vr-oculus-2",
        conectadoEm: "2026-09-30T17:50:00.000Z",
      };
      store.confirmarConexaoDispositivo(dispositivo);
      store.iniciarIntervencao();

      const state = useSessionStore.getState();
      expect(state.status).toBe("em_andamento");
      expect(state.erro).toBeNull();
    });

    it("deve finalizar a sessão e fechar o modal", () => {
      const store = useSessionStore.getState();
      store.abrirModalPreSessao({ id: "jogo-1", titulo: "Jogo 1" });
      store.finalizarSessao();

      const state = useSessionStore.getState();
      expect(state.status).toBe("finalizada");
      expect(state.isModalAberto).toBe(false);
    });

    it("deve cancelar a sessão gravando o motivo e fechando o modal", () => {
      const store = useSessionStore.getState();
      store.abrirModalPreSessao({ id: "jogo-1", titulo: "Jogo 1" });
      store.cancelarSessao("Paciente precisou interromper");

      const state = useSessionStore.getState();
      expect(state.status).toBe("cancelada");
      expect(state.isModalAberto).toBe(false);
      expect(state.erro).toBe("Paciente precisou interromper");
    });

    it("deve expirar o token marcando status 'expirada'", () => {
      const store = useSessionStore.getState();
      store.iniciarPareamento({ sessionToken: "TEA-9042" });
      store.expirarToken();

      const state = useSessionStore.getState();
      expect(state.status).toBe("expirada");
      expect(state.erro).toContain("expirou");
    });

    it("deve resetar o estado da store para o inicial", () => {
      const store = useSessionStore.getState();
      store.abrirModalPreSessao({ id: "jogo-1", titulo: "Jogo 1" });
      store.iniciarPareamento({ sessionToken: "TEA-9042" });

      store.reset();

      const state = useSessionStore.getState();
      expect(state.status).toBe("ocioso");
      expect(state.config).toBeNull();
      expect(state.pareamento).toBeNull();
      expect(state.isModalAberto).toBe(false);
      expect(state.erro).toBeNull();
    });
  });

  describe("Integração com WebSocket via useSessionSync", () => {
    it("deve sincronizar eventos de conexão de dispositivo na store", () => {
      const store = useSessionStore.getState();
      store.abrirModalPreSessao({ id: "jogo-1", titulo: "Jogo 1" });
      store.iniciarPareamento({ sessionToken: "TEA-1234" });

      const dispositivo: DispositivoConectadoPayload = {
        deviceId: "tablet-tab-s7",
        tipoDispositivo: "tablet",
        conectadoEm: "2026-09-30T17:55:00.000Z",
      };

      // Simula a confirmação via callback do socket
      store.confirmarConexaoDispositivo(dispositivo);
      expect(useSessionStore.getState().status).toBe("pareado");
      expect(useSessionStore.getState().pareamento?.dispositivo).toEqual(dispositivo);

      // Simula a perda de conexão
      store.notificarDesconexaoDispositivo();
      expect(useSessionStore.getState().status).toBe("aguardando_pareamento");
      expect(useSessionStore.getState().pareamento?.dispositivo).toBeNull();
    });
  });
});
