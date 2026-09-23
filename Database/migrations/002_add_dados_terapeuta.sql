-- ==============================================================================
-- PROJETO InTEA: MIGRAÇÃO 002 - DADOS COMPLEMENTARES DO TERAPEUTA E ÁREAS DE FOCO
-- ==============================================================================
-- OBJETIVO:
-- 1. Adicionar colunas de contato e experiência profissional em `public.terapeuta`:
--    - telefone (VARCHAR(20))
--    - crefito (VARCHAR(50)) [registro profissional / conselho regional]
--    - tempo_experiencia_anos (INTEGER)
-- 2. Criar tabela de catálogo de Áreas de Foco (`public.areas_foco`)
-- 3. Criar tabela associativa (`public.terapeuta_area_foco`) N:N
-- 4. Atualizar trigger `handle_new_user()` para mapear novos campos no signup
-- 5. Configurar políticas de RLS e índices de performance
-- 6. Inserir sementes iniciais de áreas de foco clínico
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 1: Adicionar novas colunas em `public.terapeuta`
-- ------------------------------------------------------------------------------
ALTER TABLE public.terapeuta
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS crefito VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tempo_experiencia_anos INTEGER DEFAULT 0 CHECK (tempo_experiencia_anos >= 0);

-- Se existir registro_profissional e crefito estiver nulo, copia os dados existentes
UPDATE public.terapeuta
SET crefito = registro_profissional
WHERE crefito IS NULL AND registro_profissional IS NOT NULL;

-- ------------------------------------------------------------------------------
-- PASSO 2: Criar tabela de catálogo `public.areas_foco`
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.areas_foco (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL UNIQUE,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- PASSO 3: Criar tabela associativa `public.terapeuta_area_foco`
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.terapeuta_area_foco (
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE CASCADE,
    area_foco_id UUID NOT NULL REFERENCES public.areas_foco(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    PRIMARY KEY (terapeuta_id, area_foco_id)
);

-- ------------------------------------------------------------------------------
-- PASSO 4: Atualizar trigger `handle_new_user()`
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
    COALESCE((NEW.raw_user_meta_data->>'is_super_admin')::BOOLEAN, FALSE),
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- PASSO 5: Políticas de Segurança (Row Level Security - RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.areas_foco ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terapeuta_area_foco ENABLE ROW LEVEL SECURITY;

-- Políticas para `terapeuta`
DROP POLICY IF EXISTS "Terapeutas autenticados podem visualizar perfis" ON public.terapeuta;
CREATE POLICY "Terapeutas autenticados podem visualizar perfis"
ON public.terapeuta FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Terapeuta pode atualizar o proprio perfil" ON public.terapeuta;
CREATE POLICY "Terapeuta pode atualizar o proprio perfil"
ON public.terapeuta FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.check_is_super_admin());

-- Políticas para `areas_foco`
DROP POLICY IF EXISTS "Areas de foco visiveis para terapeutas" ON public.areas_foco;
CREATE POLICY "Areas de foco visiveis para terapeutas"
ON public.areas_foco FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Apenas admin gerencia catalogo de areas de foco" ON public.areas_foco;
CREATE POLICY "Apenas admin gerencia catalogo de areas de foco"
ON public.areas_foco FOR ALL
TO authenticated
USING (public.check_is_super_admin());

-- Políticas para `terapeuta_area_foco`
DROP POLICY IF EXISTS "Areas de foco vinculadas visiveis para autenticados" ON public.terapeuta_area_foco;
CREATE POLICY "Areas de foco vinculadas visiveis para autenticados"
ON public.terapeuta_area_foco FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Terapeuta gerencia suas proprias areas de foco" ON public.terapeuta_area_foco;
CREATE POLICY "Terapeuta gerencia suas proprias areas de foco"
ON public.terapeuta_area_foco FOR ALL
TO authenticated
USING (terapeuta_id = auth.uid() OR public.check_is_super_admin());

-- ------------------------------------------------------------------------------
-- PASSO 6: Sementes Iniciais de Áreas de Foco Clínico
-- ------------------------------------------------------------------------------
INSERT INTO public.areas_foco (nome, descricao)
VALUES
    ('Comunicação e Linguagem', 'Fonoaudiologia, estimulação da fala, comunicação alternativa e aumentativa (CAA).'),
    ('Habilidades Sociais e Interação', 'Desenvolvimento de reciprocidade social, contato visual, empatia e convivência em grupo.'),
    ('Integração e Regulação Sensorial', 'Terapia ocupacional voltada a modulação e processamento de estímulos sensoriais.'),
    ('Coordenação Motora e Psicomotricidade', 'Atividades motoras globais e coordenação motora fina para autonomia e precisão.'),
    ('Autonomia e Atividades de Vida Diária (AVD)', 'Treino de rotinas diárias como alimentação, higiene pessoal e organização.'),
    ('Flexibilidade Cognitiva e Atenção', 'Aprimoramento de foco, atenção compartilhada e capacidade de transição entre tarefas.'),
    ('Análise do Comportamento Aplicada (ABA)', 'Intervenções baseadas em princípios comportamentais para ensino de novas habilidades.'),
    ('Funções Executivas e Resolução de Problemas', 'Planejamento, controle inibitório, memória de trabalho e raciocínio lógico.')
ON CONFLICT (nome) DO NOTHING;

-- ------------------------------------------------------------------------------
-- PASSO 7: Índices de Otimização de Busca
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_terapeuta_telefone ON public.terapeuta(telefone);
CREATE INDEX IF NOT EXISTS idx_terapeuta_crefito ON public.terapeuta(crefito);
CREATE INDEX IF NOT EXISTS idx_terapeuta_area_foco_terapeuta ON public.terapeuta_area_foco(terapeuta_id);
CREATE INDEX IF NOT EXISTS idx_terapeuta_area_foco_area ON public.terapeuta_area_foco(area_foco_id);
