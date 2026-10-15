// Tipagem para os dados do jogo
export type TipoMetrica =
  | "tempo"
  | "acertos"
  | "toques"
  | "movimento"
  | "frequencia";

export interface MetricaSuportada {
  nome: string;
  tipo: TipoMetrica;
  descricao: string;
}

// Estrutura do manifesto do jogo
export interface ManifestoJogo {
  nome: string;
  versao: string;
  descricaoClinica: string;
  objetivoTerapeutico: string;
  faixaEtaria: string;
  metricasSuportadas: MetricaSuportada[];
  suportaVR?: boolean;
}

// Modelo completo do Jogo usado na interface
export interface Jogo {
  id: string;
  titulo: string;
  versao: string;
  descricaoClinica: string;
  objetivoTerapeutico: string;
  bannerUrl?: string;
  manifesto: ManifestoJogo;
}

// Filtros para a barra de pesquisa/seleção
export interface FiltrosJogos {
  objetivo?: string;
  busca?: string;
}
