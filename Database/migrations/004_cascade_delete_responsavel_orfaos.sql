-- ==============================================================================
-- PROJETO InTEA: MIGRAÇÃO 004 - TRIGGER DE EXCLUSÃO EM CASCATA PARA RESPONSÁVEIS ÓRFÃOS
-- ==============================================================================
-- OBJETIVO:
-- Garantir que ao excluir fisicamente um paciente (hard delete em ambiente de dev/testes),
-- os registros da tabela `public.responsavel` vinculados exclusivamente a esse paciente
-- também sejam removidos automaticamente, evitando retenção de dados residuais e CPF órfão.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_limpar_responsavel_orfaos()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o responsável não estiver vinculado a nenhum outro paciente, apaga da tabela responsavel
    IF NOT EXISTS (
        SELECT 1 FROM public.paciente_responsavel
        WHERE responsavel_id = OLD.responsavel_id
    ) THEN
        DELETE FROM public.responsavel
        WHERE id = OLD.responsavel_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_limpar_responsavel_orfaos ON public.paciente_responsavel;

CREATE TRIGGER trg_limpar_responsavel_orfaos
AFTER DELETE ON public.paciente_responsavel
FOR EACH ROW
EXECUTE FUNCTION public.fn_limpar_responsavel_orfaos();
