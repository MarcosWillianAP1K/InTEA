-- ==============================================================================
-- InTEA: Migration 025 - Trilha Unificada de Auditoria do Ecossistema (Item 3)
-- ==============================================================================
-- Conformidade: RF07, RF08, RF13, RNF06 (LGPD / Seguranca Forense), RN05
-- Caracteristicas:
--   1. Tabela unica append-only `public.auditoria_evento` cobrindo todo o ecossistema
--      (autenticacao, terapeuta, paciente, vinculo, sessao, anotacao, clinica,
--      jogo, relatorio, exportacao, sistema).
--   2. Imutabilidade estrita via triggers BEFORE UPDATE OR DELETE e BEFORE TRUNCATE.
--   3. RLS restrita exclusivamente a SuperAdmins para leitura (SELECT).
--   4. Backfill 100% idempotente e resiliente das 3 tabelas legadas (sem apagar
--      registros historicos — RN05).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Tabela Unificada: public.auditoria_evento
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auditoria_evento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entidade VARCHAR(50) NOT NULL,
    acao VARCHAR(80) NOT NULL,
    origem VARCHAR(50) NOT NULL DEFAULT 'terapeuta_web',
    terapeuta_id UUID REFERENCES public.terapeuta(id) ON DELETE SET NULL,
    paciente_id UUID REFERENCES public.paciente(id) ON DELETE RESTRICT,
    sessao_id UUID REFERENCES public.sessao(id) ON DELETE RESTRICT,
    clinica_id UUID REFERENCES public.clinica(id) ON DELETE SET NULL,
    recurso_id UUID NULL,
    descricao TEXT NULL,
    detalhes_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

COMMENT ON TABLE public.auditoria_evento IS 'Trilha unificada e imutavel de auditoria clinica e administrativa de todo o ecossistema InTEA (RF07, RF08, RF13, RNF06, RN05).';

-- ------------------------------------------------------------------------------
-- 2. Imutabilidade Forense (RN05 / RNF06)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.impedir_modificacao_auditoria_evento()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operacao proibida: Registros da trilha de auditoria unificada sao estritamente imutaveis (RN05 / RNF06).'
        USING ERRCODE = '23505';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloqueio_mutacao_auditoria_evento ON public.auditoria_evento;
CREATE TRIGGER trg_bloqueio_mutacao_auditoria_evento
    BEFORE UPDATE OR DELETE ON public.auditoria_evento
    FOR EACH ROW
    EXECUTE FUNCTION public.impedir_modificacao_auditoria_evento();

CREATE OR REPLACE FUNCTION public.impedir_truncate_auditoria()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operacao proibida: Truncamento de tabelas da trilha de auditoria clinica e terminantemente vedado (RN05 / RNF06).'
        USING ERRCODE = '23505';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloqueio_truncate_auditoria_evento ON public.auditoria_evento;
CREATE TRIGGER trg_bloqueio_truncate_auditoria_evento
    BEFORE TRUNCATE ON public.auditoria_evento
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.impedir_truncate_auditoria();

-- ------------------------------------------------------------------------------
-- 3. Indices de Consulta e Filtragem
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_auditoria_evento_created_at
    ON public.auditoria_evento(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auditoria_evento_entidade_acao
    ON public.auditoria_evento(entidade, acao);

CREATE INDEX IF NOT EXISTS idx_auditoria_evento_terapeuta
    ON public.auditoria_evento(terapeuta_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auditoria_evento_paciente
    ON public.auditoria_evento(paciente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auditoria_evento_sessao
    ON public.auditoria_evento(sessao_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auditoria_evento_clinica
    ON public.auditoria_evento(clinica_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auditoria_evento_detalhes_gin
    ON public.auditoria_evento USING gin (detalhes_json);

-- ------------------------------------------------------------------------------
-- 4. Row Level Security (Somente ADMIN le eventos de auditoria)
-- ------------------------------------------------------------------------------
ALTER TABLE public.auditoria_evento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auditoria_evento_select_super_admin" ON public.auditoria_evento;
CREATE POLICY "auditoria_evento_select_super_admin" ON public.auditoria_evento
    FOR SELECT TO authenticated
    USING (public.rls_is_super_admin());

DROP POLICY IF EXISTS "auditoria_evento_insert_autenticados" ON public.auditoria_evento;
CREATE POLICY "auditoria_evento_insert_autenticados" ON public.auditoria_evento
    FOR INSERT TO authenticated
    WITH CHECK (public.rls_is_super_admin() OR terapeuta_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 5. Backfill Idempotente das Trilhas Legadas (com protecao contra FKs orfas)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'auditoria_sessao'
    ) THEN
        INSERT INTO public.auditoria_evento (
            id,
            entidade,
            acao,
            origem,
            terapeuta_id,
            paciente_id,
            sessao_id,
            clinica_id,
            recurso_id,
            descricao,
            detalhes_json,
            ip,
            user_agent,
            created_at
        )
        SELECT
            a.id,
            CASE
                WHEN a.acao = 'acesso_prontuario' THEN 'paciente'
                WHEN a.acao LIKE 'vinculo_%' THEN 'vinculo'
                ELSE 'sessao'
            END AS entidade,
            a.acao,
            COALESCE(NULLIF(a.origem, ''), 'terapeuta_web') AS origem,
            t.id AS terapeuta_id,
            p.id AS paciente_id,
            s.id AS sessao_id,
            c.id AS clinica_id,
            COALESCE(s.id, p.id) AS recurso_id,
            NULLIF(TRIM(COALESCE(a.detalhes_json->>'descricao', a.detalhes_json->>'motivo', '')), '') AS descricao,
            COALESCE(a.detalhes_json, '{}'::jsonb),
            a.ip,
            a.user_agent,
            a.created_at
        FROM public.auditoria_sessao a
        LEFT JOIN public.terapeuta t ON t.id = a.terapeuta_id
        LEFT JOIN public.sessao s ON s.id = a.sessao_id
        LEFT JOIN public.paciente p ON p.id = s.paciente_id
        LEFT JOIN public.clinica c ON c.id = COALESCE(p.clinica_id, t.clinica_id)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'auditoria_acesso_prontuario'
    ) THEN
        INSERT INTO public.auditoria_evento (
            id,
            entidade,
            acao,
            origem,
            terapeuta_id,
            paciente_id,
            sessao_id,
            clinica_id,
            recurso_id,
            descricao,
            detalhes_json,
            ip,
            user_agent,
            created_at
        )
        SELECT
            ap.id,
            'paciente' AS entidade,
            CASE
                WHEN ap.operacao = 'visualizacao' THEN 'acesso_prontuario'
                WHEN ap.operacao = 'alteracao' THEN 'paciente_atualizado'
                WHEN ap.operacao = 'exclusao_logica' THEN 'paciente_desativado'
                ELSE COALESCE(NULLIF(ap.operacao, ''), 'acesso_prontuario')
            END AS acao,
            'terapeuta_web' AS origem,
            t.id AS terapeuta_id,
            p.id AS paciente_id,
            NULL::uuid AS sessao_id,
            c.id AS clinica_id,
            p.id AS recurso_id,
            ap.recurso_acessado AS descricao,
            COALESCE(ap.detalhes_json, '{}'::jsonb) || jsonb_build_object(
                'operacao', ap.operacao,
                'recurso_acessado', ap.recurso_acessado
            ),
            ap.ip,
            ap.user_agent,
            ap.created_at
        FROM public.auditoria_acesso_prontuario ap
        LEFT JOIN public.terapeuta t ON t.id = ap.terapeuta_id
        LEFT JOIN public.paciente p ON p.id = ap.paciente_id
        LEFT JOIN public.clinica c ON c.id = COALESCE(p.clinica_id, t.clinica_id)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'auditoria_vinculo_acesso'
    ) THEN
        INSERT INTO public.auditoria_evento (
            id,
            entidade,
            acao,
            origem,
            terapeuta_id,
            paciente_id,
            sessao_id,
            clinica_id,
            recurso_id,
            descricao,
            detalhes_json,
            ip,
            user_agent,
            created_at
        )
        SELECT
            av.id,
            'vinculo' AS entidade,
            av.acao,
            'terapeuta_web' AS origem,
            t_autor.id AS terapeuta_id,
            p.id AS paciente_id,
            NULL::uuid AS sessao_id,
            c.id AS clinica_id,
            av.terapeuta_alvo_id AS recurso_id,
            CASE
                WHEN av.acao = 'vinculo_equipe_criado' THEN 'Especialista vinculado a equipe do paciente.'
                ELSE 'Especialista desvinculado da equipe do paciente.'
            END AS descricao,
            jsonb_build_object(
                'paciente_id', av.paciente_id,
                'terapeuta_autor_id', av.terapeuta_autor_id,
                'terapeuta_alvo_id', av.terapeuta_alvo_id,
                'terapeuta_alvo_nome', t_alvo.nome
            ),
            av.ip,
            av.user_agent,
            av.created_at
        FROM public.auditoria_vinculo_acesso av
        LEFT JOIN public.terapeuta t_autor ON t_autor.id = av.terapeuta_autor_id
        LEFT JOIN public.terapeuta t_alvo ON t_alvo.id = av.terapeuta_alvo_id
        LEFT JOIN public.paciente p ON p.id = av.paciente_id
        LEFT JOIN public.clinica c ON c.id = COALESCE(p.clinica_id, t_autor.clinica_id)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
