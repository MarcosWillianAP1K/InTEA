import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { CardSessaoTimer } from "../components/CardSessaoTimer";

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe("Componente CardSessaoTimer (Figma: 'sessão - InTEA' 61:759)", () => {
  it("deve renderizar dados da atividade, paciente e contagem regressiva", () => {
    renderWithRouter(
      <CardSessaoTimer
        pacienteNome="João Betinha da Silva"
        jogoTitulo="Caminho das Cores"
        tempoFormatado="14:55"
        status="conectado"
      />,
    );

    expect(screen.getByText("João Betinha da Silva")).toBeDefined();
    expect(screen.getByText("Atividade atual: Caminho das Cores")).toBeDefined();
    expect(screen.getByTestId("countdown-display").textContent).toBe("14:55");
    expect(screen.getByText("Conectado")).toBeDefined();
    expect(screen.getByRole("button", { name: /Concluir sessão/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Cockpit/i })).toBeDefined();
  });

  it("deve formatar duração em segundos caso tempoFormatado não seja informado", () => {
    renderWithRouter(
      <CardSessaoTimer
        duracaoSegundos={625}
      />,
    );

    expect(screen.getByTestId("countdown-display").textContent).toBe("10:25");
  });

  it("deve disparar onCockpitClick ao clicar no atalho de Cockpit", () => {
    const handleCockpit = vi.fn();
    renderWithRouter(
      <CardSessaoTimer onCockpitClick={handleCockpit} />,
    );

    const btnCockpit = screen.getByRole("button", { name: /Cockpit/i });
    fireEvent.click(btnCockpit);

    expect(handleCockpit).toHaveBeenCalledTimes(1);
  });

  it("deve disparar onConcluirClick ao clicar em Concluir sessão", () => {
    const handleConcluir = vi.fn();
    renderWithRouter(
      <CardSessaoTimer onConcluirClick={handleConcluir} />,
    );

    const btnConcluir = screen.getByRole("button", { name: /Concluir sessão/i });
    fireEvent.click(btnConcluir);

    expect(handleConcluir).toHaveBeenCalledTimes(1);
  });

  it("deve exibir status Finalizado quando a sessão estiver concluída", () => {
    renderWithRouter(
      <CardSessaoTimer status="finalizada" />,
    );

    expect(screen.getByText("Finalizado")).toBeDefined();
  });
});
