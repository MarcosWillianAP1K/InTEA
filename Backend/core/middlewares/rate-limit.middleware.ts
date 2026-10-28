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
 * Utility to reset in-memory rate limiting counters between automated test runs.
 * Test Isolation: Clears request buckets to prevent false positive 429 errors during testing.
 */
export function resetarRateLimits(): void {
  loginMemoryStore.resetAll();
  parearMemoryStore.resetAll();
}

/**
 * Rate limiting middleware for authentication and login endpoints (RNF03).
 * Brute Force Protection (RNF03): Restricts requests to 5 attempts per IP per 15-minute window.
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
 * Rate limiting middleware for remote game pairing handshake endpoints (RNF03).
 * PIN Brute Force Guard: Restricts pairing attempts to 10 requests per IP per 15-minute window.
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
