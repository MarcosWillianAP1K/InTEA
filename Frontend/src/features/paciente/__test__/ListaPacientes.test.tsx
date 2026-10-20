import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ListaPacientes } from "../components/ListaPacientes";

describe("Componente ListaPacientes (Alternador Tabela vs Grid de Cards)", () => {
  it("deve renderizar inicialmente em modo Grid com CardAdicionarPaciente e CardPacienteGrid", () => {
    render(<ListaPacientes initialVisualMode="grid" />);

    expect(screen.getByTestId("grid-pacientes")).toBeDefined();
    expect(screen.getByTestId("card-adicionar-paciente")).toBeDefined();
    expect(screen.getByText("Novo Paciente")).toBeDefined();
    expect(screen.getByText("Cadastrar no sistema")).toBeDefined();

    // Verifica se os pacientes mock estão presentes nos cards do Grid
    expect(screen.getByText("Lucas Gabriel Silva")).toBeDefined();
  });

  it("deve alternar para visualização em Tabela ao clicar no botão correspondente", () => {
    render(<ListaPacientes initialVisualMode="grid" />);

    const btnTable = screen.getByTestId("toggle-view-table");
    fireEvent.click(btnTable);

    // O container de grid não deve mais estar visível
    expect(screen.queryByTestId("grid-pacientes")).toBeNull();

    // Cabeçalhos da tabela devem estar presentes
    expect(screen.getByText("Paciente")).toBeDefined();
    expect(screen.getByText("Categoria")).toBeDefined();
    expect(screen.getByText("Progresso")).toBeDefined();
    expect(screen.getByText("Data de Criação")).toBeDefined();
  });

  it("deve alternar de volta para o Grid ao clicar no botão de Grid", () => {
    render(<ListaPacientes initialVisualMode="table" />);

    expect(screen.queryByTestId("grid-pacientes")).toBeNull();

    const btnGrid = screen.getByTestId("toggle-view-grid");
    fireEvent.click(btnGrid);

    expect(screen.getByTestId("grid-pacientes")).toBeDefined();
    expect(screen.getByTestId("card-adicionar-paciente")).toBeDefined();
  });

  it("deve disparar onOpenCreate ao clicar no CardAdicionarPaciente dentro do Grid", () => {
    const handleOpenCreate = vi.fn();
    render(<ListaPacientes initialVisualMode="grid" onOpenCreate={handleOpenCreate} />);

    const cardAdd = screen.getByTestId("card-adicionar-paciente");
    fireEvent.click(cardAdd);

    expect(handleOpenCreate).toHaveBeenCalledTimes(1);
  });

  it("não deve renderizar botão 'Cadastrar Paciente' nem 'CardAdicionarPaciente' quando permitirCadastro={false} em modo Grid", () => {
    render(<ListaPacientes initialVisualMode="grid" permitirCadastro={false} />);

    expect(screen.getByTestId("grid-pacientes")).toBeDefined();
    expect(screen.queryByTestId("card-adicionar-paciente")).toBeNull();
    expect(screen.queryByText("Novo Paciente")).toBeNull();
    expect(screen.queryByText("Cadastrar no sistema")).toBeNull();
    expect(screen.queryByRole("button", { name: /Cadastrar Paciente/i })).toBeNull();

    // Pacientes da listagem continuam sendo renderizados normalmente
    expect(screen.getByText("Lucas Gabriel Silva")).toBeDefined();
  });

  it("não deve renderizar botão 'Cadastrar Paciente' quando permitirCadastro={false} em modo Tabela", () => {
    render(<ListaPacientes initialVisualMode="table" permitirCadastro={false} />);

    expect(screen.queryByRole("button", { name: /Cadastrar Paciente/i })).toBeNull();
    expect(screen.getByText("Paciente")).toBeDefined();
    expect(screen.getByText("Lucas Gabriel Silva")).toBeDefined();
  });

  it("deve exibir aviso 'Nenhum paciente vinculado' quando permitirCadastro={false} e não houver pacientes no Grid", () => {
    render(<ListaPacientes initialVisualMode="grid" permitirCadastro={false} />);
    const inputBusca = screen.getByPlaceholderText(/buscar paciente/i);
    fireEvent.change(inputBusca, { target: { value: "NomeInexistenteXYZ" } });

    expect(screen.getByText("Nenhum paciente vinculado")).toBeDefined();
    expect(screen.getByTestId("grid-pacientes-vazio")).toBeDefined();
  });

  it("deve exibir aviso 'Nenhum paciente vinculado' quando permitirCadastro={false} e não houver pacientes na Tabela", () => {
    render(<ListaPacientes initialVisualMode="table" permitirCadastro={false} />);
    const inputBusca = screen.getByPlaceholderText(/buscar paciente/i);
    fireEvent.change(inputBusca, { target: { value: "NomeInexistenteXYZ" } });

    expect(screen.getByText("Nenhum paciente vinculado")).toBeDefined();
  });
});
