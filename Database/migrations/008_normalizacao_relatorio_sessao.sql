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

-- ==============================================================================
-- PARTE 2: TABELA anotacao_clinica (Prontuário Humano com Sessão Opcional)
-- ==============================================================================
-- Justificativa Clínica:
-- Anotações clínicas pertencem ao prontuário do paciente (paciente_id NOT NULL).
-- A relação com sessão é opcional (sessao_id NULLABLE ON DELETE SET NULL), pois
-- o terapeuta realiza anotações de evolução fora de jogos terapêuticos.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 7: Criação Idempotente da Tabela anotacao_clinica
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anotacao_clinica (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE RESTRICT,
    sessao_id UUID REFERENCES public.sessao(id) ON DELETE SET NULL,
    conteudo TEXT NOT NULL,
    soft_delete BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- PASSO 8: Comentários Semânticos de Documentação
-- ------------------------------------------------------------------------------
COMMENT ON TABLE public.anotacao_clinica IS 'Evoluções e anotações clínicas do prontuário médico (RF16, RN04, RN05). paciente_id é mandatório e sessao_id é opcional.';
COMMENT ON COLUMN public.anotacao_clinica.id IS 'Identificador único da anotação clínica (UUID).';
COMMENT ON COLUMN public.anotacao_clinica.terapeuta_id IS 'Terapeuta autor da anotação (autoria obrigatória via JWT - RF21).';
COMMENT ON COLUMN public.anotacao_clinica.paciente_id IS 'Paciente titular do prontuário médico (vínculo institucional obrigatório - RN04).';
COMMENT ON COLUMN public.anotacao_clinica.sessao_id IS 'Sessão clínica associada à anotação (opcional: NULL para observações avulsas).';
COMMENT ON COLUMN public.anotacao_clinica.conteudo IS 'Texto da evolução clínica ou anotação terapêutica.';
COMMENT ON COLUMN public.anotacao_clinica.soft_delete IS 'Flag de exclusão lógica para preservação do histórico clínico (RN05).';

-- ------------------------------------------------------------------------------
-- PASSO 9: Índices de Otimização e Performance
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_anotacao_paciente ON public.anotacao_clinica(paciente_id);
CREATE INDEX IF NOT EXISTS idx_anotacao_sessao ON public.anotacao_clinica(sessao_id);
CREATE INDEX IF NOT EXISTS idx_anotacao_terapeuta ON public.anotacao_clinica(terapeuta_id);

-- ------------------------------------------------------------------------------
-- PASSO 10: Habilitação de RLS e Políticas de Segurança com Blindagem RN04
-- ------------------------------------------------------------------------------
ALTER TABLE public.anotacao_clinica ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Consulta de anotacoes ativas da equipe" ON public.anotacao_clinica;
DROP POLICY IF EXISTS "Insercao de anotacao com autoria obrigatoria" ON public.anotacao_clinica;
DROP POLICY IF EXISTS "Insercao de anotacao com autoria e vinculo obrigatorio" ON public.anotacao_clinica;
DROP POLICY IF EXISTS "Edicao de anotacao propria" ON public.anotacao_clinica;

-- Consulta: apenas anotações ativas de pacientes que o terapeuta possui vínculo na clínica (RN04 / RN05)
CREATE POLICY "Consulta de anotacoes ativas da equipe"
ON public.anotacao_clinica FOR SELECT
TO authenticated
USING (
    soft_delete = FALSE AND (
        terapeuta_id = auth.uid() OR 
        public.terapeuta_tem_acesso_paciente(paciente_id) OR
        public.check_is_super_admin()
    )
);

-- Inserção: exige autoria (terapeuta_id = auth.uid()) E vínculo institucional com o paciente (RN04)
CREATE POLICY "Insercao de anotacao com autoria e vinculo obrigatorio"
ON public.anotacao_clinica FOR INSERT
TO authenticated
WITH CHECK (
    terapeuta_id = auth.uid() AND (
        public.terapeuta_tem_acesso_paciente(paciente_id) OR
        public.check_is_super_admin()
    )
);

-- Edição: autor da anotação pode editar se o registro estiver ativo e mantiver vínculo institucional
CREATE POLICY "Edicao de anotacao propria"
ON public.anotacao_clinica FOR UPDATE
TO authenticated
USING (
    terapeuta_id = auth.uid() AND 
    soft_delete = FALSE AND (
        public.terapeuta_tem_acesso_paciente(paciente_id) OR
        public.check_is_super_admin()
    )
);

