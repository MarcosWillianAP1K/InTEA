// ==============================================================================
// InTEA: Serviço de Validação, Injeção e Sugestão de Contexto Clínico Pré-Sessão DDA
// ==============================================================================
// Conformidade: RF12, RF14, RF17, RF21, RN01, RN03, RN04, RNF02
// Contrato 2: docs/ModelosDeContratos/contextoPreSessao.json
// Padrão Arquitetural: TypeScript Estrito (sem 'any'), Métodos em camelCase
// ==============================================================================

import { supabase } from '../../../core/supabase/supabase.client.js';
import { validarUUID } from '../../../core/utils/validators.js';
import { PacienteServiceError } from '../../paciente/services/paciente.service.js';
import { RelatorioIAContrato } from '../models/relatorio.model.js';

export type NivelEstresseCanonico = 'baixo' | 'medio' | 'alto';

export interface ContextoPacienteContrato2 {
  nivel_estresse_inicial: NivelEstresseCanonico;
  gatilhos_sensoriais_evitar: string[];
  objetivo_clinico: string;
}

export interface PacoteContrato2 {
  token_sessao: string;
  id_terapeuta: string;
  id_paciente: string | null;
  contexto_paciente: ContextoPacienteContrato2;
}

export interface EntradaContextoDDA {
  nivel_estresse_inicial?: unknown;
  estresse_inicial?: unknown;
  gatilhos_sensoriais_evitar?: unknown;
  gatilhos_a_evitar?: unknown;
  objetivo_clinico?: unknown;
  usar_fallback_padrao?: boolean;
  [key: string]: unknown;
}

export interface SugestaoContextoDTO {
  nivel_estresse_sugerido: NivelEstresseCanonico;
  gatilhos_sensoriais_cadastrados: string[];
  objetivo_clinico_sugerido: string;
  origem: 'anamnese_padrao' | 'ultima_sessao';
}

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
  nivel_estresse_sugerido?: NivelEstresseCanonico;
  gatilhos_sensoriais_cadastrados?: string[];
  objetivo_clinico_sugerido?: string;
  origem?: 'anamnese_padrao' | 'ultima_sessao';
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
   * Checks whether the Supabase client is available for real querying or running in a mocked test environment.
   * Testing Guard: Prevents DNS timeout lockups when running in automated test environments with placeholder URLs.
   */
  private static deveConsultarSupabase(): boolean {
    const isMock = typeof (supabase.from as unknown as { mock?: unknown })?.mock !== 'undefined';
    if (isMock) return true;
    const url = process.env.SUPABASE_URL || '';
    if (!url || url.includes('placeholder')) return false;
    return true;
  }

  /**
   * Converts and deterministically normalizes input stress scale values to canonical Contract 2 strings.
   * Mapping Scale (RN03): Maps 1-2 to 'baixo', 3 to 'medio', and 4-5 to 'alto', also accepting canonical string literals.
   */
  static validarENormalizarEstresse(valor: unknown): NivelEstresseCanonico {
    if (valor === undefined || valor === null || valor === '') {
      throw new Error("Nível de estresse inicial é obrigatório. Utilize escala numérica de 1 a 5 ou 'baixo', 'medio', 'alto'.");
    }

    if (typeof valor === 'number') {
      if (valor >= 1 && valor <= 2) return 'baixo';
      if (valor === 3) return 'medio';
      if (valor >= 4 && valor <= 5) return 'alto';
      throw new Error(`Escala numérica de estresse inválida (${valor}). O domínio permitido é de 1 a 5.`);
    }

    if (typeof valor === 'string') {
      const normalizado = valor.trim().toLowerCase();
      if (normalizado === '1' || normalizado === '2' || normalizado === 'baixo') return 'baixo';
      if (normalizado === '3' || normalizado === 'medio' || normalizado === 'médio') return 'medio';
      if (normalizado === '4' || normalizado === '5' || normalizado === 'alto') return 'alto';

      const numConvertido = Number(normalizado);
      if (!Number.isNaN(numConvertido)) {
        if (numConvertido >= 1 && numConvertido <= 2) return 'baixo';
        if (numConvertido === 3) return 'medio';
        if (numConvertido >= 4 && numConvertido <= 5) return 'alto';
      }
    }

    throw new Error("Nível de estresse inicial inválido. Utilize escala numérica de 1 a 5 ou 'baixo', 'medio', 'alto'.");
  }

  /**
   * Validates and sanitizes the list of sensory triggers to avoid during gameplay.
   */
  static validarGatilhos(gatilhos: unknown): string[] {
    if (!gatilhos) return [];

    if (Array.isArray(gatilhos)) {
      const unicos = new Set<string>();
      for (const item of gatilhos) {
        if (typeof item === 'string') {
          const limpo = item.trim();
          if (limpo) unicos.add(limpo);
        } else if (item && typeof item === 'object') {
          const nomeObj = (item as Record<string, unknown>).nome || (item as Record<string, unknown>).gatilho;
          if (typeof nomeObj === 'string' && nomeObj.trim()) {
            unicos.add(nomeObj.trim());
          }
        }
      }
      return Array.from(unicos);
    }

    if (typeof gatilhos === 'string') {
      const limpo = gatilhos.trim();
      return limpo ? [limpo] : [];
    }

    return [];
  }

  /**
   * Retrieves sensory triggers registered in the patient's electronic health record.
   */
  static async obterGatilhosPaciente(pacienteId: string): Promise<string[]> {
    if (!pacienteId) return [];
    if (!SessaoContextoDdaService.deveConsultarSupabase()) return [];

    const conjuntoGatilhos = new Set<string>();

    try {
      const { data: dadosClinicos } = await supabase
        .from('dados_clinicos')
        .select('gatilhos_sensoriais')
        .eq('paciente_id', pacienteId)
        .maybeSingle();

      if (dadosClinicos?.gatilhos_sensoriais) {
        const listaGatilhos = SessaoContextoDdaService.validarGatilhos(dadosClinicos.gatilhos_sensoriais);
        listaGatilhos.forEach(g => conjuntoGatilhos.add(g));
      }

      const { data: vinculosGatilho } = await supabase
        .from('paciente_gatilho')
        .select('gatilhos(nome)')
        .eq('paciente_id', pacienteId);

      if (vinculosGatilho && Array.isArray(vinculosGatilho)) {
        for (const item of vinculosGatilho) {
          const gatilhoRel = item.gatilhos as unknown as { nome?: string } | { nome?: string }[] | null;
          if (gatilhoRel) {
            if (Array.isArray(gatilhoRel)) {
              gatilhoRel.forEach(g => {
                if (g?.nome?.trim()) conjuntoGatilhos.add(g.nome.trim());
              });
            } else if (gatilhoRel.nome?.trim()) {
              conjuntoGatilhos.add(gatilhoRel.nome.trim());
            }
          }
        }
      }
    } catch (err) {
      console.error('[SessaoContextoDdaService] Erro ao consultar gatilhos do paciente:', err);
    }

    return Array.from(conjuntoGatilhos);
  }

  /**
   * Queries the default clinical objective declared in the selected game's manifest.
   */
  static async obterObjetivoPadraoJogo(jogoId: string): Promise<string> {
    if (!jogoId) return 'foco_atencional';
    if (!SessaoContextoDdaService.deveConsultarSupabase()) return 'foco_atencional';

    try {
      const { data: jogo } = await supabase
        .from('jogo')
        .select('manifesto_json')
        .eq('id', jogoId)
        .maybeSingle();

      const manifesto = jogo?.manifesto_json as Record<string, unknown> | undefined;
      const objetivo = manifesto?.objetivo_clinico || manifesto?.objetivos_clinicos;

      if (typeof objetivo === 'string' && objetivo.trim()) {
        return objetivo.trim();
      }
      if (Array.isArray(objetivo) && objetivo.length > 0 && typeof objetivo[0] === 'string') {
        return objetivo[0].trim();
      }
    } catch (err) {
      console.error('[SessaoContextoDdaService] Erro ao consultar objetivo do jogo:', err);
    }

    return 'foco_atencional';
  }

  /**
   * Implements the Parametrized Clinical Fallback defined in the Figure 5 activity diagram.
   */
  static async aplicarFallbackClinico(
    pacienteId: string,
    jogoId: string
  ): Promise<ContextoPacienteContrato2> {
    const [gatilhos, objetivo] = await Promise.all([
      SessaoContextoDdaService.obterGatilhosPaciente(pacienteId),
      SessaoContextoDdaService.obterObjetivoPadraoJogo(jogoId),
    ]);

    return {
      nivel_estresse_inicial: 'baixo',
      gatilhos_sensoriais_evitar: gatilhos,
      objetivo_clinico: objetivo,
    };
  }

  /**
   * Validates, normalizes, and injects pre-session DDA clinical context in strict compliance with Contract 2 and RN01/RN03.
   */
  static async validarEFormatarContexto(
    entrada: EntradaContextoDDA | undefined,
    pacienteId: string | null,
    jogoId: string,
    modoSessao: string
  ): Promise<ContextoPacienteContrato2 | null> {
    if (modoSessao === 'modo_livre') {
      const tentouEnviarContexto = entrada && (
        entrada.nivel_estresse_inicial !== undefined ||
        entrada.estresse_inicial !== undefined ||
        (Array.isArray(entrada.gatilhos_sensoriais_evitar) && entrada.gatilhos_sensoriais_evitar.length > 0) ||
        (Array.isArray(entrada.gatilhos_a_evitar) && entrada.gatilhos_a_evitar.length > 0) ||
        (typeof entrada.objetivo_clinico === 'string' && entrada.objetivo_clinico.trim().length > 0)
      );

      if (tentouEnviarContexto) {
        throw new Error('Partidas em modo livre não admitem calibração de contexto clínico DDA de paciente (RN01).');
      }

      return null;
    }

    if (!pacienteId) {
      throw new Error('O identificador do paciente (paciente_id) é obrigatório para sessões clínicas com DDA.');
    }

    const desejaFallback = entrada?.usar_fallback_padrao === true;
    const camposVazios = !entrada || (
      entrada.nivel_estresse_inicial === undefined &&
      entrada.estresse_inicial === undefined &&
      !entrada.objetivo_clinico &&
      (!entrada.gatilhos_sensoriais_evitar || (Array.isArray(entrada.gatilhos_sensoriais_evitar) && entrada.gatilhos_sensoriais_evitar.length === 0))
    );

    if (desejaFallback || camposVazios) {
      return SessaoContextoDdaService.aplicarFallbackClinico(pacienteId, jogoId);
    }

    const valorEstresse = entrada.nivel_estresse_inicial ?? entrada.estresse_inicial;
    const nivel_estresse_inicial = SessaoContextoDdaService.validarENormalizarEstresse(valorEstresse);

    const valorGatilhos = entrada.gatilhos_sensoriais_evitar ?? entrada.gatilhos_a_evitar;
    let gatilhos_sensoriais_evitar = SessaoContextoDdaService.validarGatilhos(valorGatilhos);

    if (gatilhos_sensoriais_evitar.length === 0) {
      gatilhos_sensoriais_evitar = await SessaoContextoDdaService.obterGatilhosPaciente(pacienteId);
    }

    let objetivo_clinico = typeof entrada.objetivo_clinico === 'string'
      ? entrada.objetivo_clinico.trim()
      : '';

    if (!objetivo_clinico) {
      objetivo_clinico = await SessaoContextoDdaService.obterObjetivoPadraoJogo(jogoId);
    }

    return {
      nivel_estresse_inicial,
      gatilhos_sensoriais_evitar,
      objetivo_clinico,
    };
  }

  /**
   * Assembles the structured Contract 2 payload for dispatch to the game client.
   */
  static montarPacoteContrato2(
    tokenSessao: string,
    terapeutaId: string,
    pacienteId: string | null,
    contextoPaciente: ContextoPacienteContrato2 | null
  ): PacoteContrato2 | null {
    if (!contextoPaciente) return null;

    return {
      token_sessao: tokenSessao,
      id_terapeuta: terapeutaId,
      id_paciente: pacienteId,
      contexto_paciente: contextoPaciente,
    };
  }

  /**
   * Busca dados de anamnese estática cadastrados no prontuário.
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
      } else if (typeof clinicos.gatilhos_sensoriais === 'string') {
        gatilhosEstaticos = [clinicos.gatilhos_sensoriais.trim()].filter(Boolean);
      }

      return {
        diagnostico_base: (clinicos.diagnostico_base as string) || null,
        gatilhos_estaticos: gatilhosEstaticos,
        observacoes_gerais: (clinicos.observacoes_gerais as string) || null,
      };
    } catch {
      return {
        diagnostico_base: null,
        gatilhos_estaticos: [],
        observacoes_gerais: null,
      };
    }
  }

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

  /**
   * Retrieves suggested DDA context pre-calibrated by AI for a target patient.
   * Cross-references static anamnesis data with the patient's latest Contract 4 report.
   */
  static async obterContextoSugerido(pacienteId: string): Promise<ContextoSugeridoResposta> {
    if (!pacienteId || !validarUUID(pacienteId)) {
      throw new PacienteServiceError('Identificador do paciente inválido ou ausente.', 400);
    }

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

    const dadosAnamnese = await this.buscarDadosAnamnese(pacienteId);
    const ultimaSessaoInfo = await this.buscarUltimoRelatorioAtivo(pacienteId);
    const sugestaoIa = this.gerarSugestaoIA(dadosAnamnese, ultimaSessaoInfo);

    const estresseCanonico: NivelEstresseCanonico =
      sugestaoIa.nivel_estresse_sugerido === 3
        ? 'alto'
        : sugestaoIa.nivel_estresse_sugerido === 2
          ? 'medio'
          : 'baixo';

    return {
      paciente_id: pacienteId,
      dados_anamnese: dadosAnamnese,
      ultima_sessao: ultimaSessaoInfo,
      sugestao_ia: sugestaoIa,
      nivel_estresse_sugerido: estresseCanonico,
      gatilhos_sensoriais_cadastrados: sugestaoIa.gatilhos_recomendados,
      objetivo_clinico_sugerido: 'foco_atencional',
      origem: ultimaSessaoInfo ? 'ultima_sessao' : 'anamnese_padrao',
    };
  }
}
