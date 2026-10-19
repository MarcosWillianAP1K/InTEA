import { create } from "zustand";
import type { Patient, PatientStatus } from "../types/paciente.types";
import { pacienteToPatient } from "../types/paciente.types";
import { pacienteService } from "../services/paciente.service";
import { PATIENTS_DICTIONARY } from "../types/bdmock";

// Reexportação dos tipos canônicos e dicionário de mocks para compatibilidade
export type { Patient, PatientStatus };
export { PATIENTS_DICTIONARY };


// ==========================================
// STORE DO ZUSTAND PARA PACIENTES
// ==========================================
interface PatientsState {
  patients: Record<string, Patient>;
  selectedPatientId: string | null;
  searchTerm: string;
  categoryFilter: string;
  statusFilter: string;
  sortOrder: string;

  // Actions
  addPatient: (patient: Patient) => void;
  fetchPatients: () => Promise<void>;
  setSelectedPatientId: (id: string | null) => void;
  setSearchTerm: (term: string) => void;
  setCategoryFilter: (category: string) => void;
  setStatusFilter: (status: string) => void;
  setSortOrder: (order: string) => void;
  resetFilters: () => void;

  // Helpers
  getSelectedPatient: () => Patient | null;
  getFilteredPatients: () => Patient[];
  getCategories: () => string[];
}

export const usePatientsStore = create<PatientsState>((set, get) => ({
  patients: PATIENTS_DICTIONARY,
  selectedPatientId: "pac-001",
  searchTerm: "",
  categoryFilter: "all",
  statusFilter: "all",
  sortOrder: "recent",

  fetchPatients: async () => {
    try {
      const lista = await pacienteService.listar();
      if (Array.isArray(lista) && lista.length > 0) {
        const novosPacientes: Record<string, Patient> = {};
        for (const p of lista) {
          novosPacientes[p.id] = pacienteToPatient(p);
        }
        set((state) => ({
          patients: {
            ...state.patients,
            ...novosPacientes,
          },
          selectedPatientId: state.selectedPatientId || lista[0]?.id || null,
        }));
      }
    } catch {
      // Falha silenciosa para resiliência offline e isolamento de testes
    }
  },

  addPatient: (patient: Patient) => {
    set((state) => ({
      patients: {
        [patient.id]: patient,
        ...state.patients,
      },
      selectedPatientId: patient.id,
    }));
  },
  setSelectedPatientId: (id: string | null) => set({ selectedPatientId: id }),
  setSearchTerm: (searchTerm: string) => set({ searchTerm }),
  setCategoryFilter: (categoryFilter: string) => set({ categoryFilter }),
  setStatusFilter: (statusFilter: string) => set({ statusFilter }),
  setSortOrder: (sortOrder: string) => set({ sortOrder }),
  resetFilters: () =>
    set({
      searchTerm: "",
      categoryFilter: "all",
      statusFilter: "all",
      sortOrder: "recent",
    }),

  getSelectedPatient: () => {
    const { patients, selectedPatientId } = get();
    return selectedPatientId ? patients[selectedPatientId] || null : null;
  },

  getCategories: () => {
    const { patients } = get();
    const setCategory = new Set<string>();
    Object.values(patients).forEach((p) => setCategory.add(p.category));
    return Array.from(setCategory);
  },

  getFilteredPatients: () => {
    const { patients, searchTerm, categoryFilter, statusFilter, sortOrder } =
      get();
    const all = Object.values(patients);

    const filtered = all.filter((patient) => {
      const matchesSearch =
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.clinicalStatus
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        patient.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.responsibleName
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || patient.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || patient.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });

    if (sortOrder === "name-asc") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === "age-asc") {
      filtered.sort((a, b) => a.age - b.age);
    } else if (sortOrder === "age-desc") {
      filtered.sort((a, b) => b.age - a.age);
    }

    return filtered;
  },
}));

export const usePacienteStore = usePatientsStore;
export default usePacienteStore;
