-- ==============================================================================
-- PROJETO InTEA: MIGRAÇÃO - GERENCIAMENTO DE SESSÕES ATIVAS (RF02)
-- ==============================================================================
-- TASK: Back: Gestão e Encerramento de Sessões Concorrentes (Tipo: Feature)
-- REQUISITOS: RF02 (Gerenciamento de Sessões Ativas), RNF03, RNF06 (Segurança & LGPD)
--
-- OBJETIVO:
-- Estruturar o controle de dispositivos conectados por terapeutas, permitindo
-- rastrear conexões ativas com IP, User-Agent e metadados de dispositivo, além de
-- possibilitar a revogação remota de acessos concorrentes ou suspeitos (logout-all).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 1: Criação da Tabela public.sessao_ativa (se não existir)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessao_ativa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- Hash SHA-256 do token JWT (RNF06 / LGPD)
    ip_origem VARCHAR(45) NULL,             -- Suporta IPv4 e IPv6
    user_agent TEXT NULL,
    dispositivo VARCHAR(100) NULL,          -- Identificação amigável (ex: 'Chrome no Windows')
    criado_em TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    ultimo_acesso_em TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    expira_em TIMESTAMPTZ NOT NULL,
    revogado BOOLEAN NOT NULL DEFAULT FALSE,
    revogado_em TIMESTAMPTZ NULL,
    motivo_revogacao VARCHAR(100) NULL      -- 'logout_all', 'logout_manual', 'sessao_remota_revogada'
);

-- ------------------------------------------------------------------------------
-- PASSO 2: Comentários de Documentação Semântica
-- ------------------------------------------------------------------------------
COMMENT ON TABLE public.sessao_ativa IS 'Registro e controle de dispositivos conectados e sessões ativas de terapeutas (RF02).';
COMMENT ON COLUMN public.sessao_ativa.id IS 'Identificador único UUID da sessão ativa.';
COMMENT ON COLUMN public.sessao_ativa.usuario_id IS 'Chave estrangeira do usuário autenticado (auth.users).';
COMMENT ON COLUMN public.sessao_ativa.token_hash IS 'Hash criptográfico SHA-256 do token de acesso para verificação rápida de revogação.';
COMMENT ON COLUMN public.sessao_ativa.ip_origem IS 'Endereço IP público do cliente que iniciou a sessão.';
COMMENT ON COLUMN public.sessao_ativa.user_agent IS 'String de User-Agent completa do navegador ou cliente HTTP.';
COMMENT ON COLUMN public.sessao_ativa.dispositivo IS 'Rótulo simplificado do dispositivo e sistema operacional.';
COMMENT ON COLUMN public.sessao_ativa.criado_em IS 'Data e hora em que a sessão de login foi estabelecida.';
COMMENT ON COLUMN public.sessao_ativa.ultimo_acesso_em IS 'Data e hora da última requisição autenticada realizada com este token.';
COMMENT ON COLUMN public.sessao_ativa.expira_em IS 'Data e hora limite de validade do token de acesso.';
COMMENT ON COLUMN public.sessao_ativa.revogado IS 'Indica se a sessão foi explicitamente invalidada antes da expiração.';
COMMENT ON COLUMN public.sessao_ativa.revogado_em IS 'Momento exato da revogação da sessão.';
COMMENT ON COLUMN public.sessao_ativa.motivo_revogacao IS 'Motivo ou comando disparador da revogação.';

-- ------------------------------------------------------------------------------
-- PASSO 3: Índices para Otimização de Consultas de Sessão e Revogação
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sessao_ativa_usuario_id
    ON public.sessao_ativa(usuario_id);

CREATE INDEX IF NOT EXISTS idx_sessao_ativa_token_hash
    ON public.sessao_ativa(token_hash);

CREATE INDEX IF NOT EXISTS idx_sessao_ativa_ativas
    ON public.sessao_ativa(usuario_id, revogado, expira_em)
    WHERE revogado = FALSE;
