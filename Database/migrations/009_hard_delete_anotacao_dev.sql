-- ==============================================================================
-- InTEA: Migration 009 - Remoção de Triggers de Bloqueio de Hard Delete (Fase de Testes / Dev)
-- ==============================================================================
-- Durante a fase de desenvolvimento e testes, os triggers de bloqueio físico
-- são desativados para permitir limpeza física permanente controlada em testes.
-- Na migração para produção final, os triggers de bloqueio RN05 serão reativados.
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_bloqueio_delete_anotacao ON public.anotacao_clinica;
DROP TRIGGER IF EXISTS trg_bloqueio_delete_relatorio ON public.relatorio_sessao;
