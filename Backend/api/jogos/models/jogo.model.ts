import crypto from 'node:crypto';
import { supabase } from '../../../core/supabase/supabase.client.js';

export type StatusJogo = 'ativo' | 'desativado' | 'manutencao' | 'em_breve';

export interface MetricaManifesto {
  id_metrica: string;
  tipo_metrica: 'numerica' | 'categorica' | string;
  unidade?: string;
  valores?: string[];
}

export interface CriarJogoInput {
  nome: string;
  descricao: string;
  versao: string;
  status_jogo?: StatusJogo;
  manifesto_json: ManifestoJogo;
}

export interface AtualizarJogoInput {
  nome?: string;
  descricao?: string;
  versao?: string;
  status_jogo?: StatusJogo;
  manifesto_json?: ManifestoJogo;
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
  status_jogo?: StatusJogo;
  manifesto_json: ManifestoJogo;
  created_at?: string;
  updated_at?: string;
}

export interface JogoResumo {
  id: number | string;
  nome: string;
  descricao: string;
  versao: string;
  status_jogo: StatusJogo;
}

export interface FiltrosJogo {
  objetivo?: string;
  status?: StatusJogo | 'todos' | 'all';
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
      status_jogo: 'ativo',
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
      status_jogo: 'ativo',
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
      status_jogo: 'ativo',
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

  /**
   * Checks whether the Supabase client is configured and available in the current runtime environment.
   * Recognizes test mocks during Vitest runs and validates environment variables in production.
   *
   * @returns True if Supabase is properly configured or mocked, false otherwise.
   */
  private static isSupabaseAvailable(): boolean {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      const fromObj = supabase?.from as unknown as { _isMockFunction?: boolean; mock?: unknown };
      const isMock = typeof supabase?.from === 'function' && Boolean(fromObj?._isMockFunction || fromObj?.mock);
      return isMock;
    }
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
          .select('id, nome, descricao, versao, status_jogo, manifesto_json', { count: 'exact' });

        // Filtro por objetivo_clinico dentro do JSONB (RF19)
        if (filtros.objetivo && filtros.objetivo !== 'todos' && filtros.objetivo !== 'all') {
          query = query.eq('manifesto_json->>objetivo_clinico', filtros.objetivo);
        }

        // Filtro por status operacional do jogo
        if (filtros.status && filtros.status !== 'todos' && filtros.status !== 'all') {
          query = query.eq('status_jogo', filtros.status);
        }

        const { data, error, count } = await query.range(from, to);

        if (!error && data) {
          const total = count ?? data.length;
          return {
            data: data.map(j => ({
              id: j.id,
              nome: j.nome,
              descricao: j.descricao,
              versao: j.versao,
              status_jogo: (j.status_jogo as StatusJogo) ?? 'ativo'
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          };
        }
      } catch {
        console.warn('[JogoModel] Falha ao consultar Supabase, utilizando dados locais de fallback.');
      }
    }

    // Fallback local com suporte a filtro e paginação em memória
    let lista = this.fallbackJogos;

    if (filtros.objetivo && filtros.objetivo !== 'todos' && filtros.objetivo !== 'all') {
      lista = lista.filter(
        j => j.manifesto_json?.objetivo_clinico === filtros.objetivo
      );
    }

    if (filtros.status && filtros.status !== 'todos' && filtros.status !== 'all') {
      lista = lista.filter(
        j => (j.status_jogo ?? 'ativo') === filtros.status
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
        status_jogo: j.status_jogo ?? 'ativo'
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Retrieves full details of a specific therapeutic game including its manifest JSON.
   * Supports lookup by database UUID, numeric ID, or technical slug (id_jogo).
   *
   * @param id - Game identifier (numeric ID, UUID, or technical slug).
   * @returns The full game object if found, or undefined otherwise.
   */
  static async buscarPorId(id: number | string): Promise<Jogo | undefined> {
    const idStr = String(id).trim();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idStr);

    if (this.isSupabaseAvailable()) {
      try {
        let query = supabase.from('jogo').select('*');

        if (isUUID) {
          query = query.or(`id.eq.${idStr},manifesto_json->>id_jogo.eq.${idStr}`);
        } else {
          query = query.filter('manifesto_json->>id_jogo', 'eq', idStr);
        }

        const { data, error } = await query.maybeSingle();

        if (!error) {
          return data ? (data as Jogo) : undefined;
        }
      } catch {
        console.warn('[JogoModel] Falha ao consultar Supabase por ID, consultando dados locais.');
      }
    }

    return this.fallbackJogos.find(
      j => String(j.id) === idStr || j.manifesto_json?.id_jogo === idStr
    );
  }

  /**
   * Registers a new therapeutic game in the catalog.
   * Inserts into Supabase if available, otherwise appends to local in-memory fallback.
   *
   * @param input - Attributes for the new game including validated manifest JSON.
   * @returns The created game record.
   */
  static async criar(input: CriarJogoInput): Promise<Jogo> {
    if (this.isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase
          .from('jogo')
          .insert({
            nome: input.nome,
            descricao: input.descricao,
            versao: input.versao,
            status_jogo: input.status_jogo ?? 'ativo',
            manifesto_json: input.manifesto_json
          })
          .select('*')
          .single();

        if (!error && data) {
          return data as Jogo;
        }
        if (error) {
          console.error('[JogoModel] Erro ao inserir jogo no Supabase:', error);
          throw new Error(error.message);
        }
      } catch (err: unknown) {
        console.warn('[JogoModel] Falha ao persistir no Supabase, salvando em memória fallback:', err instanceof Error ? err.message : String(err));
      }
    }

    const novoJogo: Jogo = {
      id: crypto.randomUUID(),
      nome: input.nome,
      descricao: input.descricao,
      versao: input.versao,
      status_jogo: input.status_jogo ?? 'ativo',
      manifesto_json: input.manifesto_json,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.fallbackJogos.push(novoJogo);
    return novoJogo;
  }

  /**
   * Updates an existing therapeutic game in the catalog.
   *
   * @param id - Game identifier (numeric or string ID).
   * @param input - Attributes to update.
   * @returns The updated game record or null if not found.
   */
  static async atualizar(id: number | string, input: AtualizarJogoInput): Promise<Jogo | null> {
    if (this.isSupabaseAvailable()) {
      try {
        const payloadParaAtualizar: Record<string, unknown> = {
          updated_at: new Date().toISOString()
        };

        if (input.nome !== undefined) payloadParaAtualizar.nome = input.nome;
        if (input.descricao !== undefined) payloadParaAtualizar.descricao = input.descricao;
        if (input.versao !== undefined) payloadParaAtualizar.versao = input.versao;
        if (input.status_jogo !== undefined) payloadParaAtualizar.status_jogo = input.status_jogo;
        if (input.manifesto_json !== undefined) payloadParaAtualizar.manifesto_json = input.manifesto_json;

        const { data, error } = await supabase
          .from('jogo')
          .update(payloadParaAtualizar)
          .eq('id', id)
          .select('*')
          .maybeSingle();

        if (!error && data) {
          return data as Jogo;
        }
      } catch (err: unknown) {
        console.warn('[JogoModel] Falha ao atualizar no Supabase, atualizando localmente:', err instanceof Error ? err.message : String(err));
      }
    }

    const index = this.fallbackJogos.findIndex(j => String(j.id) === String(id));
    if (index === -1) {
      return null;
    }

    const jogoAtual = this.fallbackJogos[index];
    const jogoAtualizado: Jogo = {
      ...jogoAtual,
      nome: input.nome ?? jogoAtual.nome,
      descricao: input.descricao ?? jogoAtual.descricao,
      versao: input.versao ?? jogoAtual.versao,
      status_jogo: input.status_jogo ?? jogoAtual.status_jogo ?? 'ativo',
      manifesto_json: input.manifesto_json ?? jogoAtual.manifesto_json,
      updated_at: new Date().toISOString()
    };

    this.fallbackJogos[index] = jogoAtualizado;
    return jogoAtualizado;
  }

  /**
   * Performs a hard delete of a game from the catalog.
   *
   * @param id - Game identifier.
   * @returns Outcome of deletion.
   */
  static async excluir(id: number | string): Promise<{ sucesso: boolean; motivo?: string }> {
    if (this.isSupabaseAvailable()) {
      try {
        const { error } = await supabase
          .from('jogo')
          .delete()
          .eq('id', id);

        if (error) {
          if (error.code === '23503') {
            return {
              sucesso: false,
              motivo: 'Não é possível excluir o jogo pois existem sessões clínicas vinculadas a ele. Recomenda-se desativá-lo alterando seu status para "desativado".'
            };
          }
          return { sucesso: false, motivo: error.message };
        }
        return { sucesso: true };
      } catch (err: unknown) {
        return { sucesso: false, motivo: err instanceof Error ? err.message : String(err) };
      }
    }

    const index = this.fallbackJogos.findIndex(j => String(j.id) === String(id));
    if (index === -1) {
      return { sucesso: false, motivo: 'Jogo não encontrado' };
    }

    this.fallbackJogos.splice(index, 1);
    return { sucesso: true };
  }
}
