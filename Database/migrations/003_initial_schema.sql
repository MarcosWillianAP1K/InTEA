-- ==============================================================================
-- PROJETO InTEA: MIGRAÇÃO 003 - ESQUEMA INICIAL DE TELEMETRIA E SESSÕES (LEGACY / SUPABASE)
-- ==============================================================================
-- OBJETIVO:
-- 1. Padronizar a migração inicial de telemetria e sessões originada na branch joao-marcos
--    (anteriormente em Database/supabase/migrations/20260905172500_initial_schema.sql).
-- 2. Consolidar o versionamento sequencial no padrão 001, 002, 003 sob Database/migrations/.
-- 3. Assegurar extensão pgcrypto para criptografia e geração de identificadores.
-- 4. Criar tabelas transitórias/legadas de jogos, sessões, telemetria de eventos e relatórios de sessão.
-- 5. Criar índice temporal para telemetria de eventos por sessão e data_hora decrescente.
--
-- ATENÇÃO ARQUITETURAL:
-- O esquema oficial e canônico de produção do InTEA está definido em Database/database.sql
-- (utilizando public.jogo, public.sessao e chaves primárias/estrangeiras padronizadas em UUID).
-- Esta migração garante retrocompatibilidade e registro histórico formal no pipeline.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 0: Extensões de Banco de Dados
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- PASSO 1: Tabelas de Catálogo de Jogos e Sessões
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jogos (
  id_jogo TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  versao TEXT NOT NULL,
  metricas_suportadas JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_sessao TEXT NOT NULL UNIQUE,
  id_terapeuta TEXT NOT NULL,
  id_paciente TEXT NOT NULL,
  contexto_paciente JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- PASSO 2: Telemetria de Eventos e Relatórios de Sessão
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.telemetria_eventos (
  id BIGSERIAL PRIMARY KEY,
  sessao_id UUID NOT NULL REFERENCES public.sessoes(id) ON DELETE CASCADE,
  data_hora TIMESTAMPTZ NOT NULL,
  tipo_evento TEXT NOT NULL,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.relatorios_sessao (
  id BIGSERIAL PRIMARY KEY,
  sessao_id UUID NOT NULL UNIQUE REFERENCES public.sessoes(id) ON DELETE CASCADE,
  duracao_segundos INTEGER NOT NULL CHECK (duracao_segundos >= 0),
  resumo JSONB NOT NULL DEFAULT '{}'::jsonb,
  analises_ia JSONB NOT NULL DEFAULT '[]'::jsonb,
  metricas_agregadas JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- PASSO 3: Índices de Performance e Otimização
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_telemetria_eventos_sessao_data_hora
  ON public.telemetria_eventos(sessao_id, data_hora DESC);
