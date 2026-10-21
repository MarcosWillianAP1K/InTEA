# Diagrama Entidade-Relacionamento (DER Físico Supabase 3FN) — InTEA

> **Projeto:** InTEA — Interface do Terapeuta para Orquestração do Ecossistema de Games Terapêuticos  
> **Instituição:** Sistemas de Informação — Universidade Federal do Piauí (UFPI)  
> **Documento Mestre:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) (Seção 5.7, Página 13; Seção 7.10.2, Página 34)  
> **Hub de Navegação:** [Índice Geral](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/README.md)

---

## 1. Visão Geral do Modelo Relacional e Físico

O **Diagrama Entidade-Relacionamento (DER Físico)** reflete o esquema relacional implementado no banco de dados PostgreSQL gerenciado pelo Supabase. A modelagem segue estritamente as diretrizes de engenharia do InTEA:
* Todas as chaves primárias (PK) e estrangeiras (FK) utilizam identificadores universais únicos (**UUID** via `gen_random_uuid()`), extinguindo vulnerabilidades de adivinhação ou enumeração sequencial;
* Conformidade integral com a **3ª Forma Normal (3FN)**, em especial na relação 1:1 estrita entre `sessao` e `relatorio_sessao` via chave primária compartilhada;
* Isolamento multi-tenant por instituição (`clinica_id`);
* Soft delete clínico imutável via triggers de banco (**RN05**).

```mermaid
erDiagram
    CLINICA ||--o{ TERAPEUTA : "emprega (1:N)"
    CLINICA ||--o{ PACIENTE : "registra (1:N)"

    TERAPEUTA ||--o{ TERAPEUTA_PACIENTE : "vincula (1:N)"
    PACIENTE ||--o{ TERAPEUTA_PACIENTE : "acompanhado_por (1:N)"

    PACIENTE ||--|| DADOS_CLINICOS : "possui (1:1)"
    PACIENTE ||--o{ PACIENTE_RESPONSAVEL : "possui (1:N)"
    RESPONSAVEL ||--o{ PACIENTE_RESPONSAVEL : "responde_por (1:N)"

    TERAPEUTA ||--o{ SESSAO : "orquestra (1:N)"
    PACIENTE ||--o{ SESSAO : "participa (1:N, opcional RN01)"
    JOGO ||--o{ SESSAO : "instancia (1:N)"

    SESSAO ||--o| RELATORIO_SESSAO : "consolida em 3FN (1:1)"

    TERAPEUTA ||--o{ ANOTACAO_CLINICA : "autoria RF21 (1:N)"
    PACIENTE ||--o{ ANOTACAO_CLINICA : "pertence (1:N)"
    SESSAO |o--o{ ANOTACAO_CLINICA : "contextualiza (0:N)"

    CLINICA {
        uuid id PK
        string nome
        string cnpj UK
        timestamptz created_at
        timestamptz updated_at
    }

    TERAPEUTA {
        uuid id PK "Referencia auth.users(id)"
        uuid clinica_id FK
        string nome
        string email UK
        string registro_profissional
        string especialidade
        boolean is_super_admin
        boolean status_ativo
        timestamptz created_at
        timestamptz updated_at
    }

    PACIENTE {
        uuid id PK
        uuid clinica_id FK
        string nome
        date data_nascimento
        string cpf UK
        string telefone
        boolean status_ativo
        timestamptz created_at
        timestamptz updated_at
    }

    DADOS_CLINICOS {
        uuid id PK
        uuid paciente_id FK,UK "1:1 com paciente"
        string cid_11
        string nivel_suporte
        text observacoes
        timestamptz created_at
        timestamptz updated_at
    }

    TERAPEUTA_PACIENTE {
        uuid terapeuta_id PK,FK
        uuid paciente_id PK,FK
        timestamptz created_at
    }

    JOGO {
        uuid id PK
        string nome
        string versao
        string status_instalacao
        jsonb manifesto_json "Declaração obrigatória de metric_type (RN02)"
        timestamptz created_at
        timestamptz updated_at
    }

    SESSAO {
        uuid id PK
        uuid terapeuta_id FK "Autor obrigatório RF21"
        uuid paciente_id FK "NULL em Modo Livre (RN01)"
        uuid jogo_id FK
        string session_token UK "PIN alfanumérico (TTL 15 min)"
        string modo_sessao "modo_clinico | modo_livre"
        jsonb contexto_dda_json "Injeção pré-sessão (RN03)"
        timestamptz data_hora_inicio
        timestamptz data_hora_fim
        timestamptz created_at
    }

    RELATORIO_SESSAO {
        uuid sessao_id PK,FK "PK/FK compartilhada com sessao(id) - 3FN"
        jsonb metricas_consolidadas "Estatísticas agregadas pós-sessão"
        text sintese_ia "Parecer analítico do Agente de IA"
        boolean soft_delete "Imutabilidade clínica (RN05)"
        timestamptz created_at
        timestamptz updated_at
    }

    ANOTACAO_CLINICA {
        uuid id PK
        uuid terapeuta_id FK "Autor do prontuário (RF21)"
        uuid paciente_id FK
        uuid sessao_id FK "Opcional (vínculo de contexto)"
        text conteudo
        boolean soft_delete "Imutabilidade clínica (RN05)"
        timestamptz created_at
        timestamptz updated_at
    }

    RESPONSAVEL {
        uuid id PK
        string nome
        string parentesco
        string telefone
        string email
        timestamptz created_at
    }

    PACIENTE_RESPONSAVEL {
        uuid paciente_id PK,FK
        uuid responsavel_id PK,FK
        string tipo_vinculo "principal | extra"
    }
```

---

## 2. Invariantes de Integridade Referencial no Banco

1. **Relação 1:1 Estrita em `relatorio_sessao` (3FN):**
   * A coluna `sessao_id` é simultaneamente Chave Primária e Chave Estrangeira com restrição `REFERENCES public.sessao(id) ON DELETE RESTRICT`.
   * Não há duplicação de `paciente_id` ou `terapeuta_id`, eliminando qualquer redundância funcional ou anomalia de atualização.
2. **Multi-Tenancy por `clinica_id`:**
   * Todas as tabelas que contêm entidades pertencentes a instituições (`terapeuta`, `paciente`) carregam `clinica_id UUID NOT NULL REFERENCES clinica(id)`.
   * Consultas de listagem filtram obrigatoriamente a clínica do solicitante autenticado (**RN04**).
3. **Chave Primária Composta em Vínculos N:N:**
   * A tabela associativa `terapeuta_paciente` utiliza `PRIMARY KEY (terapeuta_id, paciente_id)`, impedindo vínculos duplicados.
4. **Proteção de Histórico contra Hard Delete (RN05):**
   * Triggers de banco (`BEFORE DELETE`) bloqueiam qualquer exclusão física de registros clínicos em produção, exigindo atualização de `soft_delete = true` ou `status_ativo = false`.

---

## 3. Evidências Visuais e Estrutura Física

* `[Imagem 4: Diagrama Entidade-Relacionamento (DER Físico Supabase 3FN)]` — Diagrama ER físico de alta resolução publicado no Documento Mestre.
* `[Imagem 18: Tabelas das Classes no Banco de Dados]` — Painel de classes instanciadas no PostgreSQL.
* `[Imagem 19: Tabela de Clínicas no Banco de Dados]` — Tabela institucional multi-tenant.
* `[Imagem 20: Tabela Associativa Terapeuta-Paciente]` — Tabela associativa com chave composta.
* `[Imagem 23: Classes e Tabelas Físicas do Banco]` — Catálogo de tabelas físicas no Supabase Studio.
