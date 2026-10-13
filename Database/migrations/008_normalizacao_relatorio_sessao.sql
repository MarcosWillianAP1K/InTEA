-- ==============================================================================
-- PROJETO InTEA: MIGRAÇÃO 008 - NORMALIZAÇÃO DA TABELA relatorio_sessao (3FN)
-- ==============================================================================
-- TASK: BD: (Fix) Saneamento da Tabela relatorio_sessao e Políticas RLS (Tipo: Fix)
-- RESPONSÁVEL: Marcos Willian (@MarcosWillianAP1K)
-- REQUISITOS: 3FN (Normalização Relacional), RN01 (Modo Livre sem Relatório), RN04, RN05
--
-- OBJETIVO:
-- 1. Normalizar a tabela relatorio_sessao em estrita conformidade com a 3FN.
-- 2. Eliminar chaves estrangeiras redundantes (paciente_id e terapeuta_id), pois
--    ambas já são unívocas e resolvidas na tabela pai sessao.
-- 3. Definir sessao_id como a própria PRIMARY KEY da tabela, refletindo a relação
--    existencial de 1:1 (ou 1:0..1) e eliminando a necessidade de ID artificial.
-- 4. Esclarecer que sessões em Modo Livre (RN01) NÃO geram relatório clínico.
-- 5. Reescrever as políticas RLS para consulta, inserção e atualização delegando
--    a verificação de autoria e vínculo institucional à tabela pai sessao (EXISTS).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 1: Criação da Tabela com Estrutura Saneada (caso ainda não exista)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.relatorio_sessao (
    sessao_id UUID PRIMARY KEY REFERENCES public.sessao(id) ON DELETE RESTRICT,
    conteudo TEXT, -- Parecer técnico e observações consolidadas do terapeuta
    dados_ia_json JSONB DEFAULT '{}'::jsonb, -- Contrato 4: Taxa de conclusão, DDA, análises IA
    soft_delete BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- PASSO 2: Limpeza Prévia de Políticas e Índices Antigos (Anti-bloqueio)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Consulta de relatorios clinicos" ON public.relatorio_sessao;
DROP POLICY IF EXISTS "Insercao de relatorio consolidado" ON public.relatorio_sessao;
DROP POLICY IF EXISTS "Edicao de relatorio consolidado" ON public.relatorio_sessao;
DROP INDEX IF EXISTS public.idx_relatorio_paciente;
DROP INDEX IF EXISTS public.idx_relatorio_sessao_id;

-- ------------------------------------------------------------------------------
-- PASSO 3: Saneamento Idempotente de Colunas e Constraints Legadas
-- ------------------------------------------------------------------------------
ALTER TABLE public.relatorio_sessao DROP CONSTRAINT IF EXISTS relatorio_sessao_paciente_id_fkey;
ALTER TABLE public.relatorio_sessao DROP CONSTRAINT IF EXISTS relatorio_sessao_terapeuta_id_fkey;
ALTER TABLE public.relatorio_sessao DROP CONSTRAINT IF EXISTS relatorio_sessao_sessao_id_key;

-- Dropar PK antiga (se era a coluna 'id') e colunas redundantes
DO $$
BEGIN
    -- Se a coluna id existir, remover sua constraint de PK e dropar a coluna
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'relatorio_sessao' AND column_name = 'id'
    ) THEN
        ALTER TABLE public.relatorio_sessao DROP CONSTRAINT IF EXISTS relatorio_sessao_pkey CASCADE;
        ALTER TABLE public.relatorio_sessao DROP COLUMN IF EXISTS id CASCADE;
    END IF;

    -- Garantir que sessao_id seja a PRIMARY KEY
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'relatorio_sessao_pkey' AND conrelid = 'public.relatorio_sessao'::regclass
    ) THEN
        ALTER TABLE public.relatorio_sessao ADD CONSTRAINT relatorio_sessao_pkey PRIMARY KEY (sessao_id);
    END IF;
END $$;

ALTER TABLE public.relatorio_sessao
    DROP COLUMN IF EXISTS paciente_id CASCADE,
    DROP COLUMN IF EXISTS terapeuta_id CASCADE;

-- ------------------------------------------------------------------------------
-- PASSO 4: Salvaguarda de Imutabilidade e Soft Delete (RN05)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.impedir_hard_delete_clinico()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Exclusão física proibida por conformidade clínica (RN05). Altere soft_delete para TRUE.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloqueio_delete_relatorio ON public.relatorio_sessao;
CREATE TRIGGER trg_bloqueio_delete_relatorio
BEFORE DELETE ON public.relatorio_sessao
FOR EACH ROW EXECUTE FUNCTION public.impedir_hard_delete_clinico();

-- ------------------------------------------------------------------------------
-- PASSO 5: Comentários Semânticos de Documentação
-- ------------------------------------------------------------------------------
COMMENT ON TABLE public.relatorio_sessao IS 'Entidade de prontuário clínico que consolida o resultado da sessão e a síntese analítica da IA (3FN, RN05). Sessões de Modo Livre não geram relatório (RN01).';
COMMENT ON COLUMN public.relatorio_sessao.sessao_id IS 'Chave primária e estrangeira vinculada à sessão clínica correspondente (relação 1:1 estrita).';
COMMENT ON COLUMN public.relatorio_sessao.conteudo IS 'Parecer técnico e anotações consolidadas do terapeuta.';
COMMENT ON COLUMN public.relatorio_sessao.dados_ia_json IS 'Estrutura JSONB aderente ao Contrato 4 (taxa_conclusao, intervencoes_dda, analises_ia, metricas_agregadas).';
COMMENT ON COLUMN public.relatorio_sessao.soft_delete IS 'Flag de exclusão lógica para preservação do prontuário médico (RN05).';

-- ------------------------------------------------------------------------------
-- PASSO 6: Habilitação de RLS e Políticas Baseadas na Tabela Pai sessao
-- ------------------------------------------------------------------------------
ALTER TABLE public.relatorio_sessao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consulta de relatorios clinicos"
ON public.relatorio_sessao FOR SELECT
TO authenticated
USING (
    soft_delete = FALSE AND
    EXISTS (
        SELECT 1 FROM public.sessao s
        WHERE s.id = relatorio_sessao.sessao_id
          AND (
              s.terapeuta_id = auth.uid() OR 
              (s.paciente_id IS NOT NULL AND public.terapeuta_tem_acesso_paciente(s.paciente_id)) OR
              public.check_is_super_admin()
          )
    )
);

CREATE POLICY "Insercao de relatorio consolidado"
ON public.relatorio_sessao FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sessao s
        WHERE s.id = relatorio_sessao.sessao_id
          AND (s.terapeuta_id = auth.uid() OR public.check_is_super_admin())
    )
);

CREATE POLICY "Edicao de relatorio consolidado"
ON public.relatorio_sessao FOR UPDATE
TO authenticated
USING (
    soft_delete = FALSE AND
    EXISTS (
        SELECT 1 FROM public.sessao s
        WHERE s.id = relatorio_sessao.sessao_id
          AND (s.terapeuta_id = auth.uid() OR public.check_is_super_admin())
    )
);
