/**
 * ============================================================================
 * GAMES DOMAIN IN-MEMORY FIXTURES AND MOCKS
 * Therapeutic games with clinical manifests and strictly typed metrics (RN02).
 * ============================================================================
 */

import type {
  Jogo,
  ManifestoJogo,
  JogoFiltroDTO,
  FiltrosJogos,
} from "./jogos.types";

export const MOCK_JOGO_AVENTURA_CORES: Jogo = {
  id: "jogo-1",
  titulo: "Aventura das Cores",
  nome: "Aventura das Cores",
  versao: "1.2",
  descricaoClinica: "Estimula atenção compartilhada e reconhecimento facial através de interação cromática.",
  descricao: "Estimula atenção compartilhada e reconhecimento facial através de interação cromática.",
  objetivoTerapeutico: "Atenção Compartilhada",
  status_jogo: "ativo",
  bannerUrl:
    "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=200&auto=format&fit=crop&q=60",
  manifesto: {
    id_jogo: "aventura-das-cores",
    nome: "Aventura das Cores",
    versao: "1.2",
    descricaoClinica: "Estimula atenção compartilhada e reconhecimento facial",
    objetivoTerapeutico: "Atenção Compartilhada",
    objetivo_clinico: "Atenção Compartilhada",
    faixaEtaria: "3 a 8 anos",
    faixa_etaria: "3 a 8 anos",
    suportaVR: false,
    suporta_vr: false,
    metricasSuportadas: [
      {
        nome: "tempo_foco",
        id_metrica: "tempo_foco",
        tipo: "tempo",
        tipo_metrica: "numerica",
        unidade: "segundos",
        descricao: "Tempo sustentado na tela",
      },
      {
        nome: "acertos_sequencia",
        id_metrica: "acertos_sequencia",
        tipo: "acertos",
        tipo_metrica: "numerica",
        unidade: "quantidade",
        descricao: "Padrões identificados com sucesso",
      },
    ],
    metricas_suportadas: [
      {
        id_metrica: "tempo_foco",
        tipo_metrica: "numerica",
        unidade: "segundos",
        descricao: "Tempo sustentado na tela",
      },
      {
        id_metrica: "acertos_sequencia",
        tipo_metrica: "numerica",
        unidade: "quantidade",
        descricao: "Padrões identificados com sucesso",
      },
    ],
    parametros_dda: [
      {
        nome: "velocidade_troca_cores",
        tipo: "range",
        valor_padrao: 1.0,
        min: 0.5,
        max: 2.5,
        descricao: "Velocidade de alternância dos estímulos visuais",
      },
    ],
  },
};

export const MOCK_JOGO_FORMAS_CALMAS: Jogo = {
  id: "jogo-2",
  titulo: "Formas Calmas",
  nome: "Formas Calmas",
  versao: "2.0",
  descricaoClinica: "Foco em pareamento visual e regulação sensorial com feedback sonoro suave.",
  descricao: "Foco em pareamento visual e regulação sensorial com feedback sonoro suave.",
  objetivoTerapeutico: "Regulação Sensorial",
  status_jogo: "ativo",
  bannerUrl:
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&auto=format&fit=crop&q=60",
  manifesto: {
    id_jogo: "formas-calmas",
    nome: "Formas Calmas",
    versao: "2.0",
    descricaoClinica: "Foco em pareamento visual e regulação sensorial com feedback sonoro suave",
    objetivoTerapeutico: "Regulação Sensorial",
    objetivo_clinico: "Regulação Sensorial",
    faixaEtaria: "Livre",
    faixa_etaria: "Livre",
    suportaVR: true,
    suporta_vr: true,
    metricasSuportadas: [
      {
        nome: "ciclos_respiracao",
        id_metrica: "ciclos_respiracao",
        tipo: "frequencia",
        tipo_metrica: "numerica",
        unidade: "ciclos",
        descricao: "Ciclos de calma completados",
      },
    ],
    metricas_suportadas: [
      {
        id_metrica: "ciclos_respiracao",
        tipo_metrica: "numerica",
        unidade: "ciclos",
        descricao: "Ciclos de calma completados",
      },
    ],
    parametros_dda: [
      {
        nome: "volume_audio_feedback",
        tipo: "range",
        valor_padrao: 50,
        min: 10,
        max: 80,
        descricao: "Volume dos efeitos sonoros de relaxamento",
      },
    ],
  },
};

export const MOCK_JOGO_SOM_ANIMAIS: Jogo = {
  id: "jogo-3",
  titulo: "Som dos Animais",
  nome: "Som dos Animais",
  versao: "1.4",
  descricaoClinica: "Associação auditivo-visual para desenvolvimento de linguagem e imitação.",
  descricao: "Associação auditivo-visual para desenvolvimento de linguagem e imitação.",
  objetivoTerapeutico: "Integração Auditiva",
  status_jogo: "ativo",
  bannerUrl:
    "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=200&auto=format&fit=crop&q=60",
  manifesto: {
    id_jogo: "som-dos-animais",
    nome: "Som dos Animais",
    versao: "1.4",
    descricaoClinica: "Associação auditivo-visual para desenvolvimento de linguagem e imitação",
    objetivoTerapeutico: "Integração Auditiva",
    objetivo_clinico: "Integração Auditiva",
    faixaEtaria: "2 a 6 anos",
    faixa_etaria: "2 a 6 anos",
    suportaVR: false,
    suporta_vr: false,
    metricasSuportadas: [
      {
        nome: "repeticoes_audio",
        id_metrica: "repeticoes_audio",
        tipo: "toques",
        tipo_metrica: "numerica",
        unidade: "vezes",
        descricao: "Vezes que solicitou repetição sonora",
      },
    ],
    metricas_suportadas: [
      {
        id_metrica: "repeticoes_audio",
        tipo_metrica: "numerica",
        unidade: "vezes",
        descricao: "Vezes que solicitou repetição sonora",
      },
    ],
    parametros_dda: [
      {
        nome: "intervalo_repeticao_ms",
        tipo: "range",
        valor_padrao: 1500,
        min: 500,
        max: 3000,
        descricao: "Intervalo em milissegundos entre sons",
      },
    ],
  },
};

export const MOCK_JOGO_ILHA_SENTIDOS: Jogo = {
  id: "jogo-4",
  titulo: "Ilha dos Sentidos",
  nome: "Ilha dos Sentidos",
  versao: "2.1",
  descricaoClinica: "Exploração multissensorial com modulação dinâmica de estresse e suporte VR/Tablet.",
  descricao: "Exploração multissensorial com modulação dinâmica de estresse e suporte VR/Tablet.",
  objetivoTerapeutico: "Integração Sensorial",
  status_jogo: "ativo",
  bannerUrl:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&auto=format&fit=crop&q=60",
  manifesto: {
    id_jogo: "ilha-dos-sentidos",
    nome: "Ilha dos Sentidos",
    versao: "2.1",
    descricaoClinica: "Exploração multissensorial com modulação dinâmica de estresse",
    objetivoTerapeutico: "Integração Sensorial",
    objetivo_clinico: "Integração Sensorial",
    faixaEtaria: "4 a 12 anos",
    faixa_etaria: "4 a 12 anos",
    suportaVR: true,
    suporta_vr: true,
    metricasSuportadas: [
      {
        nome: "atencao_sustentada",
        id_metrica: "atencao_sustentada",
        tipo: "tempo",
        tipo_metrica: "numerica",
        unidade: "segundos",
        descricao: "Tempo contínuo interagindo com o mesmo elemento",
      },
      {
        nome: "frequencia_toques",
        id_metrica: "frequencia_toques",
        tipo: "frequencia",
        tipo_metrica: "numerica",
        unidade: "toques/minuto",
        descricao: "Cadência motora de interação na tela ou controle",
      },
      {
        nome: "nivel_estresse_estimado",
        id_metrica: "nivel_estresse_estimado",
        tipo: "movimento",
        tipo_metrica: "categorica",
        valores: ["baixo", "moderado", "elevado"],
        descricao: "Indicador comportamental derivado de movimentos bruscos",
      },
    ],
    metricas_suportadas: [
      {
        id_metrica: "atencao_sustentada",
        tipo_metrica: "numerica",
        unidade: "segundos",
        descricao: "Tempo contínuo interagindo com o mesmo elemento",
      },
      {
        id_metrica: "frequencia_toques",
        tipo_metrica: "numerica",
        unidade: "toques/minuto",
        descricao: "Cadência motora de interação",
      },
      {
        id_metrica: "nivel_estresse_estimado",
        tipo_metrica: "categorica",
        valores: ["baixo", "moderado", "elevado"],
        descricao: "Indicador comportamental",
      },
    ],
    parametros_dda: [
      {
        nome: "sensibilidade_audio",
        tipo: "range",
        valor_padrao: 40,
        min: 0,
        max: 100,
        descricao: "Sensibilidade a sons ambientais",
      },
      {
        nome: "velocidade_estimulos",
        tipo: "range",
        valor_padrao: 1.0,
        min: 0.2,
        max: 2.0,
        descricao: "Velocidade de animação do cenário",
      },
    ],
  },
};

export const MOCK_JOGO_LABIRINTO_EMOJIS: Jogo = {
  id: "jogo-5",
  titulo: "Labirinto dos Emojis",
  nome: "Labirinto dos Emojis",
  versao: "1.0",
  descricaoClinica: "Navegação espacial guiada por pistas de expressões faciais e regulação emocional.",
  descricao: "Navegação espacial guiada por pistas de expressões faciais e regulação emocional.",
  objetivoTerapeutico: "Reconhecimento Emocional",
  status_jogo: "ativo",
  bannerUrl:
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=60",
  manifesto: {
    id_jogo: "labirinto-dos-emojis",
    nome: "Labirinto dos Emojis",
    versao: "1.0",
    descricaoClinica: "Navegação espacial guiada por pistas de expressões faciais",
    objetivoTerapeutico: "Reconhecimento Emocional",
    objetivo_clinico: "Reconhecimento Emocional",
    faixaEtaria: "5 a 14 anos",
    faixa_etaria: "5 a 14 anos",
    suportaVR: false,
    suporta_vr: false,
    metricasSuportadas: [
      {
        nome: "tempo_reacao",
        id_metrica: "tempo_reacao",
        tipo: "tempo",
        tipo_metrica: "numerica",
        unidade: "milissegundos",
        descricao: "Tempo entre apresentação do emoji e tomada de decisão",
      },
      {
        nome: "taxa_acertos_emocao",
        id_metrica: "taxa_acertos_emocao",
        tipo: "acertos",
        tipo_metrica: "numerica",
        unidade: "%",
        descricao: "Porcentagem de emoções corretamente identificadas",
      },
    ],
    metricas_suportadas: [
      {
        id_metrica: "tempo_reacao",
        tipo_metrica: "numerica",
        unidade: "milissegundos",
        descricao: "Tempo de reação à expressão",
      },
      {
        id_metrica: "taxa_acertos_emocao",
        tipo_metrica: "numerica",
        unidade: "%",
        descricao: "Porcentagem de acertos na emoção",
      },
    ],
    parametros_dda: [
      {
        nome: "complexidade_labirinto",
        tipo: "range",
        valor_padrao: 1,
        min: 1,
        max: 5,
        descricao: "Número de bifurcações e desvios no labirinto",
      },
    ],
  },
};

export const FIXTURES_JOGOS: Jogo[] = [
  MOCK_JOGO_AVENTURA_CORES,
  MOCK_JOGO_FORMAS_CALMAS,
  MOCK_JOGO_SOM_ANIMAIS,
  MOCK_JOGO_ILHA_SENTIDOS,
  MOCK_JOGO_LABIRINTO_EMOJIS,
];

export const JOGOS_MOCK: Jogo[] = [...FIXTURES_JOGOS];

let jogosMockState: Jogo[] = JSON.parse(JSON.stringify(FIXTURES_JOGOS));

export function resetarJogosMock(): void {
  jogosMockState = JSON.parse(JSON.stringify(FIXTURES_JOGOS));
}

/**
 * Lists registered games applying optional filters (search, objective, pagination).
 */
export async function listarJogosMock(
  filtros?: JogoFiltroDTO | FiltrosJogos,
): Promise<Jogo[]> {
  let lista = [...jogosMockState];

  if (filtros?.busca) {
    const termo = filtros.busca.toLowerCase();
    lista = lista.filter(
      (j) =>
        j.titulo.toLowerCase().includes(termo) ||
        (j.nome && j.nome.toLowerCase().includes(termo)) ||
        j.descricaoClinica.toLowerCase().includes(termo) ||
        (j.descricao && j.descricao.toLowerCase().includes(termo)),
    );
  }

  if (filtros?.objetivo && filtros.objetivo !== "todos") {
    lista = lista.filter(
      (j) =>
        j.objetivoTerapeutico === filtros.objetivo ||
        j.manifesto.objetivoTerapeutico === filtros.objetivo ||
        j.manifesto.objetivo_clinico === filtros.objetivo,
    );
  }

  return JSON.parse(JSON.stringify(lista));
}

/**
 * Retrieves game by its unique identifier.
 */
export async function buscarJogoMockPorId(
  id: string,
): Promise<Jogo | null> {
  const encontrado = jogosMockState.find(
    (j) => j.id === id || j.manifesto.id_jogo === id,
  );
  return encontrado ? JSON.parse(JSON.stringify(encontrado)) : null;
}

/**
 * Retrieves technical and clinical manifest of a game.
 */
export async function obterManifestoJogoMock(
  id: string,
): Promise<ManifestoJogo | null> {
  const jogo = await buscarJogoMockPorId(id);
  return jogo ? JSON.parse(JSON.stringify(jogo.manifesto)) : null;
}
