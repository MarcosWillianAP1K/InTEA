-- ==============================================================================
-- PROJETO InTEA: MODELAGEM RELACIONAL SUPABASE (PostgreSQL)
-- Modelo Otimizado, Padronizado em UUID, Gestão de Pacientes, Terapeutas e Laudos
-- ==============================================================================

-- 1. Extensões para UUID e Criptografia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABELA: clinica
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clinica (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    clinica_id UUID REFERENCES public.clinica(id) ON DELETE SET NULL,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    crefito VARCHAR(50), -- Registro profissional / conselho de classe
    registro_profissional VARCHAR(50), -- Mantido por retrocompatibilidade
    tempo_experiencia_anos INTEGER DEFAULT 0 CHECK (tempo_experiencia_anos >= 0),
    especialidade VARCHAR(100),
    is_super_admin BOOLEAN DEFAULT FALSE NOT NULL,
    status_ativo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 4. TABELAS: areas_foco e terapeuta_area_foco (Catálogo e Vínculo N:N)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.areas_foco (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL UNIQUE,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.terapeuta_area_foco (
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE CASCADE,
    area_foco_id UUID NOT NULL REFERENCES public.areas_foco(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    PRIMARY KEY (terapeuta_id, area_foco_id)
);

-- ==============================================================================
-- 5. TABELA: paciente (Com dados sociodemográficos e endereço - Fig. 15/16)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.paciente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID NOT NULL REFERENCES public.clinica(id) ON DELETE RESTRICT,
    nome VARCHAR(255) NOT NULL,
    data_nascimento DATE NOT NULL,
    telefone VARCHAR(20),
    cpf VARCHAR(14) UNIQUE,
    cep VARCHAR(10),
    cidade VARCHAR(255),
    estado VARCHAR(100),
    endereco VARCHAR(255),
    bairro VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(255),
    status_ativo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 6. TABELAS: responsavel e paciente_responsavel (Responsável Principal e Extra)
-- ==============================================================================
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

CREATE TABLE IF NOT EXISTS public.paciente_responsavel (
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE CASCADE,
    responsavel_id UUID NOT NULL REFERENCES public.responsavel(id) ON DELETE CASCADE,
    tipo_responsavel VARCHAR(30) DEFAULT 'principal' NOT NULL, -- 'principal' ou 'extra'
    parentesco VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    PRIMARY KEY (paciente_id, responsavel_id)
);

-- ==============================================================================
-- 7. TABELA: dados_clinicos (1:1 com paciente)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.dados_clinicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID UNIQUE NOT NULL REFERENCES public.paciente(id) ON DELETE CASCADE,
    diagnostico_base TEXT, -- Ex: Autismo nível 2 de suporte, TDAH
    gatilhos_sensoriais JSONB DEFAULT '[]'::jsonb, -- Compatibilidade com tags rápidas
    observacoes_gerais TEXT,
    metadados JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 8. TABELA ASSOCIATIVA: terapeuta_paciente (Chave Primária Composta N:N)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.terapeuta_paciente (
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE CASCADE,
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    PRIMARY KEY (terapeuta_id, paciente_id)
);

-- ==============================================================================
-- 9. TABELAS: gatilhos e paciente_gatilho (Catálogo e Vínculo com Severidade)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.gatilhos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL UNIQUE,
    categoria VARCHAR(50) DEFAULT 'sensorial' NOT NULL, -- sensorial, rotina, ambiental, emocional
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.paciente_gatilho (
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE CASCADE,
    gatilho_id UUID NOT NULL REFERENCES public.gatilhos(id) ON DELETE CASCADE,
    grau_severidade VARCHAR(30) DEFAULT 'moderado', -- leve, moderado, severo
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    PRIMARY KEY (paciente_id, gatilho_id)
);

-- ==============================================================================
-- 10. TABELA: laudo_clinico (Metadados de arquivos armazenados no Supabase Storage)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.laudo_clinico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE CASCADE,
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    arquivo_caminho TEXT NOT NULL, -- Caminho no Supabase Storage (bucket 'laudos')
    arquivo_nome_original VARCHAR(255) NOT NULL,
    arquivo_mime_type VARCHAR(100) NOT NULL, -- application/pdf, application/msword, etc.
    tamanho_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 11. TABELA: jogo (Catálogo / Biblioteca)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.jogo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    versao VARCHAR(50) NOT NULL,
    status_instalacao VARCHAR(50) DEFAULT 'instalado' NOT NULL,
    manifesto_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- Contrato 1: Manifesto de métricas
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 12. TABELA: sessao (Orquestração e Pareamento - sem resultado_ia redundante)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sessao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    paciente_id UUID REFERENCES public.paciente(id) ON DELETE RESTRICT, -- NULL em Modo Livre
    jogo_id UUID NOT NULL REFERENCES public.jogo(id) ON DELETE RESTRICT,
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
-- 13. TABELA: anotacao_clinica (Prontuário com Soft Delete - RN05)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.anotacao_clinica (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE RESTRICT,
    sessao_id UUID REFERENCES public.sessao(id) ON DELETE SET NULL,
    conteudo TEXT NOT NULL,
    soft_delete BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 14. TABELA: relatorio_sessao (Centraliza o Relatório e Dados da IA da Sessão)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.relatorio_sessao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id UUID UNIQUE NOT NULL REFERENCES public.sessao(id) ON DELETE RESTRICT,
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE RESTRICT,
    conteudo TEXT, -- Parecer/observações do terapeuta
    dados_ia_json JSONB DEFAULT '{}'::jsonb, -- Contrato 4: Taxa de conclusão, DDA, análises IA
    soft_delete BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 15. BLOQUEIO DE HARD DELETE (Conformidade RN05)
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
-- 16. SUPABASE STORAGE: BUCKET PRIVADO DE LAUDOS
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'laudos',
    'laudos',
    false, -- Bucket estritamente PRIVADO
    15728640, -- 15 MB
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

-- ==============================================================================
-- 17. ÍNDICES DE PERFORMANCE E BUSCA (RF19)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_terapeuta_telefone ON public.terapeuta(telefone);
CREATE INDEX IF NOT EXISTS idx_terapeuta_crefito ON public.terapeuta(crefito);
CREATE INDEX IF NOT EXISTS idx_terapeuta_area_foco_terapeuta ON public.terapeuta_area_foco(terapeuta_id);
CREATE INDEX IF NOT EXISTS idx_terapeuta_area_foco_area ON public.terapeuta_area_foco(area_foco_id);
CREATE INDEX IF NOT EXISTS idx_paciente_cpf ON public.paciente(cpf);
CREATE INDEX IF NOT EXISTS idx_responsavel_cpf ON public.responsavel(cpf);
CREATE INDEX IF NOT EXISTS idx_paciente_responsavel_paciente ON public.paciente_responsavel(paciente_id);
CREATE INDEX IF NOT EXISTS idx_paciente_responsavel_responsavel ON public.paciente_responsavel(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_paciente_gatilho_paciente ON public.paciente_gatilho(paciente_id);
CREATE INDEX IF NOT EXISTS idx_laudo_clinico_paciente ON public.laudo_clinico(paciente_id);
CREATE INDEX IF NOT EXISTS idx_laudo_clinico_terapeuta ON public.laudo_clinico(terapeuta_id);
CREATE INDEX IF NOT EXISTS idx_sessao_paciente ON public.sessao(paciente_id);
CREATE INDEX IF NOT EXISTS idx_sessao_terapeuta ON public.sessao(terapeuta_id);
CREATE INDEX IF NOT EXISTS idx_sessao_token ON public.sessao(session_token);
CREATE INDEX IF NOT EXISTS idx_anotacao_paciente ON public.anotacao_clinica(paciente_id);
CREATE INDEX IF NOT EXISTS idx_anotacao_sessao ON public.anotacao_clinica(sessao_id);
CREATE INDEX IF NOT EXISTS idx_relatorio_paciente ON public.relatorio_sessao(paciente_id);

-- ==============================================================================
-- 18. FUNÇÕES AUXILIARES DE RLS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.terapeuta WHERE id = auth.uid()),
    FALSE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.terapeuta_tem_acesso_paciente(p_paciente_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.terapeuta_paciente
    WHERE terapeuta_id = auth.uid() AND paciente_id = p_paciente_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==============================================================================
-- 19. TRIGGER DE CRIAÇÃO DO TERAPEUTA VIA AUTH
-- ==============================================================================
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 20. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terapeuta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas_foco ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terapeuta_area_foco ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsavel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente_responsavel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dados_clinicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terapeuta_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gatilhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente_gatilho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laudo_clinico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anotacao_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorio_sessao ENABLE ROW LEVEL SECURITY;

-- Catálogo de Jogos
CREATE POLICY "Jogos visiveis para terapeutas autenticados"
ON public.jogo FOR SELECT
TO authenticated
USING (true);

-- Terapeuta
CREATE POLICY "Terapeutas autenticados podem visualizar perfis"
ON public.terapeuta FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Terapeuta pode atualizar o proprio perfil"
ON public.terapeuta FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.check_is_super_admin());

-- Áreas de Foco
CREATE POLICY "Areas de foco visiveis para terapeutas"
ON public.areas_foco FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Apenas admin gerencia catalogo de areas de foco"
ON public.areas_foco FOR ALL
TO authenticated
USING (public.check_is_super_admin());

-- Vínculo Terapeuta - Área de Foco
CREATE POLICY "Areas de foco vinculadas visiveis para autenticados"
ON public.terapeuta_area_foco FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Terapeuta gerencia suas proprias areas de foco"
ON public.terapeuta_area_foco FOR ALL
TO authenticated
USING (terapeuta_id = auth.uid() OR public.check_is_super_admin());

-- Pacientes (Vínculo formal ou SuperAdmin)
CREATE POLICY "Acesso aos pacientes vinculados"
ON public.paciente FOR ALL
TO authenticated
USING (
    public.check_is_super_admin() OR public.terapeuta_tem_acesso_paciente(id)
);

-- Responsáveis
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

CREATE POLICY "Terapeutas podem cadastrar responsaveis"
ON public.responsavel FOR INSERT
TO authenticated
WITH CHECK (true);

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

-- Vínculo Paciente - Responsável
CREATE POLICY "Gestao do vinculo paciente responsavel"
ON public.paciente_responsavel FOR ALL
TO authenticated
USING (
    public.check_is_super_admin() OR public.terapeuta_tem_acesso_paciente(paciente_id)
);

-- Dados Clínicos
CREATE POLICY "Acesso aos dados clinicos do paciente"
ON public.dados_clinicos FOR ALL
TO authenticated
USING (
    public.check_is_super_admin() OR public.terapeuta_tem_acesso_paciente(paciente_id)
);

-- Catálogo de Gatilhos
CREATE POLICY "Gatilhos visiveis para terapeutas"
ON public.gatilhos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Apenas admin gerencia catalogo de gatilhos"
ON public.gatilhos FOR ALL
TO authenticated
USING (public.check_is_super_admin());

-- Gatilhos do Paciente
CREATE POLICY "Gestao dos gatilhos do paciente"
ON public.paciente_gatilho FOR ALL
TO authenticated
USING (
    public.check_is_super_admin() OR public.terapeuta_tem_acesso_paciente(paciente_id)
);

-- Laudos Clínicos
CREATE POLICY "Consulta de laudos de pacientes vinculados"
ON public.laudo_clinico FOR SELECT
TO authenticated
USING (
    public.check_is_super_admin() OR public.terapeuta_tem_acesso_paciente(paciente_id)
);

CREATE POLICY "Insercao de laudo por terapeuta vinculado"
ON public.laudo_clinico FOR INSERT
TO authenticated
WITH CHECK (
    terapeuta_id = auth.uid() AND
    (public.check_is_super_admin() OR public.terapeuta_tem_acesso_paciente(paciente_id))
);

CREATE POLICY "Edicao de metadados do proprio laudo"
ON public.laudo_clinico FOR UPDATE
TO authenticated
USING (
    terapeuta_id = auth.uid() OR public.check_is_super_admin()
);

CREATE POLICY "Exclusao de laudo pelo autor ou admin"
ON public.laudo_clinico FOR DELETE
TO authenticated
USING (
    terapeuta_id = auth.uid() OR public.check_is_super_admin()
);

-- Políticas para Supabase Storage (storage.objects)
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

CREATE POLICY "Upload de laudos no Storage"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'laudos' AND
    auth.role() = 'authenticated'
);

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

-- ==============================================================================
-- 21. SEMENTES DE DADOS (Seeds Iniciais)
-- ==============================================================================

-- Gatilhos Sensoriais
INSERT INTO public.gatilhos (nome, categoria, descricao)
VALUES 
    ('Sons Altos ou Repentinos', 'sensorial', 'Hipersensibilidade auditiva a ruídos intensos, alarmes, sirenes ou palmas.'),
    ('Luzes Fortes ou Piscantes', 'sensorial', 'Hipersensibilidade visual a ambientes com claridade excessiva ou luzes estroboscópicas.'),
    ('Toque Físico / Texturas Específicas', 'sensorial', 'Desconforto com toque inesperado ou texturas específicas de tecidos e objetos.'),
    ('Pressão de Tempo / Contagem Regressiva', 'emocional', 'Ansiedade gerada por limites rígidos de tempo ou cronômetros visíveis.'),
    ('Mudança Brusca de Rotina / Transições', 'rotina', 'Dificuldade de adaptação ao término imprevisto de uma atividade ou troca de tarefa.'),
    ('Ambientes Aglomerados / Multidões', 'ambiental', 'Sobrecarga sensorial provocada pelo excesso de estímulos simultâneos em locais cheios.')
ON CONFLICT (nome) DO NOTHING;

-- Áreas de Foco Clínico
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