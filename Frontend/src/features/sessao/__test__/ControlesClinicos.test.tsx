import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ControlesClinicos } from "../components/ControlesClinicos";

describe("Card 3.4 — Testes Unitários de Controles Clínicos (Hermeson Alves)", () => {
  it("deve renderizar botão Pausar quando o jogo não estiver pausado", () => {
    const onPausar = vi.fn();
    const onRetomar = vi.fn();
    const onAjustarDda = vi.fn();
    const onAbrirModalFinalizar = vi.fn();

    render(
      <ControlesClinicos
        isPausado={false}
        nivelDda={2}
        onPausar={onPausar}
        onRetomar={onRetomar}
        onAjustarDda={onAjustarDda}
        onAbrirModalFinalizar={onAbrirModalFinalizar}
      />
    );

    const botaoPausar = screen.getByTestId("botao-pausar");
    expect(botaoPausar).toBeDefined();

    fireEvent.click(botaoPausar);
    expect(onPausar).toHaveBeenCalledTimes(1);
    expect(onRetomar).not.toHaveBeenCalled();
  });

  it("deve renderizar botão Retomar quando o jogo estiver pausado", () => {
    const onPausar = vi.fn();
    const onRetomar = vi.fn();
    const onAjustarDda = vi.fn();
    const onAbrirModalFinalizar = vi.fn();

    render(
      <ControlesClinicos
        isPausado={true}
        nivelDda={3}
        onPausar={onPausar}
        onRetomar={onRetomar}
        onAjustarDda={onAjustarDda}
        onAbrirModalFinalizar={onAbrirModalFinalizar}
      />
    );

    const botaoRetomar = screen.getByTestId("botao-retomar");
    expect(botaoRetomar).toBeDefined();

    fireEvent.click(botaoRetomar);
    expect(onRetomar).toHaveBeenCalledTimes(1);
  });

  it("deve permitir ajustar o nível DDA de 1 a 5", () => {
    const onAjustarDda = vi.fn();

    render(
      <ControlesClinicos
        isPausado={false}
        nivelDda={1}
        onPausar={vi.fn()}
        onRetomar={vi.fn()}
        onAjustarDda={onAjustarDda}
        onAbrirModalFinalizar={vi.fn()}
      />
    );

    const btnDda4 = screen.getByTestId("btn-dda-4");
    fireEvent.click(btnDda4);
    expect(onAjustarDda).toHaveBeenCalledWith(4);
  });

  it("deve disparar abertura do modal de encerramento ao clicar em Finalizar Sessão", () => {
    const onAbrirModalFinalizar = vi.fn();

    render(
      <ControlesClinicos
        isPausado={false}
        nivelDda={1}
        onPausar={vi.fn()}
        onRetomar={vi.fn()}
        onAjustarDda={vi.fn()}
        onAbrirModalFinalizar={onAbrirModalFinalizar}
      />
    );

    const btnFinalizar = screen.getByTestId("botao-finalizar-sessao");
    fireEvent.click(btnFinalizar);
    expect(onAbrirModalFinalizar).toHaveBeenCalledTimes(1);
  });
});
