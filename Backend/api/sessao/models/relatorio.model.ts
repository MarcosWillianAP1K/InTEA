import { supabase } from '../../../core/supabase/supabase.client.js';

export interface MetricaAgregadaIA {
  id_metrica: string;
  valor_dominante: string | number;
  tendencia: 'estavel' | 'crescente' | 'decrescente' | string;
}

export interface ResumoSessaoIA {
  taxa_conclusao: number;
  intervencoes_dda: number;
}

/**
 * Contrato 4 oficial da IA (docs/ModelosDeContratos/relatorio.json)
 */
export interface RelatorioIAContrato {
  token_sessao: string;
  duracao_segundos: number;
  resumo: ResumoSessaoIA;
  analises_ia: string[];
  metricas_agregadas: MetricaAgregadaIA[];
}

export interface RelatorioSessao {
  id: string;
  sessao_id: string;
  terapeuta_id: string;
  paciente_id: string;
  conteudo: string | null;
  dados_ia_json: RelatorioIAContrato;
  soft_delete: boolean;
  created_at: string;
  updated_at: string;
}

export interface CriarRelatorioDTO {
  sessao_id: string;
  terapeuta_id: string;
  paciente_id: string;
  conteudo?: string | null;
  dados_ia_json: RelatorioIAContrato;
}

export class RelatorioSessaoModel {
  /**
   * Persiste o relatório e os dados consolidados da IA na tabela 'relatorio_sessao'.
   */
  static async criar(dto: CriarRelatorioDTO): Promise<RelatorioSessao | null> {
    try {
      const { data, error } = await supabase
        .from('relatorio_sessao')
        .insert({
          sessao_id: dto.sessao_id,
          terapeuta_id: dto.terapeuta_id,
          paciente_id: dto.paciente_id,
          conteudo: dto.conteudo || null,
          dados_ia_json: dto.dados_ia_json,
        })
        .select('*')
        .single();

      if (error || !data) {
        console.error('[RelatorioSessaoModel] Erro ao inserir relatorio_sessao:', error);
        return null;
      }

      return data as RelatorioSessao;
    } catch (err) {
      console.error('[RelatorioSessaoModel] Exceção ao criar relatório:', err);
      return null;
    }
  }

  /**
   * Busca o relatório de uma sessão ativa pelo sessao_id.
   */
  static async buscarPorSessaoId(sessaoId: string): Promise<RelatorioSessao | null> {
    try {
      const { data, error } = await supabase
        .from('relatorio_sessao')
        .select('*')
        .eq('sessao_id', sessaoId)
        .eq('soft_delete', false)
        .maybeSingle();

      if (error || !data) return null;
      return data as RelatorioSessao;
    } catch (err) {
      console.error('[RelatorioSessaoModel] Erro ao buscar relatório:', err);
      return null;
    }
  }
}
