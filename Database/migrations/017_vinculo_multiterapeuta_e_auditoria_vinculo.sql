-- ==============================================================================
-- MIGRAÇÃO 017: Vínculo Multiterapeuta, Trilha de Auditoria de Vínculos e
--               Função Atômica Anti-Órfão (Sprint 13)
-- Conformidade: RF08, RF18, RN04, RN05, RNF05
--
-- Auditoria de RLS (AGENTS.md §6.2.3):
--   As políticas de Row Level Security (RLS) foram removidas pela Migração 010
--   (010_remover_rls_policies.sql). O Backend do InTEA opera exclusivamente via
--   SUPABASE_SERVICE_ROLE_KEY com validação institucional estrita (clinica_id e
--   vínculo ativo em public.terapeuta_paciente) aplicada na camada de Serviço e
--   Middleware (RN04). Nenhuma policy RLS bloqueante é adicionada nesta migração.
--
-- Higienização Relacional (3FN / Decisão D2):
--   Nenhuma coluna órfã (papel_equipe / vinculado_por) é adicionada em
--   public.terapeuta_paciente. A rastreabilidade de autoria e ciclo de vida
--   dos vínculos da equipe multidisciplinar reside integralmente na tabela
--   imutável public.auditoria_vinculo_acesso.
-- ==============================================================================

-- 1. Índice Reverso de Vínculo Multiterapeuta (Busca por Paciente -> Equipe)
CREATE INDEX IF NOT EXISTS idx_terapeuta_paciente_paciente_id
    ON public.terapeuta_paciente(paciente_id, terapeuta_id);

-- 2. Tabela Imutável de Auditoria de Vínculos e Acessos da Equipe (RF08, RN04, RN05)
CREATE TABLE IF NOT EXISTS public.auditoria_vinculo_acesso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE RESTRICT,
    terapeuta_autor_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    terapeuta_alvo_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    acao VARCHAR(40) NOT NULL CHECK (acao IN ('vinculo_equipe_criado', 'vinculo_equipe_removido')),
    ip VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 3. Trigger de Imutabilidade Estrita (RN05 / RNF05)
CREATE OR REPLACE FUNCTION public.impedir_modificacao_auditoria_vinculo()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operacao proibida: Registros da trilha de auditoria de vinculos sao estritamente imutaveis (RN05 / RNF05).'
        USING ERRCODE = '23505';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloqueio_mutacao_auditoria_vinculo ON public.auditoria_vinculo_acesso;
CREATE TRIGGER trg_bloqueio_mutacao_auditoria_vinculo
    BEFORE UPDATE OR DELETE ON public.auditoria_vinculo_acesso
    FOR EACH ROW
    EXECUTE FUNCTION public.impedir_modificacao_auditoria_vinculo();

-- 4. Índices de Otimização da Trilha de Auditoria de Vínculos (RNF05)
CREATE INDEX IF NOT EXISTS idx_auditoria_vinculo_paciente_created
    ON public.auditoria_vinculo_acesso(paciente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_vinculo_autor
    ON public.auditoria_vinculo_acesso(terapeuta_autor_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_vinculo_acao
    ON public.auditoria_vinculo_acesso(acao);

-- 5. Função Atômica Anti-Órfão com Lock Pessimista (RN04, RF08)
CREATE OR REPLACE FUNCTION public.desvincular_terapeuta_seguro(
    p_paciente_id UUID,
    p_terapeuta_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_existe_vinculo BOOLEAN;
    v_ativos_restantes INTEGER;
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

    DELETE FROM public.terapeuta_paciente
    WHERE paciente_id = p_paciente_id AND terapeuta_id = p_terapeuta_id;

    RETURN 'removido';
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
