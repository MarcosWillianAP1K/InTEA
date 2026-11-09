-- ==============================================================================
-- InTEA: Migration 022 - Blindagem de Segurança (P0.1, P0.2) e Índices (P1.4)
-- ==============================================================================
-- Escopo:
-- 1. P0.1: Blindagem de public.handle_new_user() contra escalonamento de privilégio
--    no signup público (leitura de is_super_admin exclusivamente de raw_app_meta_data).
-- 2. P0.2: Bloqueio físico de DELETE em prontuário clínico (paciente, anotacao_clinica,
--    sessao) em conformidade com a RN05 e Lei 13.787/2018 Art. 6º (retenção de 20 anos).
--    Alteração de FK de auditoria_acesso_prontuario.paciente_id para ON DELETE RESTRICT
--    e proteção contra TRUNCATE nas tabelas de auditoria.
-- 3. P1.4: Índices compostos de performance para consultas de sessões e anotações.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. P0.1: Blindagem do Trigger handle_new_user (Prevenção de Privilege Escalation)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.terapeuta (
    id,
    nome,
    email,
    telefone,
    crefito,
    registro_profissional,
    tempo_experiencia_anos,
    especialidade,
    clinica_id,
    is_super_admin,
    status_ativo
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Novo Terapeuta'),
    NEW.email,
    NEW.raw_user_meta_data->>'telefone',
    COALESCE(NEW.raw_user_meta_data->>'crefito', NEW.raw_user_meta_data->>'registro_profissional'),
    COALESCE(NEW.raw_user_meta_data->>'registro_profissional', NEW.raw_user_meta_data->>'crefito'),
    COALESCE((NEW.raw_user_meta_data->>'tempo_experiencia_anos')::INTEGER, 0),
    NEW.raw_user_meta_data->>'especialidade',
    (NEW.raw_user_meta_data->>'clinica_id')::UUID,
    COALESCE((NEW.raw_app_meta_data->>'is_super_admin')::BOOLEAN, FALSE),
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. P0.2: Bloqueio de Hard Delete Clínico (RN05 / Lei 13.787/2018 Art. 6º)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.impedir_delete_fisico_prontuario()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operacao proibida: Exclusao fisica de prontuario clinico e vedada (RN05 / Lei 13.787/2018). Utilize inativacao logica (soft_delete = true ou status_ativo = false).'
        USING ERRCODE = '23505';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloqueio_delete_paciente ON public.paciente;
CREATE TRIGGER trg_bloqueio_delete_paciente
    BEFORE DELETE ON public.paciente
    FOR EACH ROW
    EXECUTE FUNCTION public.impedir_delete_fisico_prontuario();

DROP TRIGGER IF EXISTS trg_bloqueio_delete_anotacao ON public.anotacao_clinica;
CREATE TRIGGER trg_bloqueio_delete_anotacao
    BEFORE DELETE ON public.anotacao_clinica
    FOR EACH ROW
    EXECUTE FUNCTION public.impedir_delete_fisico_prontuario();

DROP TRIGGER IF EXISTS trg_bloqueio_delete_sessao ON public.sessao;
CREATE TRIGGER trg_bloqueio_delete_sessao
    BEFORE DELETE ON public.sessao
    FOR EACH ROW
    EXECUTE FUNCTION public.impedir_delete_fisico_prontuario();

-- Alteração idempotente da FK de auditoria_acesso_prontuario para ON DELETE RESTRICT
ALTER TABLE public.auditoria_acesso_prontuario
    DROP CONSTRAINT IF EXISTS auditoria_acesso_prontuario_paciente_id_fkey;

ALTER TABLE public.auditoria_acesso_prontuario
    ADD CONSTRAINT auditoria_acesso_prontuario_paciente_id_fkey
    FOREIGN KEY (paciente_id) REFERENCES public.paciente(id) ON DELETE RESTRICT;

-- Bloqueio de TRUNCATE nas trilhas de auditoria (Imutabilidade Forense)
CREATE OR REPLACE FUNCTION public.impedir_truncate_auditoria()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operacao proibida: Truncamento de tabelas da trilha de auditoria clinica e terminantemente vedado (RN05 / RNF06).'
        USING ERRCODE = '23505';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloqueio_truncate_auditoria_sessao ON public.auditoria_sessao;
CREATE TRIGGER trg_bloqueio_truncate_auditoria_sessao
    BEFORE TRUNCATE ON public.auditoria_sessao
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.impedir_truncate_auditoria();

DROP TRIGGER IF EXISTS trg_bloqueio_truncate_auditoria_vinculo ON public.auditoria_vinculo_acesso;
CREATE TRIGGER trg_bloqueio_truncate_auditoria_vinculo
    BEFORE TRUNCATE ON public.auditoria_vinculo_acesso
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.impedir_truncate_auditoria();

DROP TRIGGER IF EXISTS trg_bloqueio_truncate_auditoria_prontuario ON public.auditoria_acesso_prontuario;
CREATE TRIGGER trg_bloqueio_truncate_auditoria_prontuario
    BEFORE TRUNCATE ON public.auditoria_acesso_prontuario
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.impedir_truncate_auditoria();

-- ------------------------------------------------------------------------------
-- 3. P1.4: Índices Compostos de Performance
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sessao_terapeuta_inicio
    ON public.sessao(terapeuta_id, data_hora_inicio DESC);

CREATE INDEX IF NOT EXISTS idx_sessao_paciente_inicio
    ON public.sessao(paciente_id, data_hora_inicio DESC)
    WHERE paciente_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_anotacao_paciente_created_ativo
    ON public.anotacao_clinica(paciente_id, created_at DESC)
    WHERE soft_delete = FALSE;
