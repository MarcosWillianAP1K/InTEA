// ==============================================================================
// InTEA: Serviço de Validação e Injeção de Contexto Clínico Pré-Sessão DDA
// ==============================================================================
// Conformidade: RF12, RF17, RF21, RN01, RN03, RN04, RNF02
// Contrato 2: docs/ModelosDeContratos/contextoPreSessao.json
// Padrão Arquitetural: TypeScript Estrito (sem 'any'), Métodos em camelCase
// ==============================================================================

import { supabase } from '../../../core/supabase/supabase.client.js';

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

export class SessaoContextoDdaService {
  /**
   * Checks whether the Supabase client is available for real querying or running in a mocked test environment.
   * Testing Guard: Prevents DNS timeout lockups when running in automated test environments with placeholder URLs.
   *
   * @returns True if Supabase client can be queried, false otherwise
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
   *
   * @param valor - Numeric or textual stress rating input
   * @returns Canonical stress level ('baixo' | 'medio' | 'alto')
   * @throws Error if the value is invalid or outside the allowed domain (1-5)
   */
  static validarENormalizarEstresse(valor: unknown): NivelEstresseCanonico {
    if (valor === undefined || valor === null || valor === '') {
      throw new Error("Nível de estresse inicial é obrigatório. Utilize escala numérica de 1 a 5 ou 'baixo', 'medio', 'alto'.");
    }

    // Caso numérico
    if (typeof valor === 'number') {
      if (valor >= 1 && valor <= 2) return 'baixo';
      if (valor === 3) return 'medio';
      if (valor >= 4 && valor <= 5) return 'alto';
      throw new Error(`Escala numérica de estresse inválida (${valor}). O domínio permitido é de 1 a 5.`);
    }

    // Caso string
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
   * Data Sanitization: Strips whitespace, removes empty entries, and eliminates duplicate items.
   *
   * @param gatilhos - Array or single string input containing sensory triggers
   * @returns Array of unique, sanitized sensory trigger strings
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
   * Clinical Record Integration (RF16, RN04): Queries both dados_clinicos (JSONB) and paciente_gatilho junction tables.
   *
   * @param pacienteId - UUID of the target patient
   * @returns Consolidated unique list of registered sensory triggers
   */
  static async obterGatilhosPaciente(pacienteId: string): Promise<string[]> {
    if (!pacienteId) return [];
    if (!SessaoContextoDdaService.deveConsultarSupabase()) return [];

    const conjuntoGatilhos = new Set<string>();

    try {
      // 1. Consulta em dados_clinicos (gatilhos_sensoriais JSONB)
      const { data: dadosClinicos } = await supabase
        .from('dados_clinicos')
        .select('gatilhos_sensoriais')
        .eq('paciente_id', pacienteId)
        .maybeSingle();

      if (dadosClinicos?.gatilhos_sensoriais) {
        const listaGatilhos = SessaoContextoDdaService.validarGatilhos(dadosClinicos.gatilhos_sensoriais);
        listaGatilhos.forEach(g => conjuntoGatilhos.add(g));
      }

      // 2. Consulta em paciente_gatilho com JOIN na tabela gatilhos
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
   * Game Manifest Reference (Contrato 1): Falls back to safe default 'foco_atencional' when undefined.
   *
   * @param jogoId - UUID of the selected therapeutic game
   * @returns String with default clinical objective from manifest or fallback
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
   * Fallback Rule (RN03): Pulls patient triggers, sets stress to 'baixo', and assumes game manifest objective when skipped.
   *
   * @param pacienteId - UUID of the target patient
   * @param jogoId - UUID of the selected therapeutic game
   * @returns Populated Contract 2 patient context package with homologated defaults
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
   * Free Mode Guard (RN01): Rejects calibration attempts with HTTP 400 for free play sessions without a patient.
   *
   * @param entrada - Raw pre-session context payload submitted with request
   * @param pacienteId - UUID of the patient (mandatory for clinical sessions)
   * @param jogoId - UUID of the selected therapeutic game
   * @param modoSessao - Operational mode ('sessao_clinica' or 'modo_livre')
   * @returns Normalized Contract 2 context object or null for free mode
   */
  static async validarEFormatarContexto(
    entrada: EntradaContextoDDA | undefined,
    pacienteId: string | null,
    jogoId: string,
    modoSessao: string
  ): Promise<ContextoPacienteContrato2 | null> {
    // 1. Guarda RN01: Modo Livre não admite paciente nem contexto clínico DDA
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

    // 2. Para Sessão Clínica, pacienteId é obrigatório
    if (!pacienteId) {
      throw new Error('O identificador do paciente (paciente_id) é obrigatório para sessões clínicas com DDA.');
    }

    // 3. Fallback Clínico Parametrizado (Figura 5 do PDF):
    // Acionado explicitamente por usar_fallback_padrao = true ou pela omissão de parâmetros clínicos
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

    // 4. Customização Manual pelo Terapeuta:
    const valorEstresse = entrada.nivel_estresse_inicial ?? entrada.estresse_inicial;
    const nivel_estresse_inicial = SessaoContextoDdaService.validarENormalizarEstresse(valorEstresse);

    const valorGatilhos = entrada.gatilhos_sensoriais_evitar ?? entrada.gatilhos_a_evitar;
    let gatilhos_sensoriais_evitar = SessaoContextoDdaService.validarGatilhos(valorGatilhos);

    // Se o terapeuta não listou gatilhos manuais, busca do cadastro do paciente
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
   * Contract 2 Envelope: Bundles session token, therapist ID, patient ID, and normalized clinical context.
   *
   * @param tokenSessao - Pairing PIN or session token
   * @param terapeutaId - UUID of the responsible therapist
   * @param pacienteId - UUID of the patient (or null for free mode)
   * @param contextoPaciente - Normalized clinical context object
   * @returns Complete Contract 2 payload or null when no context exists
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
   * Fetches registered baseline triggers and previous session calibration to prepopulate the pre-session modal.
   * Smart Suggestion (RF12, RF17): Prioritizes the most recent completed session or falls back to patient anamnesis.
   *
   * @param pacienteId - UUID of the patient
   * @returns Suggested DDA context DTO containing stress, triggers, objective, and data source
   */
  static async obterContextoSugerido(pacienteId: string): Promise<SugestaoContextoDTO> {
    const gatilhos = await SessaoContextoDdaService.obterGatilhosPaciente(pacienteId);
    if (!SessaoContextoDdaService.deveConsultarSupabase()) {
      return {
        nivel_estresse_sugerido: 'baixo',
        gatilhos_sensoriais_cadastrados: gatilhos,
        objetivo_clinico_sugerido: 'foco_atencional',
        origem: 'anamnese_padrao',
      };
    }

    try {
      // Consulta a última sessão finalizada desse paciente
      const { data: sessaoAnterior } = await supabase
        .from('sessao')
        .select('contexto_dda_json')
        .eq('paciente_id', pacienteId)
        .eq('status_sessao', 'finalizada')
        .order('data_hora_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();

      const contextoSalvo = sessaoAnterior?.contexto_dda_json as Record<string, unknown> | undefined;
      const contextoPaciente = (contextoSalvo?.contexto_paciente || contextoSalvo) as Record<string, unknown> | undefined;

      if (contextoPaciente && typeof contextoPaciente.nivel_estresse_inicial === 'string') {
        const estresse = contextoPaciente.nivel_estresse_inicial as NivelEstresseCanonico;
        const objetivo = typeof contextoPaciente.objetivo_clinico === 'string' && contextoPaciente.objetivo_clinico.trim()
          ? contextoPaciente.objetivo_clinico.trim()
          : 'foco_atencional';

        return {
          nivel_estresse_sugerido: estresse,
          gatilhos_sensoriais_cadastrados: gatilhos,
          objetivo_clinico_sugerido: objetivo,
          origem: 'ultima_sessao',
        };
      }
    } catch (err) {
      console.error('[SessaoContextoDdaService] Erro ao buscar última sessão para sugestão:', err);
    }

    return {
      nivel_estresse_sugerido: 'baixo',
      gatilhos_sensoriais_cadastrados: gatilhos,
      objetivo_clinico_sugerido: 'foco_atencional',
      origem: 'anamnese_padrao',
    };
  }
}
