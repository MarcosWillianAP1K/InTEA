-- ==============================================================================
-- InTEA: Migration 023 - Consentimento Parental e Trilha Imutável (LGPD Art. 14 §1º)
-- ==============================================================================
-- Escopo (P0.3):
-- 1. Criação da tabela append-only public.consentimento_responsavel para registro
--    de concessão e revogação de consentimento específico e em destaque de pais
--    ou responsáveis legais no tratamento de dados de crianças e adolescentes.
-- 2. Trigger BEFORE UPDATE OR DELETE e BEFORE TRUNCATE garantindo imutabilidade
--    estrita da trilha (revogações são registradas como nova linha com
--    consentimento_concedido = FALSE).
-- 3. Índice composto para consulta rápida do estado vigente por paciente.
-- 4. Políticas de Row Level Security (RLS) restritas por vínculo institucional (RN04).
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.consentimento_responsavel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE RESTRICT,
    responsavel_id UUID REFERENCES public.responsavel(id) ON DELETE RESTRICT,
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    versao_termo VARCHAR(50) NOT NULL DEFAULT 'v1.0',
    finalidades JSONB NOT NULL DEFAULT '["acompanhamento_clinico", "telemetria_terapeutica", "relatorios_ia"]'::jsonb,
    consentimento_concedido BOOLEAN NOT NULL DEFAULT TRUE,
    ip_origem VARCHAR(45) NULL,
    user_agent TEXT NULL,
    canal_coleta VARCHAR(50) NOT NULL DEFAULT 'presencial_web',
    observacoes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Trigger de Imutabilidade Estrita (Append-Only — LGPD Art. 14 §1º / RN05)
CREATE OR REPLACE FUNCTION public.impedir_modificacao_consentimento_responsavel()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operacao proibida: Registros de consentimento parental (LGPD Art. 14) sao estritamente imutaveis. Para revogar ou atualizar o consentimento, insira um novo registro na trilha (RN05 / RNF06).'
        USING ERRCODE = '23505';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloqueio_mutacao_consentimento ON public.consentimento_responsavel;
CREATE TRIGGER trg_bloqueio_mutacao_consentimento
    BEFORE UPDATE OR DELETE ON public.consentimento_responsavel
    FOR EACH ROW
    EXECUTE FUNCTION public.impedir_modificacao_consentimento_responsavel();

DROP TRIGGER IF EXISTS trg_bloqueio_truncate_consentimento ON public.consentimento_responsavel;
CREATE TRIGGER trg_bloqueio_truncate_consentimento
    BEFORE TRUNCATE ON public.consentimento_responsavel
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.impedir_modificacao_consentimento_responsavel();

-- Índice para busca rápida do último estado de consentimento e histórico por paciente
CREATE INDEX IF NOT EXISTS idx_consentimento_paciente_created
    ON public.consentimento_responsavel(paciente_id, created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.consentimento_responsavel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consentimento_select_equipe" ON public.consentimento_responsavel;
CREATE POLICY "consentimento_select_equipe" ON public.consentimento_responsavel
    FOR SELECT TO authenticated
    USING (public.rls_tem_vinculo_paciente(paciente_id));

DROP POLICY IF EXISTS "consentimento_insert_equipe" ON public.consentimento_responsavel;
CREATE POLICY "consentimento_insert_equipe" ON public.consentimento_responsavel
    FOR INSERT TO authenticated
    WITH CHECK (
        public.rls_is_super_admin()
        OR (
            terapeuta_id = auth.uid()
            AND public.rls_tem_vinculo_paciente(paciente_id)
        )
    );
