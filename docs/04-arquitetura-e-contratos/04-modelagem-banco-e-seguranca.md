# Modelagem de Banco de Dados, RLS e Segurança — InTEA

> **Projeto:** InTEA — Interface do Terapeuta para Orquestração do Ecossistema de Games Terapêuticos  
> **Instituição:** Sistemas de Informação — Universidade Federal do Piauí (UFPI)  
> **Documento Mestre:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf)  
> **Regras de Arquitetura:** [architecture.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/architecture.md) (Seção 2)  
> **Hub de Navegação:** [Índice Geral](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/README.md)

---

## 1. Visão Geral da Camada de Persistência

A camada de persistência do InTEA é implementada sobre o **PostgreSQL 15+** hospedado na infraestrutura gerenciada do **Supabase**. A arquitetura do banco foi desenhada para atender a três requisitos vitais:
1. **Integridade Clínica Absoluta (RN05):** Inalterabilidade do histórico e bloqueio de exclusão física (*hard delete*).
2. **Isolamento Institucional Multi-Tenant (RN04):** Clínicas independentes sem vazamento cruzado de dados de pacientes.
3. **Segurança em Profundidade:** Combinação de políticas de *Row Level Security* (RLS), triggers de proteção e chaves primárias exclusivamente em **UUID**.

---

## 2. Governança de Migrações e Seeds de Banco

### 2.1. Estrutura de Diretórios
```
Database/
├── database.sql          # Schema Mestre (Single Source of Truth para novos deploys)
├── migrations/           # Migrações DDL sequenciais, imutáveis e idempotentes
│   ├── 001_pacientes.sql
│   ├── 002_terapeuta.sql
│   ├── 003_initial_schema.sql
│   └── NNN_descricao.sql
└── seeds/                # Cargas DML de dados iniciais e homologação
    ├── 01_seed_jogos.sql
    └── NN_seed_*.sql
```

### 2.2. Regras de Engenharia de Migração
* **Nomeação Sequencial:** Arquivos numerados estritamente com três dígitos (`001_*.sql`, `002_*.sql`, `003_*.sql`).
* **Idempotência Obrigatória:** Toda instrução DDL deve poder ser reexecutada com segurança sem falhar:
  * `CREATE TABLE IF NOT EXISTS ...`
  * `ADD COLUMN IF NOT EXISTS ...`
  * `DO $$ BEGIN ... END $$;` para criação condicional de restrições e tipos.
* **Single Source of Truth (`database.sql`):** Sempre que uma nova migração for adicionada, o arquivo `Database/database.sql` deve ser sincronizado para permitir instalações limpas do zero.
* **Separação DDL vs DML:** Migrações contêm exclusivamente alterações de estrutura. Cargas de catálogo ou dados de teste residem em `Database/seeds/`.

---

## 3. Políticas de Segurança em Nível de Linha (Row Level Security — RLS)

Todas as tabelas do banco possuem RLS ativado compulsoriamente via:
```sql
ALTER TABLE public.paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anotacao_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorio_sessao ENABLE ROW LEVEL SECURITY;
```

### 3.1. Funções e Helpers de RLS
Para evitar duplicação de regras SQL complexas nas políticas, o banco disponibiliza duas funções centrais:
* **`public.check_is_super_admin()`:** Retorna `TRUE` se o usuário autenticado (`auth.uid()`) possuir a flag `is_super_admin = true` em `public.terapeuta`.
* **`public.terapeuta_tem_acesso_paciente(p_paciente_id UUID)`:** Retorna `TRUE` se houver tupla ativa correspondente na tabela associativa `public.terapeuta_paciente` para o terapeuta solicitante.

### 3.2. Arquitetura Híbrida de Chaves
* **Backend (`SUPABASE_SERVICE_ROLE_KEY`):** O backend Node.js opera como autoridade privada de negócio. Ele valida credenciais via `authMiddleware`, checa vínculos via `verificarVisibilidadePaciente` e realiza mutações no banco com perfil de serviço seguro. A chave de serviço **nunca é compartilhada com o frontend**.
* **Frontend (`VITE_SUPABASE_ANON_KEY`):** Utilizada exclusivamente pelo cliente React no navegador para autenticação direta (`supabase.auth.signInWithPassword`) e upload/download de laudos em buckets privados do Supabase Storage.

---

## 4. Triggers de Integridade e Bloqueio de Hard Delete (RN05)

Para garantir o cumprimento inegociável da regra **RN05 (Inalterabilidade do Histórico Clínico)**, o banco de dados conta com triggers instalados nas entidades de prontuário:

```sql
CREATE OR REPLACE FUNCTION public.impedir_hard_delete_clinico()
RETURNS TRIGGER AS $$
BEGIN
    -- Bloqueia exclusão física em tabelas clínicas protegidas
    RAISE EXCEPTION 'Operação violou RN05: exclusão física (hard delete) é terminantemente proibida em registros clínicos. Utilize soft delete.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Aplicação nas tabelas clínicas
CREATE TRIGGER trg_bloqueio_delete_paciente
BEFORE DELETE ON public.paciente
FOR EACH ROW EXECUTE FUNCTION public.impedir_hard_delete_clinico();

CREATE TRIGGER trg_bloqueio_delete_anotacao
BEFORE DELETE ON public.anotacao_clinica
FOR EACH ROW EXECUTE FUNCTION public.impedir_hard_delete_clinico();

CREATE TRIGGER trg_bloqueio_delete_relatorio
BEFORE DELETE ON public.relatorio_sessao
FOR EACH ROW EXECUTE FUNCTION public.impedir_hard_delete_clinico();
```

---

## 5. Trilha de Auditoria e Conformidade LGPD (RNF06)

* **Tabela de Auditoria (`public.auditoria_acesso`):** Registra toda consulta ou modificação em dados pessoais e clínicos do paciente:
  * `terapeuta_id UUID`: Identidade do profissional responsável.
  * `paciente_id UUID`: Paciente cujo prontuário foi acessado.
  * `acao VARCHAR`: Tipo de operação (`leitura_prontuario`, `edicao_anotacao`, `exportacao_pdf`).
  * `ip_origem VARCHAR` e `user_agent TEXT`: Metadados técnicos da conexão.
  * `created_at TIMESTAMPTZ`: Carimbo de data/hora UTC não mutável.
* **Storage Privado de Laudos Médicos:**
  * Bucket `'laudos'` configurado como estritamente privado (`public = false`).
  * Download viabilizado unicamente por **Signed URLs temporárias com validade máxima de 60 segundos**.
  * Tipos de arquivo limitados a PDF e documentos de texto clínico com tamanho máximo de 15 MB.

---

## 6. Evidências Visuais e Estrutura Física

* `[Imagem 18: Tabelas das Classes no Banco de Dados]` — Painel com as entidades instanciadas no PostgreSQL.
* `[Imagem 19: Tabela de Clínicas no Banco de Dados]` — Estrutura da tabela institucional multi-tenant.
* `[Imagem 20: Tabela Associativa Terapeuta-Paciente]` — Tabela associativa com chave composta para equipe multidisciplinar.
* `[Imagem 23: Classes e Tabelas Físicas do Banco]` — Catálogo de tabelas físicas no Supabase Studio.
