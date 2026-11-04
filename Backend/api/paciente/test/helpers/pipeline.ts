// ==============================================================================
// InTEA: Helpers de Pipeline Express para Testes de Integração de Rotas
// ==============================================================================

import type { Request, Response, Router } from 'express';

export interface OpcoesMockReqRes {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string | undefined>;
  user?: Record<string, unknown> | null;
  headers?: Record<string, string | undefined>;
  ip?: string;
}

export interface ItemEntidadeTeste {
  id?: string;
  nome?: string;
  email?: string | null;
  especialidade?: string | null;
  crefito?: string | null;
  registro_profissional?: string | null;
  status_ativo?: boolean;
  paciente_id?: string;
  terapeuta_id?: string;
  status?: string;
  [key: string]: unknown;
}

export interface EnvelopeDataTeste {
  paciente: ItemEntidadeTeste;
  pacientes: ItemEntidadeTeste[];
  responsavel: ItemEntidadeTeste;
  responsaveis: ItemEntidadeTeste[];
  terapeutas: ItemEntidadeTeste[];
  vinculo: ItemEntidadeTeste;
  sessoes: ItemEntidadeTeste[];
  auditoria: ItemEntidadeTeste[];
  registros: ItemEntidadeTeste[];
  eventos: ItemEntidadeTeste[];
  engajamento: Record<string, unknown>;
  jogo: ItemEntidadeTeste;
  jogos: ItemEntidadeTeste[];
  metricas: Record<string, unknown>;
  dados_clinicos: Record<string, unknown> | null;
  meta: {
    total?: number;
    pagina?: number;
    limite?: number;
    total_paginas?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    total_responsaveis?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface EnvelopeRespostaTeste {
  data: EnvelopeDataTeste;
  message?: string;
  error?: string;
  detalhes?: unknown;
  [key: string]: unknown;
}

export interface ResultadoMockReqRes<TJson = EnvelopeRespostaTeste> {
  req: Request;
  res: Response;
  getStatus: () => number;
  getJson: () => TJson;
  isSent: () => boolean;
}

export type HandlerExpress = (
  req: Request,
  res: Response,
  next: (err?: unknown) => void
) => Promise<void> | void;

/**
 * Creates a typed Express Request/Response mock pair for route pipeline testing.
 */
export function criarMockReqResPaciente<TJson = EnvelopeRespostaTeste>(
  opcoes: OpcoesMockReqRes = {}
): ResultadoMockReqRes<TJson> {
  let statusCode = 200;
  let jsonResult: unknown = null;
  let sent = false;

  const req = {
    body: opcoes.body || {},
    params: opcoes.params || {},
    query: opcoes.query || {},
    headers: opcoes.headers || { authorization: 'Bearer token-teste' },
    user: opcoes.user || null,
    ip: opcoes.ip || '127.0.0.1',
  } as unknown as Request;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: unknown) {
      jsonResult = data;
      sent = true;
      return this;
    },
    send(data?: unknown) {
      jsonResult = data;
      sent = true;
      return this;
    },
  } as unknown as Response;

  return {
    req,
    res,
    getStatus: () => statusCode,
    getJson: () => jsonResult as TJson,
    isSent: () => sent,
  };
}

/**
 * Sequentially executes an array of Express route middlewares and controller handlers.
 */
export function executarPipelinePaciente(
  handlers: HandlerExpress[],
  req: Request,
  res: Response
): Promise<void> {
  return new Promise((resolve, reject) => {
    let idx = 0;

    const resMutable = res as unknown as {
      json: (data: unknown) => Response;
      send: (data?: unknown) => Response;
    };

    const originalJson = resMutable.json?.bind(res);
    const originalSend = resMutable.send?.bind(res);

    resMutable.json = (data: unknown) => {
      const ret = originalJson ? originalJson(data) : res;
      resolve();
      return ret;
    };

    resMutable.send = (data?: unknown) => {
      const ret = originalSend ? originalSend(data) : res;
      resolve();
      return ret;
    };

    function next(err?: unknown) {
      if (err) return reject(err);
      if (idx < handlers.length) {
        const handler = handlers[idx++];
        Promise.resolve(handler(req, res, next)).catch(reject);
      } else {
        resolve();
      }
    }

    next();
  });
}

interface RouterLayerInterno {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: HandlerExpress }>;
  };
}

/**
 * Extracts the ordered stack of Express handlers registered on a Router for a path and HTTP method.
 */
export function obterHandlersPaciente(
  router: Router,
  path: string,
  method: string
): HandlerExpress[] {
  const stack = (router as unknown as { stack: RouterLayerInterno[] }).stack;
  const layer = stack.find(
    (l) => l.route?.path === path && l.route?.methods?.[method.toLowerCase()]
  );
  if (!layer?.route?.stack) {
    throw new Error(`Rota ${method.toUpperCase()} ${path} não encontrada no router`);
  }
  return layer.route.stack.map((s) => s.handle);
}
