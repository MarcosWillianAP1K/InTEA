-- ==============================================================================
-- InTEA: Migration 024 - Governança do Terapeuta Responsável / Líder da Equipe
-- ==============================================================================
-- Escopo:
-- 1. Criação da tabela public.terapeuta_paciente_responsavel (cardinalidade 1:1
--    por paciente) que designa formalmente o Especialista Responsável (Líder) da
--    equipe multidisciplinar.
-- 2. Chave estrangeira composta fk_lider_vinculo_equipe garantindo que o líder
--    obrigatoriamente possua vínculo ativo em public.terapeuta_paciente.
-- 3. Backfill idempotente para pacientes existentes promovendo o vínculo mais
--    antigo da equipe como líder inicial.
-- 4. Atualização de public.desvincular_terapeuta_seguro para transferir a
--    liderança ao especialista ativo mais antigo caso o líder deixe a equipe.
-- 5. Políticas de Row Level Security (RLS) restritas por vínculo institucional (RN04).
-- ==============================================================================

-- 1. Tabela de Designação do Terapeuta Responsável (Líder) por Paciente
CREATE TABLE IF NOT EXISTS public.terapeuta_paciente_responsavel (
    paciente_id UUID PRIMARY KEY REFERENCES public.paciente(id) ON DELETE CASCADE,
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT fk_lider_vinculo_equipe
        FOREIGN KEY (terapeuta_id, paciente_id)
        REFERENCES public.terapeuta_paciente(terapeuta_id, paciente_id)
        ON DELETE RESTRICT
);

-- 2. Índice para consultas por terapeuta responsável
CREATE INDEX IF NOT EXISTS idx_terapeuta_paciente_responsavel_terapeuta
    ON public.terapeuta_paciente_responsavel(terapeuta_id);

-- 3. Backfill idempotente para pacientes já existentes (vincula o 1º especialista cadastrado)
INSERT INTO public.terapeuta_paciente_responsavel (paciente_id, terapeuta_id, created_at, updated_at)
SELECT DISTINCT ON (tp.paciente_id)
    tp.paciente_id,
    tp.terapeuta_id,
    tp.created_at,
    TIMEZONE('utc', NOW())
FROM public.terapeuta_paciente tp
ORDER BY tp.paciente_id, tp.created_at ASC
ON CONFLICT (paciente_id) DO NOTHING;

-- 4. Atualização da função atômica anti-órfão com sucessão segura de liderança
CREATE OR REPLACE FUNCTION public.desvincular_terapeuta_seguro(
    p_paciente_id UUID,
    p_terapeuta_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_existe_vinculo BOOLEAN;
    v_ativos_restantes INTEGER;
    v_novo_lider_id UUID;
BEGIN
    -- Trava pessimista na linha do paciente para impedir condição de corrida
    PERFORM 1 FROM public.paciente WHERE id = p_paciente_id FOR UPDATE;

    SELECT EXISTS (
        SELECT 1 FROM public.terapeuta_paciente
        WHERE paciente_id = p_paciente_id AND terapeuta_id = p_terapeuta_id
    ) INTO v_existe_vinculo;

    IF NOT v_existe_vinculo THEN
        RETURN 'nao_vinculado';
    END IF;

    SELECT COUNT(*)::INTEGER
    INTO v_ativos_restantes
    FROM public.terapeuta_paciente tp
    JOIN public.terapeuta t ON t.id = tp.terapeuta_id
    WHERE tp.paciente_id = p_paciente_id
      AND tp.terapeuta_id <> p_terapeuta_id
      AND t.status_ativo = TRUE;

    IF v_ativos_restantes <= 0 THEN
        RETURN 'ultimo_ativo';
    END IF;

    -- Se o terapeuta removido for o líder atual, transfere a liderança para o especialista ativo mais antigo restante
    IF EXISTS (
        SELECT 1 FROM public.terapeuta_paciente_responsavel
        WHERE paciente_id = p_paciente_id AND terapeuta_id = p_terapeuta_id
    ) THEN
        SELECT tp.terapeuta_id
        INTO v_novo_lider_id
        FROM public.terapeuta_paciente tp
        JOIN public.terapeuta t ON t.id = tp.terapeuta_id
        WHERE tp.paciente_id = p_paciente_id
          AND tp.terapeuta_id <> p_terapeuta_id
          AND t.status_ativo = TRUE
        ORDER BY tp.created_at ASC
        LIMIT 1;

        IF v_novo_lider_id IS NOT NULL THEN
            UPDATE public.terapeuta_paciente_responsavel
            SET terapeuta_id = v_novo_lider_id,
                updated_at = TIMEZONE('utc', NOW())
            WHERE paciente_id = p_paciente_id;
        END IF;
    END IF;

    DELETE FROM public.terapeuta_paciente
    WHERE paciente_id = p_paciente_id AND terapeuta_id = p_terapeuta_id;

    RETURN 'removido';
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 5. Políticas de Row Level Security (RLS)
ALTER TABLE public.terapeuta_paciente_responsavel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tpr_select_equipe_ou_admin" ON public.terapeuta_paciente_responsavel;
CREATE POLICY "tpr_select_equipe_ou_admin" ON public.terapeuta_paciente_responsavel
    FOR SELECT TO authenticated
    USING (public.rls_is_super_admin() OR public.rls_tem_vinculo_paciente(paciente_id));

DROP POLICY IF EXISTS "tpr_insert_equipe_ou_admin" ON public.terapeuta_paciente_responsavel;
CREATE POLICY "tpr_insert_equipe_ou_admin" ON public.terapeuta_paciente_responsavel
    FOR INSERT TO authenticated
    WITH CHECK (public.rls_is_super_admin() OR public.rls_tem_vinculo_paciente(paciente_id));

DROP POLICY IF EXISTS "tpr_update_lider_ou_admin" ON public.terapeuta_paciente_responsavel;
CREATE POLICY "tpr_update_lider_ou_admin" ON public.terapeuta_paciente_responsavel
    FOR UPDATE TO authenticated
    USING (public.rls_is_super_admin() OR terapeuta_id = auth.uid())
    WITH CHECK (public.rls_is_super_admin() OR public.rls_tem_vinculo_paciente(paciente_id));

DROP POLICY IF EXISTS "tpr_delete_super_admin" ON public.terapeuta_paciente_responsavel;
CREATE POLICY "tpr_delete_super_admin" ON public.terapeuta_paciente_responsavel
    FOR DELETE TO authenticated
    USING (public.rls_is_super_admin());
