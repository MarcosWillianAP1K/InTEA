import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CardAdicionarPaciente } from "../components/CardAdicionarPaciente";

describe("Componente CardAdicionarPaciente (Figma: 'Card add paciente' 67:1617)", () => {
  it("deve renderizar textos oficiais do Figma ('Novo Paciente' e 'Cadastrar no sistema')", () => {
    render(<CardAdicionarPaciente onClick={vi.fn()} />);

    expect(screen.getByText("Novo Paciente")).toBeDefined();
    expect(screen.getByText("Cadastrar no sistema")).toBeDefined();
  });

  it("deve disparar onClick ao clicar com o mouse", () => {
    const handleClick = vi.fn();
    render(<CardAdicionarPaciente onClick={handleClick} />);

    const card = screen.getByTestId("card-adicionar-paciente");
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("deve ser acessível e disparar ação com as teclas Enter e Espaço", () => {
    const handleClick = vi.fn();
    render(<CardAdicionarPaciente onClick={handleClick} />);

    const card = screen.getByTestId("card-adicionar-paciente");

    fireEvent.keyDown(card, { key: "Enter" });
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: " " });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });
});
