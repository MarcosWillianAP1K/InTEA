import type { IncomingHttpHeaders } from 'node:http';

export interface HttpRequestContextInput {
  headers?: IncomingHttpHeaders | Record<string, string | string[] | undefined>;
  ip?: string | null;
  socket?: {
    remoteAddress?: string | null;
  } | null;
}

export interface HttpContext {
  ip: string | null;
  userAgent: string | null;
}

const MAX_IP_LENGTH = 45;

/**
 * Normalizes a single-value or multi-value HTTP header into a trimmed string.
 *
 * @param valor - Raw HTTP header value (string, string array, or undefined).
 * @returns Trimmed first non-empty header value, or `null` if unavailable.
 */
function normalizarHeaderUnico(valor: string | string[] | undefined): string | null {
  if (Array.isArray(valor)) {
    const primeiro = valor.find((item) => typeof item === 'string' && item.trim() !== '');
    return primeiro ? primeiro.trim() : null;
  }
  if (typeof valor === 'string' && valor.trim() !== '') {
    return valor.trim();
  }
  return null;
}

/**
 * Sanitizes and truncates a raw IP address string, stripping IPv6-mapped IPv4 prefixes.
 *
 * @param ipBruto - Raw IP address string extracted from request or proxy headers.
 * @returns Normalized IP string capped at 45 characters, or `null` if empty.
 */
function normalizarIpBruto(ipBruto?: string | null): string | null {
  if (typeof ipBruto !== 'string') return null;
  const limpo = ipBruto.trim().replace(/^::ffff:/i, '');
  if (!limpo) return null;
  return limpo.slice(0, MAX_IP_LENGTH);
}

/**
 * Extracts client IP (prioritizing trusted proxy `x-forwarded-for`) and `User-Agent` from an HTTP request.
 *
 * @param req - HTTP request context containing headers, IP, and socket metadata.
 * @returns Object containing normalized `ip` and `userAgent` strings (or `null` when absent).
 */
export function extrairContextoHttp(req?: HttpRequestContextInput | null): HttpContext {
  if (!req) {
    return { ip: null, userAgent: null };
  }

  const xForwardedFor = normalizarHeaderUnico(req.headers?.['x-forwarded-for']);
  const primeiroProxyIp = xForwardedFor
    ? xForwardedFor
        .split(',')
        .map((parte) => parte.trim())
        .find((parte) => Boolean(parte))
    : undefined;

  const ip =
    normalizarIpBruto(primeiroProxyIp) ??
    normalizarIpBruto(req.ip) ??
    normalizarIpBruto(req.socket?.remoteAddress) ??
    null;

  const userAgent = normalizarHeaderUnico(req.headers?.['user-agent']);

  return { ip, userAgent };
}
