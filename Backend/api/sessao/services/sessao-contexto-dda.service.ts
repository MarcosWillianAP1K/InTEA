// ==============================================================================
// InTEA: Serviço de Contexto DDA Sugerido por IA Pré-Sessão (RF14, RF17, RN03)
// ==============================================================================
// REQUISITOS ATENDIDOS:
// - RF14: Injeção de Contexto DDA Pré-Sessão
// - RF17: Calibração Analítica Baseada no Histórico Clínico da IA (Contrato 4)
// - RN03: Contexto DDA Obrigatório Pré-Sessão
// - RNF02: Resiliência e Tratamento Seguro de Empty State
// ==============================================================================

import { supabase } from '../../../core/supabase/supabase.client.js';
import { validarUUID } from '../../../core/utils/validators.js';
import { PacienteServiceError } from '../../paciente/services/paciente.service.js';
import { RelatorioIAContrato } from '../models/relatorio.model.js';

export interface SugestaoIaContextoDDA {
  nivel_estresse_sugerido: number;
  gatilhos_recomendados: string[];
  justificativa_baseada_ultima_sessao: string;
}

export interface DadosAnamneseContexto {
  diagnostico_base: string | null;
  gatilhos_estaticos: string[];
  observacoes_gerais: string | null;
}

export interface ResumoUltimaSessaoContexto {
  sessao_id: string;
  jogo_id: string;
  jogo_nome: string;
  data_hora_fim: string;
  intervencoes_dda: number;
  taxa_conclusao: number;
}

export interface ContextoSugeridoResposta {
  paciente_id: string;
  dados_anamnese: DadosAnamneseContexto;
  ultima_sessao: ResumoUltimaSessaoContexto | null;
  sugestao_ia: SugestaoIaContextoDDA;
}

interface RelatorioRow {
  sessao_id: string;
  conteudo: string | null;
  dados_ia_json: RelatorioIAContrato;
  soft_delete: boolean;
}

interface SessaoComRelatorioContextoRow {
  id: string;
  jogo_id: string;
  status_sessao: string;
  modo_sessao: string;
  data_hora_fim: string | null;
  jogo?: { id: string; nome: string } | Array<{ id: string; nome: string }> | null;
  relatorio_sessao?: RelatorioRow | RelatorioRow[] | null;
}

export class SessaoContextoDdaService {
  /**
   * Retrieves suggested DDA context pre-calibrated by AI for a target patient.
   * Cross-references static anamnesis data with the patient's latest Contract 4 report.
   *
   * @param pacienteId - UUID of the target patient.
   * @returns Categorized suggested DDA context and clinical rationale.
   */
  static async obterContextoSugerido(pacienteId: string): Promise<ContextoSugeridoResposta> {
    if (!pacienteId || !validarUUID(pacienteId)) {
      throw new PacienteServiceError('Identificador do paciente inválido ou ausente.', 400);
    }

    // 1. Valida existência do paciente
    const { data: paciente, error: pacError } = await supabase
      .from('paciente')
      .select('id, nome, status_ativo')
      .eq('id', pacienteId)
      .maybeSingle();

    if (pacError) {
      throw new PacienteServiceError(`Erro ao consultar paciente: ${pacError.message}`, 500);
    }

    if (!paciente) {
      throw new PacienteServiceError('Paciente não encontrado.', 404);
    }

    // 2. Consulta dados de anamnese clínica (dados_clinicos)
    const dadosAnamnese = await this.buscarDadosAnamnese(pacienteId);

    // 3. Consulta otimizada ao último relatório de sessão clínico ativo (soft_delete = false)
    const ultimaSessaoInfo = await this.buscarUltimoRelatorioAtivo(pacienteId);

    // 4. Calibração analítica da IA (Contrato 4 -> Sugestão Pré-Sessão Contrato 2)
    const sugestaoIa = this.gerarSugestaoIA(dadosAnamnese, ultimaSessaoInfo);

    return {
      paciente_id: pacienteId,
      dados_anamnese: {
        diagnostico_base: dadosAnamnese.diagnostico_base,
        gatilhos_estaticos: dadosAnamnese.gatilhos_estaticos,
        observacoes_gerais: dadosAnamnese.observacoes_gerais,
      },
      ultima_sessao: ultimaSessaoInfo ? {
        sessao_id: ultimaSessaoInfo.sessao_id,
        jogo_id: ultimaSessaoInfo.jogo_id,
        jogo_nome: ultimaSessaoInfo.jogo_nome,
        data_hora_fim: ultimaSessaoInfo.data_hora_fim,
        intervencoes_dda: ultimaSessaoInfo.intervencoes_dda,
        taxa_conclusao: ultimaSessaoInfo.taxa_conclusao,
      } : null,
      sugestao_ia: sugestaoIa,
    };
  }

  /**
   * Retrieves anamnesis triggers and baseline diagnostic data.
   */
  private static async buscarDadosAnamnese(pacienteId: string): Promise<DadosAnamneseContexto> {
    try {
      const { data: clinicos, error } = await supabase
        .from('dados_clinicos')
        .select('diagnostico_base, gatilhos_sensoriais, observacoes_gerais')
        .eq('paciente_id', pacienteId)
        .maybeSingle();

      if (error || !clinicos) {
        return {
          diagnostico_base: null,
          gatilhos_estaticos: [],
          observacoes_gerais: null,
        };
      }

      let gatilhosEstaticos: string[] = [];
      if (Array.isArray(clinicos.gatilhos_sensoriais)) {
        gatilhosEstaticos = clinicos.gatilhos_sensoriais
          .map((g: unknown) => (typeof g === 'string' ? g : String((g as { nome?: string })?.nome || '')))
          .filter((g: string) => g.trim().length > 0);
      }

      return {
        diagnostico_base: clinicos.diagnostico_base || null,
        gatilhos_estaticos: gatilhosEstaticos,
        observacoes_gerais: clinicos.observacoes_gerais || null,
      };
    } catch {
      return {
        diagnostico_base: null,
        gatilhos_estaticos: [],
        observacoes_gerais: null,
      };
    }
  }

  /**
   * Retrieves the most recent active clinical session report (RN01, RN05).
   */
  private static async buscarUltimoRelatorioAtivo(
    pacienteId: string
  ): Promise<(ResumoUltimaSessaoContexto & { dados_ia_json: RelatorioIAContrato }) | null> {
    try {
      const { data, error } = await supabase
        .from('sessao')
        .select(`
          id,
          jogo_id,
          status_sessao,
          modo_sessao,
          data_hora_fim,
          jogo:jogo_id (id, nome),
          relatorio_sessao (
            sessao_id,
            conteudo,
            dados_ia_json,
            soft_delete
          )
        `)
        .eq('paciente_id', pacienteId)
        .eq('status_sessao', 'finalizada')
        .eq('modo_sessao', 'sessao_clinica')
        .not('data_hora_fim', 'is', null)
        .order('data_hora_fim', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      const row = data as unknown as SessaoComRelatorioContextoRow;
      const relatorios = Array.isArray(row.relatorio_sessao)
        ? row.relatorio_sessao
        : (row.relatorio_sessao ? [row.relatorio_sessao] : []);

      const relatorioAtivo = relatorios.find((r) => r.soft_delete !== true);
      if (!relatorioAtivo || !relatorioAtivo.dados_ia_json) {
        return null;
      }

      const jogoInfo = Array.isArray(row.jogo) ? row.jogo[0] : row.jogo;
      const jogoNome = jogoInfo?.nome || 'Jogo Terapêutico';
      const dadosIA = relatorioAtivo.dados_ia_json;

      const intervencoesDDA = typeof dadosIA.resumo?.intervencoes_dda === 'number'
        ? dadosIA.resumo.intervencoes_dda
        : 0;

      const taxaConclusao = typeof dadosIA.resumo?.taxa_conclusao === 'number'
        ? dadosIA.resumo.taxa_conclusao
        : 100;

      return {
        sessao_id: row.id,
        jogo_id: row.jogo_id,
        jogo_nome: jogoNome,
        data_hora_fim: row.data_hora_fim || new Date().toISOString(),
        intervencoes_dda: intervencoesDDA,
        taxa_conclusao: taxaConclusao,
        dados_ia_json: dadosIA,
      };
    } catch {
      return null;
    }
  }

  /**
   * Generates analytical AI DDA pre-session suggestions based on Contract 4 feedback.
   */
  private static gerarSugestaoIA(
    anamnese: DadosAnamneseContexto,
    ultimaSessao: (ResumoUltimaSessaoContexto & { dados_ia_json: RelatorioIAContrato }) | null
  ): SugestaoIaContextoDDA {
    // Cenário 1: Empty State (paciente novo sem sessões finalizadas prévias)
    if (!ultimaSessao) {
      return {
        nivel_estresse_sugerido: 1,
        gatilhos_recomendados: [...anamnese.gatilhos_estaticos],
        justificativa_baseada_ultima_sessao:
          'Primeiro atendimento clínico do paciente. Sugestão calibrada com base nos gatilhos basais da anamnese clínica.',
      };
    }

    // Cenário 2: Paciente com sessão prévia consolidada
    const dadosIA = ultimaSessao.dados_ia_json;
    const intervencoesDDA = ultimaSessao.intervencoes_dda;
    const taxaConclusao = ultimaSessao.taxa_conclusao;
    const analisesTexto = Array.isArray(dadosIA.analises_ia)
      ? dadosIA.analises_ia.join(' ').toLowerCase()
      : '';

    // Avaliação de sobrecargas sensoriais específicas nas análises e métricas da IA
    const sobrecargaSonora =
      analisesTexto.includes('som') ||
      analisesTexto.includes('ruído') ||
      analisesTexto.includes('auditivo') ||
      analisesTexto.includes('tolerância sonora');

    const sobrecargaVisual =
      analisesTexto.includes('luz') ||
      analisesTexto.includes('brilho') ||
      analisesTexto.includes('visual') ||
      analisesTexto.includes('estrobosc') ||
      analisesTexto.includes('fixação visual');

    const altaIntervencaoDDA = intervencoesDDA >= 3 || taxaConclusao < 70;
    const moderadaIntervencaoDDA = intervencoesDDA >= 2 || taxaConclusao < 85;

    // Combina gatilhos basais com recomendações dinâmicas
    const conjuntoGatilhos = new Set<string>(anamnese.gatilhos_estaticos);

    if (sobrecargaSonora || altaIntervencaoDDA) {
      conjuntoGatilhos.add('Sons Altos ou Repentinos');
    }

    if (sobrecargaVisual || altaIntervencaoDDA) {
      conjuntoGatilhos.add('Luzes Fortes ou Piscantes');
    }

    if (taxaConclusao < 60) {
      conjuntoGatilhos.add('Pressão de Tempo / Contagem Regressiva');
    }

    const gatilhosRecomendados = Array.from(conjuntoGatilhos);

    // Determinação do nível de estresse sugerido (1 = calmo/leve, 2 = moderado, 3 = alerta/alto)
    let nivelEstresseSugerido = 1;
    let justificativa: string;

    if (altaIntervencaoDDA) {
      nivelEstresseSugerido = 3;
      justificativa = `A última sessão no jogo '${ultimaSessao.jogo_nome}' registrou alta taxa de intervenções do motor DDA (${intervencoesDDA} intervenções) e ${taxaConclusao}% de conclusão. Recomenda-se iniciar com estresse pré-calibrado em nível 3 e atenuação de estímulos sonoros/visuais para prevenir sobrecarga sensorial.`;
    } else if (moderadaIntervencaoDDA) {
      nivelEstresseSugerido = 2;
      justificativa = `A última sessão no jogo '${ultimaSessao.jogo_nome}' apresentou modulação adaptativa moderada (${intervencoesDDA} intervenções de DDA). Sugere-se nível de estresse inicial 2 para ambientação progressiva.`;
    } else {
      nivelEstresseSugerido = 1;
      justificativa = `Paciente apresentou excelente estabilidade e engajamento na sessão anterior (${taxaConclusao}% de conclusão e poucas intervenções de DDA). Sugere-se manutenção dos parâmetros basais com estresse inicial 1.`;
    }

    return {
      nivel_estresse_sugerido: nivelEstresseSugerido,
      gatilhos_recomendados: gatilhosRecomendados,
      justificativa_baseada_ultima_sessao: justificativa,
    };
  }
}
