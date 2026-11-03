-- ==============================================================================
-- InTEA: Migration 014 - Criptografia em Repouso e Adequação LGPD (RNF06)
-- ==============================================================================
-- Adequação de tipos de colunas e extensão de campos de prontuário clínico
-- para comportar strings cifradas via algoritmo AES-256-GCM (enc:v1:...)
-- em conformidade estrita com a LGPD (Lei 13.709/2018 - Art. 11 e Art. 46).
-- ==============================================================================

-- 1. Ampliação do tamanho de colunas de identificadores do responsável
-- para suportar payloads cifrados (AES-256-GCM serializado possui ~80-120 caracteres)
DO $$
BEGIN
    -- Ajusta coluna cpf do responsável para VARCHAR(255)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'responsavel' AND column_name = 'cpf'
    ) THEN
        ALTER TABLE public.responsavel ALTER COLUMN cpf TYPE VARCHAR(255);
    END IF;

    -- Ajusta coluna telefone do responsável para VARCHAR(255)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'responsavel' AND column_name = 'telefone'
    ) THEN
        ALTER TABLE public.responsavel ALTER COLUMN telefone TYPE VARCHAR(255);
    END IF;
END $$;

-- 2. Garantia de tipo TEXT nas colunas de prontuário e anotações clínicas
DO $$
BEGIN
    -- dados_clinicos: diagnostico_base e observacoes_gerais
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'dados_clinicos' AND column_name = 'diagnostico_base'
    ) THEN
        ALTER TABLE public.dados_clinicos ALTER COLUMN diagnostico_base TYPE TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'dados_clinicos' AND column_name = 'observacoes_gerais'
    ) THEN
        ALTER TABLE public.dados_clinicos ALTER COLUMN observacoes_gerais TYPE TEXT;
    END IF;

    -- laudo_clinico: descricao
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'laudo_clinico' AND column_name = 'descricao'
    ) THEN
        ALTER TABLE public.laudo_clinico ALTER COLUMN descricao TYPE TEXT;
    END IF;

    -- anotacao_clinica: conteudo
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'anotacao_clinica' AND column_name = 'conteudo'
    ) THEN
        ALTER TABLE public.anotacao_clinica ALTER COLUMN conteudo TYPE TEXT;
    END IF;
END $$;

-- 3. Documentação de Conformidade LGPD no Banco de Dados
COMMENT ON TABLE public.dados_clinicos IS 'Dados clínicos de pacientes atípicos TEA com suporte a criptografia simétrica AES-256-GCM em repouso (LGPD RNF06)';
COMMENT ON TABLE public.anotacao_clinica IS 'Evoluções e notas clínicas protegidas por Soft Delete (RN05) e suporte a cifragem em repouso (RNF06)';
COMMENT ON TABLE public.laudo_clinico IS 'Metadados de laudos médicos multidisciplinares sob sigilo profissional (LGPD / RNF06)';
COMMENT ON TABLE public.responsavel IS 'Identificadores e contatos de responsáveis legais com proteção contra vazamento em logs e suporte a repouso cifrado (RNF06)';
