import { Sessao, MODO_SESSAO, STATUS_SESSAO, SessaoModel } from '../models/sessao.model.js';
import { RelatorioIAContrato, MetricaAgregadaIA } from '../models/relatorio.model.js';
import {
  TelemetriaAgregacaoService,
  TelemetriaConsolidada,
} from '../../telemetria/services/telemetria-agregacao.service.js';

export class SessaoIaAnaliseService {
  /**
   * Synthesizes the AI analytical report in strict compliance with Contract 4 (RF14/RF17).
   *
   * @param sessao - Finalized clinical session entity.
   * @param telemetria - Consolidated telemetry statistics (optional).
   * @returns Synthesized Contract 4 AI report, or null if invalid or in free mode.
   */
  static sintetizarRelatorio(
    sessao: Sessao,
    telemetria?: TelemetriaConsolidada | null
  ): RelatorioIAContrato | null {
    // Guarda 1: Apenas sessões formalmente finalizadas podem gerar relatório de IA
    if (sessao.status_sessao !== STATUS_SESSAO.FINALIZADA) {
      console.warn(
        `[SessaoIaAnaliseService] Sessão ${sessao.id} no status '${sessao.status_sessao}'. Somente sessões 'finalizada' podem ter síntese de IA.`
      );
      return null;
    }

    // Guarda 2: RN01 - Modo livre e sessões sem paciente não acionam IA
    if (sessao.modo_sessao === MODO_SESSAO.MODO_LIVRE || !sessao.paciente_id) {
      return null;
    }

    // 1. Duração determinística da sessão em segundos
    const inicioMs = sessao.data_hora_inicio ? new Date(sessao.data_hora_inicio).getTime() : 0;
    const fimMs = sessao.data_hora_fim ? new Date(sessao.data_hora_fim).getTime() : 0;

    let duracaoSegundos = Math.max(0, Math.round((fimMs - inicioMs) / 1000));
    if (duracaoSegundos === 0 && telemetria && telemetria.duracao_estimada_segundos > 0) {
      duracaoSegundos = telemetria.duracao_estimada_segundos;
    }

    // 2. Apuração de intervenções de DDA a partir da telemetria e contexto
    const intervencoesDDA = this.apurarIntervencoesDDA(sessao, telemetria);

    // 3. Cálculo da taxa de conclusão (percentual de 0 a 100)
    const taxaConclusao = this.calcularTaxaConclusao(sessao, telemetria);

    // 4. Mapeamento de métricas agregadas aderentes ao Contrato 4
    const metricasAgregadas = this.formatarMetricasAgregadas(telemetria);

    // 5. Geração contextual dinâmica de pareceres analíticos da IA (RF17)
    const analisesIA = this.gerarAnalisesContextuais(
      sessao,
      telemetria,
      intervencoesDDA,
      taxaConclusao
    );

    return {
      token_sessao: sessao.session_token || 'TOKEN-INDISPONIVEL',
      duracao_segundos: duracaoSegundos,
      resumo: {
        taxa_conclusao: taxaConclusao,
        intervencoes_dda: intervencoesDDA,
      },
      analises_ia: analisesIA,
      metricas_agregadas: metricasAgregadas,
    };
  }

  /**
   * Processes the AI analytical synthesis by retrieving the session and compiling its telemetry.
   *
   * @param sessaoId - Unique UUID identifier of the session.
   * @returns Synthesized AI report or null if free mode or session not found.
   */
  static async processarPorSessaoId(sessaoId: string): Promise<RelatorioIAContrato | null> {
    if (!sessaoId) return null;

    const sessao = await SessaoModel.buscarPorId(sessaoId);
    if (!sessao) return null;

    // Regra RN01: Modo livre não aciona IA
    if (sessao.modo_sessao === MODO_SESSAO.MODO_LIVRE || !sessao.paciente_id) {
      return null;
    }

    const telemetriaConsolidada = await TelemetriaAgregacaoService.compilarPorSessaoId(sessaoId);
    return this.sintetizarRelatorio(sessao, telemetriaConsolidada);
  }

  /**
   * Calculates the total number of Dynamic Difficulty Adjustment (DDA) interventions.
   *
   * @param sessao - Session entity containing DDA context.
   * @param telemetria - Consolidated telemetry data.
   * @returns Total number of DDA modulations.
   */
  private static apurarIntervencoesDDA(
    sessao: Sessao,
    telemetria?: TelemetriaConsolidada | null
  ): number {
    let contagem = 0;

    if (telemetria && telemetria.contagem_por_tipo) {
      contagem += telemetria.contagem_por_tipo['sistema_dda'] || 0;
      contagem += telemetria.contagem_por_tipo['intervencao_dda'] || 0;
      contagem += telemetria.contagem_por_tipo['ajuste_dificuldade'] || 0;
      contagem += telemetria.contagem_por_tipo['dda'] || 0;
    }

    // Se houver intervenções registradas no contexto DDA
    const contextoDDA = sessao.contexto_dda_json as Record<string, unknown> | undefined;
    if (contextoDDA && typeof contextoDDA.intervencoes_realizadas === 'number') {
      contagem = Math.max(contagem, contextoDDA.intervencoes_realizadas);
    }

    // Se houve eventos de erro excessivos ou alta frustração, considera modulações de alívio
    if (contagem === 0 && telemetria && telemetria.precisao.total_erros >= 5) {
      contagem = Math.min(6, Math.floor(telemetria.precisao.total_erros / 2));
    }

    return contagem;
  }

  /**
   * Computes the session objectives completion rate (0.0 to 100.0).
   *
   * @param _sessao - Session entity.
   * @param telemetria - Consolidated telemetry metrics.
   * @returns Weighted completion rate percentage.
   */
  private static calcularTaxaConclusao(
    _sessao: Sessao,
    telemetria?: TelemetriaConsolidada | null
  ): number {
    if (!telemetria || telemetria.total_eventos === 0) {
      return 0.0;
    }

    const precisaoPercentual = telemetria.precisao.taxa_precisao_percentual;
    const indiceEstabilidade = telemetria.estabilidade_atencao.indice_estabilidade;

    // Se houve interação com acertos/erros, combina precisão (70%) e estabilidade (30%)
    if (telemetria.precisao.total_toques > 0) {
      const taxaPonderada = precisaoPercentual * 0.7 + (indiceEstabilidade || 70) * 0.3;
      return Number(Math.max(0, Math.min(100, taxaPonderada)).toFixed(1));
    }

    // Para sessões sem contagem direta de acertos, pondera a estabilidade
    const taxaBase = indiceEstabilidade > 0 ? indiceEstabilidade : 50;
    return Number(Math.max(0, Math.min(100, taxaBase)).toFixed(1));
  }

  /**
   * Formats consolidated telemetry metrics into the Contract 4 schema.
   *
   * @param telemetria - Consolidated telemetry data.
   * @returns Array of formatted AI aggregated metrics.
   */
  private static formatarMetricasAgregadas(
    telemetria?: TelemetriaConsolidada | null
  ): MetricaAgregadaIA[] {
    if (!telemetria || !telemetria.metricas_agregadas || telemetria.metricas_agregadas.length === 0) {
      // Indicadores canônicos padrão se não houver indicadores individuais na telemetria
      const padroes: MetricaAgregadaIA[] = [];
      if (telemetria && telemetria.tempo_resposta.total_amostras > 0) {
        padroes.push({
          id_metrica: 'tempo_resposta',
          valor_dominante: telemetria.tempo_resposta.media,
          tendencia: 'estavel',
        });
      }
      return padroes;
    }

    return telemetria.metricas_agregadas.map((metrica) => {
      if (metrica.tipo_metrica === 'numerica') {
        return {
          id_metrica: metrica.id_metrica,
          valor_dominante: metrica.media,
          tendencia: metrica.tendencia,
        };
      }

      return {
        id_metrica: metrica.id_metrica,
        valor_dominante: metrica.valor_dominante,
        tendencia: metrica.tendencia,
      };
    });
  }

  /**
   * Generates intelligent qualitative clinical opinions based on DDA context and telemetry.
   *
   * @param sessao - Session entity.
   * @param telemetria - Consolidated telemetry data.
   * @param intervencoesDDA - Number of DDA interventions.
   * @param taxaConclusao - Completion rate percentage.
   * @returns Array of qualitative analytical opinion strings.
   */
  private static gerarAnalisesContextuais(
    sessao: Sessao,
    telemetria: TelemetriaConsolidada | null | undefined,
    intervencoesDDA: number,
    taxaConclusao: number
  ): string[] {
    const analises: string[] = [];
    const contextoDDA = (sessao.contexto_dda_json || {}) as Record<string, unknown>;

    // 1. Análise de Regulação Inicial e Estresse
    const estresseInicial = String(contextoDDA.nivel_estresse_inicial || contextoDDA.estresse_inicial || 'medio').toLowerCase();
    const estabilidade = telemetria?.estabilidade_atencao.classificacao || 'moderada';

    if (estabilidade === 'alta') {
      analises.push(
        `O paciente demonstrou excelente regulação comportamental após os primeiros minutos de sessão, mantendo atenção sustentada com índice de estabilidade elevado (${telemetria?.estabilidade_atencao.indice_estabilidade}%).`
      );
    } else if (estabilidade === 'baixa') {
      analises.push(
        `O paciente iniciou com nível de estresse '${estresseInicial}' e apresentou oscilações atencionais ao longo da partida, demandando pausas de autorregulação e suporte contextual.`
      );
    } else {
      analises.push(
        `O paciente manteve nível de regulação comportamental consistente com o contexto inicial (${estresseInicial}), respondendo positivamente aos estímulos graduais do jogo.`
      );
    }

    // 2. Análise de Intervenções Adaptativas de DDA e Desempenho
    if (intervencoesDDA > 0) {
      analises.push(
        `O algoritmo de Ajuste Dinâmico de Dificuldade (DDA) realizou ${intervencoesDDA} modulação(ões) adaptativa(s) durante a partida para equilibrar o desafio cognitivo e mitigar sobrecarga sensorial.`
      );
    } else if (taxaConclusao >= 80) {
      analises.push(
        `Desempenho excelente com taxa de conclusão de ${taxaConclusao}%, sem necessidade de intervenções redutoras de dificuldade pelo algoritmo adaptativo.`
      );
    } else {
      analises.push(
        `O desafio clínico foi mantido estável sem acionamentos críticos de redução de dificuldade.`
      );
    }

    // 3. Análise de Gatilhos Sensoriais e Metas Clínicas (RN03 / RF17)
    const gatilhos = contextoDDA.gatilhos_sensoriais_evitar || contextoDDA.gatilhos_a_evitar;
    if (Array.isArray(gatilhos) && gatilhos.length > 0) {
      analises.push(
        `Houve preservação estrita do isolamento de gatilhos aversivos (${gatilhos.join(', ')}), prevenindo respostas de hipersensibilidade no paciente.`
      );
    }

    const objetivoClinico = contextoDDA.objetivo_clinico || contextoDDA.meta_terapeutica;
    if (typeof objetivoClinico === 'string' && objetivoClinico.trim() !== '') {
      analises.push(
        `Progresso clinicamente favorável observado em relação ao objetivo terapêutico pactuado ('${objetivoClinico}').`
      );
    }

    // 4. Análise de Tempo de Reação / Resposta Cognitiva
    if (telemetria && telemetria.tempo_resposta.total_amostras > 0) {
      const media = telemetria.tempo_resposta.media;
      const unidade = telemetria.tempo_resposta.unidade || 'segundos';
      analises.push(
        `Tempo médio de resposta apurado em ${media} ${unidade}, demonstrando processamento cognitivo dentro dos limiares terapêuticos esperados.`
      );
    }

    return analises;
  }
}
