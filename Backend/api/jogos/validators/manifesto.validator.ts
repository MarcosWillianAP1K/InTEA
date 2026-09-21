import { ManifestoJogo, MetricaManifesto } from '../models/jogo.model.js';

export interface ResultadoValidacaoManifesto {
  valido: boolean;
  erros: string[];
  manifestoValido?: ManifestoJogo;
}

export class ManifestoValidator {
  private static readonly TIPOS_METRICA_PERMITIDOS = ['numerica', 'categorica'];

  /**
   * Valida a conformidade da estrutura do manifesto_json com o Contrato 1 (RNF02 e RN02)
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

    const m = manifesto as Record<string, any>;

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
      m.metricas_suportadas.forEach((metrica: any, index: number) => {
        const prefixo = `Métrica [índice ${index}]`;

        if (!metrica || typeof metrica !== 'object' || Array.isArray(metrica)) {
          erros.push(`${prefixo}: deve ser um objeto JSON.`);
          return;
        }

        const idMetrica = metrica.id_metrica;
        const idLabel = idMetrica ? `'${idMetrica}'` : `[índice ${index}]`;

        // 6.1. id_metrica
        if (!idMetrica || typeof idMetrica !== 'string' || idMetrica.trim() === '') {
          erros.push(`${prefixo}: 'id_metrica' é obrigatório e deve ser uma string não vazia.`);
        }

        // 6.2. tipo_metrica
        if (!metrica.tipo_metrica || typeof metrica.tipo_metrica !== 'string') {
          erros.push(`Métrica ${idLabel}: 'tipo_metrica' é obrigatório e não pode ser nulo ou ausente.`);
        } else if (!this.TIPOS_METRICA_PERMITIDOS.includes(metrica.tipo_metrica)) {
          erros.push(
            `Métrica ${idLabel}: tipo '${metrica.tipo_metrica}' inválido. Tipos permitidos: ${this.TIPOS_METRICA_PERMITIDOS.map(t => `'${t}'`).join(', ')}.`
          );
        } else {
          // 6.3. Validações específicas por tipo
          if (metrica.tipo_metrica === 'numerica') {
            if (metrica.unidade !== undefined && typeof metrica.unidade !== 'string') {
              erros.push(`Métrica numérica ${idLabel}: o campo 'unidade' deve ser uma string.`);
            }
          } else if (metrica.tipo_metrica === 'categorica') {
            if (!metrica.valores || !Array.isArray(metrica.valores) || metrica.valores.length === 0) {
              erros.push(`Métrica categórica ${idLabel}: o campo 'valores' é obrigatório e deve ser um array não vazio de opções.`);
            } else {
              const temValorInvalido = metrica.valores.some((v: any) => typeof v !== 'string' || v.trim() === '');
              if (temValorInvalido) {
                erros.push(`Métrica categórica ${idLabel}: todos os itens do array 'valores' devem ser strings não vazias.`);
              }
            }
          }
        }
      });
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
      manifestoValido: m as ManifestoJogo
    };
  }
}
