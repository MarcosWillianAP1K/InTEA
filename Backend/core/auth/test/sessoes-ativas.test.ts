// ==============================================================================
// InTEA: Suíte de Testes para Gestão e Encerramento de Sessões Ativas (RF02)
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { SessoesAtivasService } from '../sessoes-ativas.service.js';
import { AuthController } from '../auth.controller.js';
import { authMiddleware, AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { supabase } from '../../supabase/supabase.client.js';

describe('SessoesAtivasService (RF02 - Gerenciamento de Sessões Ativas)', () => {
  const usuarioId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
  const token1 = 'jwt-token-dispositivo-desktop-windows-11111';
  const token2 = 'jwt-token-dispositivo-mobile-iphone-22222';
  const token3 = 'jwt-token-dispositivo-tablet-ipad-33333';

  beforeEach(() => {
    SessoesAtivasService.limparMemoria();
    vi.clearAllMocks();
  });

  describe('Criptografia e Detecção de Dispositivos', () => {
    it('deve gerar hash SHA-256 consistente para os tokens', () => {
      const hash1 = SessoesAtivasService.gerarHashToken(token1);
      const hash2 = SessoesAtivasService.gerarHashToken(token1);
      const hashOutro = SessoesAtivasService.gerarHashToken(token2);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hashOutro);
      expect(SessoesAtivasService.gerarHashToken('')).toBe('');
    });

    it('deve detectar corretamente os sistemas operacionais e navegadores a partir do User-Agent', () => {
      const uaWindows = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const uaMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
      const uaiPhone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      const uaiPad = 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';
      const uaAndroid = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
      const uaLinux = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0';

      expect(SessoesAtivasService.detectarDispositivo(uaWindows)).toBe('Chrome no Windows');
      expect(SessoesAtivasService.detectarDispositivo(uaMac)).toBe('Safari no macOS');
      expect(SessoesAtivasService.detectarDispositivo(uaiPhone)).toBe('Safari no iOS');
      expect(SessoesAtivasService.detectarDispositivo(uaiPad)).toBe('Safari no iOS');
      expect(SessoesAtivasService.detectarDispositivo(uaAndroid)).toBe('Chrome no Android');
      expect(SessoesAtivasService.detectarDispositivo(uaLinux)).toBe('Firefox no Linux');
      expect(SessoesAtivasService.detectarDispositivo(null)).toBe('Dispositivo Desconhecido');
    });
  });

  describe('Registro e Listagem de Sessões Ativas', () => {
    it('deve registrar sessões com sucesso e listar indicando a sessão atual', async () => {
      const sessao1 = await SessoesAtivasService.registrarSessao({
        usuarioId,
        token: token1,
        ip: '187.32.45.10',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      });

      const sessao2 = await SessoesAtivasService.registrarSessao({
        usuarioId,
        token: token2,
        ip: '201.55.88.99',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      });

      expect(sessao1.id).toBeDefined();
      expect(sessao2.id).toBeDefined();
      expect(sessao1.id).not.toBe(sessao2.id);

      const lista = await SessoesAtivasService.listarSessoes(usuarioId, token1);
      expect(lista).toHaveLength(2);

      const itemAtual = lista.find((s) => s.id === sessao1.id);
      const itemOutro = lista.find((s) => s.id === sessao2.id);

      expect(itemAtual?.atual).toBe(true);
      expect(itemOutro?.atual).toBe(false);
      expect(itemAtual?.ip_origem).toBe('187.32.45.10');
      expect(itemOutro?.ip_origem).toBe('201.55.88.99');
    });

    it('não deve listar sessões de outros terapeutas (isolamento por usuário)', async () => {
      const outroUsuarioId = '11111111-2222-3333-4444-555555555555';

      await SessoesAtivasService.registrarSessao({
        usuarioId,
        token: token1,
      });

      await SessoesAtivasService.registrarSessao({
        usuarioId: outroUsuarioId,
        token: token2,
      });

      const listaTerapeuta1 = await SessoesAtivasService.listarSessoes(usuarioId, token1);
      const listaTerapeuta2 = await SessoesAtivasService.listarSessoes(outroUsuarioId, token2);

      expect(listaTerapeuta1).toHaveLength(1);
      expect(listaTerapeuta2).toHaveLength(1);
      expect(listaTerapeuta1[0].id).not.toBe(listaTerapeuta2[0].id);
    });
  });

  describe('Revogação e Desconexão Remota (RF02)', () => {
    it('deve revogar todas as outras sessões ativas via revogarOutrasSessoes mantendo apenas a atual', async () => {
      await SessoesAtivasService.registrarSessao({ usuarioId, token: token1 });
      await SessoesAtivasService.registrarSessao({ usuarioId, token: token2 });
      await SessoesAtivasService.registrarSessao({ usuarioId, token: token3 });

      // Antes do logout-all: nenhum token está revogado
      expect(await SessoesAtivasService.isTokenRevogado(token1)).toBe(false);
      expect(await SessoesAtivasService.isTokenRevogado(token2)).toBe(false);
      expect(await SessoesAtivasService.isTokenRevogado(token3)).toBe(false);

      // Executa logout-all a partir da sessão 1
      const resultado = await SessoesAtivasService.revogarOutrasSessoes(usuarioId, token1);
      expect(resultado.revogadas).toBe(2);

      // Sessão 1 permanece ativa
      expect(await SessoesAtivasService.isTokenRevogado(token1)).toBe(false);

      // Sessões 2 e 3 agora estão revogadas
      expect(await SessoesAtivasService.isTokenRevogado(token2)).toBe(true);
      expect(await SessoesAtivasService.isTokenRevogado(token3)).toBe(true);

      // Listagem agora deve conter apenas a sessão 1 ativa
      const sessoesAtivas = await SessoesAtivasService.listarSessoes(usuarioId, token1);
      expect(sessoesAtivas).toHaveLength(1);
      expect(sessoesAtivas[0].atual).toBe(true);
    });

    it('deve revogar uma sessão remota específica por ID', async () => {
      await SessoesAtivasService.registrarSessao({ usuarioId, token: token1 });
      const sessaoRemota = await SessoesAtivasService.registrarSessao({ usuarioId, token: token2 });

      const revogado = await SessoesAtivasService.revogarSessaoPorId(usuarioId, sessaoRemota.id);
      expect(revogado).toBe(true);

      // Token da sessão remota agora está revogado
      expect(await SessoesAtivasService.isTokenRevogado(token2)).toBe(true);
      // Token da sessão corrente permanece ativo
      expect(await SessoesAtivasService.isTokenRevogado(token1)).toBe(false);

      // Tentativa de revogar novamente a mesma sessão deve retornar falso
      const revogadoNovamente = await SessoesAtivasService.revogarSessaoPorId(usuarioId, sessaoRemota.id);
      expect(revogadoNovamente).toBe(false);
    });

    it('não deve permitir que um usuário revogue a sessão de outro usuário por ID', async () => {
      const outroUsuarioId = '22222222-3333-4444-5555-666666666666';
      const sessaoOutro = await SessoesAtivasService.registrarSessao({
        usuarioId: outroUsuarioId,
        token: token2,
      });

      const tentativaInvasiva = await SessoesAtivasService.revogarSessaoPorId(usuarioId, sessaoOutro.id);
      expect(tentativaInvasiva).toBe(false);
      expect(await SessoesAtivasService.isTokenRevogado(token2)).toBe(false);
    });
  });
});

describe('AuthController - Endpoints de Sessões Ativas (RF02)', () => {
  const usuarioId = 'a1111111-2222-3333-4444-555555555555';
  const tokenAtual = 'jwt-token-atual-desktop';
  const tokenOutro = 'jwt-token-outro-celular';

  beforeEach(() => {
    SessoesAtivasService.limparMemoria();
    vi.clearAllMocks();
  });

  function criarMockResponse() {
    const res: Partial<Response> = {};
    res.statusCode = 200;
    res.status = vi.fn().mockImplementation((code: number) => {
      res.statusCode = code;
      return res as Response;
    });
    res.json = vi.fn().mockImplementation((_data: unknown) => {
      return res as Response;
    });
    return res as Response & { statusCode: number };
  }

  it('GET /api/auth/sessoes: deve listar sessões ativas do usuário autenticado com status 200', async () => {
    await SessoesAtivasService.registrarSessao({ usuarioId, token: tokenAtual, ip: '127.0.0.1' });
    await SessoesAtivasService.registrarSessao({ usuarioId, token: tokenOutro, ip: '192.168.1.100' });

    const req = {
      user: { id: usuarioId, email: 'terapeuta@intea.com.br' },
      headers: { authorization: `Bearer ${tokenAtual}` },
    } as unknown as Request;

    const res = criarMockResponse();

    await AuthController.listarSessoes(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ atual: true }),
          expect.objectContaining({ atual: false }),
        ]),
        total: 2,
      })
    );
  });

  it('POST /api/auth/logout-all: deve desconectar todas as outras sessões com status 200', async () => {
    await SessoesAtivasService.registrarSessao({ usuarioId, token: tokenAtual });
    await SessoesAtivasService.registrarSessao({ usuarioId, token: tokenOutro });

    const req = {
      user: { id: usuarioId },
      headers: { authorization: `Bearer ${tokenAtual}` },
    } as unknown as Request;

    const res = criarMockResponse();

    await AuthController.logoutAll(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: null,
        message: expect.stringContaining('desconectadas com sucesso'),
        sessoesRevogadas: 1,
      })
    );

    // O outro token deve ter sido invalidado
    expect(await SessoesAtivasService.isTokenRevogado(tokenOutro)).toBe(true);
    // O token atual continua válido
    expect(await SessoesAtivasService.isTokenRevogado(tokenAtual)).toBe(false);
  });

  it('DELETE /api/auth/sessoes/:id: deve revogar sessão específica retornando 200', async () => {
    await SessoesAtivasService.registrarSessao({ usuarioId, token: tokenAtual });
    const sessaoRemota = await SessoesAtivasService.registrarSessao({ usuarioId, token: tokenOutro });

    const req = {
      user: { id: usuarioId },
      params: { id: sessaoRemota.id },
      headers: { authorization: `Bearer ${tokenAtual}` },
    } as unknown as Request;

    const res = criarMockResponse();

    await AuthController.revogarSessao(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: null,
        message: expect.stringContaining('revogada com sucesso'),
      })
    );
  });

  it('deve retornar 401 se a requisição não estiver autenticada', async () => {
    const req = {
      user: undefined,
      headers: {},
      params: {},
    } as unknown as Request;

    const res1 = criarMockResponse();
    await AuthController.listarSessoes(req, res1);
    expect(res1.status).toHaveBeenCalledWith(401);

    const res2 = criarMockResponse();
    await AuthController.logoutAll(req, res2);
    expect(res2.status).toHaveBeenCalledWith(401);

    const res3 = criarMockResponse();
    await AuthController.revogarSessao(req, res3);
    expect(res3.status).toHaveBeenCalledWith(401);
  });
});

describe('authMiddleware - Bloqueio de Tokens Revogados (RF02)', () => {
  const usuarioId = 'b2222222-3333-4444-5555-666666666666';
  const tokenValido = 'jwt-token-valido-123';
  const tokenRevogado = 'jwt-token-revogado-456';

  beforeEach(async () => {
    SessoesAtivasService.limparMemoria();
    vi.clearAllMocks();

    // Registra token válido
    await SessoesAtivasService.registrarSessao({ usuarioId, token: tokenValido });

    // Registra token revogado
    await SessoesAtivasService.registrarSessao({ usuarioId, token: tokenRevogado });
    await SessoesAtivasService.revogarOutrasSessoes(usuarioId, tokenValido);
  });

  function criarMockResponse() {
    const res: Partial<Response> = {};
    res.statusCode = 200;
    res.status = vi.fn().mockImplementation((code: number) => {
      res.statusCode = code;
      return res as Response;
    });
    res.json = vi.fn().mockImplementation((_data: unknown) => {
      return res as Response;
    });
    return res as Response & { statusCode: number };
  }

  it('deve permitir passagem com next() quando o token é válido e a sessão está ativa', async () => {
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: {
        user: {
          id: usuarioId,
          email: 'terapeuta@intea.com.br',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    });

    const req = {
      headers: { authorization: `Bearer ${tokenValido}` },
    } as unknown as AuthenticatedRequest;

    const res = criarMockResponse();
    const next: NextFunction = vi.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user?.id).toBe(usuarioId);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve rejeitar imediatamente com HTTP 401 quando o token foi revogado remotamente via logout-all', async () => {
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: {
        user: {
          id: usuarioId,
          email: 'terapeuta@intea.com.br',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    });

    const req = {
      headers: { authorization: `Bearer ${tokenRevogado}` },
    } as unknown as AuthenticatedRequest;

    const res = criarMockResponse();
    const next: NextFunction = vi.fn();

    await authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('revogada remotamente'),
      })
    );
  });

  it('deve rejeitar com HTTP 401 se nenhum token Bearer for fornecido', async () => {
    const req = {
      headers: {},
    } as unknown as AuthenticatedRequest;

    const res = criarMockResponse();
    const next: NextFunction = vi.fn();

    await authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
