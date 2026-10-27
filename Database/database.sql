-- ==============================================================================
-- PROJETO InTEA: MODELAGEM RELACIONAL SUPABASE (PostgreSQL)
-- Modelo Otimizado, Padronizado em UUID, Gestão de Pacientes, Terapeutas e Laudos
-- (Políticas de RLS desativadas para a fase de desenvolvimento e prototipação ágil)
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
    status_ativo BOOLEAN DEFAULT TRUE NOT NULL,
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
-- 5. TABELA: paciente (Com dados sociodemográficos e endereço)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.paciente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID NOT NULL REFERENCES public.clinica(id) ON DELETE RESTRICT,
    nome VARCHAR(255) NOT NULL,
    data_nascimento DATE NOT NULL,
    telefone VARCHAR(20),
    cpf VARCHAR(255) UNIQUE, -- Suporta armazenamento cifrado AES-256-GCM (RNF06)
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
    telefone VARCHAR(255) NOT NULL, -- Suporta armazenamento cifrado AES-256-GCM (RNF06)
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
    status_jogo VARCHAR(30) DEFAULT 'ativo' NOT NULL, -- 'ativo', 'desativado', 'manutencao', 'em_breve'
    manifesto_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- Contrato 1: Manifesto de métricas
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_status_jogo CHECK (status_jogo IN ('ativo', 'desativado', 'manutencao', 'em_breve'))
);

-- ==============================================================================
-- 12. TABELA: sessao (Orquestração e Pareamento - sem resultado_ia redundante)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sessao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    paciente_id UUID REFERENCES public.paciente(id) ON DELETE RESTRICT, -- NULL em Modo Livre (RN01)
    jogo_id UUID NOT NULL REFERENCES public.jogo(id) ON DELETE RESTRICT,
    session_token VARCHAR(20) UNIQUE NOT NULL, -- Código de pareamento (Ex: PIN de 6 dígitos ou formato 849-291)
    modo_sessao VARCHAR(30) DEFAULT 'sessao_clinica' NOT NULL, -- 'sessao_clinica' ou 'modo_livre'
    contexto_dda_json JSONB DEFAULT '{}'::jsonb, -- Contrato 2: Parâmetros pré-sessão para a IA (RN03)
    dispositivo_info JSONB DEFAULT '{}'::jsonb, -- Metadados de hardware do dispositivo pareado (RF10)
    status_sessao VARCHAR(30) DEFAULT 'aguardando_pareamento' NOT NULL, -- Máquina de estados da sessão
    data_hora_inicio TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    expira_em TIMESTAMPTZ DEFAULT (TIMEZONE('utc', NOW()) + INTERVAL '15 minutes') NOT NULL, -- TTL de 15 minutos (Card 530/556)
    data_hora_fim TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

    -- Restrição RN01: Modo Livre não vincula paciente, Sessão Clínica exige paciente
    CONSTRAINT chk_modo_sessao_paciente CHECK (
        (modo_sessao = 'modo_livre' AND paciente_id IS NULL) OR
        (modo_sessao = 'sessao_clinica' AND paciente_id IS NOT NULL)
    ),

    -- Máquina de Estados da Sessão e Pareamento Remoto (RF12, RF21)
    CONSTRAINT chk_status_sessao CHECK (
        status_sessao IN (
            'aguardando_pareamento',
            'conectado',
            'em_andamento',
            'pausada',
            'finalizada',
            'expirada',
            'cancelada',
            'interrompida_por_queda'
        )
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
-- 14. TABELA: relatorio_sessao (Entidade de Prontuário Clínico da Sessão - 3FN)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.relatorio_sessao (
    sessao_id UUID PRIMARY KEY REFERENCES public.sessao(id) ON DELETE RESTRICT,
    conteudo TEXT, -- Parecer técnico e observações consolidadas do terapeuta
    dados_ia_json JSONB DEFAULT '{}'::jsonb, -- Contrato 4: Taxa de conclusão, DDA, análises IA
    soft_delete BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 15. TABELA: telemetria_evento (Ingestão e Persistência de Eventos de Telemetria)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.telemetria_evento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id UUID NOT NULL REFERENCES public.sessao(id) ON DELETE RESTRICT,
    tipo_evento VARCHAR(50) NOT NULL, -- Ex: 'interacao_paciente', 'metrica_jogo', 'sistema_tablet'
    dados JSONB DEFAULT '{}'::jsonb NOT NULL, -- Contrato 3 (telemetria.json): { "id_metrica": "...", "valor": ... }
    data_hora TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 16. TABELA: auditoria_sessao (Trilha de Auditoria Clínica de Sessão - RF13, RNF06, RN04, RN05)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.auditoria_sessao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id UUID NOT NULL REFERENCES public.sessao(id) ON DELETE CASCADE,
    terapeuta_id UUID REFERENCES public.terapeuta(id) ON DELETE SET NULL,
    origem VARCHAR(50) NOT NULL, -- 'terapeuta_web', 'dispositivo_jogo', 'sistema_dda'
    acao VARCHAR(80) NOT NULL,   -- 'sessao_criada', 'dispositivo_pareado', 'sessao_finalizada', 'sessao_cancelada', etc.
    detalhes_json JSONB DEFAULT '{}'::jsonb NOT NULL,
    ip VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Trigger de Imutabilidade Estrita
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

-- Índices de Otimização da Auditoria
CREATE INDEX IF NOT EXISTS idx_auditoria_sessao_created 
    ON public.auditoria_sessao(sessao_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_auditoria_terapeuta 
    ON public.auditoria_sessao(terapeuta_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_acao 
    ON public.auditoria_sessao(acao);
CREATE INDEX IF NOT EXISTS idx_auditoria_detalhes_gin 
    ON public.auditoria_sessao USING gin (detalhes_json);


-- ==============================================================================
-- 17. BLOQUEIO DE HARD DELETE (Desativado temporariamente em DEV/Testes)
-- ==============================================================================
-- Os triggers de bloqueio físico (trg_bloqueio_delete_anotacao e trg_bloqueio_delete_relatorio)
-- estão temporariamente desativados durante a fase de testes e desenvolvimento.
-- Serão reativados antes da implantação oficial em produção para conformidade clínica RN05.
DROP TRIGGER IF EXISTS trg_bloqueio_delete_anotacao ON public.anotacao_clinica;
DROP TRIGGER IF EXISTS trg_bloqueio_delete_relatorio ON public.relatorio_sessao;

-- Trigger para limpeza automática de responsáveis órfãos em exclusões físicas de testes (Hard Delete)
CREATE OR REPLACE FUNCTION public.fn_limpar_responsavel_orfaos()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.paciente_responsavel
        WHERE responsavel_id = OLD.responsavel_id
    ) THEN
        DELETE FROM public.responsavel
        WHERE id = OLD.responsavel_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_limpar_responsavel_orfaos ON public.paciente_responsavel;

CREATE TRIGGER trg_limpar_responsavel_orfaos
AFTER DELETE ON public.paciente_responsavel
FOR EACH ROW
EXECUTE FUNCTION public.fn_limpar_responsavel_orfaos();

-- ==============================================================================
-- 18. SUPABASE STORAGE: BUCKET PRIVADO DE LAUDOS
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
-- 19. ÍNDICES DE PERFORMANCE E BUSCA (RF19)
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
CREATE INDEX IF NOT EXISTS idx_sessao_jogo ON public.sessao(jogo_id);
CREATE INDEX IF NOT EXISTS idx_sessao_token ON public.sessao(session_token);
CREATE INDEX IF NOT EXISTS idx_sessao_status ON public.sessao(status_sessao);
CREATE INDEX IF NOT EXISTS idx_sessao_expira_em ON public.sessao(expira_em);
CREATE INDEX IF NOT EXISTS idx_sessao_status_expira ON public.sessao(status_sessao, expira_em);
CREATE INDEX IF NOT EXISTS idx_anotacao_paciente ON public.anotacao_clinica(paciente_id);
CREATE INDEX IF NOT EXISTS idx_anotacao_sessao ON public.anotacao_clinica(sessao_id);
CREATE INDEX IF NOT EXISTS idx_telemetria_sessao_data_hora ON public.telemetria_evento(sessao_id, data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_telemetria_tipo_evento ON public.telemetria_evento(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_telemetria_id_metrica ON public.telemetria_evento ((dados->>'id_metrica'));
CREATE INDEX IF NOT EXISTS idx_telemetria_dados_gin ON public.telemetria_evento USING gin (dados);

-- Índices Otimizados para Prontuário Longitudinal e Gráficos Históricos (Sprint 11 - RF15, RNF05, RN01, RN05)
CREATE INDEX IF NOT EXISTS idx_sessao_paciente_engajamento ON public.sessao (paciente_id, status_sessao, data_hora_fim DESC) WHERE paciente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessao_paciente_jogo_fim ON public.sessao (paciente_id, jogo_id, data_hora_fim DESC) WHERE status_sessao = 'finalizada' AND paciente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_relatorio_dados_ia_gin ON public.relatorio_sessao USING gin (dados_ia_json);

-- Índices Otimizados para Anotações Clínicas e Contexto DDA (Sprint 12 - RF16, RF21, RN04, RN05)
CREATE INDEX IF NOT EXISTS idx_anotacao_paciente_autor_data ON public.anotacao_clinica(paciente_id, terapeuta_id, created_at DESC) WHERE soft_delete = false;
CREATE INDEX IF NOT EXISTS idx_anotacao_sessao_soft_delete ON public.anotacao_clinica(sessao_id, created_at DESC) WHERE soft_delete = false;

-- Trigger para atualizacao automatica de updated_at em sessao
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

-- ==============================================================================
-- 20. TRIGGER DE CRIAÇÃO DO TERAPEUTA VIA AUTH
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
-- 21. TABELA: sessao_ativa (Controle de Dispositivos e Sessões Concorrentes - RF02)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sessao_ativa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    ip_origem VARCHAR(45) NULL,
    user_agent TEXT NULL,
    dispositivo VARCHAR(100) NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    ultimo_acesso_em TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    expira_em TIMESTAMPTZ NOT NULL,
    revogado BOOLEAN NOT NULL DEFAULT FALSE,
    revogado_em TIMESTAMPTZ NULL,
    motivo_revogacao VARCHAR(100) NULL
);

CREATE INDEX IF NOT EXISTS idx_sessao_ativa_usuario_id ON public.sessao_ativa(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sessao_ativa_token_hash ON public.sessao_ativa(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessao_ativa_ativas ON public.sessao_ativa(usuario_id, revogado, expira_em) WHERE revogado = FALSE;

-- ==============================================================================
-- 22. SEMENTES DE DADOS (Seeds Iniciais)
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