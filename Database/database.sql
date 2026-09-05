-- ==============================================================================
-- PROJETO InTEA: MODELAGEM RELACIONAL SUPABASE (PostgreSQL)
-- Modelo Otimizado e Enxuto (Sem redundância entre Sessão e Relatório)
-- ==============================================================================

-- 1. Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABELA: clinica
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clinica (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 3. TABELA: terapeuta (Perfil espelhado de auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.terapeuta (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    clinica_id BIGINT REFERENCES public.clinica(id) ON DELETE SET NULL,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    registro_profissional VARCHAR(50), -- CREFITO / CRM
    especialidade VARCHAR(100),
    is_super_admin BOOLEAN DEFAULT FALSE NOT NULL,
    status_ativo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 4. TABELA: paciente
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.paciente (
    id BIGSERIAL PRIMARY KEY,
    clinica_id BIGINT NOT NULL REFERENCES public.clinica(id) ON DELETE RESTRICT,
    nome VARCHAR(255) NOT NULL,
    data_nascimento DATE NOT NULL,
    status_ativo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 5. TABELA: dados_clinicos (1:1 com paciente)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.dados_clinicos (
    id BIGSERIAL PRIMARY KEY,
    paciente_id BIGINT UNIQUE NOT NULL REFERENCES public.paciente(id) ON DELETE CASCADE,
    diagnostico_base TEXT, -- Ex: Autismo nível 2, Dislexia
    gatilhos_sensoriais JSONB DEFAULT '[]'::jsonb, -- Ex: ["som_alto", "luz_intensa"]
    observacoes_gerais TEXT,
    metadados JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 6. TABELA ASSOCIATIVA: terapeuta_paciente (Chave Primária Composta N:N)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.terapeuta_paciente (
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE CASCADE,
    paciente_id BIGINT NOT NULL REFERENCES public.paciente(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    PRIMARY KEY (terapeuta_id, paciente_id)
);

-- ==============================================================================
-- 7. TABELA: jogo (Catálogo / Biblioteca)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.jogo (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    versao VARCHAR(50) NOT NULL,
    status_instalacao VARCHAR(50) DEFAULT 'instalado' NOT NULL,
    manifesto_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- Contrato 1: Manifesto de métricas
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 8. TABELA: sessao (Orquestração e Pareamento - sem resultado_ia redundante)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sessao (
    id BIGSERIAL PRIMARY KEY,
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    paciente_id BIGINT REFERENCES public.paciente(id) ON DELETE RESTRICT, -- NULL em Modo Livre
    jogo_id BIGINT NOT NULL REFERENCES public.jogo(id) ON DELETE RESTRICT,
    session_token VARCHAR(20) UNIQUE NOT NULL, -- Código de pareamento (Ex: 849-291)
    modo_sessao VARCHAR(30) DEFAULT 'sessao_clinica' NOT NULL, -- 'sessao_clinica' ou 'modo_livre'
    contexto_dda_json JSONB DEFAULT '{}'::jsonb, -- Contrato 2: Parâmetros pré-sessão
    status_sessao VARCHAR(30) DEFAULT 'aguardando_conexao' NOT NULL, -- aguardando_conexao, em_andamento, finalizada
    data_hora_inicio TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    data_hora_fim TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

    -- Restrição RN01: Modo Livre não vincula paciente
    CONSTRAINT chk_modo_sessao_paciente CHECK (
        (modo_sessao = 'modo_livre' AND paciente_id IS NULL) OR
        (modo_sessao = 'sessao_clinica' AND paciente_id IS NOT NULL)
    )
);

-- ==============================================================================
-- 9. TABELA: anotacao_clinica (Prontuário com Soft Delete - RN05)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.anotacao_clinica (
    id BIGSERIAL PRIMARY KEY,
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    paciente_id BIGINT NOT NULL REFERENCES public.paciente(id) ON DELETE RESTRICT,
    sessao_id BIGINT REFERENCES public.sessao(id) ON DELETE SET NULL,
    conteudo TEXT NOT NULL,
    soft_delete BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 10. TABELA: relatorio_sessao (Centraliza o Relatório e Dados da IA da Sessão)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.relatorio_sessao (
    id BIGSERIAL PRIMARY KEY,
    sessao_id BIGINT UNIQUE NOT NULL REFERENCES public.sessao(id) ON DELETE RESTRICT,
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    paciente_id BIGINT NOT NULL REFERENCES public.paciente(id) ON DELETE RESTRICT,
    conteudo TEXT, -- Parecer/observações do terapeuta
    dados_ia_json JSONB DEFAULT '{}'::jsonb, -- Contrato 4: Taxa de conclusão, DDA, análises IA, métricas agregadas
    soft_delete BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 11. BLOQUEIO DE HARD DELETE (Conformidade RN05)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.impedir_hard_delete_clinico()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Exclusão física proibida por conformidade clínica (RN05). Altere soft_delete para TRUE.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bloqueio_delete_anotacao
BEFORE DELETE ON public.anotacao_clinica
FOR EACH ROW EXECUTE FUNCTION public.impedir_hard_delete_clinico();

CREATE TRIGGER trg_bloqueio_delete_relatorio
BEFORE DELETE ON public.relatorio_sessao
FOR EACH ROW EXECUTE FUNCTION public.impedir_hard_delete_clinico();

-- ==============================================================================
-- 12. ÍNDICES DE PERFORMANCE E BUSCA (RF19)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_sessao_paciente ON public.sessao(paciente_id);
CREATE INDEX IF NOT EXISTS idx_sessao_terapeuta ON public.sessao(terapeuta_id);
CREATE INDEX IF NOT EXISTS idx_sessao_token ON public.sessao(session_token);
CREATE INDEX IF NOT EXISTS idx_anotacao_paciente ON public.anotacao_clinica(paciente_id);
CREATE INDEX IF NOT EXISTS idx_anotacao_sessao ON public.anotacao_clinica(sessao_id);
CREATE INDEX IF NOT EXISTS idx_relatorio_paciente ON public.relatorio_sessao(paciente_id);

-- ==============================================================================
-- 13. FUNÇÕES AUXILIARES DE RLS (Evita recursão)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.terapeuta WHERE id = auth.uid()),
    FALSE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.terapeuta_tem_acesso_paciente(p_paciente_id BIGINT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.terapeuta_paciente
    WHERE terapeuta_id = auth.uid() AND paciente_id = p_paciente_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==============================================================================
-- 14. TRIGGER DE CRIAÇÃO DO TERAPEUTA VIA AUTH
-- ==============================================================================
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
    (NEW.raw_user_meta_data->>'clinica_id')::BIGINT,
    COALESCE((NEW.raw_user_meta_data->>'is_super_admin')::BOOLEAN, FALSE),
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 15. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terapeuta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dados_clinicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terapeuta_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anotacao_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorio_sessao ENABLE ROW LEVEL SECURITY;

-- Catálogo de Jogos
CREATE POLICY "Jogos visiveis para terapeutas autenticados"
ON public.jogo FOR SELECT
TO authenticated
USING (true);

-- Pacientes (Vínculo formal ou SuperAdmin)
CREATE POLICY "Acesso aos pacientes vinculados"
ON public.paciente FOR ALL
TO authenticated
USING (
    public.check_is_super_admin() OR public.terapeuta_tem_acesso_paciente(id)
);

-- Dados Clínicos
CREATE POLICY "Acesso aos dados clinicos do paciente"
ON public.dados_clinicos FOR ALL
TO authenticated
USING (
    public.check_is_super_admin() OR public.terapeuta_tem_acesso_paciente(paciente_id)
);

-- Sessões
CREATE POLICY "Terapeuta gerencia suas sessoes"
ON public.sessao FOR ALL
TO authenticated
USING (
    terapeuta_id = auth.uid() OR
    (paciente_id IS NOT NULL AND public.terapeuta_tem_acesso_paciente(paciente_id)) OR
    public.check_is_super_admin()
);

-- Pareamento Remoto do Jogo via session_token
CREATE POLICY "Pareamento via token para jogo externo"
ON public.sessao FOR SELECT
TO anon
USING (status_sessao IN ('aguardando_conexao', 'em_andamento'));

-- Anotações Clínicas
CREATE POLICY "Consulta de anotacoes ativas da equipe"
ON public.anotacao_clinica FOR SELECT
TO authenticated
USING (
    soft_delete = FALSE AND (
        terapeuta_id = auth.uid() OR 
        public.terapeuta_tem_acesso_paciente(paciente_id) OR
        public.check_is_super_admin()
    )
);

CREATE POLICY "Insercao de anotacao com autoria obrigatoria"
ON public.anotacao_clinica FOR INSERT
TO authenticated
WITH CHECK (terapeuta_id = auth.uid());

CREATE POLICY "Edicao de anotacao propria"
ON public.anotacao_clinica FOR UPDATE
TO authenticated
USING (terapeuta_id = auth.uid() AND soft_delete = FALSE);

-- Relatórios de Sessão
CREATE POLICY "Consulta de relatorios clinicos"
ON public.relatorio_sessao FOR SELECT
TO authenticated
USING (
    soft_delete = FALSE AND (
        terapeuta_id = auth.uid() OR 
        public.terapeuta_tem_acesso_paciente(paciente_id) OR
        public.check_is_super_admin()
    )
);

CREATE POLICY "Insercao de relatorio consolidado"
ON public.relatorio_sessao FOR INSERT
TO authenticated
WITH CHECK (terapeuta_id = auth.uid());

CREATE POLICY "Edicao de relatorio consolidado"
ON public.relatorio_sessao FOR UPDATE
TO authenticated
USING (
    terapeuta_id = auth.uid() AND soft_delete = FALSE
);