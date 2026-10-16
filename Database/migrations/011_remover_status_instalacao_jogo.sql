-- ==============================================================================
-- InTEA: Migration 011 - Remoção de status_instalacao e adição de status operacional da tabela jogo
-- ==============================================================================
-- 1. Remove status_instalacao (campo estático legado sem valor operacional).
-- 2. Adiciona status_jogo com as 4 categorias operacionais:
--    'ativo', 'desativado', 'manutencao', 'em_breve'
-- ==============================================================================

ALTER TABLE public.jogo DROP COLUMN IF EXISTS status_instalacao;

-- Adiciona coluna status_jogo com valor padrão 'ativo'
ALTER TABLE public.jogo 
ADD COLUMN IF NOT EXISTS status_jogo VARCHAR(30) DEFAULT 'ativo' NOT NULL;

-- Garante a restrição das 4 categorias de status
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_status_jogo'
    ) THEN
        ALTER TABLE public.jogo 
        ADD CONSTRAINT chk_status_jogo 
        CHECK (status_jogo IN ('ativo', 'desativado', 'manutencao', 'em_breve'));
    END IF;
END $$;
