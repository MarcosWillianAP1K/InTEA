import rateLimit, { MemoryStore } from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';

/**
 * ==============================================================================
 * RATE LIMITING CONTRA FORÇA BRUTA (RF01, RNF03)
 * Módulo de segurança para proteção de autenticação e pareamento remoto.
 * - Limite de 5 tentativas de login por IP a cada 15 minutos (HTTP 429).
 * - Limite de 10 checagens de PIN em /api/sessao/parear contra enumeração exaustiva.
 * - Injeção padronizada de header Retry-After com o tempo restante de bloqueio.
 * ==============================================================================
 */

export const loginMemoryStore = new MemoryStore();
export const parearMemoryStore = new MemoryStore();

/**
 * Utilitário para redefinir contadores em memória (essencial para isolamento de testes).
 */
export function resetarRateLimits(): void {
  loginMemoryStore.resetAll();
  parearMemoryStore.resetAll();
}

/**
 * Middleware de Rate Limiting para Login (RNF03).
 * Limite: 5 requisições por IP a cada 15 minutos.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  store: loginMemoryStore,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
  },
  skip: (req: Request) => {
    // Permite bypass apenas em testes que declarem explicitamente o header
    return Boolean(req.headers && req.headers['x-skip-rate-limit']);
  },
  handler: (req: Request, res: Response, _next: NextFunction, options) => {
    const rateLimitInfo = (req as Request & { rateLimit?: { resetTime?: Date } }).rateLimit;
    const tempoRestanteSegundos = rateLimitInfo?.resetTime
      ? Math.max(1, Math.ceil((rateLimitInfo.resetTime.getTime() - Date.now()) / 1000))
      : Math.ceil(options.windowMs / 1000);

    res.setHeader('Retry-After', String(tempoRestanteSegundos));
    res.status(429).json({
      error: 'Muitas tentativas de login realizadas a partir deste endereço IP.',
      detalhes: 'Limite de segurança de 5 tentativas a cada 15 minutos excedido. Aguarde antes de tentar novamente.',
      retryAfter: tempoRestanteSegundos,
    });
  },
});

/**
 * Middleware de Rate Limiting para Pareamento Remoto (/api/sessao/parear) (RNF03).
 * Limite: 10 checagens de PIN por IP a cada 15 minutos contra enumeração exaustiva.
 */
export const parearRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 tentativas
  store: parearMemoryStore,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
  },
  skip: (req: Request) => {
    return Boolean(req.headers && req.headers['x-skip-rate-limit']);
  },
  handler: (req: Request, res: Response, _next: NextFunction, options) => {
    const rateLimitInfo = (req as Request & { rateLimit?: { resetTime?: Date } }).rateLimit;
    const tempoRestanteSegundos = rateLimitInfo?.resetTime
      ? Math.max(1, Math.ceil((rateLimitInfo.resetTime.getTime() - Date.now()) / 1000))
      : Math.ceil(options.windowMs / 1000);

    res.setHeader('Retry-After', String(tempoRestanteSegundos));
    res.status(429).json({
      error: 'Muitas tentativas de pareamento realizadas a partir deste dispositivo.',
      detalhes: 'Limite de segurança para validação de PIN excedido contra enumeração exaustiva. Aguarde antes de tentar novamente.',
      retryAfter: tempoRestanteSegundos,
    });
  },
});
