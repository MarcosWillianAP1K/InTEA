import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CardPacienteGrid } from "../components/CardPacienteGrid";
import type { Patient } from "../types/paciente.types";

const mockPatient: Patient = {
  id: "pac-001",
  name: "Lucas Martins",
  age: 8,
  gender: "M",
  birthDate: "01/01/2018",
  photoUrl: "",
  category: "TEA Nível 2",
  clinicalStatus: "Autismo 2, dislexia",
  progress: 50,
  lastSessionDate: "08/09/2026",
  status: "IN_PROGRESS",
  responsibleName: "Mariana Martins",
  responsiblePhone: "(86) 99999-0000",
  therapist: "Dr. Marcos Vinicius",
  communicationStyle: "Verbal com suporte",
  sensorySensitivities: ["Som Alto"],
  notes: "Evoluindo bem",
};

describe("Componente CardPacienteGrid (Figma: 'Card paciente' 67:1592)", () => {
  it("deve renderizar dados do paciente corretamente (nome, idade, estado clínico, status e última sessão)", () => {
    render(<CardPacienteGrid patient={mockPatient} />);

    expect(screen.getByText("Lucas Martins")).toBeDefined();
    expect(screen.getByText("8 anos")).toBeDefined();
    expect(screen.getByText("TEA Nível 2")).toBeDefined();
    expect(screen.getByText("Ativo")).toBeDefined();
    expect(screen.getByText(/Última sessão: 08\/09\/2026/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Ver Perfil/i })).toBeDefined();
  });

  it("deve renderizar iniciais no avatar quando photoUrl não estiver disponível", () => {
    render(<CardPacienteGrid patient={mockPatient} />);
    expect(screen.getByText("LM")).toBeDefined();
  });

  it("deve disparar onSelect ao clicar no card", () => {
    const handleSelect = vi.fn();
    render(<CardPacienteGrid patient={mockPatient} onSelect={handleSelect} />);

    const card = screen.getByTestId("card-paciente-grid-pac-001");
    fireEvent.click(card);

    expect(handleSelect).toHaveBeenCalledWith(mockPatient);
  });

  it("deve disparar onVerPerfil ao clicar no botão Ver Perfil", () => {
    const handleVerPerfil = vi.fn();
    render(<CardPacienteGrid patient={mockPatient} onVerPerfil={handleVerPerfil} />);

    const btnVerPerfil = screen.getByRole("button", { name: /Ver Perfil/i });
    fireEvent.click(btnVerPerfil);

    expect(handleVerPerfil).toHaveBeenCalledWith(mockPatient);
  });

  it("deve exibir status Inativo quando paciente estiver finalizado", () => {
    const patientInativo: Patient = {
      ...mockPatient,
      status: "FINISHED",
    };

    render(<CardPacienteGrid patient={patientInativo} />);
    expect(screen.getByText("Inativo")).toBeDefined();
  });

  it("deve renderizar o componente SparklineTendencia com acessibilidade para o paciente", () => {
    const patientComHistorico: Patient = {
      ...mockPatient,
      performanceScore: 78,
      performanceHistory: [50, 62, 70, 78],
    };

    render(<CardPacienteGrid patient={patientComHistorico} />);
    expect(screen.getByRole("img", { name: /Tendência de alta/i })).toBeDefined();
    expect(screen.getByTestId("sparkline-tendencia")).toBeDefined();
  });
});
