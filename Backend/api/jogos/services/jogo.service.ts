// ==============================================================================
// InTEA: Serviço de Jogos Terapêuticos (Camada de Domínio / Fat Service)
// ==============================================================================
// Conformidade: RF09, RF19 (Catálogo), RNF02 (Manifesto), RN02 (Tipagem Estrita)
// ==============================================================================

import {
  JogoModel,
  Jogo,
  StatusJogo,
  FiltrosJogo,
  ResultadoPaginado,
  JogoResumo,
  ManifestoJogo,
  MetricaManifesto,
} from '../models/jogo.model.js';
import { ManifestoValidator } from '../validators/manifesto.validator.js';
import { MetricaValidator } from '../validators/metrica.validator.js';

export const STATUS_JOGO_PERMITIDOS: StatusJogo[] = ['ativo', 'desativado', 'manutencao', 'em_breve'];

export class JogoServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public detalhes?: unknown,
    public regraViolada?: string
  ) {
    super(message);
    this.name = 'JogoServiceError';
  }
}

export interface CadastrarJogoDTO {
  nome: string;
  descricao: string;
  versao: string;
  status?: StatusJogo;
  status_jogo?: StatusJogo;
  objetivo_clinico?: string;
  metricas_suportadas?: unknown[];
}

export interface AtualizarJogoDTO {
  nome?: string;
  descricao?: string;
  versao?: string;
  status?: StatusJogo;
  status_jogo?: StatusJogo;
  objetivo_clinico?: string;
  metricas_suportadas?: unknown[];
}

export class JogoService {
  /**
   * Generates a sanitized technical slug (id_jogo) from game name.
   *
   * @param nome - Game name.
   * @returns Sanitized slug string (e.g. "aventura-espacial").
   */
  static gerarSlug(nome: string): string {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  /**
   * Lists games from catalog with objective and status filters and pagination.
   *
   * @param filtros - Catalog filter options.
   * @returns Paginated games list.
   */
  static async listar(filtros: FiltrosJogo): Promise<ResultadoPaginado<JogoResumo>> {
    if (filtros.status && filtros.status !== 'todos' && filtros.status !== 'all' && !STATUS_JOGO_PERMITIDOS.includes(filtros.status as StatusJogo)) {
      throw new JogoServiceError(
        "Status inválido para filtro. Valores permitidos: 'ativo', 'desativado', 'manutencao', 'em_breve'.",
        400
      );
    }

    return await JogoModel.listar(filtros);
  }

  /**
   * Retrieves a single game by UUID or technical slug, validating manifest compliance.
   *
   * @param identificador - Game UUID or slug.
   * @returns Game data and compliance validation results.
   */
  static async buscarPorIdOuSlug(identificador: string): Promise<{ jogo: Jogo; validacao: { valido: boolean; erros: string[] } } | null> {
    if (!identificador || identificador.trim() === '') {
      throw new JogoServiceError('Identificador do jogo é obrigatório.', 400);
    }

    const jogo = await JogoModel.buscarPorId(identificador);
    if (!jogo) {
      return null;
    }

    const validacao = ManifestoValidator.validar(jogo.manifesto_json);

    return {
      jogo,
      validacao: {
        valido: validacao.valido,
        erros: validacao.erros,
      },
    };
  }

  /**
   * Registers a new game in catalog, generating automatic slug and validating clinical manifest.
   *
   * @param dto - New game payload.
   * @returns Created game record.
   */
  static async cadastrar(dto: CadastrarJogoDTO): Promise<Jogo> {
    if (!dto.nome || typeof dto.nome !== 'string' || dto.nome.trim() === '') {
      throw new JogoServiceError("O campo 'nome' é obrigatório e deve ser uma string.", 400);
    }

    if (!dto.descricao || typeof dto.descricao !== 'string' || dto.descricao.trim() === '') {
      throw new JogoServiceError("O campo 'descricao' é obrigatório e deve ser uma string.", 400);
    }

    if (!dto.versao || typeof dto.versao !== 'string' || dto.versao.trim() === '') {
      throw new JogoServiceError("O campo 'versao' é obrigatório e deve ser uma string.", 400);
    }

    const statusInformado: StatusJogo = dto.status ?? dto.status_jogo ?? 'ativo';
    if (!STATUS_JOGO_PERMITIDOS.includes(statusInformado)) {
      throw new JogoServiceError(
        "Status inválido. Valores permitidos: 'ativo', 'desativado', 'manutencao', 'em_breve'.",
        400
      );
    }

    // 1. Slugificação automatizada
    const id_jogo = JogoService.gerarSlug(dto.nome);

    // 2. Unicidade de slug no catálogo (409 Conflict)
    const existente = await JogoModel.buscarPorId(id_jogo);
    if (existente) {
      throw new JogoServiceError(`Já existe um jogo cadastrado com o identificador '${id_jogo}'.`, 409);
    }

    // 3. Montagem e validação estrita do manifesto clínico
    const manifesto_json: ManifestoJogo = {
      id_jogo,
      nome: dto.nome.trim(),
      versao: dto.versao.trim(),
      objetivo_clinico: typeof dto.objetivo_clinico === 'string' ? dto.objetivo_clinico.trim() : undefined,
      metricas_suportadas: Array.isArray(dto.metricas_suportadas) ? (dto.metricas_suportadas as unknown as MetricaManifesto[]) : [],
    };

    const validacao = ManifestoValidator.validar(manifesto_json);
    if (!validacao.valido) {
      const temErroRN02 = validacao.erros.some(
        e => e.includes('RN02') || e.includes('tipo_metrica') || e.includes('sem tipo') || e.includes('tipo \'')
      );
      if (temErroRN02) {
        throw new JogoServiceError(
          'Incompatibilidade de tipo clínico no manifesto (RN02).',
          422,
          validacao.erros,
          'RN02 - Fallback de Métrica Proibido'
        );
      }
      throw new JogoServiceError('Manifesto clínico do jogo inválido', 400, validacao.erros);
    }

    // 4. Persistência
    return await JogoModel.criar({
      nome: dto.nome.trim(),
      descricao: dto.descricao.trim(),
      versao: dto.versao.trim(),
      status_jogo: statusInformado,
      manifesto_json,
    });
  }

  /**
   * Updates game attributes, metadata, and operational status.
   *
   * @param identificador - Game UUID or slug.
   * @param dto - Updated fields.
   * @returns Updated game record.
   */
  static async atualizar(identificador: string, dto: AtualizarJogoDTO): Promise<Jogo> {
    const jogoExistente = await JogoModel.buscarPorId(identificador);
    if (!jogoExistente) {
      throw new JogoServiceError('Jogo não encontrado', 404);
    }

    const novoStatus: StatusJogo | undefined = dto.status ?? dto.status_jogo;
    if (novoStatus !== undefined && !STATUS_JOGO_PERMITIDOS.includes(novoStatus)) {
      throw new JogoServiceError(
        "Status inválido. Valores permitidos: 'ativo', 'desativado', 'manutencao', 'em_breve'.",
        400
      );
    }

    let manifesto_json = jogoExistente.manifesto_json;
    if (dto.nome || dto.versao || dto.objetivo_clinico !== undefined || dto.metricas_suportadas !== undefined) {
      const id_jogo = dto.nome ? JogoService.gerarSlug(dto.nome) : manifesto_json?.id_jogo;

      manifesto_json = {
        id_jogo: id_jogo ?? String(jogoExistente.id),
        nome: dto.nome?.trim() ?? manifesto_json?.nome ?? jogoExistente.nome,
        versao: dto.versao?.trim() ?? manifesto_json?.versao ?? jogoExistente.versao,
        objetivo_clinico:
          dto.objetivo_clinico !== undefined ? dto.objetivo_clinico : manifesto_json?.objetivo_clinico,
        metricas_suportadas: Array.isArray(dto.metricas_suportadas)
          ? (dto.metricas_suportadas as unknown as MetricaManifesto[])
          : (manifesto_json?.metricas_suportadas ?? []),
      };

      const validacao = ManifestoValidator.validar(manifesto_json);
      if (!validacao.valido) {
        const temErroRN02 = validacao.erros.some(
          e => e.includes('RN02') || e.includes('tipo_metrica') || e.includes('sem tipo') || e.includes('tipo \'')
        );
        if (temErroRN02) {
          throw new JogoServiceError(
            'Incompatibilidade de tipo clínico no manifesto (RN02).',
            422,
            validacao.erros,
            'RN02 - Fallback de Métrica Proibido'
          );
        }
        throw new JogoServiceError('Manifesto clínico do jogo inválido', 400, validacao.erros);
      }
    }

    const atualizado = await JogoModel.atualizar(jogoExistente.id, {
      nome: dto.nome?.trim(),
      descricao: dto.descricao?.trim(),
      versao: dto.versao?.trim(),
      status_jogo: novoStatus,
      manifesto_json,
    });

    if (!atualizado) {
      throw new JogoServiceError('Jogo não encontrado', 404);
    }

    return atualizado;
  }

  /**
   * Deletes a game physically (tests/dev).
   *
   * @param identificador - Game UUID or slug.
   * @returns Deleted game ID.
   */
  static async excluir(identificador: string): Promise<string | number> {
    const jogo = await JogoModel.buscarPorId(identificador);
    if (!jogo) {
      throw new JogoServiceError('Jogo não encontrado', 404);
    }

    const resultado = await JogoModel.excluir(jogo.id);
    if (!resultado.sucesso) {
      throw new JogoServiceError(resultado.motivo ?? 'Falha ao excluir o jogo.', 409);
    }

    return jogo.id;
  }

  /**
   * Validates an arbitrary game manifest against Contract 1 (RNF02).
   *
   * @param manifesto - Manifest object to validate.
   * @returns Validation outcome and normalized valid manifest.
   */
  static validarManifesto(manifesto: unknown): { valido: boolean; erros: string[]; manifestoValido?: unknown } {
    const resultado = ManifestoValidator.validar(manifesto);
    if (!resultado.valido) {
      const temErroRN02 = resultado.erros.some(
        e => e.includes('RN02') || e.includes('tipo_metrica') || e.includes('sem tipo') || e.includes('tipo \'')
      );
      if (temErroRN02) {
        throw new JogoServiceError(
          'Incompatibilidade de tipo clínico no manifesto (RN02).',
          422,
          resultado.erros,
          'RN02 - Fallback de Métrica Proibido'
        );
      }
      throw new JogoServiceError('Manifesto do jogo inválido', 400, resultado.erros);
    }
    return {
      valido: true,
      erros: [],
      manifestoValido: resultado.manifestoValido,
    };
  }

  /**
   * Validates a telemetry event against game manifest per RN02.
   *
   * @param identificador - Game UUID or slug.
   * @param evento - Telemetry event payload.
   * @returns Validation result.
   */
  static async validarTelemetria(identificador: string, evento: unknown): Promise<{ podeGravar: boolean; tipoDetectado?: string; metricaHomologada?: unknown }> {
    const jogo = await JogoModel.buscarPorId(identificador);
    if (!jogo) {
      throw new JogoServiceError('Jogo não encontrado', 404);
    }

    const resultado = MetricaValidator.validarGravacaoProntuario(evento, jogo.manifesto_json);
    if (!resultado.podeGravar) {
      throw new JogoServiceError(
        resultado.erro ?? 'Métrica incompatível com o manifesto.',
        422,
        undefined,
        'RN02 - Fallback de Métrica Proibido'
      );
    }

    return {
      podeGravar: true,
      tipoDetectado: resultado.tipoDetectado,
      metricaHomologada: resultado.metricaHomologada,
    };
  }
}
