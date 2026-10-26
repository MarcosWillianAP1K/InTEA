// ==============================================================================
// InTEA: Middleware de Validação e Saneamento de Intervalo e Paginação (RNF03, RNF05)
// ==============================================================================

import type { Request, Response, NextFunction } from 'express';

export interface QueryRangeSanitized {
  dataInicio?: Date;
  dataFim?: Date;
  dataInicioIso?: string;
  dataFimIso?: string;
  page: number;
  limit: number;
  offset: number;
}

export interface RequestComQueryRange extends Request {
  queryRange?: QueryRangeSanitized;
}

// Regex rigoroso para validação de datas no padrão ISO 8601 (YYYY-MM-DD ou com horário/fuso)
const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Valida se uma string representa uma data válida e estritamente no padrão ISO 8601.
 *
 * @param valor - Valor extraído da query string.
 * @returns Objeto com Date instanciado ou null se for inválido.
 */
function parsearDataIsoSegura(valor: unknown): Date | null {
  if (typeof valor !== 'string') {
    return null;
  }

  const strLimpa = valor.trim();
  if (!strLimpa || !ISO_8601_REGEX.test(strLimpa)) {
    return null;
  }

  const data = new Date(strLimpa);
  if (Number.isNaN(data.getTime())) {
    return null;
  }

  return data;
}

/**
 * Verifica se a distância temporal entre duas datas ultrapassa o limite de 24 meses consecutivos.
 *
 * @param inicio - Data inicial do intervalo.
 * @param fim - Data final do intervalo.
 * @returns true se ultrapassar 24 meses; false caso contrário.
 */
function ultrapassaLimite24Meses(inicio: Date, fim: Date): boolean {
  const dataLimite = new Date(inicio.getTime());
  dataLimite.setUTCMonth(dataLimite.getUTCMonth() + 24);
  return fim.getTime() > dataLimite.getTime();
}

/**
 * Middleware Express para sanear parâmetros temporais (dataInicio, dataFim) e paginação (page, limit).
 * Protege o banco de dados contra exaustão de recursos, intervalos invertidos e table scans excessivos.
 *
 * Regras aplicadas:
 * - Validação estrita de formato ISO 8601 para dataInicio e dataFim (HTTP 400 se inválido).
 * - Bloqueio de intervalo invertido dataInicio > dataFim (HTTP 400).
 * - Bloqueio de período consecutivo superior a 24 meses (HTTP 400).
 * - Clamping de paginação: limit padrão 20, máximo 100, mínimo 1.
 * - Normalização de page: mínimo 1, padrão 1.
 */
export function validarIntervaloHistorico(
  req: RequestComQueryRange,
  res: Response,
  next: NextFunction
): void {
  const query = req.query as Record<string, unknown>;

  let dataInicioParsed: Date | undefined;
  let dataFimParsed: Date | undefined;

  // 1. Validação de dataInicio (se fornecida)
  if (query.dataInicio !== undefined && query.dataInicio !== null && query.dataInicio !== '') {
    const parsed = parsearDataIsoSegura(query.dataInicio);
    if (!parsed) {
      res.status(400).json({
        error: 'Formato de data inválido para "dataInicio". Utilize o padrão ISO 8601 (ex: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss.sssZ).',
      });
      return;
    }
    dataInicioParsed = parsed;
  }

  // 2. Validação de dataFim (se fornecida)
  if (query.dataFim !== undefined && query.dataFim !== null && query.dataFim !== '') {
    const parsed = parsearDataIsoSegura(query.dataFim);
    if (!parsed) {
      res.status(400).json({
        error: 'Formato de data inválido para "dataFim". Utilize o padrão ISO 8601 (ex: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss.sssZ).',
      });
      return;
    }
    dataFimParsed = parsed;
  }

  // 3. Verificação de intervalo temporal invertido (dataInicio > dataFim)
  if (dataInicioParsed && dataFimParsed) {
    if (dataInicioParsed.getTime() > dataFimParsed.getTime()) {
      res.status(400).json({
        error: 'Intervalo temporal invertido: "dataInicio" não pode ser posterior a "dataFim".',
      });
      return;
    }

    // 4. Bloqueio de intervalos superiores a 24 meses consecutivos
    if (ultrapassaLimite24Meses(dataInicioParsed, dataFimParsed)) {
      res.status(400).json({
        error: 'O intervalo de busca temporal excede o limite máximo permitido de 24 meses consecutivos. Por favor, refine os filtros da consulta.',
      });
      return;
    }
  }

  // 5. Clamping e Saneamento de Paginação (RNF05)
  // Page: mínimo 1, padrão 1
  let page = 1;
  if (query.page !== undefined && query.page !== null && query.page !== '') {
    const pageNum = Number.parseInt(String(query.page), 10);
    page = Number.isFinite(pageNum) && pageNum >= 1 ? pageNum : 1;
  }

  // Limit: padrão 20, máximo 100, mínimo 1
  let limit = 20;
  if (query.limit !== undefined && query.limit !== null && query.limit !== '') {
    const limitNum = Number.parseInt(String(query.limit), 10);
    if (Number.isFinite(limitNum)) {
      if (limitNum <= 0) {
        limit = 20;
      } else if (limitNum > 100) {
        limit = 100;
      } else {
        limit = limitNum;
      }
    } else {
      limit = 20;
    }
  }

  const offset = (page - 1) * limit;

  // 6. Atualização enriquecida no objeto da requisição (Strict TypeScript)
  const rangeSanitizado: QueryRangeSanitized = {
    dataInicio: dataInicioParsed,
    dataFim: dataFimParsed,
    dataInicioIso: dataInicioParsed ? dataInicioParsed.toISOString() : undefined,
    dataFimIso: dataFimParsed ? dataFimParsed.toISOString() : undefined,
    page,
    limit,
    offset,
  };

  req.queryRange = rangeSanitizado;

  // Atualiza req.query com os valores saneados para controladores compatíveis com query params
  req.query.page = String(page);
  req.query.limit = String(limit);
  if (dataInicioParsed) {
    req.query.dataInicio = dataInicioParsed.toISOString();
  }
  if (dataFimParsed) {
    req.query.dataFim = dataFimParsed.toISOString();
  }

  next();
}
