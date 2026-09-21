import { create } from "zustand";

// ==========================================
// TIPAGEM DO PACIENTE
// ==========================================
export type PatientStatus =
  | "IN_PROGRESS"
  | "FINISHED"
  | "EVALUATION"
  | "ATTENTION";

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "M" | "F";
  birthDate: string;
  photoUrl: string;
  category: string; // Ex: "TEA Nível 1", "TEA Nível 2", "TEA Nível 3", "Avaliação Inicial"
  clinicalStatus: string;
  progress: number; // 0 a 100
  performanceScore?: number; // 0 a 100
  lastSessionDate: string; // Ex: "08/09, 14:08"
  status: PatientStatus;
  responsibleName: string;
  responsiblePhone: string;
  therapist: string;
  communicationStyle: string;
  sensorySensitivities: string[];
  notes: string;
  phone?: string;
  cpf?: string;
  address?: {
    cep: string;
    city: string;
    state: string;
    street: string;
    neighborhood: string;
    number: string;
  };
  responsible?: {
    name: string;
    birthDate: string;
    phone: string;
    cpf: string;
    address: Patient["address"];
  };
  extraResponsible?: {
    name: string;
    birthDate: string;
    phone: string;
    cpf: string;
    address: Patient["address"];
  };
}

// ==========================================
// DICIONÁRIO DE PACIENTES (DADOS MOCKADOS)
// Imagens públicas e livres de copyright (Unsplash portraits)
// ==========================================
export const PATIENTS_DICTIONARY: Record<string, Patient> = {
  "pac-001": {
    id: "pac-001",
    name: "Lucas Gabriel Silva",
    age: 7,
    gender: "M",
    birthDate: "14/05/2019",
    photoUrl:
      "https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&q=80&w=400",
    category: "TEA Nível 1",
    clinicalStatus:
      "Comunicação verbal fluente, hiperfoco em matemática e números",
    progress: 33,
    performanceScore: 33,
    lastSessionDate: "08/09, 14:08",
    status: "IN_PROGRESS",
    responsibleName: "Mariana Silva (Mãe)",
    responsiblePhone: "(11) 98765-4321",
    therapist: "Dr. Hermeson Dantas",
    communicationStyle:
      "Verbal expressivo com vocabulário rico; mediação social indicada",
    sensorySensitivities: [
      "Hipersensibilidade a sons repentinos",
      "Sensibilidade à luz branca forte",
    ],
    notes:
      "Excelente adesão a atividades de raciocínio sequencial e jogos de tabuleiro adaptados.",
  },
  "pac-002": {
    id: "pac-002",
    name: "Sofia Helena Oliveira",
    age: 5,
    gender: "F",
    birthDate: "22/11/2020",
    photoUrl:
      "https://images.unsplash.com/photo-1595454223600-91fbdd77ae09?auto=format&fit=crop&q=80&w=400",
    category: "TEA Nível 2",
    clinicalStatus: "Comunicação com suporte de PECS e gestos funcionais",
    progress: 100,
    performanceScore: 20,
    lastSessionDate: "03/09, 14:32",
    status: "FINISHED",
    responsibleName: "Renata Oliveira (Mãe)",
    responsiblePhone: "(11) 97654-3210",
    therapist: "Dra. Carolina Freitas",
    communicationStyle:
      "Comunicação Aumentativa e Alternativa (CAA), frases curtas",
    sensorySensitivities: [
      "Aversão a texturas pegajosas",
      "Busca de pressão proprioceptiva",
    ],
    notes:
      "Sessão concluída com alcance de metas em reconhecimento de emoções básicas.",
  },
  "pac-003": {
    id: "pac-003",
    name: "Enzo Gabriel Santos",
    age: 9,
    gender: "M",
    birthDate: "03/03/2017",
    photoUrl:
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=400",
    category: "TEA Nível 1",
    clinicalStatus:
      "Desenvolvimento escolar ativo, rigidez cognitiva e transições moderadas",
    progress: 100,
    performanceScore: 10,
    lastSessionDate: "02/09, 15:28",
    status: "FINISHED",
    responsibleName: "Carlos Eduardo Santos (Pai)",
    responsiblePhone: "(21) 99123-4567",
    therapist: "Dr. Hermeson Dantas",
    communicationStyle: "Verbal com necessidade de pistas visuais de transição",
    sensorySensitivities: ["Sensibilidade olfativa"],
    notes: "Módulo de flexibilidade cognitiva completado com sucesso.",
  },
  "pac-004": {
    id: "pac-004",
    name: "Beatriz Lima Costa",
    age: 8,
    gender: "F",
    birthDate: "10/08/2018",
    photoUrl:
      "https://images.unsplash.com/photo-1517677129300-07b130802f46?auto=format&fit=crop&q=80&w=400",
    category: "TEA Nível 3",
    clinicalStatus:
      "Comunicação não-verbal com prancha digital, necessidade de suporte substancial",
    progress: 100,
    performanceScore: 23,
    lastSessionDate: "27/08, 16:59",
    status: "FINISHED",
    responsibleName: "Juliana Costa (Mãe)",
    responsiblePhone: "(31) 98456-7890",
    therapist: "Dra. Beatriz Albuquerque",
    communicationStyle:
      "Não-verbal; utiliza tablet adaptado e comunicação por símbolos",
    sensorySensitivities: [
      "Sobrecarga sensorial auditiva em locais cheios",
      "Gosta de balanço vestibular",
    ],
    notes: "Grande engajamento em atividades com retorno audiovisual lúdico.",
  },
  "pac-005": {
    id: "pac-005",
    name: "Mateus Henrique Pereira",
    age: 6,
    gender: "M",
    birthDate: "30/01/2020",
    photoUrl:
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&q=80&w=400",
    category: "TEA Nível 2",
    clinicalStatus:
      "Ecolalia funcional, processo de dessensibilização e contato visual",
    progress: 100,
    performanceScore: 20,
    lastSessionDate: "22/08, 16:16",
    status: "FINISHED",
    responsibleName: "Fernanda Pereira (Mãe)",
    responsiblePhone: "(41) 99876-5432",
    therapist: "Dr. Marcos Vinicius",
    communicationStyle: "Ecolalia com intenção comunicativa",
    sensorySensitivities: ["Hipersensibilidade ao toque leve"],
    notes: "Avanço no tempo de atenção compartilhada em jogos de pares.",
  },
  "pac-006": {
    id: "pac-006",
    name: "Alice Moreira Rodrigues",
    age: 11,
    gender: "F",
    birthDate: "19/04/2015",
    photoUrl:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400",
    category: "TEA Nível 1",
    clinicalStatus:
      "Habilidades socioemocionais em desenvolvimento e reciprocidade social",
    progress: 65,
    performanceScore: 78,
    lastSessionDate: "16/08, 11:30",
    status: "IN_PROGRESS",
    responsibleName: "Patrícia Rodrigues (Mãe)",
    responsiblePhone: "(51) 99345-6789",
    therapist: "Dr. Hermeson Dantas",
    communicationStyle: "Fluente, com foco em treino de reciprocidade social",
    sensorySensitivities: ["Nenhuma sensibilidade severa"],
    notes:
      "Boa capacidade de autorreflexão e interesse nas narrativas dos jogos.",
  },
  "pac-007": {
    id: "pac-007",
    name: "Pedro Arthur Mendes",
    age: 4,
    gender: "M",
    birthDate: "05/09/2022",
    photoUrl:
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400",
    category: "Em Avaliação",
    clinicalStatus:
      "Sinais precoces de atraso no desenvolvimento da fala e interação social",
    progress: 25,
    performanceScore: 40,
    lastSessionDate: "12/08, 09:15",
    status: "IN_PROGRESS",
    responsibleName: "Cláudia Mendes (Mãe)",
    responsiblePhone: "(71) 98877-6655",
    therapist: "Dra. Carolina Freitas",
    communicationStyle: "Gestual e balbucio com intenção comunicativa",
    sensorySensitivities: ["Fixação em estímulos visuais rotatórios"],
    notes:
      "Primeiras avaliações de resposta a estímulos lúdicos e contato visual.",
  },
};

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
