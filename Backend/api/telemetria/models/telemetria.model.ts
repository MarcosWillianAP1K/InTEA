import { supabase } from '../../../core/supabase/supabase.client.js';

/**
 * Interface canônica de Telemetria Clínica (Contrato 3 - telemetria.json)
 * sessao_id e data_hora são estritamente obrigatórios para garantir vínculo e rastreabilidade temporal.
 */
export interface TelemetriaEvento {
  id?: string;
  sessao_id: string;
  tipo_evento: string;
  dados: {
    id_metrica: string;
    valor: unknown;
  };
  data_hora: string;
}

export class TelemetriaModel {
  /**
   * Persiste um único evento de telemetria clínica vinculado obrigatoriamente a uma sessão
   */
  static async registrarEvento(evento: TelemetriaEvento): Promise<TelemetriaEvento | null> {
    try {
      if (!evento.sessao_id || !evento.data_hora) {
        console.error('[TelemetriaModel] sessao_id e data_hora são obrigatórios para registrar telemetria');
        return null;
      }

      const { data, error } = await supabase
        .from('telemetria_evento')
        .insert({
          sessao_id: evento.sessao_id,
          tipo_evento: evento.tipo_evento,
          dados: evento.dados,
          data_hora: evento.data_hora,
        })
        .select('*')
        .single();

      if (error || !data) {
        console.error('[TelemetriaModel] Erro ao registrar telemetria:', error);
        return null;
      }

      return data as TelemetriaEvento;
    } catch (err) {
      console.error('[TelemetriaModel] Exceção ao registrar telemetria:', err);
      return null;
    }
  }

  /**
   * Persiste um lote (batch insert) de eventos de telemetria para alta vazão do WebSocket
   */
  static async registrarLote(eventos: TelemetriaEvento[]): Promise<TelemetriaEvento[] | null> {
    try {
      if (!eventos || eventos.length === 0) return [];

      const registrosValidos = eventos.filter((e) => e.sessao_id && e.data_hora);
      if (registrosValidos.length !== eventos.length) {
        console.error('[TelemetriaModel] Lote rejeitado: todos os eventos devem possuir sessao_id e data_hora');
        return null;
      }

      const { data, error } = await supabase
        .from('telemetria_evento')
        .insert(registrosValidos.map((e) => ({
          sessao_id: e.sessao_id,
          tipo_evento: e.tipo_evento,
          dados: e.dados,
          data_hora: e.data_hora,
        })))
        .select('*');

      if (error || !data) {
        console.error('[TelemetriaModel] Erro ao registrar lote de telemetria:', error);
        return null;
      }

      return data as TelemetriaEvento[];
    } catch (err) {
      console.error('[TelemetriaModel] Exceção ao registrar lote de telemetria:', err);
      return null;
    }
  }

  /**
   * Busca todo o histórico de eventos de uma sessão ordenado cronologicamente, com filtro opcional por métrica e paginação
   */
  static async buscarPorSessaoId(
    sessaoId: string,
    idMetrica?: string,
    limite?: number,
    pagina: number = 1
  ): Promise<TelemetriaEvento[]> {
    try {
      if (!sessaoId) return [];

      let query = supabase
        .from('telemetria_evento')
        .select('*')
        .eq('sessao_id', sessaoId)
        .order('data_hora', { ascending: true });

      if (idMetrica) {
        query = query.filter('dados->>id_metrica', 'eq', idMetrica);
      }

      if (limite && limite > 0) {
        const paginaNormalizada = Math.max(1, pagina);
        const offset = (paginaNormalizada - 1) * limite;
        query = query.range(offset, offset + limite - 1);
      }

      const { data, error } = await query;

      if (error || !data) return [];
      return data as TelemetriaEvento[];
    } catch (err) {
      console.error('[TelemetriaModel] Erro ao buscar telemetria da sessão:', err);
      return [];
    }
  }
}