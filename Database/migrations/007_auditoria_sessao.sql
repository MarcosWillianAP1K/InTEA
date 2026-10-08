-- ==============================================================================
-- PROJETO InTEA: MIGRAÇÃO 007 - TRILHA DE AUDITORIA CLÍNICA DE SESSÃO (SPRINT 9)
-- ==============================================================================
-- TASK: BD/Back: Trilha de Auditoria Clínica de Sessão [Extra] (Tipo: Feature)
-- RESPONSÁVEL: Marcos Willian (@MarcosWillianAP1K)
-- REQUISITOS: RF13, RNF06 (LGPD / Segurança), RN04, RN05 (Imutabilidade)
--
-- OBJETIVO:
-- Registrar de forma imutável todos os eventos críticos do ciclo de vida da
-- sessão clínica (criação, pareamento remoto, comandos de intervenção, pausas,
-- cancelamento e encerramento), garantindo rastreabilidade jurídica, autoria
-- e conformidade estrita com a LGPD.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 1: Criação da Tabela public.auditoria_sessao (se não existir)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auditoria_sessao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id UUID NOT NULL REFERENCES public.sessao(id) ON DELETE CASCADE,
    terapeuta_id UUID REFERENCES public.terapeuta(id) ON DELETE SET NULL,
    origem VARCHAR(50) NOT NULL, -- 'terapeuta_web', 'dispositivo_jogo', 'sistema_dda'
    acao VARCHAR(80) NOT NULL,   -- 'sessao_criada', 'dispositivo_pareado', 'sessao_finalizada', 'sessao_cancelada', etc.
    detalhes_json JSONB DEFAULT '{}'::jsonb NOT NULL,
    ip VARCHAR(45) NULL,         -- Suporta IPv4 ou IPv6
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- PASSO 2: Comentários Semânticos de Documentação
-- ------------------------------------------------------------------------------
COMMENT ON TABLE public.auditoria_sessao IS 'Trilha de auditoria imutável dos eventos e mudanças de estado das sessões clínicas (RF13, RNF06, RN05).';
COMMENT ON COLUMN public.auditoria_sessao.id IS 'Identificador único do registro de auditoria (UUID).';
COMMENT ON COLUMN public.auditoria_sessao.sessao_id IS 'Chave estrangeira da sessão clínica auditada.';
COMMENT ON COLUMN public.auditoria_sessao.terapeuta_id IS 'Identificador do terapeuta responsável pela ação (se aplicável).';
COMMENT ON COLUMN public.auditoria_sessao.origem IS 'Canal de origem do evento (terapeuta_web, dispositivo_jogo, sistema_dda).';
COMMENT ON COLUMN public.auditoria_sessao.acao IS 'Ação clínica ou transição de estado executada.';
COMMENT ON COLUMN public.auditoria_sessao.detalhes_json IS 'Metadados contextuais adicionais em JSONB.';
COMMENT ON COLUMN public.auditoria_sessao.ip IS 'Endereço IP de origem da requisição.';
COMMENT ON COLUMN public.auditoria_sessao.user_agent IS 'Identificação do cliente HTTP ou dispositivo emissor.';
COMMENT ON COLUMN public.auditoria_sessao.created_at IS 'Timestamp UTC imutável do registro de auditoria.';

-- ------------------------------------------------------------------------------
-- PASSO 3: Função e Trigger de Imutabilidade Estrita (RN05 / RNF06 / LGPD)
-- ------------------------------------------------------------------------------
-- Bloqueia qualquer tentativa de UPDATE ou DELETE, garantindo conformidade forense.
CREATE OR REPLACE FUNCTION public.impedir_modificacao_auditoria_sessao()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operacao proibida: Registros da trilha de auditoria clinica sao estritamente imutaveis (RN05 / RNF06).'
        USING ERRCODE = '23505';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloqueio_mutacao_auditoria ON public.auditoria_sessao;

CREATE TRIGGER trg_bloqueio_mutacao_auditoria
    BEFORE UPDATE OR DELETE ON public.auditoria_sessao
    FOR EACH ROW
    EXECUTE FUNCTION public.impedir_modificacao_auditoria_sessao();

-- ------------------------------------------------------------------------------
-- PASSO 4: Índices de Otimização e Performance
-- ------------------------------------------------------------------------------
-- 1. Consulta cronológica da linha do tempo da sessão
CREATE INDEX IF NOT EXISTS idx_auditoria_sessao_created 
    ON public.auditoria_sessao(sessao_id, created_at ASC);

-- 2. Filtro rápido por terapeuta
CREATE INDEX IF NOT EXISTS idx_auditoria_terapeuta 
    ON public.auditoria_sessao(terapeuta_id);

-- 3. Filtro por ação clínica
CREATE INDEX IF NOT EXISTS idx_auditoria_acao 
    ON public.auditoria_sessao(acao);

-- 4. Índice GIN sobre o payload contextual
CREATE INDEX IF NOT EXISTS idx_auditoria_detalhes_gin 
    ON public.auditoria_sessao USING gin (detalhes_json);

-- ------------------------------------------------------------------------------
-- PASSO 5: Habilitação de RLS e Políticas de Segurança (Row Level Security)
-- ------------------------------------------------------------------------------
ALTER TABLE public.auditoria_sessao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Consulta de auditoria da sessao autorizada" ON public.auditoria_sessao;
CREATE POLICY "Consulta de auditoria da sessao autorizada"
ON public.auditoria_sessao FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sessao s
        WHERE s.id = auditoria_sessao.sessao_id
          AND (
              s.terapeuta_id = auth.uid() OR 
              (s.paciente_id IS NOT NULL AND public.terapeuta_tem_acesso_paciente(s.paciente_id)) OR
              public.check_is_super_admin()
          )
    )
);

DROP POLICY IF EXISTS "Insercao de auditoria autorizada" ON public.auditoria_sessao;
CREATE POLICY "Insercao de auditoria autorizada"
ON public.auditoria_sessao FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sessao s
        WHERE s.id = auditoria_sessao.sessao_id
          AND (
              s.terapeuta_id = auth.uid() OR
              public.check_is_super_admin()
          )
    )
);
