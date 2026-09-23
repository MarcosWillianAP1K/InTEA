import { ManifestoJogo, MetricaManifesto } from '../models/jogo.model.js';

export interface EventoTelemetria {
  token_sessao: string;
  data_hora: string;
  tipo_evento: string;
  dados: {
    id_metrica: string;
    valor: any;
  };
}

export interface ResultadoValidacaoProntuario {
  podeGravar: boolean;
  erro?: string;
  tipoDetectado?: 'numerica' | 'categorica';
  metricaHomologada?: MetricaManifesto;
}

export class MetricaValidator {
  public static readonly TIPOS_VALIDOS = ['numerica', 'categorica'] as const;

  /**
   * Strictly validates whether a metric definition has an authorized type (RN02).
   * Refuses any automatic fallback to 'categorica' or other types when undefined.
   *
   * @param metrica - Raw metric definition object from a game manifest.
   * @returns Validation result with boolean `valido` and error message if invalid.
   */
  static validarTipagemEstrita(metrica: any): { valido: boolean; erro?: string } {
    if (!metrica || typeof metrica !== 'object') {
      return {
        valido: false,
        erro: 'Objeto de métrica inválido.'
      };
    }

    const { id_metrica, tipo_metrica } = metrica;
    const label = id_metrica ? `'${id_metrica}'` : 'desconhecida';

    if (!tipo_metrica || typeof tipo_metrica !== 'string' || tipo_metrica.trim() === '') {
      return {
        valido: false,
        erro: `Métrica ${label} sem tipo definido. Rejeitada estritamente conforme RN02 (proibido fallback automático).`
      };
    }

    if (!this.TIPOS_VALIDOS.includes(tipo_metrica as any)) {
      return {
        valido: false,
        erro: `Métrica ${label} com tipo inválido '${tipo_metrica}'. Apenas 'numerica' e 'categorica' são permitidas.`
      };
    }

    return { valido: true };
  }

  /**
   * Validates whether a telemetry event can be safely persisted to a patient's clinical medical record (RN02 / RNF04).
   * Telemetry from untyped or mismatched metrics is strictly rejected to prevent record corruption.
   *
   * @param evento - Telemetry event payload containing session token, metric ID, and value.
   * @param manifesto - Approved game manifest containing clinical specifications.
   * @returns Object indicating if writing is permitted (`podeGravar`), detected type, and error if blocked.
   */
  static validarGravacaoProntuario(
    evento: any,
    manifesto: ManifestoJogo
  ): ResultadoValidacaoProntuario {
    if (!evento || !evento.dados || !evento.dados.id_metrica) {
      return {
        podeGravar: false,
        erro: 'Evento de telemetria mal formatado ou sem id_metrica nos dados.'
      };
    }

    const { id_metrica, valor } = evento.dados;

    // 1. Busca a métrica declarada no manifesto do jogo
    const metricaDeclarada = manifesto.metricas_suportadas?.find(
      m => m.id_metrica === id_metrica
    );

    if (!metricaDeclarada) {
      return {
        podeGravar: false,
        erro: `Métrica '${id_metrica}' não encontrada no manifesto do jogo. Gravação no prontuário bloqueada.`
      };
    }

    // 2. Validação estrita de tipo (RN02: sem fallback para categórica)
    const validacaoTipo = this.validarTipagemEstrita(metricaDeclarada);
    if (!validacaoTipo.valido) {
      return {
        podeGravar: false,
        erro: `Violação da RN02: ${validacaoTipo.erro} Telemetria não pode ser gravada no prontuário.`
      };
    }

    // 3. Validação do valor da telemetria de acordo com o tipo estrito da métrica
    if (metricaDeclarada.tipo_metrica === 'numerica') {
      if (typeof valor !== 'number' || isNaN(valor)) {
        return {
          podeGravar: false,
          erro: `Métrica numérica '${id_metrica}' recebeu valor não numérico (${typeof valor}: ${valor}). Gravação bloqueada.`
        };
      }
      return {
        podeGravar: true,
        tipoDetectado: 'numerica',
        metricaHomologada: metricaDeclarada
      };
    }

    if (metricaDeclarada.tipo_metrica === 'categorica') {
      if (typeof valor !== 'string') {
        return {
          podeGravar: false,
          erro: `Métrica categórica '${id_metrica}' requer valor em formato string, recebido (${typeof valor}).`
        };
      }

      if (metricaDeclarada.valores && !metricaDeclarada.valores.includes(valor)) {
        return {
          podeGravar: false,
          erro: `Valor '${valor}' não pertence ao domínio permitido de valores [${metricaDeclarada.valores.join(', ')}] para a métrica categórica '${id_metrica}'.`
        };
      }

      return {
        podeGravar: true,
        tipoDetectado: 'categorica',
        metricaHomologada: metricaDeclarada
      };
    }

    return {
      podeGravar: false,
      erro: `Tipo de métrica desconhecido para gravação no prontuário.`
    };
  }
}
