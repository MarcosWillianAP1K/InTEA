import type { Jogo, FiltrosJogos } from "../types";

// Jogos oficiais da Sprint 7 e do Design
export const JOGOS_MOCK: Jogo[] = [
  {
    id: "jogo-1",
    titulo: "Aventura das Cores",
    versao: "1.2",
    descricaoClinica: "Estimula atenção compartilhada e reconhecimento facial",
    objetivoTerapeutico: "Atenção Compartilhada",
    statusInstalacao: "instalado",
    bannerUrl:
      "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=200&auto=format&fit=crop&q=60",
    manifesto: {
      nome: "Aventura das Cores",
      versao: "1.2",
      descricaoClinica:
        "Estimula atenção compartilhada e reconhecimento facial",
      objetivoTerapeutico: "Atenção Compartilhada",
      faixaEtaria: "3 a 8 anos",
      metricasSuportadas: [
        {
          nome: "tempo_foco",
          tipo: "tempo",
          descricao: "Tempo sustentado na tela",
        },
        {
          nome: "acertos_sequencia",
          tipo: "acertos",
          descricao: "Padrões identificados com sucesso",
        },
      ],
    },
  },
  {
    id: "jogo-2",
    titulo: "Formas Calmas",
    versao: "2.0",
    descricaoClinica:
      "Foco em pareamento visual e regulação sensorial com feedback sonoro suave",
    objetivoTerapeutico: "Regulação Sensorial",
    statusInstalacao: "instalado",
    bannerUrl:
      "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&auto=format&fit=crop&q=60",
    manifesto: {
      nome: "Formas Calmas",
      versao: "2.0",
      descricaoClinica:
        "Foco em pareamento visual e regulação sensorial com feedback sonoro suave",
      objetivoTerapeutico: "Regulação Sensorial",
      faixaEtaria: "Livre",
      metricasSuportadas: [
        {
          nome: "ciclos_respiracao",
          tipo: "frequencia",
          descricao: "Ciclos de calma completados",
        },
      ],
    },
  },
  {
    id: "jogo-3",
    titulo: "Som dos Animais",
    versao: "1.4",
    descricaoClinica:
      "Associação auditivo-visual para desenvolvimento de linguagem e imitação",
    objetivoTerapeutico: "Integração Auditiva",
    statusInstalacao: "instalado",
    bannerUrl:
      "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=200&auto=format&fit=crop&q=60",
    manifesto: {
      nome: "Som dos Animais",
      versao: "1.4",
      descricaoClinica:
        "Associação auditivo-visual para desenvolvimento de linguagem e imitação",
      objetivoTerapeutico: "Integração Auditiva",
      faixaEtaria: "2 a 6 anos",
      metricasSuportadas: [
        {
          nome: "repeticoes_audio",
          tipo: "toques",
          descricao: "Vezes que solicitou repetição sonora",
        },
      ],
    },
  },
];

export const jogosService = {
  listar: async (filtros?: FiltrosJogos): Promise<Jogo[]> => {
    try {
      // Quando o backend disponibilizar o endpoint /jogos, descomente a linha abaixo:
      // return await http.get<Jogo[]>("/jogos", { params: filtros as Record<string, string> });

      let lista = [...JOGOS_MOCK];

      if (filtros?.busca) {
        const termo = filtros.busca.toLowerCase();
        lista = lista.filter(
          (j) =>
            j.titulo.toLowerCase().includes(termo) ||
            j.descricaoClinica.toLowerCase().includes(termo),
        );
      }

      if (filtros?.objetivo && filtros.objetivo !== "todos") {
        lista = lista.filter((j) => j.objetivoTerapeutico === filtros.objetivo);
      }

      return lista;
    } catch {
      return JOGOS_MOCK;
    }
  },

  buscarPorId: async (id: string): Promise<Jogo | undefined> => {
    return JOGOS_MOCK.find((j) => j.id === id);
  },
};
