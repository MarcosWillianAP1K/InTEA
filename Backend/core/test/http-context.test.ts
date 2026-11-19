import { describe, it, expect } from 'vitest';
import { extrairContextoHttp } from '../utils/http-context.js';

describe('Core Utils: extrairContextoHttp', () => {
  it('deve priorizar o primeiro IP de x-forwarded-for removendo prefixo ::ffff:', () => {
    const ctx = extrairContextoHttp({
      headers: {
        'x-forwarded-for': '::ffff:177.22.10.5, 10.0.0.1',
        'user-agent': 'Mozilla/5.0 InTEA-Test',
      },
      ip: '127.0.0.1',
      socket: { remoteAddress: '::1' },
    });

    expect(ctx.ip).toBe('177.22.10.5');
    expect(ctx.userAgent).toBe('Mozilla/5.0 InTEA-Test');
  });

  it('deve aceitar x-forwarded-for em array e fazer fallback para req.ip e socket.remoteAddress', () => {
    expect(
      extrairContextoHttp({
        headers: { 'x-forwarded-for': ['200.10.20.30, 10.0.0.2'] },
      }).ip,
    ).toBe('200.10.20.30');

    expect(
      extrairContextoHttp({
        ip: '::ffff:192.168.0.15',
      }).ip,
    ).toBe('192.168.0.15');

    expect(
      extrairContextoHttp({
        socket: { remoteAddress: '::ffff:10.1.2.3' },
      }).ip,
    ).toBe('10.1.2.3');
  });

  it('deve truncar IP para no máximo 45 caracteres e retornar null quando ausente', () => {
    const ipMuitoLongo = '2001:0db8:85a3:0000:0000:8a2e:0370:7334:extra-long-suffix';
    const ctxLongo = extrairContextoHttp({ ip: ipMuitoLongo });

    expect(ctxLongo.ip).toHaveLength(45);
    expect(extrairContextoHttp({})).toEqual({ ip: null, userAgent: null });
    expect(extrairContextoHttp(null)).toEqual({ ip: null, userAgent: null });
  });
});
