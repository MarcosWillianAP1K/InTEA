import { supabase } from '../../../core/supabase/supabase.client.js';

export interface MetricaManifesto {
  id_metrica: string;
  tipo_metrica: 'numerica' | 'categorica' | string;
  unidade?: string;
  valores?: string[];
}

export interface ManifestoJogo {
  id_jogo: string;
  nome: string;
  versao: string;
  objetivo_clinico?: string;
  metricas_suportadas: MetricaManifesto[];
}

export interface Jogo {
  id: number | string;
  nome: string;
  descricao: string;
  versao: string;
  status_instalacao: 'instalado' | 'desatualizado' | 'nao_instalado' | 'em_execucao' | string;
  manifesto_json: ManifestoJogo;
  created_at?: string;
  updated_at?: string;
}

export interface JogoResumo {
  id: number | string;
  nome: string;
  descricao: string;
  versao: string;
  status_instalacao: string;
}

export interface FiltrosJogo {
  objetivo?: string;
  page?: number;
  limit?: number;
}

export interface ResultadoPaginado<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class JogoModel {
  // Base de dados em memória para fallback/testes/desenvolvimento local
  private static fallbackJogos: Jogo[] = [
    {
      id: 1,
      nome: 'Aventura das Cores',
      descricao: 'Estimula atenção compartilhada e reconhecimento facial através de interação cromática.',
      versao: '1.2.0',
      status_instalacao: 'instalado',
      manifesto_json: {
        id_jogo: 'aventura-das-cores',
        nome: 'Aventura das Cores',
        versao: '1.2.0',
        objetivo_clinico: 'foco_atencional',
        metricas_suportadas: [
          {
            id_metrica: 'tempo_resposta',
            tipo_metrica: 'numerica',
            unidade: 'segundos'
          },
          {
            id_metrica: 'nivel_frustracao',
            tipo_metrica: 'categorica',
            valores: ['baixo', 'medio', 'alto']
          }
        ]
      }
    },
    {
      id: 2,
      nome: 'Formas Calmas',
      descricao: 'Foco em pareamento visual e regulação sensorial em ambiente desacelerado.',
      versao: '2.0.0',
      status_instalacao: 'instalado',
      manifesto_json: {
        id_jogo: 'formas-calmas',
        nome: 'Formas Calmas',
        versao: '2.0.0',
        objetivo_clinico: 'regulacao_emocional',
        metricas_suportadas: [
          {
            id_metrica: 'tempo_fixacao',
            tipo_metrica: 'numerica',
            unidade: 'segundos'
          },
          {
            id_metrica: 'estabilidade_toque',
            tipo_metrica: 'categorica',
            valores: ['estavel', 'instavel']
          }
        ]
      }
    },
    {
      id: 3,
      nome: 'Som dos Animais',
      descricao: 'Associação auditivo-visual para desenvolvimento de linguagem e reconhecimento sonoro.',
      versao: '1.0.0',
      status_instalacao: 'instalado',
      manifesto_json: {
        id_jogo: 'som-dos-animais',
        nome: 'Som dos Animais',
        versao: '1.0.0',
        objetivo_clinico: 'desenvolvimento_linguagem',
        metricas_suportadas: [
          {
            id_metrica: 'precisao_auditiva',
            tipo_metrica: 'numerica',
            unidade: 'percentual'
          },
          {
            id_metrica: 'tolerancia_sonora',
            tipo_metrica: 'categorica',
            valores: ['baixa', 'moderada', 'boa']
          }
        ]
      }
    }
  ];

  private static isSupabaseAvailable(): boolean {
    const url = process.env.SUPABASE_URL;
    return Boolean(url && !url.includes('placeholder') && !url.includes('your-project'));
  }

  /**
   * Lists available games with optional filtering by clinical objective and pagination (RF19).
   * Queries Supabase if configured, otherwise falls back to local in-memory catalog.
   *
   * @param filtros - Search, filter, and pagination options (objetivo, page, limit).
   * @returns Paginated result containing game summary items and pagination metadata.
   */
  static async listar(filtros: FiltrosJogo = {}): Promise<ResultadoPaginado<JogoResumo>> {
    const page = Math.max(1, filtros.page ?? 1);
    const limit = Math.min(100, Math.max(1, filtros.limit ?? 10));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    if (this.isSupabaseAvailable()) {
      try {
        let query = supabase
          .from('jogo')
          .select('id, nome, descricao, versao, status_instalacao, manifesto_json', { count: 'exact' });

        // Filtro por objetivo_clinico dentro do JSONB (RF19)
        if (filtros.objetivo) {
          query = query.eq('manifesto_json->>objetivo_clinico', filtros.objetivo);
        }

        const { data, error, count } = await query.range(from, to);

        if (!error && data && data.length > 0) {
          const total = count ?? data.length;
          return {
            data: data.map(j => ({
              id: j.id,
              nome: j.nome,
              descricao: j.descricao,
              versao: j.versao,
              status_instalacao: j.status_instalacao
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          };
        }
      } catch (err) {
        console.warn('[JogoModel] Falha ao consultar Supabase, utilizando dados locais de fallback.');
      }
    }

    // Fallback local com suporte a filtro e paginação em memória
    let lista = this.fallbackJogos;

    if (filtros.objetivo) {
      lista = lista.filter(
        j => j.manifesto_json?.objetivo_clinico === filtros.objetivo
      );
    }

    const total = lista.length;
    const paginada = lista.slice(from, from + limit);

    return {
      data: paginada.map(j => ({
        id: j.id,
        nome: j.nome,
        descricao: j.descricao,
        versao: j.versao,
        status_instalacao: j.status_instalacao
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Retrieves full details of a specific therapeutic game including its manifest JSON.
   *
   * @param id - Game identifier (numeric or string ID).
   * @returns The full game object if found, or undefined otherwise.
   */
  static async buscarPorId(id: number | string): Promise<Jogo | undefined> {
    if (this.isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase
          .from('jogo')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          return data as Jogo;
        }
      } catch (err) {
        console.warn('[JogoModel] Falha ao consultar Supabase por ID, consultando dados locais.');
      }
    }

    return this.fallbackJogos.find(j => String(j.id) === String(id));
  }
}
