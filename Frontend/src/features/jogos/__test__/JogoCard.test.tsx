import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JogoCard } from "../components/JogoCard";
import type { Jogo } from "../types";

describe("JogoCard Component", () => {
  const jogoMock: Jogo = {
    id: "jogo-test-1",
    titulo: "Aventura das Cores",
    versao: "1.2",
    descricaoClinica: "Estimula atenção compartilhada e reconhecimento facial",
    objetivoTerapeutico: "Atenção Compartilhada",
    faixaEtariaMin: 4,
    faixaEtariaMax: 10,
    suportaDDA: true,
    metricasEsperadas: [],
  };

  it("deve renderizar o título, versão e descrição do jogo", () => {
    render(
      <JogoCard
        jogo={jogoMock}
        onIniciarSessao={vi.fn()}
        onModoLivre={vi.fn()}
      />
    );

    expect(screen.getByText("Aventura das Cores")).toBeDefined();
    expect(screen.getByText("v1.2")).toBeDefined();
    expect(screen.getByText("Estimula atenção compartilhada e reconhecimento facial")).toBeDefined();
  });

  it("deve disparar onModoLivre ao clicar no botão Modo Livre", () => {
    const onModoLivreMock = vi.fn();
    render(
      <JogoCard
        jogo={jogoMock}
        onIniciarSessao={vi.fn()}
        onModoLivre={onModoLivreMock}
      />
    );

    const botaoModoLivre = screen.getByRole("button", { name: /Modo Livre/i });
    fireEvent.click(botaoModoLivre);

    expect(onModoLivreMock).toHaveBeenCalledWith(jogoMock);
  });

  it("deve disparar onIniciarSessao ao clicar no botão Iniciar Sessão", () => {
    const onIniciarSessaoMock = vi.fn();
    render(
      <JogoCard
        jogo={jogoMock}
        onIniciarSessao={onIniciarSessaoMock}
        onModoLivre={vi.fn()}
      />
    );

    const botaoIniciar = screen.getByRole("button", { name: /Iniciar Sessão/i });
    fireEvent.click(botaoIniciar);

    expect(onIniciarSessaoMock).toHaveBeenCalledWith(jogoMock);
  });
});
