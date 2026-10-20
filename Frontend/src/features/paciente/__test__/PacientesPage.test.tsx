import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PacientesPage } from "../pages/PacientesPage";

describe("Página Meus Pacientes Vinculados (PacientesPage)", () => {
  it("deve renderizar o cabeçalho 'Meus Pacientes Vinculados' e botão para 'Ver todos os pacientes'", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PacientesPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByText("Meus Pacientes Vinculados")).toBeDefined();
    expect(
      screen.getByText(
        "Gerencie prontuários e sessões dos pacientes sob seus cuidados clínicos."
      )
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /Ver todos os pacientes/i })).toBeDefined();
  });

  it("NÃO deve renderizar ação ou botão de cadastrar paciente para o terapeuta comum", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PacientesPage />
        </MemoryRouter>
      );
    });

    // Garante que o botão do cabeçalho de cadastro NÃO está presente
    expect(screen.queryByRole("button", { name: /Cadastrar Paciente/i })).toBeNull();

    // Garante que o card de adicionar paciente NÃO está presente no grid
    expect(screen.queryByTestId("card-adicionar-paciente")).toBeNull();
    expect(screen.queryByText("Novo Paciente")).toBeNull();
    expect(screen.queryByText("Cadastrar no sistema")).toBeNull();

    // Garante que os pacientes vinculados continuam presentes
    expect(screen.getByText("Lucas Gabriel Silva")).toBeDefined();
  });
});
