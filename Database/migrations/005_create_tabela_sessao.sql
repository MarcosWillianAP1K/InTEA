-- ==============================================================================
-- PROJETO InTEA: MIGRAÇÃO 005 - TABELA DE SESSÃO E PAREAMENTO REMOTO (SPRINT 8)
-- ==============================================================================
-- REQUISITOS ATENDIDOS:
-- - RF10 (Pareamento Remoto via Código Único e WebSocket)
-- - RF12 (Injeção de Parâmetros e Contexto Pré-Sessão DDA)
-- - RN01 (Modo Livre sem persistência de paciente: paciente_id = NULL)
-- - RN03 (Contexto DDA entregue antes do primeiro evento de telemetria)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Criação Inicial (Caso o banco seja novo ou não possua a tabela)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    paciente_id UUID REFERENCES public.paciente(id) ON DELETE RESTRICT, -- NULL em Modo Livre (RN01)
    jogo_id UUID NOT NULL REFERENCES public.jogo(id) ON DELETE RESTRICT,
    session_token VARCHAR(20) UNIQUE NOT NULL, -- Código de pareamento (Ex: PIN 849-291)
    modo_sessao VARCHAR(30) DEFAULT 'sessao_clinica' NOT NULL, -- 'sessao_clinica' ou 'modo_livre'
    contexto_dda_json JSONB DEFAULT '{}'::jsonb, -- Contrato 2: Parâmetros pré-sessão para a IA (RN03)
    dispositivo_info JSONB DEFAULT '{}'::jsonb, -- Metadados de hardware do dispositivo pareado (RF10)
    status_sessao VARCHAR(30) DEFAULT 'aguardando_pareamento' NOT NULL, -- Máquina de estados da sessão
    data_hora_inicio TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    expira_em TIMESTAMPTZ DEFAULT (TIMEZONE('utc', NOW()) + INTERVAL '15 minutes') NOT NULL, -- TTL de 15 minutos (Card 530/556)
    data_hora_fim TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2. ALTER TABLE Idempotente (Garante campos caso a tabela já existisse no banco)
-- ------------------------------------------------------------------------------
ALTER TABLE public.sessao
    ADD COLUMN IF NOT EXISTS dispositivo_info JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS expira_em TIMESTAMPTZ DEFAULT (TIMEZONE('utc', NOW()) + INTERVAL '15 minutes'),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW());

-- Preenche expira_em caso existam registros prévios com valor nulo
UPDATE public.sessao
SET expira_em = created_at + INTERVAL '15 minutes'
WHERE expira_em IS NULL;

-- Garante NOT NULL em expira_em e atualiza default de status_sessao
ALTER TABLE public.sessao
    ALTER COLUMN expira_em SET NOT NULL,
    ALTER COLUMN status_sessao SET DEFAULT 'aguardando_pareamento';

-- Migra eventuais status legados ('aguardando_conexao' -> 'aguardando_pareamento')
UPDATE public.sessao
SET status_sessao = 'aguardando_pareamento'
WHERE status_sessao = 'aguardando_conexao';

-- Atualiza constraint de máquina de estados da sessão
ALTER TABLE public.sessao DROP CONSTRAINT IF EXISTS chk_status_sessao;
ALTER TABLE public.sessao
    ADD CONSTRAINT chk_status_sessao CHECK (
        status_sessao IN (
            'aguardando_pareamento',
            'conectado',
            'em_andamento',
            'finalizada',
            'expirada',
            'cancelada'
        )
    );

-- Atualiza/Garante constraint RN01 (Modo Livre sem paciente)
ALTER TABLE public.sessao DROP CONSTRAINT IF EXISTS chk_modo_sessao_paciente;
ALTER TABLE public.sessao
    ADD CONSTRAINT chk_modo_sessao_paciente CHECK (
        (modo_sessao = 'modo_livre' AND paciente_id IS NULL) OR
        (modo_sessao = 'sessao_clinica' AND paciente_id IS NOT NULL)
    );

-- ------------------------------------------------------------------------------
-- 3. Índices de Performance e Unicidade
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sessao_paciente ON public.sessao(paciente_id);
CREATE INDEX IF NOT EXISTS idx_sessao_terapeuta ON public.sessao(terapeuta_id);
CREATE INDEX IF NOT EXISTS idx_sessao_jogo ON public.sessao(jogo_id);
CREATE INDEX IF NOT EXISTS idx_sessao_token ON public.sessao(session_token);
CREATE INDEX IF NOT EXISTS idx_sessao_status ON public.sessao(status_sessao);
CREATE INDEX IF NOT EXISTS idx_sessao_expira_em ON public.sessao(expira_em);
CREATE INDEX IF NOT EXISTS idx_sessao_status_expira ON public.sessao(status_sessao, expira_em);

-- ------------------------------------------------------------------------------
-- 4. Trigger para atualização automática de updated_at
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_sessao_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sessao_updated_at ON public.sessao;

CREATE TRIGGER trg_sessao_updated_at
BEFORE UPDATE ON public.sessao
FOR EACH ROW
EXECUTE FUNCTION public.fn_sessao_set_updated_at();

-- ------------------------------------------------------------------------------
-- 5. Atualização da Política de RLS para Pareamento Remoto
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Pareamento via token para jogo externo" ON public.sessao;

CREATE POLICY "Pareamento via token para jogo externo"
ON public.sessao FOR SELECT
TO anon
USING (status_sessao IN ('aguardando_pareamento', 'conectado', 'em_andamento'));
