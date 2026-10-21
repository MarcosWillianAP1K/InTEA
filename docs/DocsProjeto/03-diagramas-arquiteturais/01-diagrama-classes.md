# Diagrama de Classes UML — InTEA

> **Projeto:** InTEA — Interface do Terapeuta para Orquestração do Ecossistema de Games Terapêuticos  
> **Instituição:** Sistemas de Informação — Universidade Federal do Piauí (UFPI)  
> **Documento Mestre:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) (Seção 5.4, Página 10)  
> **Hub de Navegação:** [Índice Geral](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/README.md)

---

## 1. Visão Geral e Estrutura Estática do Domínio

O **Diagrama de Classes UML** representa a visão estática do domínio de negócio do InTEA, detalhando as entidades centrais, seus atributos canônicos (padronizados com identificadores UUID), métodos operacionais de negócio e os relacionamentos de associação, agregação e dependência que estruturam a arquitetura de software.

```mermaid
classDiagram
    direction TB

    class Clinica {
        +UUID id
        +String nome
        +String cnpj
        +adicionarTerapeuta(t: Terapeuta) void
        +registrarPaciente(p: Paciente) void
    }

    class AuthService {
        +realizarLogin(email: String, senha: String) AuthResponse
        +verificarConta(token: String) Boolean
        +gerarRefreshToken() String
        +solicitarRecuperacaoSenha(email: String) void
    }

    class Terapeuta {
        +UUID id
        +String nome
        +String email
        +String senhaHash
        +String registroProfissional
        +String especialidade
        +Boolean isSuperAdmin
        +Boolean statusAtivo
        +atualizarPerfil(dados: Terapeuta) void
        +orquestrarSessao(p: Paciente, j: Jogo) Sessao
        +escreverAnotacao(p: Paciente, conteudo: String) AnotacaoClinica
    }

    class Paciente {
        +UUID id
        +String nome
        +Date dataNascimento
        +JSON dadosClinicos
        +atualizarDadosClinicos(dados: JSON) void
        +obterHistoricoDeSessoes() List~Sessao~
    }

    class Jogo {
        +UUID id
        +String nome
        +String versao
        +String statusInstalacao
        +JSON manifesto
        +lerTiposDeMetrica() List~String~
        +verificarAtualizacao() Boolean
    }

    class Sessao {
        +UUID id
        +String sessionToken
        +String modoSessao
        +JSON contextoDDA
        +JSON resultadoIA
        +DateTime dataHoraInicio
        +DateTime dataHoraFim
        +gerarSessionToken() String
        +injetarContexto(contexto: JSON) void
        +iniciarCaptura() void
        +finalizarSessao(resultado: JSON) void
    }

    class AnotacaoClinica {
        +UUID id
        +String conteudo
        +DateTime dataCriacao
        +Boolean softDelete
        +editarConteudo(novoConteudo: String) void
        +salvarAnotacao() void
    }

    class RelatorioSessao {
        +UUID id
        +String conteudo
        +DateTime dataCriacao
        +Boolean softDelete
    }

    Clinica "1" -- "1..*" Terapeuta : emprega
    Clinica "1" -- "1..*" Paciente : registra
    Terapeuta "1" -- "0..*" AnotacaoClinica : escreve
    Terapeuta "1" -- "0..*" Sessao : orquestra
    Terapeuta "1..*" -- "1..*" Paciente : acompanha
    Paciente "1" -- "0..*" AnotacaoClinica : associada
    Paciente "1" -- "0..*" Sessao : participa
    Jogo "1" -- "0..*" Sessao : instanciado_em
    Sessao "1" -- "1" RelatorioSessao : gera
    AuthService ..> Terapeuta : autentica
```

---

## 2. Dicionário das Classes de Domínio

### 2.1. `Clinica`
Representa a instituição de saúde ou consultório multidisciplinar. Atua como raiz do isolamento multi-tenant (**RN04**), agrupando os profissionais de saúde e os pacientes atendidos.

### 2.2. `AuthService`
Serviço central de segurança e controle de identidade. Responsável pela emissão e rotação de tokens JWT, autenticação criptográfica e integração com o Supabase Auth.

### 2.3. `Terapeuta`
Entidade que encapsula o profissional de saúde habilitado (psicólogo, fonoaudiólogo, terapeuta ocupacional). Possui flags de controle como `isSuperAdmin` (acesso irrestrito) e `statusAtivo` (soft delete de credenciais).

### 2.4. `Paciente`
Entidade de registro clínico que representa o indivíduo no espectro autista. Não possui credenciais de acesso nem autentica na aplicação web (**RF06**). Seus dados clínicos e sensoriais são preservados com sigilo estrito.

### 2.5. `Jogo`
Catálogo de jogos terapêuticos digitais homologados. Armazena o manifesto técnico estruturado em JSON com a declaração obrigatória dos tipos de métrica aceitos (**RN02**).

### 2.6. `Sessao`
Entidade orquestradora da intervenção lúdica. Gerencia o ciclo de vida completo da partida, o código PIN efêmero de pareamento (`sessionToken`), o modo de operação (clínico ou livre — **RN01**) e a injeção do contexto pré-sessão para o DDA (**RN03**).

### 2.7. `AnotacaoClinica`
Registros livres de evolução e prontuário médico. Vinculados compulsoriamente a um terapeuta autor (**RF21**) e a um paciente, admitindo exclusão apenas lógica via `softDelete` (**RN05**).

### 2.8. `RelatorioSessao`
Consolidação analítica pós-intervenção gerada em relação 1:1 estrita com a sessão clínica (**3FN**). Contém as métricas consolidadas e o parecer automatizado do Agente de IA.

---

## 3. Evidência Visual

* `[Imagem 1: Diagrama de Classes UML do Sistema InTEA]` — Diagrama de classes oficial publicado no Documento Mestre do projeto.
