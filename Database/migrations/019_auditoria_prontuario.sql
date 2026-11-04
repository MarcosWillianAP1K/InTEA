-- ==============================================================================
-- PROJETO InTEA: MIGRAÇÃO 012 - TRILHA DE AUDITORIA DE ACESSOS AO PRONTUÁRIO MÉDICO
-- ==============================================================================
-- Conformidade: RF08 (Auditoria de Vínculos e Acessos), RNF06 (LGPD / Segurança Forense)
-- Registra imutavelmente todo evento de visualização, alteração ou exclusão lógica.
-- ==============================================================================

-- 1. Criação da tabela de auditoria de acessos ao prontuário médico
CREATE TABLE IF NOT EXISTS public.auditoria_acesso_prontuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE CASCADE,
    terapeuta_id UUID REFERENCES public.terapeuta(id) ON DELETE SET NULL,
    operacao VARCHAR(30) NOT NULL, -- 'visualizacao', 'alteracao', 'exclusao_logica'
    recurso_acessado VARCHAR(255) NOT NULL, -- Endpoint ou recurso consultado (ex: '/api/paciente/:id')
    ip VARCHAR(45) NULL,
    user_agent TEXT NULL,
    detalhes_json JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2. Trigger de Imutabilidade Estrita (RN05 / RNF06)
-- Bloqueia qualquer tentativa física de UPDATE ou DELETE sobre a trilha forense de prontuário
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

-- 3. Índices de Otimização e Performance
CREATE INDEX IF NOT EXISTS idx_auditoria_prontuario_paciente 
    ON public.auditoria_acesso_prontuario(paciente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auditoria_prontuario_terapeuta 
    ON public.auditoria_acesso_prontuario(terapeuta_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auditoria_prontuario_created 
    ON public.auditoria_acesso_prontuario(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auditoria_prontuario_operacao 
    ON public.auditoria_acesso_prontuario(operacao);

-- 4. Comentários Semânticos
COMMENT ON TABLE public.auditoria_acesso_prontuario IS 
    'Tabela forense de auditoria para rastreamento imutável de acessos, visualizações e mutações em prontuários clínicos (RF08, RNF06, LGPD).';

COMMENT ON COLUMN public.auditoria_acesso_prontuario.paciente_id IS 
    'Identificador do paciente cujo prontuário foi consultado ou alterado.';

COMMENT ON COLUMN public.auditoria_acesso_prontuario.terapeuta_id IS 
    'Identificador do terapeuta que realizou a consulta ou modificação no prontuário.';

COMMENT ON COLUMN public.auditoria_acesso_prontuario.operacao IS 
    'Tipo de operação clínica executada: visualizacao (GET), alteracao (PUT/PATCH) ou exclusao_logica (DELETE).';
