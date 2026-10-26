import { ManifestoJogo, MetricaManifesto } from '../models/jogo.model.js';

export interface ResultadoValidacaoManifesto {
  valido: boolean;
  erros: string[];
  manifestoValido?: ManifestoJogo;
}

export class ManifestoValidator {
  private static readonly TIPOS_METRICA_PERMITIDOS = ['numerica', 'categorica'];

  /**
   * Termos e mecânicas proibidos no ecossistema clínico InTEA conforme a Diretriz Clínica de Não-Competitividade.
   * Jogos para pessoas no espectro autista não podem conter mecânicas punitivas, disputas interpessoais ou rankings
   * que gerem sobrecarga sensorial, aversão ou desregulação emocional.
   */
  public static readonly TERMOS_COMPETITIVOS_PUNITIVOS_PROIBIDOS: readonly string[] = [
    'competitivo',
    'competicao',
    'versus',
    'pvp',
    'ranking',
    'leaderboard',
    'placar_lideres',
    'eliminatorio',
    'eliminacao',
    'morte_subita',
    'punitivo',
    'derrota_punitiva',
    'perda_vidas',
    'game_over_punitivo',
    'battle_royale'
  ];

  /**
   * Verifica se o manifesto cumpre a Diretriz Clínica de Não-Competitividade.
   * Barra manifestos com mecânicas punitivas, rankings ou disputas competitivas eliminatórias,
   * assegurando foco exclusivo em cooperação, autorregulação e estímulos positivos adaptativos.
   *
   * @param manifesto - O objeto de manifesto a ser inspecionado.
   * @returns Resultado indicando conformidade clínica booleana e array de violações detalhadas.
   */
  static verificarConformidadeNaoCompetitividade(manifesto: unknown): { conforme: boolean; violacoes: string[] } {
    const violacoes: string[] = [];

    if (!manifesto || typeof manifesto !== 'object' || Array.isArray(manifesto)) {
      return { conforme: true, violacoes: [] };
    }

    const m = manifesto as Record<string, unknown>;

    // 1. Verificação de flags booleanas/truthy diretas na raiz
    const flagsProibidas: Array<{ campo: string; rotulo: string }> = [
      { campo: 'competitivo', rotulo: 'modo competitivo' },
      { campo: 'mecanica_competitiva', rotulo: 'mecânica competitiva' },
      { campo: 'modo_competitivo', rotulo: 'modo competitivo' },
      { campo: 'ranking', rotulo: 'ranking ou tabela de líderes' },
      { campo: 'leaderboard', rotulo: 'leaderboard' },
      { campo: 'placar_lideres', rotulo: 'placar de líderes' },
      { campo: 'eliminatorio', rotulo: 'mecânica eliminatória' },
      { campo: 'mecanica_eliminatoria', rotulo: 'mecânica eliminatória' },
      { campo: 'morte_subita', rotulo: 'morte súbita' },
      { campo: 'punitivo', rotulo: 'punição ou penalidade severa' },
      { campo: 'derrota_punitiva', rotulo: 'derrota punitiva' },
      { campo: 'perda_progresso', rotulo: 'perda punitiva de progresso' }
    ];

    for (const { campo, rotulo } of flagsProibidas) {
      const valor = m[campo];
      if (valor === true || valor === 'true' || valor === 1) {
        violacoes.push(
          `[Diretriz Clínica de Não-Competitividade] O manifesto declara ${rotulo} ('${campo}: true'). Jogos terapêuticos para TEA devem focar exclusivamente em cooperação, autorregulação e estímulos positivos adaptativos.`
        );
      }
    }

    // 2. Verificação de strings em 'modo', 'modo_jogo', 'foco' ou 'foco_pedagogico'
    const camposString = ['modo', 'modo_jogo', 'foco', 'foco_pedagogico', 'foco_clinico'];
    for (const campo of camposString) {
      const valor = m[campo];
      if (typeof valor === 'string') {
        const valorNormalizado = valor.toLowerCase().trim();
        for (const termo of this.TERMOS_COMPETITIVOS_PUNITIVOS_PROIBIDOS) {
          if (valorNormalizado.includes(termo)) {
            violacoes.push(
              `[Diretriz Clínica de Não-Competitividade] O campo '${campo}' declara termo competitivo/punitivo proibido ('${valor}'). O catálogo clínico aceita apenas foco em cooperação e autorregulação.`
            );
            break;
          }
        }
      }
    }

    // 3. Verificação em coleções de mecânicas, tags ou modos suportados
    const colecoes = ['mecanicas', 'tags', 'modos_suportados', 'caracteristicas'];
    for (const colecao of colecoes) {
      const lista = m[colecao];
      if (Array.isArray(lista)) {
        for (const item of lista) {
          if (typeof item === 'string') {
            const itemNormalizado = item.toLowerCase().trim();
            for (const termo of this.TERMOS_COMPETITIVOS_PUNITIVOS_PROIBIDOS) {
              if (itemNormalizado.includes(termo)) {
                violacoes.push(
                  `[Diretriz Clínica de Não-Competitividade] A coleção '${colecao}' contém mecânica competitiva/punitiva proibida ('${item}'). Foco obrigatório em estímulos adaptativos e cooperativos.`
                );
                break;
              }
            }
          }
        }
      }
    }

    // 4. Verificação em sub-objeto de diretrizes ou configurações
    const subObjetos = ['diretrizes_clinicas', 'configuracao_jogo', 'mecanicas_jogo'];
    for (const sub of subObjetos) {
      const subObj = m[sub];
      if (subObj && typeof subObj === 'object' && !Array.isArray(subObj)) {
        const subResultado = this.verificarConformidadeNaoCompetitividade(subObj);
        if (!subResultado.conforme) {
          violacoes.push(...subResultado.violacoes);
        }
      }
    }

    // 5. Verificação nas métricas suportadas (ex: ids voltados a disputa interpessoal ou ranking)
    if (Array.isArray(m.metricas_suportadas)) {
      m.metricas_suportadas.forEach((metricaItem: unknown, idx: number) => {
        if (metricaItem && typeof metricaItem === 'object' && !Array.isArray(metricaItem)) {
          const metrica = metricaItem as Record<string, unknown>;
          const idMetrica = typeof metrica.id_metrica === 'string' ? metrica.id_metrica.toLowerCase().trim() : '';
          for (const termo of this.TERMOS_COMPETITIVOS_PUNITIVOS_PROIBIDOS) {
            if (idMetrica.includes(termo)) {
              violacoes.push(
                `[Diretriz Clínica de Não-Competitividade] A métrica '${metrica.id_metrica}' [índice ${idx}] é voltada a disputa, ranking ou eliminação punitiva, violando a diretriz de não-competitividade.`
              );
              break;
            }
          }
        }
      });
    }

    return {
      conforme: violacoes.length === 0,
      violacoes
    };
  }

  /**
   * Validates the structural and clinical compliance of a game manifest JSON object according to Contract 1 (RNF02 & RN02).
   * Incorporates strict validation of the Clinical Non-Competitiveness Guideline.
   *
   * @param manifesto - The untyped game manifest payload to validate.
   * @returns Validation outcome including boolean status `valido`, array of error messages, and parsed `manifestoValido`.
   */
  static validar(manifesto: unknown): ResultadoValidacaoManifesto {
    const erros: string[] = [];

    // 1. Verificação básica de objeto
    if (!manifesto || typeof manifesto !== 'object' || Array.isArray(manifesto)) {
      return {
        valido: false,
        erros: ['O manifesto deve ser um objeto JSON válido.']
      };
    }

    const m = manifesto as Record<string, unknown>;

    // 2. Campo obrigatório: id_jogo
    if (!m.id_jogo || typeof m.id_jogo !== 'string' || m.id_jogo.trim() === '') {
      erros.push("O campo 'id_jogo' é obrigatório e deve ser uma string não vazia.");
    }

    // 3. Campo obrigatório: nome
    if (!m.nome || typeof m.nome !== 'string' || m.nome.trim() === '') {
      erros.push("O campo 'nome' é obrigatório e deve ser uma string não vazia.");
    }

    // 4. Campo obrigatório: versao
    if (!m.versao || typeof m.versao !== 'string' || m.versao.trim() === '') {
      erros.push("O campo 'versao' é obrigatório e deve ser uma string não vazia.");
    }

    // 5. Campo opcional: objetivo_clinico (se fornecido, deve ser string)
    if (m.objetivo_clinico !== undefined && typeof m.objetivo_clinico !== 'string') {
      erros.push("O campo 'objetivo_clinico', quando informado, deve ser uma string.");
    }

    // 6. Campo obrigatório: metricas_suportadas
    if (!m.metricas_suportadas || !Array.isArray(m.metricas_suportadas)) {
      erros.push("O campo 'metricas_suportadas' é obrigatório e deve ser um array.");
    } else if (m.metricas_suportadas.length === 0) {
      erros.push("O array 'metricas_suportadas' deve conter pelo menos uma métrica suportada.");
    } else {
      // Validação item a item das métricas
      m.metricas_suportadas.forEach((metricaItem: unknown, index: number) => {
        const prefixo = `Métrica [índice ${index}]`;

        if (!metricaItem || typeof metricaItem !== 'object' || Array.isArray(metricaItem)) {
          erros.push(`${prefixo}: deve ser um objeto JSON.`);
          return;
        }

        const metrica = metricaItem as Record<string, unknown>;
        const idMetrica = typeof metrica.id_metrica === 'string' ? metrica.id_metrica : undefined;
        const idLabel = idMetrica ? `'${idMetrica}'` : `[índice ${index}]`;

        // 6.1. id_metrica
        if (!idMetrica || idMetrica.trim() === '') {
          erros.push(`${prefixo}: 'id_metrica' é obrigatório e deve ser uma string não vazia.`);
        }

        // 6.2. tipo_metrica (RN02: Validação Estrita sem Fallback)
        const tipoMetrica = typeof metrica.tipo_metrica === 'string' ? metrica.tipo_metrica : undefined;
        if (!tipoMetrica || tipoMetrica.trim() === '') {
          erros.push(`Métrica ${idLabel}: 'tipo_metrica' é obrigatório e não pode ser nulo ou ausente (RN02: proibido fallback automático para categórica).`);
        } else if (!this.TIPOS_METRICA_PERMITIDOS.includes(tipoMetrica)) {
          erros.push(
            `Métrica ${idLabel}: tipo '${tipoMetrica}' inválido. Tipos permitidos: ${this.TIPOS_METRICA_PERMITIDOS.map(t => `'${t}'`).join(', ')} (RN02: tipagem estrita).`
          );
        } else {
          // 6.3. Validações específicas por tipo
          if (tipoMetrica === 'numerica') {
            if (metrica.unidade !== undefined && typeof metrica.unidade !== 'string') {
              erros.push(`Métrica numérica ${idLabel}: o campo 'unidade' deve ser uma string.`);
            }
          } else if (tipoMetrica === 'categorica') {
            if (!metrica.valores || !Array.isArray(metrica.valores) || metrica.valores.length === 0) {
              erros.push(`Métrica categórica ${idLabel}: o campo 'valores' é obrigatório e deve ser um array não vazio de opções.`);
            } else {
              const temValorInvalido = metrica.valores.some((v: unknown) => typeof v !== 'string' || v.trim() === '');
              if (temValorInvalido) {
                erros.push(`Métrica categórica ${idLabel}: todos os itens do array 'valores' devem ser strings não vazias.`);
              }
            }
          }
        }
      });
    }

    // 7. Validação estrita da Diretriz Clínica de Não-Competitividade
    const conformidadeNaoComp = this.verificarConformidadeNaoCompetitividade(m);
    if (!conformidadeNaoComp.conforme) {
      erros.push(...conformidadeNaoComp.violacoes);
    }

    if (erros.length > 0) {
      return {
        valido: false,
        erros
      };
    }

    return {
      valido: true,
      erros: [],
      manifestoValido: m as unknown as ManifestoJogo
    };
  }
}
