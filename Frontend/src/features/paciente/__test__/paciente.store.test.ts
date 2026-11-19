import { describe, it, expect, beforeEach } from "vitest";
import { usePatientsStore, PATIENTS_DICTIONARY } from "../store/paciente.store";
import type { Patient } from "../store/paciente.store";

describe("Paciente Store (usePacienteStore)", () => {
  beforeEach(() => {
    usePatientsStore.setState({
      patients: { ...PATIENTS_DICTIONARY },
      selectedPatientId: "pac-001",
      searchTerm: "",
      categoryFilter: "all",
      statusFilter: "all",
      sortOrder: "recent",
    });
  });

  it("deve carregar os pacientes iniciais do dicionário", () => {
    const state = usePatientsStore.getState();
    expect(Object.keys(state.patients).length).toBeGreaterThan(0);
    expect(state.selectedPatientId).toBe("pac-001");
  });

  it("deve adicionar um novo paciente e selecioná-lo automaticamente", () => {
    const novoPaciente: Patient = {
      id: "pac-999",
      name: "Mariana Teste",
      age: 6,
      gender: "F",
      birthDate: "01/01/2020",
      photoUrl: "",
      category: "TEA Nível 1",
      clinicalStatus: "Avaliação inicial",
      progress: 0,
      lastSessionDate: "Hoje, 10:00",
      status: "IN_PROGRESS",
      responsibleName: "Mãe Teste",
      responsiblePhone: "(11) 99999-9999",
      therapist: "Dr. Hermeson",
      communicationStyle: "Verbal",
      sensorySensitivities: [],
      notes: "Anotação inicial",
    };

    usePatientsStore.getState().addPatient(novoPaciente);

    const state = usePatientsStore.getState();
    expect(state.patients["pac-999"]).toBeDefined();
    expect(state.patients["pac-999"].name).toBe("Mariana Teste");
    expect(state.selectedPatientId).toBe("pac-999");
  });

  it("deve buscar o paciente selecionado via getSelectedPatient", () => {
    const store = usePatientsStore.getState();
    store.setSelectedPatientId("pac-002");

    const paciente = usePatientsStore.getState().getSelectedPatient();
    expect(paciente).not.toBeNull();
    expect(paciente?.name).toBe("Sofia Helena Oliveira");
  });

  it("deve filtrar pacientes por termo de busca", () => {
    const store = usePatientsStore.getState();
    store.setSearchTerm("Lucas");

    const filtrados = usePatientsStore.getState().getFilteredPatients();
    expect(filtrados.length).toBeGreaterThan(0);
    expect(filtrados.every((p) => p.name.includes("Lucas"))).toBe(true);
  });

  it("deve filtrar pacientes por categoria", () => {
    const store = usePatientsStore.getState();
    store.setCategoryFilter("TEA Nível 2");

    const filtrados = usePatientsStore.getState().getFilteredPatients();
    expect(filtrados.every((p) => p.category === "TEA Nível 2")).toBe(true);
  });

  it("deve resetar filtros para os valores padrão", () => {
    const store = usePatientsStore.getState();
    store.setSearchTerm("teste");
    store.setCategoryFilter("TEA Nível 1");
    store.setStatusFilter("FINISHED");

    store.resetFilters();

    const state = usePatientsStore.getState();
    expect(state.searchTerm).toBe("");
    expect(state.categoryFilter).toBe("all");
    expect(state.statusFilter).toBe("all");
  });

  it("deve atualizar ou inserir paciente via upsertPatient preservando registros existentes", () => {
    const store = usePatientsStore.getState();
    const existente = store.patients["pac-001"];
    expect(existente).toBeDefined();

    store.upsertPatient({
      ...existente,
      name: "Lucas Atualizado via Upsert",
    });

    const atualizado = usePatientsStore.getState().patients["pac-001"];
    expect(atualizado.name).toBe("Lucas Atualizado via Upsert");
    expect(Object.keys(usePatientsStore.getState().patients).length).toBeGreaterThan(1);
  });
});
