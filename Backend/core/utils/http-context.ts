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

function normalizarIpBruto(ipBruto?: string | null): string | null {
  if (typeof ipBruto !== 'string') return null;
  const limpo = ipBruto.trim().replace(/^::ffff:/i, '');
  if (!limpo) return null;
  return limpo.slice(0, MAX_IP_LENGTH);
}

/**
 * Extracts client IP (prioritizing trusted proxy `x-forwarded-for`) and `User-Agent` from an HTTP request.
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
