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
    expect(screen.getByText("Em Andamento")).toBeDefined();
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

  it("deve exibir status Finalizado quando a sessão estiver concluída e ocultar botões de cockpit/concluir", () => {
    const handleVerRelatorio = vi.fn();
    renderWithRouter(
      <CardSessaoTimer status="finalizada" onVerRelatorioClick={handleVerRelatorio} />,
    );

    expect(screen.getByText("Finalizado")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Concluir sessão/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Cockpit/i })).toBeNull();

    const btnRelatorio = screen.getByRole("button", { name: /Ver Relatório/i });
    expect(btnRelatorio).toBeDefined();
    fireEvent.click(btnRelatorio);
    expect(handleVerRelatorio).toHaveBeenCalledTimes(1);
  });

  it("deve exibir status 'Em Pausa' quando a sessão estiver pausada mantendo botões de ação", () => {
    renderWithRouter(
      <CardSessaoTimer status="pausada" tempoFormatado="18:00" />,
    );

    expect(screen.getByText("Em Pausa")).toBeDefined();
    expect(screen.getByTestId("countdown-display").textContent).toBe("18:00");
    expect(screen.getByRole("button", { name: /Concluir sessão/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Cockpit/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Continuar sessão/i })).toBeDefined();
  });

  it("deve renderizar botão compacto de pausa (ícone Pause) quando sessão estiver em andamento e disparar onTogglePausa", () => {
    const handleTogglePausa = vi.fn();
    renderWithRouter(
      <CardSessaoTimer
        status="em_andamento"
        tempoFormatado="10:00"
        onTogglePausa={handleTogglePausa}
      />,
    );

    const btnPausa = screen.getByRole("button", { name: /Pausar sessão/i });
    expect(btnPausa).toBeDefined();
    expect(btnPausa.getAttribute("data-testid")).toBe("btn-toggle-pausa");

    fireEvent.click(btnPausa);
    expect(handleTogglePausa).toHaveBeenCalledTimes(1);
  });

  it("deve ocultar botão de pausa/retomada quando a sessão estiver finalizada", () => {
    renderWithRouter(
      <CardSessaoTimer status="finalizada" tempoFormatado="25:00" />,
    );

    expect(screen.queryByTestId("btn-toggle-pausa")).toBeNull();
  });
});
