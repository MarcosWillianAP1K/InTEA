-- ==============================================================================
-- InTEA: Migration 010 - Remoção Completa de Políticas de RLS (Fase de Desenvolvimento)
-- ==============================================================================
-- Justificativa:
-- Durante o ciclo acelerado de desenvolvimento e homologação de novos fluxos,
-- as políticas de Row Level Security (RLS) estavam gerando constantes bloqueios
-- e exigindo migrações intermediárias a cada ajuste no modelo de dados.
--
-- Esta migration:
-- 1. Remove explicitamente todas as políticas existentes nas tabelas públicas e storage.
-- 2. Remove dinamicamente qualquer política residual no schema public.
-- 3. Desativa o Row Level Security (DISABLE ROW LEVEL SECURITY) em todas as tabelas.
--
-- Obs: A segurança em nível de linha (RLS) será consolidada em uma migração definitiva
-- na fase de homologação/produção final, quando o modelo relacional estiver 100% estabilizado.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Remoção Explícita de Políticas em Tabelas Públicas
-- ------------------------------------------------------------------------------

-- public.jogo
DROP POLICY IF EXISTS "Jogos visiveis para terapeutas autenticados" ON public.jogo;

-- public.terapeuta
DROP POLICY IF EXISTS "Terapeutas autenticados podem visualizar perfis" ON public.terapeuta;
DROP POLICY IF EXISTS "Terapeuta pode atualizar o proprio perfil" ON public.terapeuta;

-- public.areas_foco
DROP POLICY IF EXISTS "Areas de foco visiveis para terapeutas" ON public.areas_foco;
DROP POLICY IF EXISTS "Apenas admin gerencia catalogo de areas de foco" ON public.areas_foco;

-- public.terapeuta_area_foco
DROP POLICY IF EXISTS "Areas de foco vinculadas visiveis para autenticados" ON public.terapeuta_area_foco;
DROP POLICY IF EXISTS "Terapeuta gerencia suas proprias areas de foco" ON public.terapeuta_area_foco;

-- public.paciente
DROP POLICY IF EXISTS "Acesso aos pacientes vinculados" ON public.paciente;

-- public.responsavel
DROP POLICY IF EXISTS "Terapeutas acessam responsaveis vinculados" ON public.responsavel;
DROP POLICY IF EXISTS "Terapeutas podem cadastrar responsaveis" ON public.responsavel;
DROP POLICY IF EXISTS "Terapeutas podem atualizar responsaveis vinculados" ON public.responsavel;

-- public.paciente_responsavel
DROP POLICY IF EXISTS "Gestao do vinculo paciente responsavel" ON public.paciente_responsavel;

-- public.dados_clinicos
DROP POLICY IF EXISTS "Acesso aos dados clinicos do paciente" ON public.dados_clinicos;

-- public.gatilhos
DROP POLICY IF EXISTS "Gatilhos visiveis para terapeutas" ON public.gatilhos;
DROP POLICY IF EXISTS "Apenas admin gerencia catalogo de gatilhos" ON public.gatilhos;

-- public.paciente_gatilho
DROP POLICY IF EXISTS "Gestao dos gatilhos do paciente" ON public.paciente_gatilho;

-- public.laudo_clinico
DROP POLICY IF EXISTS "Consulta de laudos de pacientes vinculados" ON public.laudo_clinico;
DROP POLICY IF EXISTS "Insercao de laudo por terapeuta vinculado" ON public.laudo_clinico;
DROP POLICY IF EXISTS "Edicao de metadados do proprio laudo" ON public.laudo_clinico;
DROP POLICY IF EXISTS "Exclusao de laudo pelo autor ou admin" ON public.laudo_clinico;

-- public.sessao
DROP POLICY IF EXISTS "Terapeuta gerencia suas sessoes" ON public.sessao;
DROP POLICY IF EXISTS "Pareamento via token para jogo externo" ON public.sessao;

-- public.anotacao_clinica
DROP POLICY IF EXISTS "Consulta de anotacoes ativas da equipe" ON public.anotacao_clinica;
DROP POLICY IF EXISTS "Insercao de anotacao com autoria e vinculo obrigatorio" ON public.anotacao_clinica;
DROP POLICY IF EXISTS "Edicao de anotacao propria" ON public.anotacao_clinica;

-- public.relatorio_sessao
DROP POLICY IF EXISTS "Consulta de relatorios clinicos" ON public.relatorio_sessao;
DROP POLICY IF EXISTS "Insercao de relatorio consolidado" ON public.relatorio_sessao;
DROP POLICY IF EXISTS "Edicao de relatorio consolidado" ON public.relatorio_sessao;

-- public.telemetria_evento
DROP POLICY IF EXISTS "Consulta de telemetria da sessao" ON public.telemetria_evento;
DROP POLICY IF EXISTS "Insercao de telemetria autorizada" ON public.telemetria_evento;

-- public.auditoria_sessao
DROP POLICY IF EXISTS "Consulta de auditoria da sessao autorizada" ON public.auditoria_sessao;
DROP POLICY IF EXISTS "Insercao de auditoria autorizada" ON public.auditoria_sessao;

-- ------------------------------------------------------------------------------
-- 2. Remoção Explícita de Políticas no Supabase Storage
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Acesso de leitura a laudos no Storage" ON storage.objects;
DROP POLICY IF EXISTS "Upload de laudos no Storage" ON storage.objects;
DROP POLICY IF EXISTS "Exclusao de laudos no Storage" ON storage.objects;

-- ------------------------------------------------------------------------------
-- 3. Limpeza Dinâmica de Qualquer Política Residual no Schema public
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
-- 4. Desativação do Row Level Security (RLS) em Todas as Tabelas
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.clinica DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.terapeuta DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.areas_foco DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.terapeuta_area_foco DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paciente DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.responsavel DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paciente_responsavel DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dados_clinicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.terapeuta_paciente DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gatilhos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paciente_gatilho DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.laudo_clinico DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jogo DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessao DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.anotacao_clinica DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.relatorio_sessao DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.telemetria_evento DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auditoria_sessao DISABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 5. Garantia Dinâmica de Desativação de RLS em Qualquer Tabela do Schema public
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' AND rowsecurity = true
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', tbl.tablename);
    END LOOP;
END $$;
