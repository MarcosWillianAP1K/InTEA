-- ==============================================================================
-- PROJETO InTEA: MIGRAÇÃO 005 - METADADOS DE DISPOSITIVO E EXPIRAÇÃO DE SESSÃO
-- ==============================================================================
-- OBJETIVO:
-- Adicionar suporte para armazenamento de metadados do dispositivo conectado
-- (tipo de dispositivo, resolução, SO, versão do jogo) e controle de expiração
-- do token efêmero de pareamento na tabela `public.sessao` (RF10, RNF03, Sprint 8).
-- ==============================================================================

DO $$
BEGIN
    -- 1. Adiciona coluna de metadados do dispositivo pareado (JSONB)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sessao' 
          AND column_name = 'dispositivo_info'
    ) THEN
        ALTER TABLE public.sessao 
        ADD COLUMN dispositivo_info JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- 2. Adiciona coluna de data/hora limite para expiração do token de pareamento
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sessao' 
          AND column_name = 'expira_em'
    ) THEN
        ALTER TABLE public.sessao 
        ADD COLUMN expira_em TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Índice para acelerar a busca de sessões ativas e verificação de expiração
CREATE INDEX IF NOT EXISTS idx_sessao_status_expira 
ON public.sessao (status_sessao, expira_em);
