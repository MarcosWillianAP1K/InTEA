-- ==============================================================================
-- InTEA: Migration 015 - Adição de status_ativo na tabela clinica
-- Conformidade: RF07 (Gestão SuperAdmin), RF08
-- Idempotente e segura para rollback
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'clinica'
          AND column_name = 'status_ativo'
    ) THEN
        ALTER TABLE public.clinica
        ADD COLUMN status_ativo BOOLEAN DEFAULT TRUE NOT NULL;
    END IF;
END $$;

COMMENT ON COLUMN public.clinica.status_ativo IS 'Flag de controle institucional: indica se a clínica conveniada está autorizada e ativa no ecossistema InTEA (RF07).';
