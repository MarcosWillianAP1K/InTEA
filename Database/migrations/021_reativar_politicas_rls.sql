-- ==============================================================================
-- InTEA: Migration 021 - Reativação Consolidada de Row Level Security (RLS)
-- ==============================================================================
-- Contexto e Diagnóstico da Falha Anterior (Migration 010):
-- 1. Contaminação de Sessão no Singleton do Backend (Causa Primária):
--    O Backend exportava uma única instância `supabase` inicializada com
--    `SUPABASE_SERVICE_ROLE_KEY`, mas invocava `supabase.auth.signInWithPassword`
--    e `supabase.auth.verifyOtp` nessa mesma instância. No `@supabase/supabase-js`,
--    mesmo com `persistSession: false`, o `GoTrueClient` armazena a sessão em
--    `memoryStorage` e o `SupabaseClient` passa a sobrescrever o cabeçalho
--    `Authorization: Bearer <SERVICE_ROLE_KEY>` pelo JWT do último terapeuta logado.
-- 2. Recursão Infinita (`42P17`) e Tabelas Sem Políticas (Causa Secundária):
--    Políticas que consultavam `public.terapeuta` ou `public.terapeuta_paciente`
--    diretamente dentro de `USING (...)` sem funções `SECURITY DEFINER` entravam
--    em loop recursivo, e tabelas criadas após a Migration 010 (`sessao_ativa`,
--    `auditoria_vinculo_acesso`, `auditoria_acesso_prontuario`) não possuíam
--    políticas de RLS para as regras multidisciplinares (RN04, Sprint 13+).
--
-- Esta migration é 100% idempotente e:
-- 1. Cria funções auxiliares `SECURITY DEFINER` (`STABLE`, `search_path = public`)
--    para eliminar recursão infinita na resolução de clínica, vínculo e SuperAdmin.
-- 2. Ativa `ENABLE ROW LEVEL SECURITY` nas 21 tabelas do schema `public`.
-- 3. Recria todas as políticas de isolamento institucional (RN04), sigilo clínico
--    e imutabilidade forense (RN05 / RNF06), além das políticas do bucket `laudos`.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Garantia Idempotente de Tabelas e Colunas Criadas Após a Migration 010
--    (Caso 010_sessoes_ativas, 015, 017 ou 019 ainda não tenham sido rodadas)
-- ------------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.clinica
    ADD COLUMN IF NOT EXISTS status_ativo BOOLEAN DEFAULT TRUE NOT NULL;

CREATE TABLE IF NOT EXISTS public.sessao_ativa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    ip_origem VARCHAR(45) NULL,
    user_agent TEXT NULL,
    dispositivo VARCHAR(100) NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    ultimo_acesso_em TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    expira_em TIMESTAMPTZ NOT NULL,
    revogado BOOLEAN NOT NULL DEFAULT FALSE,
    revogado_em TIMESTAMPTZ NULL,
    motivo_revogacao VARCHAR(100) NULL
);

CREATE INDEX IF NOT EXISTS idx_sessao_ativa_usuario_id ON public.sessao_ativa(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sessao_ativa_token_hash ON public.sessao_ativa(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessao_ativa_ativas ON public.sessao_ativa(usuario_id, revogado, expira_em) WHERE revogado = FALSE;

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

CREATE INDEX IF NOT EXISTS idx_auditoria_vinculo_paciente_created ON public.auditoria_vinculo_acesso(paciente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_vinculo_autor ON public.auditoria_vinculo_acesso(terapeuta_autor_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_vinculo_acao ON public.auditoria_vinculo_acesso(acao);
CREATE INDEX IF NOT EXISTS idx_terapeuta_paciente_paciente_id ON public.terapeuta_paciente(paciente_id, terapeuta_id);

CREATE OR REPLACE FUNCTION public.desvincular_terapeuta_seguro(
    p_paciente_id UUID,
    p_terapeuta_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_existe_vinculo BOOLEAN;
    v_ativos_restantes INTEGER;
BEGIN
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

CREATE TABLE IF NOT EXISTS public.auditoria_acesso_prontuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE RESTRICT,
    terapeuta_id UUID REFERENCES public.terapeuta(id) ON DELETE SET NULL,
    operacao VARCHAR(30) NOT NULL,
    recurso_acessado VARCHAR(255) NOT NULL,
    ip VARCHAR(45) NULL,
    user_agent TEXT NULL,
    detalhes_json JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE OR REPLACE FUNCTION public.impedir_modificacao_auditoria_prontuario()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operacao proibida: Registros da trilha de auditoria de prontuario sao estritamente imutaveis (RN05 / RNF06).'
        USING ERRCODE = '23505';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloqueio_mutacao_auditoria_prontuario ON public.auditoria_acesso_prontuario;
CREATE TRIGGER trg_bloqueio_mutacao_auditoria_prontuario
    BEFORE UPDATE OR DELETE ON public.auditoria_acesso_prontuario
    FOR EACH ROW
    EXECUTE FUNCTION public.impedir_modificacao_auditoria_prontuario();

CREATE INDEX IF NOT EXISTS idx_auditoria_prontuario_paciente ON public.auditoria_acesso_prontuario(paciente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_prontuario_terapeuta ON public.auditoria_acesso_prontuario(terapeuta_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_prontuario_created ON public.auditoria_acesso_prontuario(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_prontuario_operacao ON public.auditoria_acesso_prontuario(operacao);

-- ------------------------------------------------------------------------------
-- 1. Funções Auxiliares SECURITY DEFINER (Anti-Recursão 42P17)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rls_is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.terapeuta
        WHERE id = auth.uid()
          AND is_super_admin = TRUE
          AND status_ativo = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.rls_clinica_usuario()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT clinica_id
    FROM public.terapeuta
    WHERE id = auth.uid()
      AND status_ativo = TRUE
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.rls_tem_vinculo_paciente(p_paciente_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.rls_is_super_admin()
    OR EXISTS (
        SELECT 1
        FROM public.terapeuta t
        JOIN public.paciente p ON p.id = p_paciente_id
        JOIN public.terapeuta_paciente tp
          ON tp.paciente_id = p.id
         AND tp.terapeuta_id = t.id
        WHERE t.id = auth.uid()
          AND t.status_ativo = TRUE
          AND p.clinica_id = t.clinica_id
    );
$$;

CREATE OR REPLACE FUNCTION public.rls_tem_acesso_sessao(p_sessao_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.rls_is_super_admin()
    OR EXISTS (
        SELECT 1
        FROM public.sessao s
        JOIN public.terapeuta t
          ON t.id = auth.uid()
         AND t.status_ativo = TRUE
        WHERE s.id = p_sessao_id
          AND (
              s.terapeuta_id = auth.uid()
              OR (
                  s.paciente_id IS NOT NULL
                  AND public.rls_tem_vinculo_paciente(s.paciente_id)
              )
          )
    );
$$;

REVOKE ALL ON FUNCTION public.rls_is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_clinica_usuario() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_tem_vinculo_paciente(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_tem_acesso_sessao(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rls_is_super_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rls_clinica_usuario() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rls_tem_vinculo_paciente(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rls_tem_acesso_sessao(UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. Limpeza Idempotente de Políticas Anteriores no Schema public
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Ativação de Row Level Security (RLS) nas 21 Tabelas Públicas
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.terapeuta ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.areas_foco ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.terapeuta_area_foco ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.responsavel ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paciente_responsavel ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dados_clinicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.terapeuta_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gatilhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paciente_gatilho ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.laudo_clinico ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.anotacao_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.relatorio_sessao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.telemetria_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auditoria_sessao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessao_ativa ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auditoria_vinculo_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auditoria_acesso_prontuario ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. Políticas por Tabela (Isolamento Institucional RN04 & Prontuário RN05)
-- ------------------------------------------------------------------------------

-- 4.1. public.clinica
CREATE POLICY "clinica_select_membros_ou_admin" ON public.clinica
    FOR SELECT TO authenticated
    USING (
        public.rls_is_super_admin()
        OR id = public.rls_clinica_usuario()
    );

CREATE POLICY "clinica_all_super_admin" ON public.clinica
    FOR ALL TO authenticated
    USING (public.rls_is_super_admin())
    WITH CHECK (public.rls_is_super_admin());

-- 4.2. public.terapeuta
CREATE POLICY "terapeuta_select_mesma_clinica_ou_admin" ON public.terapeuta
    FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR public.rls_is_super_admin()
        OR (
            clinica_id IS NOT NULL
            AND clinica_id = public.rls_clinica_usuario()
        )
    );

CREATE POLICY "terapeuta_update_proprio_ou_admin" ON public.terapeuta
    FOR UPDATE TO authenticated
    USING (
        id = auth.uid()
        OR public.rls_is_super_admin()
    )
    WITH CHECK (
        public.rls_is_super_admin()
        OR (
            id = auth.uid()
            AND is_super_admin = FALSE
            AND clinica_id IS NOT DISTINCT FROM public.rls_clinica_usuario()
        )
    );

CREATE POLICY "terapeuta_insert_delete_super_admin" ON public.terapeuta
    FOR ALL TO authenticated
    USING (public.rls_is_super_admin())
    WITH CHECK (public.rls_is_super_admin());

-- 4.3. public.areas_foco
CREATE POLICY "areas_foco_select_autenticados" ON public.areas_foco
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "areas_foco_all_super_admin" ON public.areas_foco
    FOR ALL TO authenticated
    USING (public.rls_is_super_admin())
    WITH CHECK (public.rls_is_super_admin());

-- 4.4. public.terapeuta_area_foco
CREATE POLICY "terapeuta_area_foco_select_autenticados" ON public.terapeuta_area_foco
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "terapeuta_area_foco_gestao_propria_ou_admin" ON public.terapeuta_area_foco
    FOR ALL TO authenticated
    USING (
        terapeuta_id = auth.uid()
        OR public.rls_is_super_admin()
    )
    WITH CHECK (
        terapeuta_id = auth.uid()
        OR public.rls_is_super_admin()
    );

-- 4.5. public.paciente
CREATE POLICY "paciente_select_vinculados_ou_admin" ON public.paciente
    FOR SELECT TO authenticated
    USING (public.rls_tem_vinculo_paciente(id));

CREATE POLICY "paciente_insert_mesma_clinica_ou_admin" ON public.paciente
    FOR INSERT TO authenticated
    WITH CHECK (
        public.rls_is_super_admin()
        OR (
            clinica_id IS NOT NULL
            AND clinica_id = public.rls_clinica_usuario()
        )
    );

CREATE POLICY "paciente_update_vinculados_ou_admin" ON public.paciente
    FOR UPDATE TO authenticated
    USING (public.rls_tem_vinculo_paciente(id))
    WITH CHECK (
        public.rls_is_super_admin()
        OR (
            public.rls_tem_vinculo_paciente(id)
            AND clinica_id = public.rls_clinica_usuario()
        )
    );

CREATE POLICY "paciente_delete_super_admin" ON public.paciente
    FOR DELETE TO authenticated
    USING (public.rls_is_super_admin());

-- 4.6. public.responsavel
CREATE POLICY "responsavel_select_vinculados_ou_admin" ON public.responsavel
    FOR SELECT TO authenticated
    USING (
        public.rls_is_super_admin()
        OR EXISTS (
            SELECT 1
            FROM public.paciente_responsavel pr
            WHERE pr.responsavel_id = responsavel.id
              AND public.rls_tem_vinculo_paciente(pr.paciente_id)
        )
    );

CREATE POLICY "responsavel_insert_terapeuta_ativo" ON public.responsavel
    FOR INSERT TO authenticated
    WITH CHECK (
        public.rls_is_super_admin()
        OR public.rls_clinica_usuario() IS NOT NULL
    );

CREATE POLICY "responsavel_update_vinculados_ou_admin" ON public.responsavel
    FOR UPDATE TO authenticated
    USING (
        public.rls_is_super_admin()
        OR EXISTS (
            SELECT 1
            FROM public.paciente_responsavel pr
            WHERE pr.responsavel_id = responsavel.id
              AND public.rls_tem_vinculo_paciente(pr.paciente_id)
        )
    )
    WITH CHECK (
        public.rls_is_super_admin()
        OR EXISTS (
            SELECT 1
            FROM public.paciente_responsavel pr
            WHERE pr.responsavel_id = responsavel.id
              AND public.rls_tem_vinculo_paciente(pr.paciente_id)
        )
    );

CREATE POLICY "responsavel_delete_super_admin" ON public.responsavel
    FOR DELETE TO authenticated
    USING (public.rls_is_super_admin());

-- 4.7. public.paciente_responsavel
CREATE POLICY "paciente_responsavel_gestao_vinculados" ON public.paciente_responsavel
    FOR ALL TO authenticated
    USING (public.rls_tem_vinculo_paciente(paciente_id))
    WITH CHECK (public.rls_tem_vinculo_paciente(paciente_id));

-- 4.8. public.dados_clinicos
CREATE POLICY "dados_clinicos_gestao_vinculados" ON public.dados_clinicos
    FOR ALL TO authenticated
    USING (public.rls_tem_vinculo_paciente(paciente_id))
    WITH CHECK (public.rls_tem_vinculo_paciente(paciente_id));

-- 4.9. public.terapeuta_paciente
CREATE POLICY "terapeuta_paciente_select_equipe_ou_admin" ON public.terapeuta_paciente
    FOR SELECT TO authenticated
    USING (
        terapeuta_id = auth.uid()
        OR public.rls_tem_vinculo_paciente(paciente_id)
    );

CREATE POLICY "terapeuta_paciente_insert_equipe_mesma_clinica" ON public.terapeuta_paciente
    FOR INSERT TO authenticated
    WITH CHECK (
        public.rls_is_super_admin()
        OR (
            EXISTS (
                SELECT 1
                FROM public.paciente p
                JOIN public.terapeuta t_alvo ON t_alvo.id = terapeuta_id
                WHERE p.id = paciente_id
                  AND p.clinica_id = public.rls_clinica_usuario()
                  AND t_alvo.clinica_id = p.clinica_id
                  AND t_alvo.status_ativo = TRUE
            )
            AND (
                terapeuta_id = auth.uid()
                OR public.rls_tem_vinculo_paciente(paciente_id)
            )
        )
    );

CREATE POLICY "terapeuta_paciente_delete_equipe_ou_admin" ON public.terapeuta_paciente
    FOR DELETE TO authenticated
    USING (
        public.rls_is_super_admin()
        OR public.rls_tem_vinculo_paciente(paciente_id)
    );

-- 4.10. public.gatilhos
CREATE POLICY "gatilhos_select_autenticados" ON public.gatilhos
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "gatilhos_all_super_admin" ON public.gatilhos
    FOR ALL TO authenticated
    USING (public.rls_is_super_admin())
    WITH CHECK (public.rls_is_super_admin());

-- 4.11. public.paciente_gatilho
CREATE POLICY "paciente_gatilho_gestao_vinculados" ON public.paciente_gatilho
    FOR ALL TO authenticated
    USING (public.rls_tem_vinculo_paciente(paciente_id))
    WITH CHECK (public.rls_tem_vinculo_paciente(paciente_id));

-- 4.12. public.laudo_clinico
CREATE POLICY "laudo_clinico_select_vinculados" ON public.laudo_clinico
    FOR SELECT TO authenticated
    USING (public.rls_tem_vinculo_paciente(paciente_id));

CREATE POLICY "laudo_clinico_insert_vinculados" ON public.laudo_clinico
    FOR INSERT TO authenticated
    WITH CHECK (
        terapeuta_id = auth.uid()
        AND public.rls_tem_vinculo_paciente(paciente_id)
    );

CREATE POLICY "laudo_clinico_update_autor_ou_admin" ON public.laudo_clinico
    FOR UPDATE TO authenticated
    USING (
        public.rls_is_super_admin()
        OR (
            terapeuta_id = auth.uid()
            AND public.rls_tem_vinculo_paciente(paciente_id)
        )
    )
    WITH CHECK (
        public.rls_is_super_admin()
        OR (
            terapeuta_id = auth.uid()
            AND public.rls_tem_vinculo_paciente(paciente_id)
        )
    );

CREATE POLICY "laudo_clinico_delete_autor_ou_admin" ON public.laudo_clinico
    FOR DELETE TO authenticated
    USING (
        public.rls_is_super_admin()
        OR (
            terapeuta_id = auth.uid()
            AND public.rls_tem_vinculo_paciente(paciente_id)
        )
    );

-- 4.13. public.jogo
CREATE POLICY "jogo_select_autenticados" ON public.jogo
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "jogo_all_super_admin" ON public.jogo
    FOR ALL TO authenticated
    USING (public.rls_is_super_admin())
    WITH CHECK (public.rls_is_super_admin());

-- 4.14. public.sessao
CREATE POLICY "sessao_select_equipe_ou_autor" ON public.sessao
    FOR SELECT TO authenticated
    USING (public.rls_tem_acesso_sessao(id));

CREATE POLICY "sessao_insert_terapeuta_autorizado" ON public.sessao
    FOR INSERT TO authenticated
    WITH CHECK (
        public.rls_is_super_admin()
        OR (
            terapeuta_id = auth.uid()
            AND (
                (modo_sessao = 'modo_livre' AND paciente_id IS NULL)
                OR (paciente_id IS NOT NULL AND public.rls_tem_vinculo_paciente(paciente_id))
            )
        )
    );

CREATE POLICY "sessao_update_equipe_ou_autor" ON public.sessao
    FOR UPDATE TO authenticated
    USING (public.rls_tem_acesso_sessao(id))
    WITH CHECK (public.rls_tem_acesso_sessao(id));

-- 4.15. public.anotacao_clinica
CREATE POLICY "anotacao_clinica_select_equipe" ON public.anotacao_clinica
    FOR SELECT TO authenticated
    USING (
        public.rls_is_super_admin()
        OR (
            soft_delete = FALSE
            AND public.rls_tem_vinculo_paciente(paciente_id)
        )
    );

CREATE POLICY "anotacao_clinica_insert_autor_vinculado" ON public.anotacao_clinica
    FOR INSERT TO authenticated
    WITH CHECK (
        terapeuta_id = auth.uid()
        AND public.rls_tem_vinculo_paciente(paciente_id)
    );

CREATE POLICY "anotacao_clinica_update_autor_ou_admin" ON public.anotacao_clinica
    FOR UPDATE TO authenticated
    USING (
        public.rls_is_super_admin()
        OR (
            terapeuta_id = auth.uid()
            AND public.rls_tem_vinculo_paciente(paciente_id)
        )
    )
    WITH CHECK (
        public.rls_is_super_admin()
        OR (
            terapeuta_id = auth.uid()
            AND public.rls_tem_vinculo_paciente(paciente_id)
        )
    );

-- 4.16. public.relatorio_sessao (DELETE bloqueado por trigger trg_bloqueio_relatorio_sessao)
CREATE POLICY "relatorio_sessao_select_equipe" ON public.relatorio_sessao
    FOR SELECT TO authenticated
    USING (
        public.rls_is_super_admin()
        OR (
            soft_delete = FALSE
            AND public.rls_tem_acesso_sessao(sessao_id)
        )
    );

CREATE POLICY "relatorio_sessao_insert_equipe" ON public.relatorio_sessao
    FOR INSERT TO authenticated
    WITH CHECK (public.rls_tem_acesso_sessao(sessao_id));

CREATE POLICY "relatorio_sessao_update_equipe" ON public.relatorio_sessao
    FOR UPDATE TO authenticated
    USING (public.rls_tem_acesso_sessao(sessao_id))
    WITH CHECK (public.rls_tem_acesso_sessao(sessao_id));

-- 4.17. public.telemetria_evento
CREATE POLICY "telemetria_evento_select_equipe" ON public.telemetria_evento
    FOR SELECT TO authenticated
    USING (public.rls_tem_acesso_sessao(sessao_id));

CREATE POLICY "telemetria_evento_insert_equipe" ON public.telemetria_evento
    FOR INSERT TO authenticated
    WITH CHECK (public.rls_tem_acesso_sessao(sessao_id));

-- 4.18. public.auditoria_sessao (Imutável: apenas SELECT e INSERT)
CREATE POLICY "auditoria_sessao_select_equipe" ON public.auditoria_sessao
    FOR SELECT TO authenticated
    USING (public.rls_tem_acesso_sessao(sessao_id));

CREATE POLICY "auditoria_sessao_insert_equipe" ON public.auditoria_sessao
    FOR INSERT TO authenticated
    WITH CHECK (public.rls_tem_acesso_sessao(sessao_id));

-- 4.19. public.sessao_ativa
CREATE POLICY "sessao_ativa_gestao_proprio_usuario_ou_admin" ON public.sessao_ativa
    FOR ALL TO authenticated
    USING (
        usuario_id = auth.uid()
        OR public.rls_is_super_admin()
    )
    WITH CHECK (
        usuario_id = auth.uid()
        OR public.rls_is_super_admin()
    );

-- 4.20. public.auditoria_vinculo_acesso (Imutável: apenas SELECT e INSERT)
CREATE POLICY "auditoria_vinculo_select_equipe" ON public.auditoria_vinculo_acesso
    FOR SELECT TO authenticated
    USING (public.rls_tem_vinculo_paciente(paciente_id));

CREATE POLICY "auditoria_vinculo_insert_autor_vinculado" ON public.auditoria_vinculo_acesso
    FOR INSERT TO authenticated
    WITH CHECK (
        public.rls_is_super_admin()
        OR (
            terapeuta_autor_id = auth.uid()
            AND public.rls_tem_vinculo_paciente(paciente_id)
        )
    );

-- 4.21. public.auditoria_acesso_prontuario (Imutável: apenas SELECT e INSERT)
CREATE POLICY "auditoria_prontuario_select_equipe" ON public.auditoria_acesso_prontuario
    FOR SELECT TO authenticated
    USING (public.rls_tem_vinculo_paciente(paciente_id));

CREATE POLICY "auditoria_prontuario_insert_equipe" ON public.auditoria_acesso_prontuario
    FOR INSERT TO authenticated
    WITH CHECK (
        public.rls_is_super_admin()
        OR (
            terapeuta_id = auth.uid()
            AND public.rls_tem_vinculo_paciente(paciente_id)
        )
    );

-- ------------------------------------------------------------------------------
-- 5. Políticas de Segurança no Supabase Storage (Bucket Privado 'laudos')
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Acesso de leitura a laudos no Storage" ON storage.objects;
DROP POLICY IF EXISTS "Upload de laudos no Storage" ON storage.objects;
DROP POLICY IF EXISTS "Exclusao de laudos no Storage" ON storage.objects;

CREATE POLICY "Acesso de leitura a laudos no Storage" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'laudos'
        AND (
            public.rls_is_super_admin()
            OR (
                (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                AND public.rls_tem_vinculo_paciente(((storage.foldername(name))[1])::uuid)
            )
        )
    );

CREATE POLICY "Upload de laudos no Storage" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'laudos'
        AND (
            public.rls_is_super_admin()
            OR (
                (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                AND public.rls_tem_vinculo_paciente(((storage.foldername(name))[1])::uuid)
            )
        )
    );

CREATE POLICY "Exclusao de laudos no Storage" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'laudos'
        AND (
            public.rls_is_super_admin()
            OR (
                (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                AND public.rls_tem_vinculo_paciente(((storage.foldername(name))[1])::uuid)
            )
        )
    );
