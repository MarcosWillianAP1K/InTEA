import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionPersistence, SESSION_STORAGE_KEY } from "../hooks/useSessionPersistence";
import { useSessionStore } from "../store/sessionStore";

describe("Card 4.4 — Testes do Hook useSessionPersistence (Luma Maiara)", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useSessionStore.getState().reset();
    vi.clearAllMocks();
  });

  it("deve persistir dados no sessionStorage quando a sessão for iniciada", () => {
    act(() => {
      useSessionStore.getState().abrirModalPreSessao({
        id: "jogo-teste",
        titulo: "Aventura das Cores",
      });
      useSessionStore.getState().iniciarPareamento({ sessionToken: "TOKEN-123" });
      useSessionStore.getState().confirmarConexaoDispositivo({
        deviceId: "tab-1",
        conectadoEm: new Date().toISOString(),
      });
      useSessionStore.getState().iniciarIntervencao();
    });

    renderHook(() => useSessionPersistence());

    const itemArmazenado = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    expect(itemArmazenado).not.toBeNull();

    const dados = JSON.parse(itemArmazenado!);
    expect(dados.status).toBe("em_andamento");
    expect(dados.pareamento.sessionToken).toBe("TOKEN-123");
    expect(dados.config.jogoTitulo).toBe("Aventura das Cores");
  });

  it("deve restaurar estado do sessionStorage quando a store estiver ociosa", () => {
    const dadosSalvos = {
      status: "em_andamento",
      config: {
        jogoId: "jogo-recuperado",
        jogoTitulo: "Formas Calmas",
        pacienteId: "pac-123",
        pacienteNome: "Lucas",
      },
      pareamento: {
        sessionToken: "RESTORE-999",
        expiraEm: new Date().toISOString(),
        tempoValidadeSegundos: 900,
        dispositivo: {
          deviceId: "tab-recuperado",
          conectadoEm: new Date().toISOString(),
        },
      },
      salvoEm: new Date().toISOString(),
    };

    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dadosSalvos));

    renderHook(() => useSessionPersistence());

    const estadoRestaurado = useSessionStore.getState();
    expect(estadoRestaurado.status).toBe("em_andamento");
    expect(estadoRestaurado.config?.jogoTitulo).toBe("Formas Calmas");
    expect(estadoRestaurado.pareamento?.sessionToken).toBe("RESTORE-999");
  });

  it("deve limpar persistência do sessionStorage ao finalizar a sessão", () => {
    act(() => {
      useSessionStore.getState().abrirModalPreSessao({
        id: "jogo-teste",
        titulo: "Aventura das Cores",
      });
      useSessionStore.getState().iniciarPareamento({ sessionToken: "TOKEN-123" });
      useSessionStore.getState().confirmarConexaoDispositivo({
        deviceId: "tab-1",
        conectadoEm: new Date().toISOString(),
      });
      useSessionStore.getState().iniciarIntervencao();
    });

    const { result } = renderHook(() => useSessionPersistence());
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull();

    act(() => {
      useSessionStore.getState().finalizarSessao("Sessão concluída com sucesso.");
    });

    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});
