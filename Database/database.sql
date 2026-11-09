-- ==============================================================================
-- PROJETO InTEA: MODELAGEM RELACIONAL SUPABASE (PostgreSQL)
-- Modelo Otimizado, Padronizado em UUID, Gestão de Pacientes, Terapeutas e Laudos
-- (Políticas de RLS consolidadas e ativadas na Seção 24 / Migration 021)
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

-- Trigger de Proteção e Imutabilidade do Relatório Clínico (RN05 / RNF06)
CREATE OR REPLACE FUNCTION public.impedir_modificacao_relatorio_sessao()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Bloqueio absoluto de DELETE físico (RN05)
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Operacao proibida: Exclusao fisica de relatorio clinico e terminantemente vedada (RN05). O prontuario e inalteravel; utilize soft_delete = true.'
            USING ERRCODE = '23505';
    END IF;

    -- 2. Bloqueio de mutações não autorizadas em UPDATE (RN05 / RNF06)
    IF TG_OP = 'UPDATE' THEN
        -- Bloqueio de alteração do sessao_id (chave primária e integridade 1:1)
        IF NEW.sessao_id IS DISTINCT FROM OLD.sessao_id THEN
            RAISE EXCEPTION 'Operacao proibida: O identificador da sessao (sessao_id) em relatorio_sessao e imutavel (RN05 / RNF06).'
                USING ERRCODE = '23505';
        END IF;

        -- Bloqueio de alteração dos dados brutos consolidados da síntese de IA
        IF NEW.dados_ia_json IS DISTINCT FROM OLD.dados_ia_json THEN
            RAISE EXCEPTION 'Operacao proibida: Os dados consolidados da IA (dados_ia_json) sao estritamente imutaveis apos a criacao do relatorio (RN05 / RNF06).'
                USING ERRCODE = '23505';
        END IF;

        -- Atualiza automaticamente o timestamp de modificação caso campos permitidos sejam alterados
        NEW.updated_at := TIMEZONE('utc', NOW());
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloqueio_delete_relatorio ON public.relatorio_sessao;
DROP TRIGGER IF EXISTS trg_bloqueio_relatorio_sessao ON public.relatorio_sessao;

CREATE TRIGGER trg_bloqueio_relatorio_sessao
    BEFORE UPDATE OR DELETE ON public.relatorio_sessao
    FOR EACH ROW
    EXECUTE FUNCTION public.impedir_modificacao_relatorio_sessao();


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
-- 16.1. TABELA: auditoria_acesso_prontuario (Auditoria de Acessos ao Prontuário - RF08, RNF06, LGPD)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.auditoria_acesso_prontuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE RESTRICT,
    terapeuta_id UUID REFERENCES public.terapeuta(id) ON DELETE SET NULL,
    operacao VARCHAR(30) NOT NULL, -- 'visualizacao', 'alteracao', 'exclusao_logica'
    recurso_acessado VARCHAR(255) NOT NULL,
    ip VARCHAR(45) NULL,
    user_agent TEXT NULL,
    detalhes_json JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Trigger de Imutabilidade Estrita da Auditoria de Prontuário
CREATE OR REPLACE FUNCTION public.impedir_modificacao_auditoria_prontuario()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operacao proibida: Registros da trilha de auditoria de prontuario sao estritamente imutaveis (RN05 / RNF06).'
        USING ERRCODE = '23505';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloqueio_mutacao_auditoria_prontuario ON public.auditoria_acesso_prontuario;
CREATE TRIGGER trg_bloqueio_mutacao_auditoria_prontuario
    BEFORE UPDATE OR DELETE ON public.auditoria_acesso_prontuario
    FOR EACH ROW
    EXECUTE FUNCTION public.impedir_modificacao_auditoria_prontuario();

CREATE INDEX IF NOT EXISTS idx_auditoria_prontuario_paciente 
    ON public.auditoria_acesso_prontuario(paciente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_prontuario_terapeuta 
    ON public.auditoria_acesso_prontuario(terapeuta_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_prontuario_created 
    ON public.auditoria_acesso_prontuario(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_prontuario_operacao 
    ON public.auditoria_acesso_prontuario(operacao);



-- ==============================================================================
-- 17. BLOQUEIO DE HARD DELETE (Conformidade Clínica RN05 / RNF06)
-- ==============================================================================
-- O trigger trg_bloqueio_relatorio_sessao permanece ativo garantindo a inalterabilidade
-- dos dados de IA e bloqueando exclusão física de relatórios clínicos (RN05 / RNF06).
-- Triggers BEFORE DELETE impedem exclusão física em paciente, anotacao_clinica e sessao (Migration 022 / Lei 13.787/2018 Art. 6º).
CREATE OR REPLACE FUNCTION public.impedir_delete_fisico_prontuario()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operacao proibida: Exclusao fisica de prontuario clinico e vedada (RN05 / Lei 13.787/2018). Utilize inativacao logica (soft_delete = true ou status_ativo = false).'
        USING ERRCODE = '23505';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloqueio_delete_paciente ON public.paciente;
CREATE TRIGGER trg_bloqueio_delete_paciente
    BEFORE DELETE ON public.paciente
    FOR EACH ROW
    EXECUTE FUNCTION public.impedir_delete_fisico_prontuario();

DROP TRIGGER IF EXISTS trg_bloqueio_delete_anotacao ON public.anotacao_clinica;
CREATE TRIGGER trg_bloqueio_delete_anotacao
    BEFORE DELETE ON public.anotacao_clinica
    FOR EACH ROW
    EXECUTE FUNCTION public.impedir_delete_fisico_prontuario();

DROP TRIGGER IF EXISTS trg_bloqueio_delete_sessao ON public.sessao;
CREATE TRIGGER trg_bloqueio_delete_sessao
    BEFORE DELETE ON public.sessao
    FOR EACH ROW
    EXECUTE FUNCTION public.impedir_delete_fisico_prontuario();

CREATE OR REPLACE FUNCTION public.impedir_truncate_auditoria()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operacao proibida: Truncamento de tabelas da trilha de auditoria clinica e terminantemente vedado (RN05 / RNF06).'
        USING ERRCODE = '23505';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloqueio_truncate_auditoria_sessao ON public.auditoria_sessao;
CREATE TRIGGER trg_bloqueio_truncate_auditoria_sessao
    BEFORE TRUNCATE ON public.auditoria_sessao
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.impedir_truncate_auditoria();

DROP TRIGGER IF EXISTS trg_bloqueio_truncate_auditoria_prontuario ON public.auditoria_acesso_prontuario;
CREATE TRIGGER trg_bloqueio_truncate_auditoria_prontuario
    BEFORE TRUNCATE ON public.auditoria_acesso_prontuario
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.impedir_truncate_auditoria();

-- ==============================================================================
-- 17.1. TABELA: consentimento_responsavel (Consentimento Parental LGPD Art. 14 §1º - Migration 023)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.consentimento_responsavel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE RESTRICT,
    responsavel_id UUID REFERENCES public.responsavel(id) ON DELETE RESTRICT,
    terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    versao_termo VARCHAR(50) NOT NULL DEFAULT 'v1.0',
    finalidades JSONB NOT NULL DEFAULT '["acompanhamento_clinico", "telemetria_terapeutica", "relatorios_ia"]'::jsonb,
    consentimento_concedido BOOLEAN NOT NULL DEFAULT TRUE,
    ip_origem VARCHAR(45) NULL,
    user_agent TEXT NULL,
    canal_coleta VARCHAR(50) NOT NULL DEFAULT 'presencial_web',
    observacoes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE OR REPLACE FUNCTION public.impedir_modificacao_consentimento_responsavel()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operacao proibida: Registros de consentimento parental (LGPD Art. 14) sao estritamente imutaveis. Para revogar ou atualizar o consentimento, insira um novo registro na trilha (RN05 / RNF06).'
        USING ERRCODE = '23505';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloqueio_mutacao_consentimento ON public.consentimento_responsavel;
CREATE TRIGGER trg_bloqueio_mutacao_consentimento
    BEFORE UPDATE OR DELETE ON public.consentimento_responsavel
    FOR EACH ROW
    EXECUTE FUNCTION public.impedir_modificacao_consentimento_responsavel();

DROP TRIGGER IF EXISTS trg_bloqueio_truncate_consentimento ON public.consentimento_responsavel;
CREATE TRIGGER trg_bloqueio_truncate_consentimento
    BEFORE TRUNCATE ON public.consentimento_responsavel
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.impedir_modificacao_consentimento_responsavel();

CREATE INDEX IF NOT EXISTS idx_consentimento_paciente_created
    ON public.consentimento_responsavel(paciente_id, created_at DESC);
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

-- Índices Compostos de Performance (Migration 022 - P1.4)
CREATE INDEX IF NOT EXISTS idx_sessao_terapeuta_inicio ON public.sessao(terapeuta_id, data_hora_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_sessao_paciente_inicio ON public.sessao(paciente_id, data_hora_inicio DESC) WHERE paciente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_anotacao_paciente_created_ativo ON public.anotacao_clinica(paciente_id, created_at DESC) WHERE soft_delete = FALSE;

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
    COALESCE((NEW.raw_app_meta_data->>'is_super_admin')::BOOLEAN, FALSE),
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
-- 21.1. VIEW MATERIALIZADA: vw_resumo_longitudinal_paciente (RF15, RNF05, RN01, RN04, RN05)
-- ==============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.vw_resumo_longitudinal_paciente AS
SELECT
    s.paciente_id,
    COUNT(CASE WHEN s.status_sessao != 'aguardando_pareamento' THEN 1 END)::INTEGER AS total_sessoes,
    COUNT(CASE WHEN s.status_sessao != 'aguardando_pareamento' THEN 1 END)::INTEGER AS total_iniciadas,
    COUNT(CASE WHEN s.status_sessao = 'finalizada' THEN 1 END)::INTEGER AS sessoes_finalizadas,
    COUNT(CASE WHEN s.status_sessao IN ('cancelada', 'interrompida_por_queda', 'expirada') THEN 1 END)::INTEGER AS sessoes_interrompidas,
    ROUND(
        COALESCE(
            (COUNT(CASE WHEN s.status_sessao = 'finalizada' THEN 1 END)::NUMERIC / 
             NULLIF(COUNT(CASE WHEN s.status_sessao != 'aguardando_pareamento' THEN 1 END), 0) * 100),
            0
        ), 1
    )::NUMERIC AS taxa_conclusao_porcentagem,
    ROUND(
        COALESCE(
            (COUNT(CASE WHEN s.status_sessao = 'finalizada' THEN 1 END)::NUMERIC / 
             NULLIF(COUNT(CASE WHEN s.status_sessao != 'aguardando_pareamento' THEN 1 END), 0) * 100),
            0
        ), 1
    )::NUMERIC AS taxa_conclusao,
    COALESCE(
        SUM(
            CASE 
                WHEN s.data_hora_inicio IS NOT NULL AND s.data_hora_fim IS NOT NULL AND s.data_hora_fim >= s.data_hora_inicio
                THEN EXTRACT(EPOCH FROM (s.data_hora_fim - s.data_hora_inicio))::INTEGER
                ELSE 0
            END
        ), 0
    )::INTEGER AS tempo_total_segundos,
    ROUND(
        COALESCE(
            SUM(
                CASE 
                    WHEN s.data_hora_inicio IS NOT NULL AND s.data_hora_fim IS NOT NULL AND s.data_hora_fim >= s.data_hora_inicio
                    THEN EXTRACT(EPOCH FROM (s.data_hora_fim - s.data_hora_inicio))::INTEGER
                    ELSE 0
                END
            ) / NULLIF(COUNT(CASE WHEN s.status_sessao = 'finalizada' THEN 1 END), 0),
            0
        )
    )::INTEGER AS tempo_medio_segundos,
    COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'jogo_id', sub.sub_jogo_id,
                    'nome', sub.jogo_nome,
                    'versao', sub.jogo_versao,
                    'total_sessoes', sub.total_jogo_sessoes,
                    'ultima_sessao', sub.max_fim
                ) ORDER BY sub.max_fim DESC
            )
            FROM (
                SELECT 
                    sj.jogo_id AS sub_jogo_id,
                    j.nome AS jogo_nome,
                    j.versao AS jogo_versao,
                    COUNT(*)::INTEGER AS total_jogo_sessoes,
                    TO_CHAR(MAX(sj.data_hora_fim), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS max_fim
                FROM public.sessao sj
                JOIN public.jogo j ON j.id = sj.jogo_id
                LEFT JOIN public.relatorio_sessao rj ON rj.sessao_id = sj.id
                WHERE sj.paciente_id = s.paciente_id
                  AND sj.modo_sessao = 'sessao_clinica'
                  AND sj.status_sessao = 'finalizada'
                  AND (rj.soft_delete IS NULL OR rj.soft_delete = FALSE)
                GROUP BY sj.jogo_id, j.nome, j.versao
            ) sub
        ),
        '[]'::jsonb
    ) AS jogos_resumo,
    TIMEZONE('utc', NOW()) AS atualizado_em
FROM public.sessao s
LEFT JOIN public.relatorio_sessao r ON r.sessao_id = s.id
WHERE s.paciente_id IS NOT NULL
  AND s.modo_sessao = 'sessao_clinica'
  AND (r.soft_delete IS NULL OR r.soft_delete = FALSE)
GROUP BY s.paciente_id
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vw_resumo_paciente_id
    ON public.vw_resumo_longitudinal_paciente (paciente_id);

REVOKE ALL ON public.vw_resumo_longitudinal_paciente FROM PUBLIC;
REVOKE ALL ON public.vw_resumo_longitudinal_paciente FROM anon;
REVOKE ALL ON public.vw_resumo_longitudinal_paciente FROM authenticated;
GRANT SELECT ON public.vw_resumo_longitudinal_paciente TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_vw_resumo_longitudinal_paciente()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.vw_resumo_longitudinal_paciente;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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


-- ==============================================================================
-- 23. VÍNCULO MULTITERAPEUTA, AUDITORIA DE VÍNCULOS E FUNÇÃO ANTI-ÓRFÃO (Sprint 13 - Migration 017)
-- Conformidade: RF08, RF18, RN04, RN05, RNF05
-- Auditoria de RLS: RLS reativado e consolidado na Seção 24 (Migration 021) com
-- funções SECURITY DEFINER anti-recursão (42P17), em defesa em profundidade com
-- a validação institucional em Serviço/Middleware (RN04).
-- ==============================================================================

-- 1. Índice Reverso de Vínculo Multiterapeuta (Busca por Paciente -> Equipe)
CREATE INDEX IF NOT EXISTS idx_terapeuta_paciente_paciente_id
    ON public.terapeuta_paciente(paciente_id, terapeuta_id);

-- 2. Tabela Imutável de Auditoria de Vínculos e Acessos da Equipe (RF08, RN04, RN05)
CREATE TABLE IF NOT EXISTS public.auditoria_vinculo_acesso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE RESTRICT,
    terapeuta_autor_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    terapeuta_alvo_id UUID NOT NULL REFERENCES public.terapeuta(id) ON DELETE RESTRICT,
    acao VARCHAR(40) NOT NULL CHECK (acao IN ('vinculo_equipe_criado', 'vinculo_equipe_removido')),
    ip VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 3. Trigger de Imutabilidade Estrita (RN05 / RNF05)
CREATE OR REPLACE FUNCTION public.impedir_modificacao_auditoria_vinculo()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operacao proibida: Registros da trilha de auditoria de vinculos sao estritamente imutaveis (RN05 / RNF05).'
        USING ERRCODE = '23505';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloqueio_mutacao_auditoria_vinculo ON public.auditoria_vinculo_acesso;
CREATE TRIGGER trg_bloqueio_mutacao_auditoria_vinculo
    BEFORE UPDATE OR DELETE ON public.auditoria_vinculo_acesso
    FOR EACH ROW
    EXECUTE FUNCTION public.impedir_modificacao_auditoria_vinculo();

DROP TRIGGER IF EXISTS trg_bloqueio_truncate_auditoria_vinculo ON public.auditoria_vinculo_acesso;
CREATE TRIGGER trg_bloqueio_truncate_auditoria_vinculo
    BEFORE TRUNCATE ON public.auditoria_vinculo_acesso
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.impedir_truncate_auditoria();

-- 4. Índices de Otimização da Trilha de Auditoria de Vínculos (RNF05)
CREATE INDEX IF NOT EXISTS idx_auditoria_vinculo_paciente_created
    ON public.auditoria_vinculo_acesso(paciente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_vinculo_autor
    ON public.auditoria_vinculo_acesso(terapeuta_autor_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_vinculo_acao
    ON public.auditoria_vinculo_acesso(acao);

-- 5. Função Atômica Anti-Órfão com Lock Pessimista (RN04, RF08)
CREATE OR REPLACE FUNCTION public.desvincular_terapeuta_seguro(
    p_paciente_id UUID,
    p_terapeuta_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_existe_vinculo BOOLEAN;
    v_ativos_restantes INTEGER;
BEGIN
    -- Trava pessimista na linha do paciente para impedir condição de corrida
    PERFORM 1 FROM public.paciente WHERE id = p_paciente_id FOR UPDATE;

    SELECT EXISTS (
        SELECT 1 FROM public.terapeuta_paciente
        WHERE paciente_id = p_paciente_id AND terapeuta_id = p_terapeuta_id
    ) INTO v_existe_vinculo;

    IF NOT v_existe_vinculo THEN
        RETURN 'nao_vinculado';
    END IF;

    SELECT COUNT(*)::INTEGER
    INTO v_ativos_restantes
    FROM public.terapeuta_paciente tp
    JOIN public.terapeuta t ON t.id = tp.terapeuta_id
    WHERE tp.paciente_id = p_paciente_id
      AND tp.terapeuta_id <> p_terapeuta_id
      AND t.status_ativo = TRUE;

    IF v_ativos_restantes <= 0 THEN
        RETURN 'ultimo_ativo';
    END IF;

    DELETE FROM public.terapeuta_paciente
    WHERE paciente_id = p_paciente_id AND terapeuta_id = p_terapeuta_id;

    RETURN 'removido';
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;


-- ==============================================================================
-- 24. POLÍTICAS DE ROW LEVEL SECURITY (RLS) E FUNÇÕES ANTI-RECURSÃO (Migration 021)
-- Conformidade: RN04 (Isolamento Institucional), RN05 / RNF06 (Sigilo e Imutabilidade)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.rls_is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.terapeuta
        WHERE id = auth.uid()
          AND is_super_admin = TRUE
          AND status_ativo = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.rls_clinica_usuario()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT clinica_id
    FROM public.terapeuta
    WHERE id = auth.uid()
      AND status_ativo = TRUE
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.rls_tem_vinculo_paciente(p_paciente_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.rls_is_super_admin()
    OR EXISTS (
        SELECT 1
        FROM public.terapeuta t
        JOIN public.paciente p ON p.id = p_paciente_id
        JOIN public.terapeuta_paciente tp
          ON tp.paciente_id = p.id
         AND tp.terapeuta_id = t.id
        WHERE t.id = auth.uid()
          AND t.status_ativo = TRUE
          AND p.clinica_id = t.clinica_id
    );
$$;

CREATE OR REPLACE FUNCTION public.rls_tem_acesso_sessao(p_sessao_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.rls_is_super_admin()
    OR EXISTS (
        SELECT 1
        FROM public.sessao s
        JOIN public.terapeuta t
          ON t.id = auth.uid()
         AND t.status_ativo = TRUE
        WHERE s.id = p_sessao_id
          AND (
              s.terapeuta_id = auth.uid()
              OR (
                  s.paciente_id IS NOT NULL
                  AND public.rls_tem_vinculo_paciente(s.paciente_id)
              )
          )
    );
$$;

REVOKE ALL ON FUNCTION public.rls_is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_clinica_usuario() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_tem_vinculo_paciente(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_tem_acesso_sessao(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rls_is_super_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rls_clinica_usuario() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rls_tem_vinculo_paciente(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rls_tem_acesso_sessao(UUID) TO authenticated, service_role;

ALTER TABLE IF EXISTS public.clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.terapeuta ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.areas_foco ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.terapeuta_area_foco ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.responsavel ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paciente_responsavel ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dados_clinicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.terapeuta_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gatilhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paciente_gatilho ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.laudo_clinico ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.anotacao_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.relatorio_sessao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.telemetria_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auditoria_sessao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessao_ativa ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auditoria_vinculo_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auditoria_acesso_prontuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consentimento_responsavel ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "clinica_select_membros_ou_admin" ON public.clinica
    FOR SELECT TO authenticated
    USING (public.rls_is_super_admin() OR id = public.rls_clinica_usuario());

CREATE POLICY "clinica_all_super_admin" ON public.clinica
    FOR ALL TO authenticated
    USING (public.rls_is_super_admin())
    WITH CHECK (public.rls_is_super_admin());

CREATE POLICY "terapeuta_select_mesma_clinica_ou_admin" ON public.terapeuta
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.rls_is_super_admin() OR (clinica_id IS NOT NULL AND clinica_id = public.rls_clinica_usuario()));

CREATE POLICY "terapeuta_update_proprio_ou_admin" ON public.terapeuta
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.rls_is_super_admin())
    WITH CHECK (public.rls_is_super_admin() OR (id = auth.uid() AND is_super_admin = FALSE AND clinica_id IS NOT DISTINCT FROM public.rls_clinica_usuario()));

CREATE POLICY "terapeuta_insert_delete_super_admin" ON public.terapeuta
    FOR ALL TO authenticated
    USING (public.rls_is_super_admin())
    WITH CHECK (public.rls_is_super_admin());

CREATE POLICY "areas_foco_select_autenticados" ON public.areas_foco
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "areas_foco_all_super_admin" ON public.areas_foco
    FOR ALL TO authenticated
    USING (public.rls_is_super_admin())
    WITH CHECK (public.rls_is_super_admin());

CREATE POLICY "terapeuta_area_foco_select_autenticados" ON public.terapeuta_area_foco
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "terapeuta_area_foco_gestao_propria_ou_admin" ON public.terapeuta_area_foco
    FOR ALL TO authenticated
    USING (terapeuta_id = auth.uid() OR public.rls_is_super_admin())
    WITH CHECK (terapeuta_id = auth.uid() OR public.rls_is_super_admin());

CREATE POLICY "paciente_select_vinculados_ou_admin" ON public.paciente
    FOR SELECT TO authenticated
    USING (public.rls_tem_vinculo_paciente(id));

CREATE POLICY "paciente_insert_mesma_clinica_ou_admin" ON public.paciente
    FOR INSERT TO authenticated
    WITH CHECK (public.rls_is_super_admin() OR (clinica_id IS NOT NULL AND clinica_id = public.rls_clinica_usuario()));

CREATE POLICY "paciente_update_vinculados_ou_admin" ON public.paciente
    FOR UPDATE TO authenticated
    USING (public.rls_tem_vinculo_paciente(id))
    WITH CHECK (public.rls_is_super_admin() OR (public.rls_tem_vinculo_paciente(id) AND clinica_id = public.rls_clinica_usuario()));

CREATE POLICY "paciente_delete_super_admin" ON public.paciente
    FOR DELETE TO authenticated
    USING (public.rls_is_super_admin());

CREATE POLICY "responsavel_select_vinculados_ou_admin" ON public.responsavel
    FOR SELECT TO authenticated
    USING (public.rls_is_super_admin() OR EXISTS (SELECT 1 FROM public.paciente_responsavel pr WHERE pr.responsavel_id = responsavel.id AND public.rls_tem_vinculo_paciente(pr.paciente_id)));

CREATE POLICY "responsavel_insert_terapeuta_ativo" ON public.responsavel
    FOR INSERT TO authenticated
    WITH CHECK (public.rls_is_super_admin() OR public.rls_clinica_usuario() IS NOT NULL);

CREATE POLICY "responsavel_update_vinculados_ou_admin" ON public.responsavel
    FOR UPDATE TO authenticated
    USING (public.rls_is_super_admin() OR EXISTS (SELECT 1 FROM public.paciente_responsavel pr WHERE pr.responsavel_id = responsavel.id AND public.rls_tem_vinculo_paciente(pr.paciente_id)))
    WITH CHECK (public.rls_is_super_admin() OR EXISTS (SELECT 1 FROM public.paciente_responsavel pr WHERE pr.responsavel_id = responsavel.id AND public.rls_tem_vinculo_paciente(pr.paciente_id)));

CREATE POLICY "responsavel_delete_super_admin" ON public.responsavel
    FOR DELETE TO authenticated
    USING (public.rls_is_super_admin());

CREATE POLICY "paciente_responsavel_gestao_vinculados" ON public.paciente_responsavel
    FOR ALL TO authenticated
    USING (public.rls_tem_vinculo_paciente(paciente_id))
    WITH CHECK (public.rls_tem_vinculo_paciente(paciente_id));

CREATE POLICY "dados_clinicos_gestao_vinculados" ON public.dados_clinicos
    FOR ALL TO authenticated
    USING (public.rls_tem_vinculo_paciente(paciente_id))
    WITH CHECK (public.rls_tem_vinculo_paciente(paciente_id));

CREATE POLICY "terapeuta_paciente_select_equipe_ou_admin" ON public.terapeuta_paciente
    FOR SELECT TO authenticated
    USING (terapeuta_id = auth.uid() OR public.rls_tem_vinculo_paciente(paciente_id));

CREATE POLICY "terapeuta_paciente_insert_equipe_mesma_clinica" ON public.terapeuta_paciente
    FOR INSERT TO authenticated
    WITH CHECK (
        public.rls_is_super_admin()
        OR (
            EXISTS (
                SELECT 1
                FROM public.paciente p
                JOIN public.terapeuta t_alvo ON t_alvo.id = terapeuta_id
                WHERE p.id = paciente_id
                  AND p.clinica_id = public.rls_clinica_usuario()
                  AND t_alvo.clinica_id = p.clinica_id
                  AND t_alvo.status_ativo = TRUE
            )
            AND (terapeuta_id = auth.uid() OR public.rls_tem_vinculo_paciente(paciente_id))
        )
    );

CREATE POLICY "terapeuta_paciente_delete_equipe_ou_admin" ON public.terapeuta_paciente
    FOR DELETE TO authenticated
    USING (public.rls_is_super_admin() OR public.rls_tem_vinculo_paciente(paciente_id));

CREATE POLICY "gatilhos_select_autenticados" ON public.gatilhos
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "gatilhos_all_super_admin" ON public.gatilhos
    FOR ALL TO authenticated
    USING (public.rls_is_super_admin())
    WITH CHECK (public.rls_is_super_admin());

CREATE POLICY "paciente_gatilho_gestao_vinculados" ON public.paciente_gatilho
    FOR ALL TO authenticated
    USING (public.rls_tem_vinculo_paciente(paciente_id))
    WITH CHECK (public.rls_tem_vinculo_paciente(paciente_id));

CREATE POLICY "laudo_clinico_select_vinculados" ON public.laudo_clinico
    FOR SELECT TO authenticated
    USING (public.rls_tem_vinculo_paciente(paciente_id));

CREATE POLICY "laudo_clinico_insert_vinculados" ON public.laudo_clinico
    FOR INSERT TO authenticated
    WITH CHECK (terapeuta_id = auth.uid() AND public.rls_tem_vinculo_paciente(paciente_id));

CREATE POLICY "laudo_clinico_update_autor_ou_admin" ON public.laudo_clinico
    FOR UPDATE TO authenticated
    USING (public.rls_is_super_admin() OR (terapeuta_id = auth.uid() AND public.rls_tem_vinculo_paciente(paciente_id)))
    WITH CHECK (public.rls_is_super_admin() OR (terapeuta_id = auth.uid() AND public.rls_tem_vinculo_paciente(paciente_id)));

CREATE POLICY "laudo_clinico_delete_autor_ou_admin" ON public.laudo_clinico
    FOR DELETE TO authenticated
    USING (public.rls_is_super_admin() OR (terapeuta_id = auth.uid() AND public.rls_tem_vinculo_paciente(paciente_id)));

CREATE POLICY "jogo_select_autenticados" ON public.jogo
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "jogo_all_super_admin" ON public.jogo
    FOR ALL TO authenticated
    USING (public.rls_is_super_admin())
    WITH CHECK (public.rls_is_super_admin());

CREATE POLICY "sessao_select_equipe_ou_autor" ON public.sessao
    FOR SELECT TO authenticated
    USING (public.rls_tem_acesso_sessao(id));

CREATE POLICY "sessao_insert_terapeuta_autorizado" ON public.sessao
    FOR INSERT TO authenticated
    WITH CHECK (
        public.rls_is_super_admin()
        OR (
            terapeuta_id = auth.uid()
            AND ((modo_sessao = 'modo_livre' AND paciente_id IS NULL) OR (paciente_id IS NOT NULL AND public.rls_tem_vinculo_paciente(paciente_id)))
        )
    );

CREATE POLICY "sessao_update_equipe_ou_autor" ON public.sessao
    FOR UPDATE TO authenticated
    USING (public.rls_tem_acesso_sessao(id))
    WITH CHECK (public.rls_tem_acesso_sessao(id));

CREATE POLICY "anotacao_clinica_select_equipe" ON public.anotacao_clinica
    FOR SELECT TO authenticated
    USING (public.rls_is_super_admin() OR (soft_delete = FALSE AND public.rls_tem_vinculo_paciente(paciente_id)));

CREATE POLICY "anotacao_clinica_insert_autor_vinculado" ON public.anotacao_clinica
    FOR INSERT TO authenticated
    WITH CHECK (terapeuta_id = auth.uid() AND public.rls_tem_vinculo_paciente(paciente_id));

CREATE POLICY "anotacao_clinica_update_autor_ou_admin" ON public.anotacao_clinica
    FOR UPDATE TO authenticated
    USING (public.rls_is_super_admin() OR (terapeuta_id = auth.uid() AND public.rls_tem_vinculo_paciente(paciente_id)))
    WITH CHECK (public.rls_is_super_admin() OR (terapeuta_id = auth.uid() AND public.rls_tem_vinculo_paciente(paciente_id)));

CREATE POLICY "relatorio_sessao_select_equipe" ON public.relatorio_sessao
    FOR SELECT TO authenticated
    USING (public.rls_is_super_admin() OR (soft_delete = FALSE AND public.rls_tem_acesso_sessao(sessao_id)));

CREATE POLICY "relatorio_sessao_insert_equipe" ON public.relatorio_sessao
    FOR INSERT TO authenticated
    WITH CHECK (public.rls_tem_acesso_sessao(sessao_id));

CREATE POLICY "relatorio_sessao_update_equipe" ON public.relatorio_sessao
    FOR UPDATE TO authenticated
    USING (public.rls_tem_acesso_sessao(sessao_id))
    WITH CHECK (public.rls_tem_acesso_sessao(sessao_id));

CREATE POLICY "telemetria_evento_select_equipe" ON public.telemetria_evento
    FOR SELECT TO authenticated
    USING (public.rls_tem_acesso_sessao(sessao_id));

CREATE POLICY "telemetria_evento_insert_equipe" ON public.telemetria_evento
    FOR INSERT TO authenticated
    WITH CHECK (public.rls_tem_acesso_sessao(sessao_id));

CREATE POLICY "auditoria_sessao_select_equipe" ON public.auditoria_sessao
    FOR SELECT TO authenticated
    USING (public.rls_tem_acesso_sessao(sessao_id));

CREATE POLICY "auditoria_sessao_insert_equipe" ON public.auditoria_sessao
    FOR INSERT TO authenticated
    WITH CHECK (public.rls_tem_acesso_sessao(sessao_id));

CREATE POLICY "sessao_ativa_gestao_proprio_usuario_ou_admin" ON public.sessao_ativa
    FOR ALL TO authenticated
    USING (usuario_id = auth.uid() OR public.rls_is_super_admin())
    WITH CHECK (usuario_id = auth.uid() OR public.rls_is_super_admin());

CREATE POLICY "auditoria_vinculo_select_equipe" ON public.auditoria_vinculo_acesso
    FOR SELECT TO authenticated
    USING (public.rls_tem_vinculo_paciente(paciente_id));

CREATE POLICY "auditoria_vinculo_insert_autor_vinculado" ON public.auditoria_vinculo_acesso
    FOR INSERT TO authenticated
    WITH CHECK (public.rls_is_super_admin() OR (terapeuta_autor_id = auth.uid() AND public.rls_tem_vinculo_paciente(paciente_id)));

CREATE POLICY "auditoria_prontuario_select_equipe" ON public.auditoria_acesso_prontuario
    FOR SELECT TO authenticated
    USING (public.rls_tem_vinculo_paciente(paciente_id));

CREATE POLICY "auditoria_prontuario_insert_equipe" ON public.auditoria_acesso_prontuario
    FOR INSERT TO authenticated
    WITH CHECK (public.rls_is_super_admin() OR (terapeuta_id = auth.uid() AND public.rls_tem_vinculo_paciente(paciente_id)));

CREATE POLICY "consentimento_select_equipe" ON public.consentimento_responsavel
    FOR SELECT TO authenticated
    USING (public.rls_tem_vinculo_paciente(paciente_id));

CREATE POLICY "consentimento_insert_equipe" ON public.consentimento_responsavel
    FOR INSERT TO authenticated
    WITH CHECK (public.rls_is_super_admin() OR (terapeuta_id = auth.uid() AND public.rls_tem_vinculo_paciente(paciente_id)));

DROP POLICY IF EXISTS "Acesso de leitura a laudos no Storage" ON storage.objects;
DROP POLICY IF EXISTS "Upload de laudos no Storage" ON storage.objects;
DROP POLICY IF EXISTS "Exclusao de laudos no Storage" ON storage.objects;

CREATE POLICY "Acesso de leitura a laudos no Storage" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'laudos'
        AND (
            public.rls_is_super_admin()
            OR (
                (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                AND public.rls_tem_vinculo_paciente(((storage.foldername(name))[1])::uuid)
            )
        )
    );

CREATE POLICY "Upload de laudos no Storage" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'laudos'
        AND (
            public.rls_is_super_admin()
            OR (
                (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                AND public.rls_tem_vinculo_paciente(((storage.foldername(name))[1])::uuid)
            )
        )
    );

CREATE POLICY "Exclusao de laudos no Storage" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'laudos'
        AND (
            public.rls_is_super_admin()
            OR (
                (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                AND public.rls_tem_vinculo_paciente(((storage.foldername(name))[1])::uuid)
            )
        )
    );
