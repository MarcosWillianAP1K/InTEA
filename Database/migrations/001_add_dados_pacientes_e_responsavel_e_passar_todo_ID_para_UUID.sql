-- ==============================================================================
-- PROJETO InTEA: MIGRAÇÃO 001 - DADOS DE PACIENTE, RESPONSÁVEL E MIGRAÇÃO PARA UUID
-- ==============================================================================
-- OBJETIVO:
-- 1. Padronizar todos os identificadores primários (PK) e estrangeiros (FK) para UUID.
--    (Elimina enumeração sequencial, previne vazamento de dados e unifica com auth.users).
-- 2. Adicionar campos sociodemográficos e de endereço em `paciente` (Formulário Fig. 15/16).
-- 3. Criar tabelas `responsavel` e associativa `paciente_responsavel` (suporte a principal e extra).
-- 4. Criar catálogo de `gatilhos` e relacionamento `paciente_gatilho` (com sementes iniciais).
-- 5. Configurar armazenamento de laudos (PDF/DOCX/DOC) via Supabase Storage e tabela `laudo_clinico`.
-- 6. Atualizar funções de controle de acesso (RLS) e integridade referencial.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 0: Extensão para geração de UUIDs
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- PASSO 1: Remoção temporária de Foreign Keys existentes (para viabilizar a conversão de tipo)
-- ------------------------------------------------------------------------------
-- As constraints serão recriadas ao final com o tipo UUID estritamente validado.
ALTER TABLE IF EXISTS public.relatorio_sessao DROP CONSTRAINT IF EXISTS relatorio_sessao_sessao_id_fkey;
ALTER TABLE IF EXISTS public.relatorio_sessao DROP CONSTRAINT IF EXISTS relatorio_sessao_paciente_id_fkey;
ALTER TABLE IF EXISTS public.relatorio_sessao DROP CONSTRAINT IF EXISTS relatorio_sessao_terapeuta_id_fkey;

ALTER TABLE IF EXISTS public.anotacao_clinica DROP CONSTRAINT IF EXISTS anotacao_clinica_sessao_id_fkey;
ALTER TABLE IF EXISTS public.anotacao_clinica DROP CONSTRAINT IF EXISTS anotacao_clinica_paciente_id_fkey;
ALTER TABLE IF EXISTS public.anotacao_clinica DROP CONSTRAINT IF EXISTS anotacao_clinica_terapeuta_id_fkey;

ALTER TABLE IF EXISTS public.sessao DROP CONSTRAINT IF EXISTS sessao_paciente_id_fkey;
ALTER TABLE IF EXISTS public.sessao DROP CONSTRAINT IF EXISTS sessao_jogo_id_fkey;
ALTER TABLE IF EXISTS public.sessao DROP CONSTRAINT IF EXISTS sessao_terapeuta_id_fkey;

ALTER TABLE IF EXISTS public.terapeuta_paciente DROP CONSTRAINT IF EXISTS terapeuta_paciente_paciente_id_fkey;
ALTER TABLE IF EXISTS public.terapeuta_paciente DROP CONSTRAINT IF EXISTS terapeuta_paciente_terapeuta_id_fkey;

ALTER TABLE IF EXISTS public.dados_clinicos DROP CONSTRAINT IF EXISTS dados_clinicos_paciente_id_fkey;
ALTER TABLE IF EXISTS public.dados_clinicos DROP CONSTRAINT IF EXISTS dados_clinicos_paciente_id_key;

ALTER TABLE IF EXISTS public.paciente DROP CONSTRAINT IF EXISTS paciente_clinica_id_fkey;

ALTER TABLE IF EXISTS public.terapeuta DROP CONSTRAINT IF EXISTS terapeuta_clinica_id_fkey;

-- Remove a função antiga com assinatura BIGINT em cascata (remove políticas dependentes temporariamente)
DROP FUNCTION IF EXISTS public.terapeuta_tem_acesso_paciente(BIGINT) CASCADE;

-- ------------------------------------------------------------------------------
-- PASSO 2: Migração de BIGINT para UUID preservando dados existentes
-- ------------------------------------------------------------------------------

-- 2.1 Tabela `clinica`: Converte PK de BIGINT para UUID
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'clinica' AND column_name = 'public_id'
    ) THEN
        -- Se já existia public_id UUID na clinica, mapeia as foreign keys para ele
        ALTER TABLE public.terapeuta ADD COLUMN IF NOT EXISTS new_clinica_id UUID;
        UPDATE public.terapeuta t
        SET new_clinica_id = c.public_id
        FROM public.clinica c
        WHERE t.clinica_id = c.id;

        ALTER TABLE public.paciente ADD COLUMN IF NOT EXISTS new_clinica_id UUID;
        UPDATE public.paciente p
        SET new_clinica_id = c.public_id
        FROM public.clinica c
        WHERE p.clinica_id = c.id;

        -- Remove chave antiga e adota o public_id como id primário
        ALTER TABLE public.clinica DROP CONSTRAINT IF EXISTS clinica_pkey CASCADE;
        ALTER TABLE public.clinica DROP COLUMN IF EXISTS id CASCADE;
        ALTER TABLE public.clinica RENAME COLUMN public_id TO id;
        ALTER TABLE public.clinica ALTER COLUMN id SET DEFAULT gen_random_uuid();
        ALTER TABLE public.clinica ADD PRIMARY KEY (id);

        -- Ajusta colunas FK em terapeuta e paciente
        ALTER TABLE public.terapeuta DROP COLUMN IF EXISTS clinica_id CASCADE;
        ALTER TABLE public.terapeuta RENAME COLUMN new_clinica_id TO clinica_id;

        ALTER TABLE public.paciente DROP COLUMN IF EXISTS clinica_id CASCADE;
        ALTER TABLE public.paciente RENAME COLUMN new_clinica_id TO clinica_id;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'clinica' AND column_name = 'id' AND data_type != 'uuid'
    ) THEN
        ALTER TABLE public.clinica ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE public.clinica ALTER COLUMN id TYPE UUID USING gen_random_uuid();
        ALTER TABLE public.clinica ALTER COLUMN id SET DEFAULT gen_random_uuid();
    END IF;
END $$;

-- 2.2 Tabela `paciente`: Converte PK para UUID e propaga para tabelas filhas
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'paciente' AND column_name = 'id' AND data_type != 'uuid'
    ) THEN
        -- Cria nova coluna UUID temporária para paciente
        ALTER TABLE public.paciente ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid() NOT NULL;

        -- Cria colunas transitórias nas tabelas filhas e mapeia integridade
        ALTER TABLE public.dados_clinicos ADD COLUMN IF NOT EXISTS new_paciente_id UUID;
        UPDATE public.dados_clinicos dc SET new_paciente_id = p.new_id FROM public.paciente p WHERE dc.paciente_id = p.id;

        ALTER TABLE public.terapeuta_paciente ADD COLUMN IF NOT EXISTS new_paciente_id UUID;
        UPDATE public.terapeuta_paciente tp SET new_paciente_id = p.new_id FROM public.paciente p WHERE tp.paciente_id = p.id;

        ALTER TABLE public.sessao ADD COLUMN IF NOT EXISTS new_paciente_id UUID;
        UPDATE public.sessao s SET new_paciente_id = p.new_id FROM public.paciente p WHERE s.paciente_id = p.id;

        ALTER TABLE public.anotacao_clinica ADD COLUMN IF NOT EXISTS new_paciente_id UUID;
        UPDATE public.anotacao_clinica ac SET new_paciente_id = p.new_id FROM public.paciente p WHERE ac.paciente_id = p.id;

        ALTER TABLE public.relatorio_sessao ADD COLUMN IF NOT EXISTS new_paciente_id UUID;
        UPDATE public.relatorio_sessao rs SET new_paciente_id = p.new_id FROM public.paciente p WHERE rs.paciente_id = p.id;

        -- Converte a PK de paciente
        ALTER TABLE public.paciente DROP CONSTRAINT IF EXISTS paciente_pkey CASCADE;
        ALTER TABLE public.paciente DROP COLUMN IF EXISTS id CASCADE;
        ALTER TABLE public.paciente RENAME COLUMN new_id TO id;
        ALTER TABLE public.paciente ADD PRIMARY KEY (id);

        -- Substitui as colunas FK nas tabelas filhas
        ALTER TABLE public.dados_clinicos DROP COLUMN IF EXISTS paciente_id CASCADE;
        ALTER TABLE public.dados_clinicos RENAME COLUMN new_paciente_id TO paciente_id;

        ALTER TABLE public.terapeuta_paciente DROP CONSTRAINT IF EXISTS terapeuta_paciente_pkey CASCADE;
        ALTER TABLE public.terapeuta_paciente DROP COLUMN IF EXISTS paciente_id CASCADE;
        ALTER TABLE public.terapeuta_paciente RENAME COLUMN new_paciente_id TO paciente_id;
        ALTER TABLE public.terapeuta_paciente ADD PRIMARY KEY (terapeuta_id, paciente_id);

        ALTER TABLE public.sessao DROP COLUMN IF EXISTS paciente_id CASCADE;
        ALTER TABLE public.sessao RENAME COLUMN new_paciente_id TO paciente_id;

        ALTER TABLE public.anotacao_clinica DROP COLUMN IF EXISTS paciente_id CASCADE;
        ALTER TABLE public.anotacao_clinica RENAME COLUMN new_paciente_id TO paciente_id;

        ALTER TABLE public.relatorio_sessao DROP COLUMN IF EXISTS paciente_id CASCADE;
        ALTER TABLE public.relatorio_sessao RENAME COLUMN new_paciente_id TO paciente_id;
    END IF;
END $$;

-- 2.3 Tabela `dados_clinicos`: Converte PK para UUID
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'dados_clinicos' AND column_name = 'id' AND data_type != 'uuid'
    ) THEN
        ALTER TABLE public.dados_clinicos ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE public.dados_clinicos ALTER COLUMN id TYPE UUID USING gen_random_uuid();
        ALTER TABLE public.dados_clinicos ALTER COLUMN id SET DEFAULT gen_random_uuid();
    END IF;
END $$;

-- 2.4 Tabela `jogo`: Converte PK para UUID e propaga para `sessao.jogo_id`
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'jogo' AND column_name = 'id' AND data_type != 'uuid'
    ) THEN
        ALTER TABLE public.jogo ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid() NOT NULL;
        ALTER TABLE public.sessao ADD COLUMN IF NOT EXISTS new_jogo_id UUID;
        UPDATE public.sessao s SET new_jogo_id = j.new_id FROM public.jogo j WHERE s.jogo_id = j.id;

        ALTER TABLE public.jogo DROP CONSTRAINT IF EXISTS jogo_pkey CASCADE;
        ALTER TABLE public.jogo DROP COLUMN IF EXISTS id CASCADE;
        ALTER TABLE public.jogo RENAME COLUMN new_id TO id;
        ALTER TABLE public.jogo ADD PRIMARY KEY (id);

        ALTER TABLE public.sessao DROP COLUMN IF EXISTS jogo_id CASCADE;
        ALTER TABLE public.sessao RENAME COLUMN new_jogo_id TO jogo_id;
    END IF;
END $$;

-- 2.5 Tabela `sessao`: Converte PK para UUID e propaga para `anotacao_clinica` e `relatorio_sessao`
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sessao' AND column_name = 'id' AND data_type != 'uuid'
    ) THEN
        ALTER TABLE public.sessao ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid() NOT NULL;

        ALTER TABLE public.anotacao_clinica ADD COLUMN IF NOT EXISTS new_sessao_id UUID;
        UPDATE public.anotacao_clinica ac SET new_sessao_id = s.new_id FROM public.sessao s WHERE ac.sessao_id = s.id;

        ALTER TABLE public.relatorio_sessao ADD COLUMN IF NOT EXISTS new_sessao_id UUID;
        UPDATE public.relatorio_sessao rs SET new_sessao_id = s.new_id FROM public.sessao s WHERE rs.sessao_id = s.id;

        ALTER TABLE public.sessao DROP CONSTRAINT IF EXISTS sessao_pkey CASCADE;
        ALTER TABLE public.sessao DROP COLUMN IF EXISTS id CASCADE;
        ALTER TABLE public.sessao RENAME COLUMN new_id TO id;
        ALTER TABLE public.sessao ADD PRIMARY KEY (id);

        ALTER TABLE public.anotacao_clinica DROP COLUMN IF EXISTS sessao_id CASCADE;
        ALTER TABLE public.anotacao_clinica RENAME COLUMN new_sessao_id TO sessao_id;

        ALTER TABLE public.relatorio_sessao DROP COLUMN IF EXISTS sessao_id CASCADE;
        ALTER TABLE public.relatorio_sessao RENAME COLUMN new_sessao_id TO sessao_id;
    END IF;
END $$;

-- 2.6 Tabelas `anotacao_clinica` e `relatorio_sessao`: Converte PKs para UUID
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'anotacao_clinica' AND column_name = 'id' AND data_type != 'uuid'
    ) THEN
        ALTER TABLE public.anotacao_clinica ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE public.anotacao_clinica ALTER COLUMN id TYPE UUID USING gen_random_uuid();
        ALTER TABLE public.anotacao_clinica ALTER COLUMN id SET DEFAULT gen_random_uuid();
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'relatorio_sessao' AND column_name = 'id' AND data_type != 'uuid'
    ) THEN
        ALTER TABLE public.relatorio_sessao ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE public.relatorio_sessao ALTER COLUMN id TYPE UUID USING gen_random_uuid();
        ALTER TABLE public.relatorio_sessao ALTER COLUMN id SET DEFAULT gen_random_uuid();
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- PASSO 3: Recriação de Foreign Keys e Restrições de Integridade
-- ------------------------------------------------------------------------------
ALTER TABLE public.terapeuta 
    ADD CONSTRAINT terapeuta_clinica_id_fkey 
    FOREIGN KEY (clinica_id) REFERENCES public.clinica(id) ON DELETE SET NULL;

ALTER TABLE public.paciente 
    ADD CONSTRAINT paciente_clinica_id_fkey 
    FOREIGN KEY (clinica_id) REFERENCES public.clinica(id) ON DELETE RESTRICT;

ALTER TABLE public.dados_clinicos 
    ADD CONSTRAINT dados_clinicos_paciente_id_fkey 
    FOREIGN KEY (paciente_id) REFERENCES public.paciente(id) ON DELETE CASCADE,
    ADD CONSTRAINT dados_clinicos_paciente_id_key UNIQUE (paciente_id);

ALTER TABLE public.terapeuta_paciente 
    ADD CONSTRAINT terapeuta_paciente_terapeuta_id_fkey 
    FOREIGN KEY (terapeuta_id) REFERENCES public.terapeuta(id) ON DELETE CASCADE,
    ADD CONSTRAINT terapeuta_paciente_paciente_id_fkey 
    FOREIGN KEY (paciente_id) REFERENCES public.paciente(id) ON DELETE CASCADE;

ALTER TABLE public.sessao 
    ADD CONSTRAINT sessao_terapeuta_id_fkey 
    FOREIGN KEY (terapeuta_id) REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    ADD CONSTRAINT sessao_paciente_id_fkey 
    FOREIGN KEY (paciente_id) REFERENCES public.paciente(id) ON DELETE RESTRICT,
    ADD CONSTRAINT sessao_jogo_id_fkey 
    FOREIGN KEY (jogo_id) REFERENCES public.jogo(id) ON DELETE RESTRICT;

ALTER TABLE public.anotacao_clinica 
    ADD CONSTRAINT anotacao_clinica_terapeuta_id_fkey 
    FOREIGN KEY (terapeuta_id) REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    ADD CONSTRAINT anotacao_clinica_paciente_id_fkey 
    FOREIGN KEY (paciente_id) REFERENCES public.paciente(id) ON DELETE RESTRICT,
    ADD CONSTRAINT anotacao_clinica_sessao_id_fkey 
    FOREIGN KEY (sessao_id) REFERENCES public.sessao(id) ON DELETE SET NULL;

ALTER TABLE public.relatorio_sessao 
    ADD CONSTRAINT relatorio_sessao_sessao_id_fkey 
    FOREIGN KEY (sessao_id) REFERENCES public.sessao(id) ON DELETE RESTRICT,
    ADD CONSTRAINT relatorio_sessao_terapeuta_id_fkey 
    FOREIGN KEY (terapeuta_id) REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    ADD CONSTRAINT relatorio_sessao_paciente_id_fkey 
    FOREIGN KEY (paciente_id) REFERENCES public.paciente(id) ON DELETE RESTRICT,
    ADD CONSTRAINT relatorio_sessao_sessao_id_key UNIQUE (sessao_id);

-- ------------------------------------------------------------------------------
-- PASSO 4: Adição dos Campos do Formulário de Cadastro em `paciente`
-- ------------------------------------------------------------------------------
-- Campos sociodemográficos, contato e endereço (Figuras 15 e 16 do projeto)
ALTER TABLE public.paciente
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) UNIQUE,
    ADD COLUMN IF NOT EXISTS cep VARCHAR(10),
    ADD COLUMN IF NOT EXISTS cidade VARCHAR(255),
    ADD COLUMN IF NOT EXISTS estado VARCHAR(100),
    ADD COLUMN IF NOT EXISTS endereco VARCHAR(255),
    ADD COLUMN IF NOT EXISTS bairro VARCHAR(255),
    ADD COLUMN IF NOT EXISTS numero VARCHAR(20),
    ADD COLUMN IF NOT EXISTS complemento VARCHAR(255);

-- ------------------------------------------------------------------------------
-- PASSO 5: Tabelas de Responsáveis (`responsavel` e `paciente_responsavel`)
-- ------------------------------------------------------------------------------
-- Suporta o cadastro do responsável principal e do responsável extra opcional
CREATE TABLE IF NOT EXISTS public.responsavel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    data_nascimento DATE,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    parentesco VARCHAR(50), -- Ex: Mãe, Pai, Tutor legal, Avó
    cep VARCHAR(10),
    cidade VARCHAR(255),
    estado VARCHAR(100),
    endereco VARCHAR(255),
    bairro VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Tabela associativa com suporte à classificação 'principal' e 'extra'
CREATE TABLE IF NOT EXISTS public.paciente_responsavel (
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE CASCADE,
    responsavel_id UUID NOT NULL REFERENCES public.responsavel(id) ON DELETE CASCADE,
    tipo_responsavel VARCHAR(30) DEFAULT 'principal' NOT NULL, -- 'principal' ou 'extra'
    parentesco VARCHAR(50), -- Sobrescrita de parentesco específico para o paciente
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    PRIMARY KEY (paciente_id, responsavel_id)
);

-- ------------------------------------------------------------------------------
-- PASSO 6: Tabelas de Gatilhos Sensoriais (`gatilhos` e `paciente_gatilho`)
-- ------------------------------------------------------------------------------
-- Catálogo global de gatilhos clínicos e hipersensibilidades
CREATE TABLE IF NOT EXISTS public.gatilhos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL UNIQUE,
    categoria VARCHAR(50) DEFAULT 'sensorial' NOT NULL, -- sensorial, rotina, ambiental, emocional
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Vínculo N:N entre paciente e gatilho com grau de severidade e notas clínicas
CREATE TABLE IF NOT EXISTS public.paciente_gatilho (
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE CASCADE,
    gatilho_id UUID NOT NULL REFERENCES public.gatilhos(id) ON DELETE CASCADE,
    grau_severidade VARCHAR(30) DEFAULT 'moderado', -- leve, moderado, severo
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    PRIMARY KEY (paciente_id, gatilho_id)
);

-- ------------------------------------------------------------------------------
-- PASSO 7: Armazenamento de Laudos Clínicos (Supabase Storage + Tabela Relacional)
-- ------------------------------------------------------------------------------
-- EXPLICAÇÃO ARQUITETURAL:
-- Arquivos binários (PDF, DOCX, DOC) são armazenados no Supabase Storage (compatível com S3).
-- Isso preserva o buffer do PostgreSQL e a performance das réplicas de leitura.
-- O banco relacional armazena os metadados e o `arquivo_caminho` (caminho seguro no bucket).
-- O acesso ao arquivo é feito exclusivamente via Signed URL temporária no frontend/backend.

CREATE TABLE IF NOT EXISTS public.laudo_clinico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE CASCADE,
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    arquivo_caminho TEXT NOT NULL, -- Caminho no Supabase Storage (ex: pacientes/{id}/{uuid}.pdf)
    arquivo_nome_original VARCHAR(255) NOT NULL,
    arquivo_mime_type VARCHAR(100) NOT NULL, -- application/pdf, application/msword, etc.
    tamanho_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 7.1 Criação do bucket privado 'laudos' no Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'laudos',
    'laudos',
    false, -- Bucket estritamente PRIVADO
    15728640, -- Limite de 15 MB por arquivo
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]::text[];

-- ------------------------------------------------------------------------------
-- PASSO 8: Atualização de Funções e Triggers de Segurança
-- ------------------------------------------------------------------------------

-- Função atualizada com assinatura UUID
CREATE OR REPLACE FUNCTION public.terapeuta_tem_acesso_paciente(p_paciente_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.terapeuta_paciente
    WHERE terapeuta_id = auth.uid() AND paciente_id = p_paciente_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Trigger de criação do terapeuta adaptado para UUID de clinica_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.terapeuta (
    id,
    nome,
    email,
    registro_profissional,
    especialidade,
    clinica_id,
    is_super_admin,
    status_ativo
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Novo Terapeuta'),
    NEW.email,
    NEW.raw_user_meta_data->>'registro_profissional',
    NEW.raw_user_meta_data->>'especialidade',
    (NEW.raw_user_meta_data->>'clinica_id')::UUID,
    COALESCE((NEW.raw_user_meta_data->>'is_super_admin')::BOOLEAN, FALSE),
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- PASSO 9: Row Level Security (RLS) para Novas e Antigas Tabelas
-- ------------------------------------------------------------------------------

-- Habilita RLS em todas as novas tabelas
ALTER TABLE public.responsavel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente_responsavel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gatilhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente_gatilho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laudo_clinico ENABLE ROW LEVEL SECURITY;

-- 9.1 Políticas para `paciente` e `dados_clinicos` (recriadas para vincular com a função UUID)
DROP POLICY IF EXISTS "Acesso aos pacientes vinculados" ON public.paciente;
CREATE POLICY "Acesso aos pacientes vinculados"
ON public.paciente FOR ALL
TO authenticated
USING (
    public.check_is_super_admin() OR public.terapeuta_tem_acesso_paciente(id)
);

DROP POLICY IF EXISTS "Acesso aos dados clinicos do paciente" ON public.dados_clinicos;
CREATE POLICY "Acesso aos dados clinicos do paciente"
ON public.dados_clinicos FOR ALL
TO authenticated
USING (
    public.check_is_super_admin() OR public.terapeuta_tem_acesso_paciente(paciente_id)
);

-- 9.2 Políticas para `responsavel`
DROP POLICY IF EXISTS "Terapeutas acessam responsaveis vinculados" ON public.responsavel;
CREATE POLICY "Terapeutas acessam responsaveis vinculados"
ON public.responsavel FOR SELECT
TO authenticated
USING (
    public.check_is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.paciente_responsavel pr
        WHERE pr.responsavel_id = responsavel.id
          AND public.terapeuta_tem_acesso_paciente(pr.paciente_id)
    )
);

DROP POLICY IF EXISTS "Terapeutas podem cadastrar responsaveis" ON public.responsavel;
CREATE POLICY "Terapeutas podem cadastrar responsaveis"
ON public.responsavel FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Terapeutas podem atualizar responsaveis vinculados" ON public.responsavel;
CREATE POLICY "Terapeutas podem atualizar responsaveis vinculados"
ON public.responsavel FOR UPDATE
TO authenticated
USING (
    public.check_is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.paciente_responsavel pr
        WHERE pr.responsavel_id = responsavel.id
          AND public.terapeuta_tem_acesso_paciente(pr.paciente_id)
    )
);

-- 9.3 Políticas para `paciente_responsavel`
DROP POLICY IF EXISTS "Gestao do vinculo paciente responsavel" ON public.paciente_responsavel;
CREATE POLICY "Gestao do vinculo paciente responsavel"
ON public.paciente_responsavel FOR ALL
TO authenticated
USING (
    public.check_is_super_admin() OR public.terapeuta_tem_acesso_paciente(paciente_id)
);

-- 9.4 Políticas para `gatilhos` (Catálogo visível para terapeutas autenticados)
DROP POLICY IF EXISTS "Gatilhos visiveis para terapeutas" ON public.gatilhos;
CREATE POLICY "Gatilhos visiveis para terapeutas"
ON public.gatilhos FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Apenas admin gerencia catalogo de gatilhos" ON public.gatilhos;
CREATE POLICY "Apenas admin gerencia catalogo de gatilhos"
ON public.gatilhos FOR ALL
TO authenticated
USING (public.check_is_super_admin());

-- 9.5 Políticas para `paciente_gatilho`
DROP POLICY IF EXISTS "Gestao dos gatilhos do paciente" ON public.paciente_gatilho;
CREATE POLICY "Gestao dos gatilhos do paciente"
ON public.paciente_gatilho FOR ALL
TO authenticated
USING (
    public.check_is_super_admin() OR public.terapeuta_tem_acesso_paciente(paciente_id)
);

-- 9.6 Políticas para `laudo_clinico`
DROP POLICY IF EXISTS "Consulta de laudos de pacientes vinculados" ON public.laudo_clinico;
CREATE POLICY "Consulta de laudos de pacientes vinculados"
ON public.laudo_clinico FOR SELECT
TO authenticated
USING (
    public.check_is_super_admin() OR public.terapeuta_tem_acesso_paciente(paciente_id)
);

DROP POLICY IF EXISTS "Insercao de laudo por terapeuta vinculado" ON public.laudo_clinico;
CREATE POLICY "Insercao de laudo por terapeuta vinculado"
ON public.laudo_clinico FOR INSERT
TO authenticated
WITH CHECK (
    terapeuta_id = auth.uid() AND
    (public.check_is_super_admin() OR public.terapeuta_tem_acesso_paciente(paciente_id))
);

DROP POLICY IF EXISTS "Edicao de metadados do proprio laudo" ON public.laudo_clinico;
CREATE POLICY "Edicao de metadados do proprio laudo"
ON public.laudo_clinico FOR UPDATE
TO authenticated
USING (
    terapeuta_id = auth.uid() OR public.check_is_super_admin()
);

DROP POLICY IF EXISTS "Exclusao de laudo pelo autor ou admin" ON public.laudo_clinico;
CREATE POLICY "Exclusao de laudo pelo autor ou admin"
ON public.laudo_clinico FOR DELETE
TO authenticated
USING (
    terapeuta_id = auth.uid() OR public.check_is_super_admin()
);

-- 9.7 Políticas de segurança RLS no Supabase Storage (`storage.objects`) para bucket 'laudos'
DROP POLICY IF EXISTS "Acesso de leitura a laudos no Storage" ON storage.objects;
CREATE POLICY "Acesso de leitura a laudos no Storage"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'laudos' AND (
        public.check_is_super_admin() OR
        EXISTS (
            SELECT 1 FROM public.laudo_clinico lc
            WHERE lc.arquivo_caminho = storage.objects.name
              AND (lc.terapeuta_id = auth.uid() OR public.terapeuta_tem_acesso_paciente(lc.paciente_id))
        )
    )
);

DROP POLICY IF EXISTS "Upload de laudos no Storage" ON storage.objects;
CREATE POLICY "Upload de laudos no Storage"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'laudos' AND
    auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Exclusao de laudos no Storage" ON storage.objects;
CREATE POLICY "Exclusao de laudos no Storage"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'laudos' AND (
        public.check_is_super_admin() OR
        owner = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.laudo_clinico lc
            WHERE lc.arquivo_caminho = storage.objects.name
              AND lc.terapeuta_id = auth.uid()
        )
    )
);

-- ------------------------------------------------------------------------------
-- PASSO 10: Inserção de Dados Iniciais (Seeds de Gatilhos Sensoriais)
-- ------------------------------------------------------------------------------
INSERT INTO public.gatilhos (nome, categoria, descricao)
VALUES 
    ('Sons Altos ou Repentinos', 'sensorial', 'Hipersensibilidade auditiva a ruídos intensos, alarmes, sirenes ou palmas.'),
    ('Luzes Fortes ou Piscantes', 'sensorial', 'Hipersensibilidade visual a ambientes com claridade excessiva ou luzes estroboscópicas.'),
    ('Toque Físico / Texturas Específicas', 'sensorial', 'Desconforto com toque inesperado ou texturas específicas de tecidos e objetos.'),
    ('Pressão de Tempo / Contagem Regressiva', 'emocional', 'Ansiedade gerada por limites rígidos de tempo ou cronômetros visíveis.'),
    ('Mudança Brusca de Rotina / Transições', 'rotina', 'Dificuldade de adaptação ao término imprevisto de uma atividade ou troca de tarefa.'),
    ('Ambientes Aglomerados / Multidões', 'ambiental', 'Sobrecarga sensorial provocada pelo excesso de estímulos simultâneos em locais cheios.')
ON CONFLICT (nome) DO NOTHING;

-- ------------------------------------------------------------------------------
-- PASSO 11: Índices de Performance e Otimização de Consultas (RF19)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_paciente_cpf ON public.paciente(cpf);
CREATE INDEX IF NOT EXISTS idx_responsavel_cpf ON public.responsavel(cpf);
CREATE INDEX IF NOT EXISTS idx_paciente_responsavel_paciente ON public.paciente_responsavel(paciente_id);
CREATE INDEX IF NOT EXISTS idx_paciente_responsavel_responsavel ON public.paciente_responsavel(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_paciente_gatilho_paciente ON public.paciente_gatilho(paciente_id);
CREATE INDEX IF NOT EXISTS idx_laudo_clinico_paciente ON public.laudo_clinico(paciente_id);
CREATE INDEX IF NOT EXISTS idx_laudo_clinico_terapeuta ON public.laudo_clinico(terapeuta_id);