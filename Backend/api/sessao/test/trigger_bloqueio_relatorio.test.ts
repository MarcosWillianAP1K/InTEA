// ==============================================================================
// InTEA: Testes Unitários de Banco — Trigger de Bloqueio em relatorio_sessao
// Validação RN05 (Inalterabilidade do Histórico Clínico) e RNF06 (Integridade)
// ==============================================================================

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Função simuladora da exata semântica do trigger PL/pgSQL
 * public.impedir_modificacao_relatorio_sessao()
 */
interface RelatorioRow {
  sessao_id: string;
  conteudo: string | null;
  dados_ia_json: Record<string, unknown>;
  soft_delete: boolean;
  created_at: string;
  updated_at: string;
}

function executarTriggerRelatorioSessao(
  operacao: 'INSERT' | 'UPDATE' | 'DELETE',
  oldRow: RelatorioRow | null,
  newRow: RelatorioRow | null
): RelatorioRow {
  // 1. Bloqueio absoluto de DELETE físico (RN05)
  if (operacao === 'DELETE') {
    const erro = new Error(
      'Operacao proibida: Exclusao fisica de relatorio clinico e terminantemente vedada (RN05). O prontuario e inalteravel; utilize soft_delete = true.'
    ) as Error & { code: string };
    erro.code = '23505';
    throw erro;
  }

  // 2. Bloqueio de mutações não autorizadas em UPDATE (RN05 / RNF06)
  if (operacao === 'UPDATE') {
    if (!oldRow || !newRow) {
      throw new Error('Trigger UPDATE exige registros OLD e NEW.');
    }

    // Bloqueio de alteração do sessao_id
    if (newRow.sessao_id !== oldRow.sessao_id) {
      const erro = new Error(
        'Operacao proibida: O identificador da sessao (sessao_id) em relatorio_sessao e imutavel (RN05 / RNF06).'
      ) as Error & { code: string };
      erro.code = '23505';
      throw erro;
    }

    // Bloqueio de alteração dos dados brutos consolidados da síntese de IA
    const oldIaJsonStr = JSON.stringify(oldRow.dados_ia_json);
    const newIaJsonStr = JSON.stringify(newRow.dados_ia_json);
    if (oldIaJsonStr !== newIaJsonStr) {
      const erro = new Error(
        'Operacao proibida: Os dados consolidados da IA (dados_ia_json) sao estritamente imutaveis apos a criacao do relatorio (RN05 / RNF06).'
      ) as Error & { code: string };
      erro.code = '23505';
      throw erro;
    }

    // Atualização controlada permitida: atualiza updated_at
    return {
      ...newRow,
      updated_at: new Date().toISOString(),
    };
  }

  if (!newRow) {
    throw new Error('Operação INSERT exige newRow.');
  }
  return newRow;
}

describe('BD: Trigger de Bloqueio Estrito contra Alteração e Hard Delete em Relatórios (RN05 / RNF06)', () => {
  const caminhoMigration = path.resolve(
    process.cwd(),
    '../Database/migrations/009_trigger_bloqueio_relatorio.sql'
  );
  const caminhoDatabaseSql = path.resolve(
    process.cwd(),
    '../Database/database.sql'
  );

  describe('1. Verificação Estática de DDL e Sincronização de Banco (Single Source of Truth)', () => {
    it('o arquivo de migração 009_trigger_bloqueio_relatorio.sql deve existir e conter as declarações DDL', () => {
      expect(fs.existsSync(caminhoMigration)).toBe(true);

      const conteudoMigration = fs.readFileSync(caminhoMigration, 'utf-8');
      expect(conteudoMigration).toContain('FUNCTION public.impedir_modificacao_relatorio_sessao()');
      expect(conteudoMigration).toContain('TRIGGER trg_bloqueio_relatorio_sessao');
      expect(conteudoMigration).toContain('BEFORE UPDATE OR DELETE ON public.relatorio_sessao');
      expect(conteudoMigration).toContain('FOR EACH ROW');
      expect(conteudoMigration).toContain('RN05');
      expect(conteudoMigration).toContain('soft_delete');
      expect(conteudoMigration).toContain('dados_ia_json');
    });

    it('o arquivo Database/database.sql deve estar sincronizado com o trigger e a função', () => {
      expect(fs.existsSync(caminhoDatabaseSql)).toBe(true);

      const conteudoDatabaseSql = fs.readFileSync(caminhoDatabaseSql, 'utf-8');
      expect(conteudoDatabaseSql).toContain('FUNCTION public.impedir_modificacao_relatorio_sessao()');
      expect(conteudoDatabaseSql).toContain('TRIGGER trg_bloqueio_relatorio_sessao');
      expect(conteudoDatabaseSql).toContain('BEFORE UPDATE OR DELETE ON public.relatorio_sessao');
    });

    it('a migração deve ser idempotente contendo DROP TRIGGER IF EXISTS antes da criação', () => {
      const conteudoMigration = fs.readFileSync(caminhoMigration, 'utf-8');
      expect(conteudoMigration).toContain('DROP TRIGGER IF EXISTS trg_bloqueio_relatorio_sessao ON public.relatorio_sessao;');
      expect(conteudoMigration).toContain('DROP TRIGGER IF EXISTS trg_bloqueio_delete_relatorio ON public.relatorio_sessao;');
    });
  });

  describe('2. Critério de Aceite 1: Bloqueio de DELETE físico com mensagem explícita (RN05)', () => {
    const relatorioExistente: RelatorioRow = {
      sessao_id: '99999999-9999-4999-8999-999999999999',
      conteudo: 'Parecer técnico inicial do terapeuta.',
      dados_ia_json: {
        token_sessao: '999-999',
        duracao_segundos: 1200,
        resumo: { taxa_conclusao: 95, intervencoes_dda: 2 },
        analises_ia: ['Atenção sustentada estável durante toda a sessão.'],
        metricas_agregadas: [{ id_metrica: 'tempo_resposta', valor_dominante: 2.1, tendencia: 'estavel' }],
      },
      soft_delete: false,
      created_at: '2026-10-28T10:00:00Z',
      updated_at: '2026-10-28T10:00:00Z',
    };

    it('deve abortar imediatamente qualquer instrução DELETE física lançando exceção com código 23505', () => {
      expect(() => {
        executarTriggerRelatorioSessao('DELETE', relatorioExistente, null);
      }).toThrowError(
        /Operacao proibida: Exclusao fisica de relatorio clinico e terminantemente vedada \(RN05\)/i
      );

      try {
        executarTriggerRelatorioSessao('DELETE', relatorioExistente, null);
      } catch (err: unknown) {
        const sqlError = err as { code?: string; message: string };
        expect(sqlError.code).toBe('23505');
        expect(sqlError.message).toContain('soft_delete = true');
      }
    });
  });

  describe('3. Critério de Aceite 2: Bloqueio de adulteração de dados_ia_json e sessao_id (RNF06)', () => {
    const relatorioConsolidado: RelatorioRow = {
      sessao_id: '11111111-1111-4111-8111-111111111111',
      conteudo: 'Parecer consolidado emitido.',
      dados_ia_json: {
        token_sessao: '123-456',
        duracao_segundos: 900,
        resumo: { taxa_conclusao: 88, intervencoes_dda: 1 },
        analises_ia: ['Engajamento satisfatório no jogo.'],
        metricas_agregadas: [],
      },
      soft_delete: false,
      created_at: '2026-10-28T10:00:00Z',
      updated_at: '2026-10-28T10:00:00Z',
    };

    it('deve abortar qualquer tentativa de sobrescrever dados brutos da IA (dados_ia_json)', () => {
      const relatorioTentativaAdulteracaoIA: RelatorioRow = {
        ...relatorioConsolidado,
        dados_ia_json: {
          ...relatorioConsolidado.dados_ia_json,
          resumo: { taxa_conclusao: 100, intervencoes_dda: 0 }, // Alteração indevida de dados clínicos
        },
      };

      expect(() => {
        executarTriggerRelatorioSessao('UPDATE', relatorioConsolidado, relatorioTentativaAdulteracaoIA);
      }).toThrowError(
        /Os dados consolidados da IA \(dados_ia_json\) sao estritamente imutaveis apos a criacao do relatorio/i
      );
    });

    it('deve abortar tentativa de alterar a chave primária / vínculo de sessão (sessao_id)', () => {
      const relatorioTentativaTrocaSessao: RelatorioRow = {
        ...relatorioConsolidado,
        sessao_id: '22222222-2222-4222-8222-222222222222', // Troca proibida de sessão
      };

      expect(() => {
        executarTriggerRelatorioSessao('UPDATE', relatorioConsolidado, relatorioTentativaTrocaSessao);
      }).toThrowError(
        /O identificador da sessao \(sessao_id\) em relatorio_sessao e imutavel/i
      );
    });
  });

  describe('4. Mutações Controladas e Legítimas Permitidas em UPDATE', () => {
    const relatorioOriginal: RelatorioRow = {
      sessao_id: '11111111-1111-4111-8111-111111111111',
      conteudo: 'Observação preliminar.',
      dados_ia_json: {
        token_sessao: '123-456',
        duracao_segundos: 900,
        resumo: { taxa_conclusao: 88, intervencoes_dda: 1 },
        analises_ia: ['Engajamento satisfatório.'],
        metricas_agregadas: [],
      },
      soft_delete: false,
      created_at: '2026-10-28T10:00:00Z',
      updated_at: '2026-10-28T10:00:00Z',
    };

    it('deve permitir atualizar o parecer técnico do terapeuta (conteudo) e renovar updated_at', () => {
      const relatorioEdicaoParecer: RelatorioRow = {
        ...relatorioOriginal,
        conteudo: 'Parecer técnico ampliado e finalizado pelo especialista.',
      };

      const resultado = executarTriggerRelatorioSessao('UPDATE', relatorioOriginal, relatorioEdicaoParecer);

      expect(resultado.conteudo).toBe('Parecer técnico ampliado e finalizado pelo especialista.');
      expect(resultado.sessao_id).toBe(relatorioOriginal.sessao_id);
      expect(resultado.dados_ia_json).toEqual(relatorioOriginal.dados_ia_json);
      expect(resultado.updated_at).not.toBe(relatorioOriginal.updated_at);
    });

    it('deve permitir exclusão lógica através da transição do campo soft_delete para true (RN05)', () => {
      const relatorioSoftDelete: RelatorioRow = {
        ...relatorioOriginal,
        soft_delete: true,
      };

      const resultado = executarTriggerRelatorioSessao('UPDATE', relatorioOriginal, relatorioSoftDelete);

      expect(resultado.soft_delete).toBe(true);
      expect(resultado.sessao_id).toBe(relatorioOriginal.sessao_id);
      expect(resultado.updated_at).not.toBe(relatorioOriginal.updated_at);
    });
  });
});
