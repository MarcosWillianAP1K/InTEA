import { TelemetriaModel, TelemetriaEvento } from '../models/telemetria.model.js';
import { SessaoModel } from '../../sessao/models/sessao.model.js';
import { JogoModel, ManifestoJogo, MetricaManifesto } from '../../jogos/models/jogo.model.js';

// ==============================================================================
// TIPOS E INTERFACES DE AGREGAÇÃO ESTATÍSTICA (Zero 'any')
// ==============================================================================

export type TendenciaMetrica = 'estavel' | 'crescente' | 'decrescente';

export interface EstatisticasPrecisao {
  total_toques: number;
  total_acertos: number;
  total_erros: number;
  taxa_precisao_percentual: number; // 0.00 a 100.00
}

export interface EstatisticasTempoResposta {
  total_amostras: number;
  media: number;
  mediana: number;
  minimo: number;
  maximo: number;
  desvio_padrao: number;
  unidade: string;
}

export interface MetricaNumericaAgregada {
  id_metrica: string;
  tipo_metrica: 'numerica';
  unidade?: string;
  total_amostras: number;
  media: number;
  mediana: number;
  minimo: number;
  maximo: number;
  desvio_padrao: number;
  tendencia: TendenciaMetrica;
}

export interface MetricaCategoricaAgregada {
  id_metrica: string;
  tipo_metrica: 'categorica';
  total_amostras: number;
  valor_dominante: string;
  distribuicao: Record<string, number>;
  tendencia: TendenciaMetrica;
}

export type MetricaIndicadorAgregada = MetricaNumericaAgregada | MetricaCategoricaAgregada;

export interface MetricaRejeitadaRN02 {
  id_metrica: string;
  motivo: string;
  total_rejeitados: number;
}

export interface JanelaTemporalAtencao {
  indice: number;
  inicio_segundos: number;
  fim_segundos: number;
  total_eventos: number;
  taxa_precisao: number;
  tempo_resposta_medio: number;
}

export interface EstabilidadeAtencaoResultado {
  indice_estabilidade: number; // 0 a 100
  classificacao: 'alta' | 'moderada' | 'baixa' | 'sem_dados';
  coeficiente_variacao: number;
  janelas: JanelaTemporalAtencao[];
}

export interface TelemetriaConsolidada {
  total_eventos: number;
  duracao_estimada_segundos: number;
  contagem_por_tipo: Record<string, number>;
  precisao: EstatisticasPrecisao;
  tempo_resposta: EstatisticasTempoResposta;
  estabilidade_atencao: EstabilidadeAtencaoResultado;
  metricas_agregadas: MetricaIndicadorAgregada[];
  violacoes_rn02: MetricaRejeitadaRN02[];
  data_hora_primeiro_evento: string | null;
  data_hora_ultimo_evento: string | null;
}

// ==============================================================================
// FUNÇÕES AUXILIARES MATEMÁTICAS E ESTATÍSTICAS (Puras e Robustas)
// ==============================================================================

/**
 * Calcula a média aritmética simples com arredondamento seguro.
 */
export function calcularMedia(valores: number[], casasDecimais = 2): number {
  if (!valores || valores.length === 0) return 0;
  const soma = valores.reduce((acc, val) => acc + val, 0);
  const media = soma / valores.length;
  return Number(media.toFixed(casasDecimais));
}

/**
 * Calcula a mediana estatística de um conjunto ordenado de números.
 */
export function calcularMediana(valores: number[], casasDecimais = 2): number {
  if (!valores || valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);

  let mediana: number;
  if (ordenados.length % 2 === 1) {
    mediana = ordenados[meio];
  } else {
    mediana = (ordenados[meio - 1] + ordenados[meio]) / 2;
  }
  return Number(mediana.toFixed(casasDecimais));
}

/**
 * Calcula o desvio padrão populacional (robustez contra tamanho 1 e divisão por zero).
 */
export function calcularDesvioPadrao(valores: number[], casasDecimais = 2): number {
  if (!valores || valores.length <= 1) return 0;
  const media = valores.reduce((acc, val) => acc + val, 0) / valores.length;
  const somaQuadrados = valores.reduce((acc, val) => acc + Math.pow(val - media, 2), 0);
  const variancia = somaQuadrados / valores.length;
  return Number(Math.sqrt(variancia).toFixed(casasDecimais));
}

/**
 * Determina a tendência temporal comparando a primeira e a segunda metade das amostras cronológicas.
 * Margem mínima de variação de 5% para evitar oscilações estocásticas.
 */
export function calcularTendenciaNumerica(valoresCronologicos: number[]): TendenciaMetrica {
  if (!valoresCronologicos || valoresCronologicos.length < 2) {
    return 'estavel';
  }

  const meio = Math.floor(valoresCronologicos.length / 2);
  const primeiraMetade = valoresCronologicos.slice(0, meio);
  const segundaMetade = valoresCronologicos.slice(meio);

  if (primeiraMetade.length === 0 || segundaMetade.length === 0) {
    return 'estavel';
  }

  const media1 = primeiraMetade.reduce((acc, v) => acc + v, 0) / primeiraMetade.length;
  const media2 = segundaMetade.reduce((acc, v) => acc + v, 0) / segundaMetade.length;

  const baseComparacao = Math.abs(media1) > 0.0001 ? Math.abs(media1) : 1;
  const variacaoPercentual = (media2 - media1) / baseComparacao;

  if (variacaoPercentual > 0.05) return 'crescente';
  if (variacaoPercentual < -0.05) return 'decrescente';
  return 'estavel';
}

/**
 * Determina a tendência de uma métrica categórica comparando a distribuição do início vs final.
 */
export function calcularTendenciaCategorica(valoresCronologicos: string[]): TendenciaMetrica {
  if (!valoresCronologicos || valoresCronologicos.length < 2) {
    return 'estavel';
  }

  const meio = Math.floor(valoresCronologicos.length / 2);
  const primeiraMetade = valoresCronologicos.slice(0, meio);
  const segundaMetade = valoresCronologicos.slice(meio);

  const moda1 = obterModaCategorica(primeiraMetade);
  const moda2 = obterModaCategorica(segundaMetade);

  return moda1 === moda2 ? 'estavel' : 'decrescente';
}

/**
 * Obtém a moda (valor mais frequente) de uma lista de categorias.
 */
export function obterModaCategorica(valores: string[]): string {
  if (!valores || valores.length === 0) return 'indeterminado';
  const contagem: Record<string, number> = {};
  for (const v of valores) {
    contagem[v] = (contagem[v] || 0) + 1;
  }

  let dominante = valores[0];
  let maxOcorrencias = 0;
  for (const [chave, qtd] of Object.entries(contagem)) {
    if (qtd > maxOcorrencias) {
      maxOcorrencias = qtd;
      dominante = chave;
    }
  }
  return dominante;
}

// ==============================================================================
// CLASSE PRINCIPAL: TelemetriaAgregacaoService
// ==============================================================================

export class TelemetriaAgregacaoService {
  /**
   * Função pura e desacoplada de agregação estatística em memória.
   * Compila e sumariza eventos brutos respeitando estritamente a RN02.
   *
   * @param eventos - Lista de eventos brutos de telemetria
   * @param manifesto - Manifesto do jogo com especificações de métricas (opcional)
   */
  static agregarEventos(
    eventos: TelemetriaEvento[],
    manifesto?: ManifestoJogo | null
  ): TelemetriaConsolidada {
    // 1. Guarda para conjunto vazio (zero eventos) — Proteção contra divisão por zero
    if (!eventos || eventos.length === 0) {
      return this.gerarConsolidacaoVazia();
    }

    // 2. Ordena os eventos cronologicamente por timestamp para integridade analítica
    const eventosOrdenados = [...eventos].sort((a, b) => {
      const tA = new Date(a.data_hora || 0).getTime();
      const tB = new Date(b.data_hora || 0).getTime();
      return tA - tB;
    });

    const dataPrimeiro = eventosOrdenados[0]?.data_hora || null;
    const dataUltimo = eventosOrdenados[eventosOrdenados.length - 1]?.data_hora || null;

    let duracaoEstimadaSegundos = 0;
    if (dataPrimeiro && dataUltimo) {
      const ms = new Date(dataUltimo).getTime() - new Date(dataPrimeiro).getTime();
      duracaoEstimadaSegundos = Math.max(0, Math.round(ms / 1000));
    }

    // 3. Contagem por tipo de evento
    const contagemPorTipo: Record<string, number> = {};
    for (const evt of eventosOrdenados) {
      const tipo = evt.tipo_evento || 'desconhecido';
      contagemPorTipo[tipo] = (contagemPorTipo[tipo] || 0) + 1;
    }

    // 4. Mapa de métricas homologadas no manifesto (se fornecido)
    const mapaMetricasHomologadas = new Map<string, MetricaManifesto>();
    if (manifesto && Array.isArray(manifesto.metricas_suportadas)) {
      for (const metrica of manifesto.metricas_suportadas) {
        if (metrica.id_metrica) {
          mapaMetricasHomologadas.set(metrica.id_metrica, metrica);
        }
      }
    }

    // 5. Agrupamento de valores brutos por indicador e rastreamento de violações RN02
    const amostrasNumericas = new Map<string, number[]>();
    const amostrasCategoricas = new Map<string, string[]>();
    const violacoesMap = new Map<string, { motivo: string; contagem: number }>();

    let totalAcertos = 0;
    let totalErros = 0;
    let totalInteracoesToque = 0;
    const temposRespostaGerais: number[] = [];

    for (const evt of eventosOrdenados) {
      const tipoEvento = evt.tipo_evento?.toLowerCase() || '';
      const idMetrica = evt.dados?.id_metrica || '';
      const valorBruto = evt.dados?.valor;

      // Classificação de acertos / erros / toques
      if (tipoEvento === 'acerto' || idMetrica === 'acerto' || valorBruto === 'acerto' || valorBruto === true) {
        totalAcertos++;
        totalInteracoesToque++;
      } else if (tipoEvento === 'erro' || idMetrica === 'erro' || valorBruto === 'erro' || valorBruto === false) {
        totalErros++;
        totalInteracoesToque++;
      } else if (tipoEvento === 'interacao_paciente' || tipoEvento === 'toque') {
        totalInteracoesToque++;
      }

      // Se não há id_metrica definido nos dados, pula processamento de indicador
      if (!idMetrica) continue;

      // Validação estrita RN02 quando manifesto estiver presente
      if (manifesto) {
        const homologada = mapaMetricasHomologadas.get(idMetrica);

        // RN02: Métrica ausente do manifesto não pode ser aceita nem convertida
        if (!homologada) {
          const motivo = `Métrica '${idMetrica}' não declarada no manifesto do jogo (RN02 - proibido fallback).`;
          const atual = violacoesMap.get(idMetrica) || { motivo, contagem: 0 };
          atual.contagem++;
          violacoesMap.set(idMetrica, atual);
          continue;
        }

        // RN02: Tipo obrigatório e deve ser 'numerica' ou 'categorica'
        const tipoDeclarado = homologada.tipo_metrica;
        if (tipoDeclarado !== 'numerica' && tipoDeclarado !== 'categorica') {
          const motivo = `Métrica '${idMetrica}' possui tipo inválido '${tipoDeclarado}' no manifesto (RN02).`;
          const atual = violacoesMap.get(idMetrica) || { motivo, contagem: 0 };
          atual.contagem++;
          violacoesMap.set(idMetrica, atual);
          continue;
        }

        if (tipoDeclarado === 'numerica') {
          if (typeof valorBruto !== 'number' || Number.isNaN(valorBruto)) {
            const motivo = `Valor não-numérico recebido para métrica numérica '${idMetrica}' (RN02).`;
            const atual = violacoesMap.get(idMetrica) || { motivo, contagem: 0 };
            atual.contagem++;
            violacoesMap.set(idMetrica, atual);
            continue;
          }

          if (!amostrasNumericas.has(idMetrica)) amostrasNumericas.set(idMetrica, []);
          amostrasNumericas.get(idMetrica)!.push(valorBruto);

          if (idMetrica === 'tempo_resposta' || idMetrica === 'tempo_reacao') {
            temposRespostaGerais.push(valorBruto);
          }
        } else if (tipoDeclarado === 'categorica') {
          if (typeof valorBruto !== 'string') {
            const motivo = `Valor não-string recebido para métrica categórica '${idMetrica}' (RN02).`;
            const atual = violacoesMap.get(idMetrica) || { motivo, contagem: 0 };
            atual.contagem++;
            violacoesMap.set(idMetrica, atual);
            continue;
          }

          if (homologada.valores && !homologada.valores.includes(valorBruto)) {
            const motivo = `Valor '${valorBruto}' fora do domínio homologado [${homologada.valores.join(', ')}] para '${idMetrica}' (RN02).`;
            const atual = violacoesMap.get(idMetrica) || { motivo, contagem: 0 };
            atual.contagem++;
            violacoesMap.set(idMetrica, atual);
            continue;
          }

          if (!amostrasCategoricas.has(idMetrica)) amostrasCategoricas.set(idMetrica, []);
          amostrasCategoricas.get(idMetrica)!.push(valorBruto);
        }
      } else {
        // Modo agnóstico sem manifesto: preserva tipagem natural sem fallback
        if (typeof valorBruto === 'number' && !Number.isNaN(valorBruto)) {
          if (!amostrasNumericas.has(idMetrica)) amostrasNumericas.set(idMetrica, []);
          amostrasNumericas.get(idMetrica)!.push(valorBruto);

          if (idMetrica === 'tempo_resposta' || idMetrica === 'tempo_reacao') {
            temposRespostaGerais.push(valorBruto);
          }
        } else if (typeof valorBruto === 'string') {
          if (!amostrasCategoricas.has(idMetrica)) amostrasCategoricas.set(idMetrica, []);
          amostrasCategoricas.get(idMetrica)!.push(valorBruto);
        }
      }
    }

    // 6. Estatísticas de Precisão
    const totalInteracoesAvaliadas = totalAcertos + totalErros;
    const taxaPrecisaoPercentual =
      totalInteracoesAvaliadas > 0
        ? Number(((totalAcertos / totalInteracoesAvaliadas) * 100).toFixed(2))
        : 0;

    const precisao: EstatisticasPrecisao = {
      total_toques: Math.max(totalInteracoesToque, totalInteracoesAvaliadas),
      total_acertos: totalAcertos,
      total_erros: totalErros,
      taxa_precisao_percentual: taxaPrecisaoPercentual,
    };

    // 7. Estatísticas de Tempo de Resposta
    const temposRespostaOrdenados = [...temposRespostaGerais];
    const tempoResposta: EstatisticasTempoResposta = {
      total_amostras: temposRespostaOrdenados.length,
      media: calcularMedia(temposRespostaOrdenados),
      mediana: calcularMediana(temposRespostaOrdenados),
      minimo: temposRespostaOrdenados.length > 0 ? Math.min(...temposRespostaOrdenados) : 0,
      maximo: temposRespostaOrdenados.length > 0 ? Math.max(...temposRespostaOrdenados) : 0,
      desvio_padrao: calcularDesvioPadrao(temposRespostaOrdenados),
      unidade: mapaMetricasHomologadas.get('tempo_resposta')?.unidade || 'segundos',
    };

    // 8. Métricas Agregadas por Indicador (Formato compatível com Contrato 4)
    const metricasAgregadas: MetricaIndicadorAgregada[] = [];

    // Consolida métricas numéricas
    for (const [idMetrica, valores] of amostrasNumericas.entries()) {
      const homologada = mapaMetricasHomologadas.get(idMetrica);
      metricasAgregadas.push({
        id_metrica: idMetrica,
        tipo_metrica: 'numerica',
        unidade: homologada?.unidade,
        total_amostras: valores.length,
        media: calcularMedia(valores),
        mediana: calcularMediana(valores),
        minimo: valores.length > 0 ? Math.min(...valores) : 0,
        maximo: valores.length > 0 ? Math.max(...valores) : 0,
        desvio_padrao: calcularDesvioPadrao(valores),
        tendencia: calcularTendenciaNumerica(valores),
      });
    }

    // Consolida métricas categóricas
    for (const [idMetrica, valores] of amostrasCategoricas.entries()) {
      const distribuicao: Record<string, number> = {};
      for (const v of valores) {
        distribuicao[v] = (distribuicao[v] || 0) + 1;
      }

      metricasAgregadas.push({
        id_metrica: idMetrica,
        tipo_metrica: 'categorica',
        total_amostras: valores.length,
        valor_dominante: obterModaCategorica(valores),
        distribuicao,
        tendencia: calcularTendenciaCategorica(valores),
      });
    }

    // 9. Estabilidade de Atenção por Janelas Temporais
    const estabilidadeAtencao = this.calcularEstabilidadeAtencao(
      eventosOrdenados,
      duracaoEstimadaSegundos
    );

    // 10. Lista de violações RN02 identificadas
    const violacoesRN02: MetricaRejeitadaRN02[] = [];
    for (const [idMetrica, info] of violacoesMap.entries()) {
      violacoesRN02.push({
        id_metrica: idMetrica,
        motivo: info.motivo,
        total_rejeitados: info.contagem,
      });
    }

    return {
      total_eventos: eventosOrdenados.length,
      duracao_estimada_segundos: duracaoEstimadaSegundos,
      contagem_por_tipo: contagemPorTipo,
      precisao,
      tempo_resposta: tempoResposta,
      estabilidade_atencao: estabilidadeAtencao,
      metricas_agregadas: metricasAgregadas,
      violacoes_rn02: violacoesRN02,
      data_hora_primeiro_evento: dataPrimeiro,
      data_hora_ultimo_evento: dataUltimo,
    };
  }

  /**
   * Compila e sumariza a telemetria de uma sessão buscando dados e manifesto no banco de dados.
   *
   * @param sessaoId - Identificador único UUID da sessão
   */
  static async compilarPorSessaoId(sessaoId: string): Promise<TelemetriaConsolidada | null> {
    if (!sessaoId) return null;

    const sessao = await SessaoModel.buscarPorId(sessaoId);
    if (!sessao) return null;

    // Busca eventos brutos persistidos da sessão
    const eventos = await TelemetriaModel.buscarPorSessaoId(sessaoId);

    // Busca manifesto do jogo ativo se houver jogo_id vinculado
    let manifesto: ManifestoJogo | null = null;
    if (sessao.jogo_id) {
      const jogo = await JogoModel.buscarPorId(sessao.jogo_id);
      if (jogo && jogo.manifesto_json) {
        manifesto = jogo.manifesto_json;
      }
    }

    return this.agregarEventos(eventos, manifesto);
  }

  /**
   * Divide a sessão em janelas temporais e calcula a estabilidade do engajamento/atenção.
   */
  private static calcularEstabilidadeAtencao(
    eventos: TelemetriaEvento[],
    duracaoSegundos: number
  ): EstabilidadeAtencaoResultado {
    if (!eventos || eventos.length < 2) {
      return {
        indice_estabilidade: 0,
        classificacao: 'sem_dados',
        coeficiente_variacao: 0,
        janelas: [],
      };
    }

    const duracaoTotal = duracaoSegundos > 0 ? duracaoSegundos : 60;
    // Divide em no mínimo 3 janelas e no máximo 6 janelas (ou blocos de 60s)
    const numeroJanelas = Math.min(6, Math.max(3, Math.ceil(duracaoTotal / 60)));
    const tamanhoJanelaSegundos = Math.max(1, Math.ceil(duracaoTotal / numeroJanelas));

    const janelas: JanelaTemporalAtencao[] = [];
    const inicioPrimeiroEvento = new Date(eventos[0].data_hora).getTime();

    for (let i = 0; i < numeroJanelas; i++) {
      const inicioJanelaMs = i * tamanhoJanelaSegundos * 1000;
      const fimJanelaMs = (i + 1) * tamanhoJanelaSegundos * 1000;

      const eventosNaJanela = eventos.filter((evt) => {
        const offset = new Date(evt.data_hora).getTime() - inicioPrimeiroEvento;
        return offset >= inicioJanelaMs && (i === numeroJanelas - 1 ? offset <= fimJanelaMs : offset < fimJanelaMs);
      });

      let acertosJanela = 0;
      let errosJanela = 0;
      const temposJanela: number[] = [];

      for (const e of eventosNaJanela) {
        const tipo = e.tipo_evento?.toLowerCase() || '';
        const idMetrica = e.dados?.id_metrica || '';
        const valor = e.dados?.valor;

        if (tipo === 'acerto' || idMetrica === 'acerto' || valor === 'acerto') acertosJanela++;
        if (tipo === 'erro' || idMetrica === 'erro' || valor === 'erro') errosJanela++;
        if (typeof valor === 'number' && (idMetrica === 'tempo_resposta' || idMetrica === 'tempo_reacao')) {
          temposJanela.push(valor);
        }
      }

      const totalAvaliados = acertosJanela + errosJanela;
      const taxaPrecisao = totalAvaliados > 0 ? Number(((acertosJanela / totalAvaliados) * 100).toFixed(2)) : 0;

      janelas.push({
        indice: i + 1,
        inicio_segundos: i * tamanhoJanelaSegundos,
        fim_segundos: Math.min(duracaoTotal, (i + 1) * tamanhoJanelaSegundos),
        total_eventos: eventosNaJanela.length,
        taxa_precisao: taxaPrecisao,
        tempo_resposta_medio: calcularMedia(temposJanela),
      });
    }

    const contagensPorJanela = janelas.map((j) => j.total_eventos);
    const mediaEventos = calcularMedia(contagensPorJanela);
    const desvioEventos = calcularDesvioPadrao(contagensPorJanela);

    // Coeficiente de variação (CV = desvio / media)
    const cv = mediaEventos > 0 ? Number((desvioEventos / mediaEventos).toFixed(3)) : 0;

    // Índice de estabilidade: 100 - (CV * 50) limitado entre 0 e 100
    const indiceEstabilidade = Math.max(0, Math.min(100, Math.round(100 - cv * 50)));

    let classificacao: 'alta' | 'moderada' | 'baixa' | 'sem_dados' = 'moderada';
    if (cv <= 0.25) classificacao = 'alta';
    else if (cv <= 0.55) classificacao = 'moderada';
    else classificacao = 'baixa';

    return {
      indice_estabilidade: indiceEstabilidade,
      classificacao,
      coeficiente_variacao: cv,
      janelas,
    };
  }

  /**
   * Retorna estrutura padrão preenchida com valores nulos/zeros para sessões sem telemetria.
   */
  private static gerarConsolidacaoVazia(): TelemetriaConsolidada {
    return {
      total_eventos: 0,
      duracao_estimada_segundos: 0,
      contagem_por_tipo: {},
      precisao: {
        total_toques: 0,
        total_acertos: 0,
        total_erros: 0,
        taxa_precisao_percentual: 0,
      },
      tempo_resposta: {
        total_amostras: 0,
        media: 0,
        mediana: 0,
        minimo: 0,
        maximo: 0,
        desvio_padrao: 0,
        unidade: 'segundos',
      },
      estabilidade_atencao: {
        indice_estabilidade: 0,
        classificacao: 'sem_dados',
        coeficiente_variacao: 0,
        janelas: [],
      },
      metricas_agregadas: [],
      violacoes_rn02: [],
      data_hora_primeiro_evento: null,
      data_hora_ultimo_evento: null,
    };
  }
}
