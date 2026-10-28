// ==============================================================================
// InTEA: Testes Unitários e Integração — Trilha de Auditoria de Acessos ao Prontuário
// Conformidade: RF08 (Auditoria de Acessos e Vínculos), RNF06 (LGPD / Segurança Forense)
// ==============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Request, Response } from 'express';
import { EventEmitter } from 'events';
import {
  AuditoriaProntuarioService,
  AuditoriaAcessoProntuario,
} from '../auditoria-prontuario.service.js';
import { auditoriaProntuarioMiddleware } from '../../paciente/middlewares/auditoria-prontuario.middleware.js';
import { AuditoriaController } from '../controllers/auditoria.controller.js';

/**
 * Simula o gatilho PL/pgSQL public.impedir_modificacao_auditoria_prontuario()
 */
function executarTriggerAuditoriaProntuario(
  operacao: 'INSERT' | 'UPDATE' | 'DELETE',
  oldRow: AuditoriaAcessoProntuario | null,
  newRow: AuditoriaAcessoProntuario | null
): AuditoriaAcessoProntuario {
  if (operacao === 'UPDATE' || operacao === 'DELETE') {
    const erro = new Error(
      'Operacao proibida: Registros da trilha de auditoria de prontuario sao estritamente imutaveis (RN05 / RNF06).'
    ) as Error & { code: string };
    erro.code = '23505';
    throw erro;
  }
  if (!newRow) throw new Error('INSERT exige newRow');
  return newRow;
}

function mockResponse() {
  const emitter = new EventEmitter();
  let statusCode = 200;
  let jsonData: any = null;

  const res = Object.assign(emitter, {
    statusCode: 200,
    status(code: number) {
      statusCode = code;
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      jsonData = data;
      return this;
    },
    send(data: any) {
      jsonData = data;
      return this;
    },
  }) as unknown as Response & EventEmitter;

  return {
    res,
    emitFinish: () => emitter.emit('finish'),
    getStatus: () => statusCode,
    getJson: () => jsonData,
  };
}

describe('BD/Back: Trilha de Auditoria de Acessos ao Prontuário Médico (RF08, RNF06)', () => {
  const caminhoMigration = path.resolve(
    process.cwd(),
    '../Database/migrations/012_auditoria_prontuario.sql'
  );
  const caminhoDatabaseSql = path.resolve(
    process.cwd(),
    '../Database/database.sql'
  );

  beforeEach(() => {
    AuditoriaProntuarioService.limparMemoria();
  });

  describe('1. Verificação Estática de DDL e Sincronização de Banco (Single Source of Truth)', () => {
    it('o arquivo de migração 012_auditoria_prontuario.sql deve existir e conter DDL da tabela e trigger', () => {
      expect(fs.existsSync(caminhoMigration)).toBe(true);

      const sql = fs.readFileSync(caminhoMigration, 'utf-8');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.auditoria_acesso_prontuario');
      expect(sql).toContain('paciente_id UUID NOT NULL');
      expect(sql).toContain('terapeuta_id UUID');
      expect(sql).toContain('operacao VARCHAR');
      expect(sql).toContain('recurso_acessado VARCHAR');
      expect(sql).toContain('FUNCTION public.impedir_modificacao_auditoria_prontuario()');
      expect(sql).toContain('TRIGGER trg_bloqueio_mutacao_auditoria_prontuario');
      expect(sql).toContain('BEFORE UPDATE OR DELETE ON public.auditoria_acesso_prontuario');
    });

    it('o arquivo Database/database.sql deve estar perfeitamente sincronizado', () => {
      expect(fs.existsSync(caminhoDatabaseSql)).toBe(true);

      const sql = fs.readFileSync(caminhoDatabaseSql, 'utf-8');
      expect(sql).toContain('TABLE IF NOT EXISTS public.auditoria_acesso_prontuario');
      expect(sql).toContain('FUNCTION public.impedir_modificacao_auditoria_prontuario()');
      expect(sql).toContain('TRIGGER trg_bloqueio_mutacao_auditoria_prontuario');
    });
  });

  describe('2. Critério de Aceite 2: Imutabilidade total garantida por trigger PostgreSQL (bloqueio total de UPDATE e DELETE)', () => {
    const registroExistente: AuditoriaAcessoProntuario = {
      id: '11111111-1111-4111-8111-111111111111',
      paciente_id: '22222222-2222-4222-8222-222222222222',
      terapeuta_id: '33333333-3333-4333-8333-333333333333',
      operacao: 'visualizacao',
      recurso_acessado: '/api/paciente/22222222-2222-4222-8222-222222222222',
      ip: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      detalhes_json: { metodo: 'GET', status_code: 200 },
      created_at: '2026-10-28T12:00:00Z',
    };

    it('deve abortar imediatamente qualquer instrução UPDATE disparando exceção 23505', () => {
      expect(() => {
        executarTriggerAuditoriaProntuario('UPDATE', registroExistente, {
          ...registroExistente,
          operacao: 'alteracao_adulterada',
        });
      }).toThrowError(/Registros da trilha de auditoria de prontuario sao estritamente imutaveis/i);

      try {
        executarTriggerAuditoriaProntuario('UPDATE', registroExistente, {
          ...registroExistente,
          operacao: 'alteracao_adulterada',
        });
      } catch (err: unknown) {
        const sqlError = err as { code?: string };
        expect(sqlError.code).toBe('23505');
      }
    });

    it('deve abortar imediatamente qualquer instrução DELETE disparando exceção 23505', () => {
      expect(() => {
        executarTriggerAuditoriaProntuario('DELETE', registroExistente, null);
      }).toThrowError(/Registros da trilha de auditoria de prontuario sao estritamente imutaveis/i);

      try {
        executarTriggerAuditoriaProntuario('DELETE', registroExistente, null);
      } catch (err: unknown) {
        const sqlError = err as { code?: string };
        expect(sqlError.code).toBe('23505');
      }
    });
  });

  describe('3. Critério de Aceite 1: Registro automático em tabela de auditoria a cada consulta a /api/paciente/:id', () => {
    it('deve registrar visualização (GET) de prontuário com terapeuta, IP e user-agent ao finalizar a resposta HTTP', async () => {
      const { res, emitFinish } = mockResponse();
      let nextCalled = false;

      const req = {
        method: 'GET',
        params: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
        originalUrl: '/api/paciente/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        headers: {
          'x-forwarded-for': '203.0.113.195',
          'user-agent': 'Chrome/120.0 (Windows)',
        },
        user: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
      } as unknown as Request;

      auditoriaProntuarioMiddleware(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);

      // Simula resposta HTTP 200 concluída
      res.statusCode = 200;
      emitFinish();

      // Dá tick para conclusão assíncrona
      await new Promise((r) => setTimeout(r, 10));

      const { data } = await AuditoriaProntuarioService.consultarAcessos({
        paciente_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      });

      expect(data).toHaveLength(1);
      const log = data[0];
      expect(log.paciente_id).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
      expect(log.terapeuta_id).toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
      expect(log.operacao).toBe('visualizacao');
      expect(log.ip).toBe('203.0.113.195');
      expect(log.user_agent).toBe('Chrome/120.0 (Windows)');
    });

    it('deve registrar alteração (PUT/PATCH) de prontuário adequadamente', async () => {
      const { res, emitFinish } = mockResponse();

      const req = {
        method: 'PATCH',
        params: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
        originalUrl: '/api/paciente/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        headers: {},
        user: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
      } as unknown as Request;

      auditoriaProntuarioMiddleware(req, res, () => {});

      res.statusCode = 200;
      emitFinish();

      await new Promise((r) => setTimeout(r, 10));

      const { data } = await AuditoriaProntuarioService.consultarAcessos({
        paciente_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        operacao: 'alteracao',
      });

      expect(data).toHaveLength(1);
      expect(data[0].operacao).toBe('alteracao');
    });

    it('deve registrar exclusão lógica (DELETE) de prontuário', async () => {
      const { res, emitFinish } = mockResponse();

      const req = {
        method: 'DELETE',
        params: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
        originalUrl: '/api/paciente/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        headers: {},
        user: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
      } as unknown as Request;

      auditoriaProntuarioMiddleware(req, res, () => {});

      res.statusCode = 200;
      emitFinish();

      await new Promise((r) => setTimeout(r, 10));

      const { data } = await AuditoriaProntuarioService.consultarAcessos({
        paciente_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        operacao: 'exclusao_logica',
      });

      expect(data).toHaveLength(1);
      expect(data[0].operacao).toBe('exclusao_logica');
    });
  });

  describe('4. Critério de Aceite 3: Suporte a consultas de auditoria por período e por terapeuta com status HTTP 200', () => {
    beforeEach(async () => {
      // Cria registros em datas e terapeutas diferentes
      await AuditoriaProntuarioService.registrarAcesso({
        paciente_id: '11111111-1111-4111-8111-111111111111',
        terapeuta_id: 'terapeuta-a-1111-4111-8111-111111111111',
        operacao: 'visualizacao',
        recurso_acessado: '/api/paciente/11111111-1111-4111-8111-111111111111',
      });

      await AuditoriaProntuarioService.registrarAcesso({
        paciente_id: '11111111-1111-4111-8111-111111111111',
        terapeuta_id: 'terapeuta-b-2222-4222-8222-222222222222',
        operacao: 'alteracao',
        recurso_acessado: '/api/paciente/11111111-1111-4111-8111-111111111111',
      });
    });

    it('deve consultar acessos filtrando por terapeuta_id', async () => {
      const resultado = await AuditoriaProntuarioService.consultarAcessos({
        terapeuta_id: 'terapeuta-a-1111-4111-8111-111111111111',
      });

      expect(resultado.total).toBe(1);
      expect(resultado.data[0].terapeuta_id).toBe('terapeuta-a-1111-4111-8111-111111111111');
      expect(resultado.data[0].operacao).toBe('visualizacao');
    });

    it('deve consultar acessos filtrando por período (ex: janela temporal de 7 dias ou hoje)', async () => {
      const resultado = await AuditoriaProntuarioService.consultarAcessos({
        periodo: '7d',
      });

      expect(resultado.total).toBeGreaterThanOrEqual(2);
      expect(resultado.page).toBe(1);
    });

    it('AuditoriaController.consultarAcessosProntuario: deve responder com status 200 e envelope categorizado', async () => {
      const { res, getStatus, getJson } = mockResponse();

      const req = {
        query: {
          terapeuta_id: 'terapeuta-b-2222-4222-8222-222222222222',
          periodo: '30d',
        },
      } as unknown as Request;

      await AuditoriaController.consultarAcessosProntuario(req, res);

      expect(getStatus()).toBe(200);
      const json = getJson();
      expect(json).toHaveProperty('data');
      expect(json.data).toHaveProperty('acessos');
      expect(json.data).toHaveProperty('meta');
      expect(json.data.meta.total).toBe(1);
      expect(json.data.acessos[0].terapeuta_id).toBe('terapeuta-b-2222-4222-8222-222222222222');
      expect(json.message).toContain('recuperados com sucesso');
    });
  });
});
