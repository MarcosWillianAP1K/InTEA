# Cards de Tarefas — Sprint 7 & Diretrizes Terapêuticas (InTEA)

> [!IMPORTANT]
> **Status:** Proposta consolidada em documentação local.  
> **Aviso:** Nenhum card foi enviado ao Jira ainda. A sincronização com o Jira aguarda a revisão e aprovação formal do Marcos e da equipe.

---

## Índice das Categorias de Cards

1. [Módulo Back-end: Pacientes e Vínculos Clínicos](#1-módulo-back-end-pacientes-e-vínculos-clínicos)
2. [Módulo Back-end: Biblioteca de Jogos, Manifesto e Testes](#2-módulo-back-end-biblioteca-de-jogos-manifesto-e-testes)
3. [Módulo Front-end: Gestão e Perfil de Pacientes](#3-módulo-front-end-gestão-e-perfil-de-pacientes)
4. [Módulo Front-end: Biblioteca de Jogos, Componentes e CI](#4-módulo-front-end-biblioteca-de-jogos-componentes-e-ci)
5. [Módulo de Documentação e Qualidade Técnica](#5-módulo-de-documentação-e-qualidade-técnica)
6. [Cards Especiais: Refinamento Clínico (Orientações da Terapeuta)](#6-cards-especiais-refinamento-clínico-orientações-da-terapeuta)

---

## 1. Módulo Back-end: Pacientes e Vínculos Clínicos

---

### [CARD-BE-01] Ajuste e Migração do Schema de Pacientes e Dados Clínicos

* **Tipo:** Tarefa Técnica
* **Componente:** `Backend / Database`
* **Requisitos:** **RF06**
* **Referência Documentação:** *Seção 5 (Tabelas do Banco de Dados), Figura 19, Figura 21*
* **Descrição:**  
  Adequar a modelagem relacional das tabelas `paciente` e `dados_clinicos` para suportar todos os atributos exigidos pelo prontuário e formulário de cadastro. Criar script de migração SQL versionado.
* **Escopo Técnico:**
  * Adicionar campos em `paciente`: CPF, telefone de contato, endereço completo (logradouro, número, bairro, cidade, UF, CEP).
  * Adicionar campos em `dados_clinicos`: responsável principal (nome, parentesco, contato), responsável extra opcional, histórico de laudo médico e lista estruturada de gatilhos sensoriais (`JSONB`).
* **Critérios de Aceite:**
  * [ ] Migração SQL executa com sucesso sem quebrar dados existentes.
  * [ ] Campos obrigatórios e opcionais refletidos nas constraints do banco.
  * [ ] Rollback da migração testado e documentado.

---

### [CARD-BE-02] CRUD Completo de Pacientes com Soft Delete

* **Tipo:** Feature
* **Componente:** `Backend / Controllers / Routes`
* **Requisitos:** **RF06**, **RN05**
* **Referência Documentação:** *RN05 (Inalterabilidade do Histórico Clínico), RF06*
* **Descrição:**  
  Implementar os endpoints RESTful para manipulação de registros de pacientes, assegurando a regra de negócio que veda a exclusão física (*hard delete*) de prontuários médicos.
* **Endpoints:**
  * `POST /pacientes`: Criação de novo paciente com dados clínicos associados.
  * `GET /pacientes`: Listagem de pacientes ativos vinculados ao terapeuta.
  * `GET /pacientes/:id`: Obtenção do prontuário detalhado do paciente.
  * `PUT /pacientes/:id`: Atualização cadastral e clínica.
  * `DELETE /pacientes/:id`: Inativação lógica do paciente (`status_ativo = false`).
* **Critérios de Aceite:**
  * [ ] Endpoints implementados e respondendo com status HTTP padronizados (200, 201, 400, 404).
  * [ ] A exclusão altera o estado de ativação sem remover linhas do banco.
  * [ ] Pacientes inativos não aparecem na listagem padrão.

---

### [CARD-BE-03] Validação de DTOs e Schemas de Entrada (Pacientes)

* **Tipo:** Melhoria / Segurança
* **Componente:** `Backend / Middlewares / Validators`
* **Requisitos:** **RF06**
* **Referência Documentação:** *RF06 (Cadastro de Pacientes)*
* **Descrição:**  
  Criar camada de validação estrita para os corpos de requisição (`DTOs`) de criação e atualização de pacientes, prevenindo persistência de dados inconsistentes.
* **Escopo Técnico:**
  * Validação de formato de CPF (algoritmo dos dígitos verificadores).
  * Validação de CEP (formato 8 dígitos) e datas (data de nascimento não futura).
  * Obrigatoriedade do responsável principal e validação condicional para responsável extra (opcional).
* **Critérios de Aceite:**
  * [ ] Respostas de erro 422/400 com mensagens amigáveis e estruturadas em JSON.
  * [ ] Rejeição de CPFs inválidos ou datas impossíveis.

---

### [CARD-BE-04] Vínculo Automático de Terapeuta no Cadastro

* **Tipo:** Regra de Negócio
* **Componente:** `Backend / Services / Auth`
* **Requisitos:** **RF18**, **RF21**
* **Referência Documentação:** *RF18 (Multi-terapeuta), RF21 (Autoria Obrigatória), Figura 21*
* **Descrição:**  
  Ao finalizar o cadastro de um paciente via `POST /pacientes`, o sistema deve automaticamente registrar o vínculo do terapeuta autenticado na tabela associativa `terapeuta_paciente`.
* **Critérios de Aceite:**
  * [ ] O `terapeuta_id` é extraído com segurança do token JWT/sessão ativa.
  * [ ] Criação do registro em `terapeuta_paciente` ocorre dentro de transação atômica (`BEGIN / COMMIT`).
  * [ ] Se a associação falhar, o cadastro do paciente sofre rollback.

---

### [CARD-BE-05] Gestão de Vínculos Multi-terapeuta da Mesma Clínica

* **Tipo:** Feature
* **Componente:** `Backend / Routes / Vínculos`
* **Requisitos:** **RF18**
* **Referência Documentação:** *RF18, Seção 7.13, Figura 21*
* **Descrição:**  
  Disponibilizar rotas para permitir que profissionais da mesma instituição compartilhem o acompanhamento de um mesmo paciente.
* **Endpoints:**
  * `POST /pacientes/:id/terapeutas`: Associa um novo terapeuta ao paciente.
  * `DELETE /pacientes/:id/terapeutas/:terapeutaId`: Remove o vínculo de um terapeuta secundário.
* **Critérios de Aceite:**
  * [ ] Bloqueio de associação caso o terapeuta pertença a uma clínica diferente.
  * [ ] Garantia de que o paciente mantenha ao menos um terapeuta responsável ativo.

---

### [CARD-BE-06] Busca Avançada e Filtros de Pacientes

* **Tipo:** Feature
* **Componente:** `Backend / Services / Query`
* **Requisitos:** **RF19**
* **Referência Documentação:** *RF19 (Busca e Filtragem de Dados)*
* **Descrição:**  
  Capacitar a rota `GET /pacientes` com parâmetros de busca rápida e filtros combinados para facilitar a localização no prontuário.
* **Parâmetros:**
  * `nome` (busca textual parcial insensível a maiúsculas/minúsculas).
  * `idade_min` / `idade_max` (calculadas dinamicamente pela data de nascimento).
  * `estado_clinico` / diagnóstico base.
  * Paginação (`page`, `limit`).
* **Critérios de Aceite:**
  * [ ] Queries parametrizadas para evitar SQL injection.
  * [ ] Retorno com cabeçalhos ou envelope de paginação (`total`, `page`, `totalPages`).

---

### [CARD-BE-07] Guard de Visibilidade e Sigilo Institucional

* **Tipo:** Segurança
* **Componente:** `Backend / Middlewares / Guards`
* **Requisitos:** **RN04**
* **Referência Documentação:** *RN04 (Visibilidade por Vínculo Institucional), RNF06 (LGPD)*
* **Descrição:**  
  Middleware de autorização que intercepta qualquer requisição direcionada a um paciente específico e valida se o terapeuta autenticado possui registro formal em `terapeuta_paciente`.
* **Critérios de Aceite:**
  * [ ] Retorna status `403 Forbidden` (ou `404 Not Found` para proteção de enumeração) caso não haja vínculo.
  * [ ] SuperAdmin possui bypass autorizado para fins de auditoria institucional (RF07/RF08).

---

## 2. Módulo Back-end: Biblioteca de Jogos, Manifesto e Testes

---

### [CARD-BE-08] Endpoints do Catálogo de Jogos Terapêuticos

* **Tipo:** Feature
* **Componente:** `Backend / Jogos`
* **Requisitos:** **RF09**
* **Referência Documentação:** *RF09 (Biblioteca de Jogos), Figura 10*
* **Descrição:**  
  Desenvolver endpoints para listagem dos jogos disponíveis no ecossistema e consulta de suas especificações técnicas e clínicas.
* **Endpoints:**
  * `GET /jogos`: Lista todos os jogos cadastrados com resumo (nome, versão, descrição, status de instalação).
  * `GET /jogos/:id`: Retorna os detalhes completos do jogo, incluindo o `manifesto_json`.
* **Critérios de Aceite:**
  * [ ] Endpoints respondem em formato JSON padronizado.
  * [ ] Status de instalação reflete valores válidos (`instalado`, `desatualizado`, `nao_instalado`, `em_execucao`).

---

### [CARD-BE-09] Parser e Validador do Contrato do Manifesto do Jogo

* **Tipo:** Arquitetura / Contrato
* **Componente:** `Backend / Services / Manifesto`
* **Requisitos:** **RNF02**
* **Referência Documentação:** *RNF02 (Modularidade por Contrato), Seção 7.4.2, `manifestoGame.json`*
* **Descrição:**  
  Implementar serviço para analisar e validar a integridade estrutural do `manifesto_json` dos jogos, assegurando que o motor do jogo declara suas métricas conforme o contrato oficial do InTEA.
* **Critérios de Aceite:**
  * [ ] Valida presença obrigatória de `id_jogo`, `nome`, `versao` e array `metricas_suportadas`.
  * [ ] Valida campos de cada métrica: `id_metrica`, `tipo_metrica` (`numerica`, `categorica`, `tempo`, etc.).

---

### [CARD-BE-10] Validação Estrita de Tipagem de Métricas (Atualização RN02)

* **Tipo:** Regra de Negócio Clínica / Validação Estrita
* **Componente:** `Backend / Services / Manifesto`
* **Requisitos:** **RN02 (Tipagem Estrita Obrigatória)**
* **Referência Documentação:** *RN02 (Atualizada), RNF02 (Modularidade por Contrato), RNF04*
* **Descrição:**  
  Por se tratar de um ecossistema clínico voltado à saúde humana (TEA), métricas sem tipagem explícita (`tipo_metrica` / `metricType`) **NÃO** serão assumidas como categóricas nem utilizadas pelo sistema. O InTEA deve exigir tipagem estrita de cada métrica no manifesto do jogo; qualquer métrica desprovida de tipo válido deve ser rejeitada/descartada na validação, prevenindo erros de cálculo, interpretação incorreta de dados clínicos ou distorções no prontuário.
* **Critérios de Aceite:**
  * [ ] A regra anterior de atribuir `categorica` como fallback padrão é estritamente removida e desativada.
  * [ ] Métricas sem `tipo_metrica` explícito (`numerica`, `categorica`, `tempo`, etc.) são rejeitadas na validação do manifesto (`manifesto_json`).
  * [ ] Em caso de ausência de tipo em eventos de telemetria, o dado correspondente não é processado nem persistido no histórico clínico do paciente, registrando erro descritivo de validação.

---

### [CARD-BE-11] Script de Seed com Jogos Terapêuticos de Exemplo

* **Tipo:** Infraestrutura / Dados
* **Componente:** `Database / Seeds`
* **Requisitos:** **RF09**
* **Referência Documentação:** *RF09, Tabela `jogo`*
* **Descrição:**  
  Criar seed no banco de dados com 3 jogos de demonstração clínica contemplando diferentes perfis de estímulo:
  1. *Aventura das Cores* (Foco: coordenação motora e reconhecimento visual).
  2. *Formas Calmas* (Foco: autorregulação emocional e pareamento geométrico).
  3. *Som dos Animais* (Foco: discriminação auditiva e linguagem).
* **Critérios de Aceite:**
  * [ ] Seed executa via comando npm sem duplicar registros em execuções repetidas.
  * [ ] Cada jogo contém manifesto JSON válido com métricas numéricas e categóricas.

---

### [CARD-BE-12] Filtros e Paginação na Biblioteca de Jogos

* **Tipo:** Feature
* **Componente:** `Backend / Jogos / Filtros`
* **Requisitos:** **RF19**
* **Referência Documentação:** *RF19, Figura 10*
* **Descrição:**  
  Implementar filtro por objetivo clínico (`foco_terapeutico`, `faixa_etaria`, `status_instalacao`) na rota `GET /jogos`, com controle de paginação.
* **Critérios de Aceite:**
  * [ ] Permite filtrar jogos por tags clínicas declaradas no manifesto.
  * [ ] Paginação consistente para listas extensas de atividades.

---

### [CARD-BE-13] Bateria de Testes Unitários e Integração (Back-end)

* **Tipo:** Qualidade
* **Componente:** `Backend / Tests (Vitest)`
* **Requisitos:** **Qualidade / CI**
* **Referência Documentação:** *Pipeline CI/CD (GitHub Actions)*
* **Descrição:**  
  Desenvolver suíte de testes automatizados com Vitest para validar o CRUD de pacientes, validações de DTOs, guards de visibilidade N:N e leitura do manifesto de jogos.
* **Critérios de Aceite:**
  * [ ] Cobertura de cenários positivos e negativos (ex: acesso negado 403).
  * [ ] Execução com sucesso no comando `npm test` e integração com o pipeline.

---

## 3. Módulo Front-end: Gestão e Perfil de Pacientes

---

### [CARD-FE-01] Estruturação da Feature Modular de Pacientes

* **Tipo:** Arquitetura Front-end
* **Componente:** `Frontend / src/features/pacientes/`pessoa 
* **Requisitos:** **Boas Práticas de Engenharia**
* **Referência Documentação:** *Figura 24 (Arquitetura de Pastas do Front)*
* **Descrição:**  
  Organizar a pasta `features/pacientes/` seguindo a arquitetura limpa e desacoplada do projeto:
  * `components/`: Componentes específicos de UI do paciente.
  * `hooks/`: Custom hooks de consulta e mutação de dados.
  * `pages/`: Telas de listagem, cadastro e perfil.
  * `service/`: Comunicação HTTP com a API.
  * `store/`: Estado global do paciente ativo (Zustand).
* **Critérios de Aceite:**
  * [ ] Estrutura criada sem dependências circulares.
  * [ ] Exportações organizadas via `index.ts`.

---

### [CARD-FE-02] Tela de Seleção de Pacientes (Cards Interativos)

* **Tipo:** Interface de Usuário
* **Componente:** `Frontend / Pages / Seleção de Pacientes`
* **Requisitos:** **RF06**, **RF12**
* **Referência Documentação:** *Figura 9 (Tela de Seleção do Paciente)*
* **Descrição:**  
  Construir a interface visual que apresenta os pacientes vinculados em formato de cards visuais elegantes, contendo foto/avatar, nome, idade calculada, resumo do estado clínico e card de destaque para "Novo Paciente".
* **Critérios de Aceite:**
  * [ ] Layout responsivo em grid com Tailwind CSS.
  * [ ] Clique no card seleciona o paciente para fluxo de sessão ou consulta.
  * [ ] Card "Novo Paciente" redireciona para a rota de cadastro.

---

### [CARD-FE-03] Tela de Gerenciamento e Lista Detalhada de Pacientes

* **Tipo:** Interface de Usuário
* **Componente:** `Frontend / Pages / Tabela de Pacientes`
* **Requisitos:** **RF06**, **RF19**
* **Referência Documentação:** *Figura 14 (Tela da Lista de Pacientes)*
* **Descrição:**  
  Criar a visão administrativa em tabela detalhada para clínicas com múltiplos pacientes, oferecendo busca rápida em tempo real, filtros por diagnóstico/idade e ações rápidas (editar, ver perfil, inativar).
* **Critérios de Aceite:**
  * [ ] Tabela paginada com ordenação por nome e data de cadastro.
  * [ ] Busca com debounce para otimização de requisições.

---

### [CARD-FE-04] Formulário de Cadastro em 4 Blocos com Validações

* **Tipo:** Interface de Usuário
* **Componente:** `Frontend / Pages / Cadastro de Paciente`
* **Requisitos:** **RF06**
* **Referência Documentação:** *Figura 15 (Tela de Cadastro de Paciente)*
* **Descrição:**  
  Implementar o formulário completo de cadastro de pacientes estruturado visualmente em 4 blocos distintos:
  1. *Bloco 1 — Identificação do Paciente:* Nome completo, data de nascimento, CPF, sexo, telefone, endereço.
  2. *Bloco 2 — Responsável Principal:* Nome, parentesco, telefone de contato, e-mail.
  3. *Bloco 3 — Responsável Extra (Opcional):* Nome, parentesco e telefone para emergências.
  4. *Bloco 4 — Dados Clínicos e Gatilhos:* Diagnóstico de base, laudo médico e seleção de gatilhos sensoriais prévios.
* **Critérios de Aceite:**
  * [ ] Máscaras aplicadas para CPF, telefone e CEP com preenchimento automático de endereço via ViaCEP.
  * [ ] Validações visuais inline com mensagens de erro claras.

---

### [CARD-FE-05] Tela de Perfil e Prontuário Consolidado do Paciente

* **Tipo:** Interface de Usuário
* **Componente:** `Frontend / Pages / Perfil do Paciente`
* **Requisitos:** **RF06**, **RF15**
* **Referência Documentação:** *Figura 16 (Tela de Perfil do Paciente)*
* **Descrição:**  
  Desenvolver a tela de visualização consolidada do prontuário do paciente, reunindo dados pessoais, contatos dos responsáveis, tags de gatilhos a evitar, resumo de diagnósticos e atalho para histórico de sessões.
* **Critérios de Aceite:**
  * [ ] Layout harmonioso com visualização clara dos gatilhos em badges destacadas.
  * [ ] Botões para editar dados clínicos e iniciar nova sessão com o paciente.

---

### [CARD-FE-06] Integração com a API de Pacientes e Tratamento de Erros

* **Tipo:** Integração
* **Componente:** `Frontend / Services / Pacientes`
* **Requisitos:** **RN04**
* **Referência Documentação:** *RN04 (Visibilidade Restrita)*
* **Descrição:**  
  Conectar os componentes de front-end aos endpoints reais do back-end, implementando camada de tratamento elegante para erros de autorização (403), recursos inexistentes (404) e feedback visual via toasts (Sonner).
* **Critérios de Aceite:**
  * [ ] Mocks desacoplados e substituíveis via variável de ambiente.
  * [ ] Mensagens amigáveis para falhas de rede ou acesso não autorizado.

---

## 4. Módulo Front-end: Biblioteca de Jogos, Componentes e CI

---

### [CARD-FE-07] Biblioteca de Componentes Compartilhados (`shared/components`)

* **Tipo:** Componentização / Design System
* **Componente:** `Frontend / src/shared/components/`
* **Requisitos:** **Padronização Visual (Tailwind + Radix UI)**
* **Referência Documentação:** *Figura 24, Protótipos Figma*
* **Descrição:**  
  Construir e documentar os componentes base reutilizáveis que atenderão tanto a tela de Pacientes quanto a de Jogos:
  * Botão (`Button` com variantes primary, secondary, outline, danger).
  * Campo de Entrada (`Input` com suporte a ícones e estado de erro).
  * Cartão Base (`Card` estruturado com Header, Content e Footer).
  * Emblema de Status (`Badge` para indicar instalado, em execução, etc.).
  * Caixa de Diálogo (`Modal / Dialog` acessível).
  * Tabela Básica (`Table` estilizada e responsiva).
* **Critérios de Aceite:**
  * [x] Componentes tipados em TypeScript sem erros de lint/typecheck.
  * [x] Estilização consistente em modo claro e escuro.

---

### [CARD-FE-08] Cliente HTTP Centralizado e Interceptors

* **Tipo:** Infraestrutura Front-end
* **Componente:** `Frontend / src/core/api/`
* **Requisitos:** **RNF01**, **RF03**
* **Referência Documentação:** *Seção de Arquitetura de Comunicação*
* **Descrição:**  
  Configurar o cliente HTTP central (`endpoints.ts` / `httpClient.ts`) com interceptação automática do token JWT do Supabase/Auth, renovação de sessão e tratamento global de status de erro.
* **Critérios de Aceite:**
  * [ ] Token de autorização injetado automaticamente em todas as requisições protegidas.
  * [ ] Redirecionamento automático para tela de login em caso de token expirado (401).

---

### [CARD-FE-09] Interface da Biblioteca de Jogos (Grid de Catálogo)

* **Tipo:** Interface de Usuário
* **Componente:** `Frontend / Pages / Biblioteca de Jogos`
* **Requisitos:** **RF09**
* **Referência Documentação:** *Figura 10 (Tela dos Jogos Disponíveis)*
* **Descrição:**  
  Desenvolver a página do catálogo de jogos exibindo cartões com capa ilustrativa, título, versão atual, foco clínico e indicador visual de instalação.
* **Critérios de Aceite:**
  * [ ] Layout responsivo em grade fluida.
  * [ ] Badges coloridas refletindo status (`Instalado`, `Atualização Disponível`, etc.).

---

### [CARD-FE-10] Filtros Clínicos e Ações de Início de Sessão / Modo Livre

* **Tipo:** Interface de Usuário / UX
* **Componente:** `Frontend / Features / Jogos`
* **Requisitos:** **RF09**, **RF11**
* **Referência Documentação:** *RF11 (Modo Livre), Figura 10*
* **Descrição:**  
  Adicionar controles de filtragem por objetivo terapêutico (atenção, coordenação, regulação) e botões de ação específicos em cada card de jogo:
  * *"Iniciar Sessão":* Direciona para o fluxo clínico vinculado a um paciente.
  * *"Modo Livre":* Permite execução recreativa desvinculada de prontuário clínico.
* **Critérios de Aceite:**
  * [ ] Filtragem em tempo real na interface sem recarregar a página.
  * [ ] Ações disparadas com feedback visual imediato.

---

### [CARD-FE-11] Integração da Biblioteca de Jogos com a API e CI

* **Tipo:** Integração e Testes
* **Componente:** `Frontend / Tests & GitHub Actions`
* **Requisitos:** **RNF02**, **Qualidade**
* **Referência Documentação:** *Contrato `manifestoGame.json`, Pipeline CI*
* **Descrição:**  
  Integrar o catálogo de jogos ao endpoint `GET /jogos`, escrever testes de componentes com Vitest para os cards de jogos e garantir que a suíte execute sem falhas no GitHub Actions.
* **Critérios de Aceite:**
  * [ ] Consumo de manifesto mockado na ausência de back-end ativo.
  * [ ] Job `frontend-test` no GitHub Actions executando `npm run typecheck`, `npm test` e `npm run build` com sucesso.

---

## 5. Módulo de Documentação e Qualidade Técnica

---

### [CARD-DOC-01] Redação da Seção 7.7 do Relatório Oficial (Sprint 7)

* **Tipo:** Documentação Técnica
* **Componente:** `docs / Relatório LaTeX`
* **Requisitos:** **Gestão de Projeto**
* **Referência Documentação:** *Seção 7.7 (Sprint 7 - Pacientes e Biblioteca)*
* **Descrição:**  
  Redigir o texto descritivo oficial da Sprint 7 para o documento acadêmico/técnico do InTEA, detalhando os objetivos planejados, decisões de engenharia, módulos entregues e análise retrospectiva de dificuldades.
* **Critérios de Aceite:**
  * [ ] Texto redigido em conformidade com as normas ABNT e padrão LaTeX do projeto.
  * [ ] Referência explícita aos requisitos RF06, RF09, RF18, RN04 e RN05.

---

### [CARD-DOC-02] Documentação da API (OpenAPI / Swagger / README de Rotas)

* **Tipo:** Documentação de API
* **Componente:** `Backend / docs`
* **Requisitos:** **RNF02**
* **Referência Documentação:** *Repositório / Contratos*
* **Descrição:**  
  Documentar formalmente todos os endpoints criados nas frentes de Pacientes e Jogos, especificando headers, query parameters, corpos de requisição (`request body`), exemplos de resposta e possíveis códigos de erro HTTP.
* **Critérios de Aceite:**
  * [ ] Exemplos de payload para todas as rotas de pacientes e jogos.
  * [ ] Códigos de status 200, 201, 400, 403, 404 e 422 descritos com seus respectivos formatos de erro.

---

### [CARD-DOC-03] Atualização dos Diagramas de Engenharia de Software

* **Tipo:** Modelagem de Software
* **Componente:** `docs / Diagramas (PlantUML / Mermaid / LaTeX)`
* **Requisitos:** **Modelagem de Sistema**
* **Referência Documentação:** *Seção 5, Figura 1 (Classe), Figura 4 (ER), Figura 3 (Sequência)*
* **Descrição:**  
  Atualizar os diagramas oficiais do projeto para refletir a nova estrutura da Sprint 7:
  * *Diagrama de Entidade-Relacionamento (DER):* Novos campos de dados clínicos e tabela associativa.
  * *Diagrama de Classes:* Entidades `Paciente`, `DadosClinicos`, `Jogo`, `Manifesto`.
  * *Diagrama de Sequência:* Fluxos de cadastro de paciente com vínculo automático e consulta com guard de autorização.
* **Critérios de Aceite:**
  * [ ] Diagramas renderizados e incorporados ao relatório em PDF.
  * [ ] Numeração e referências cruzadas no texto atualizadas.

---

### [CARD-DOC-04] Versionamento e Especificação do Contrato do Manifesto

* **Tipo:** Arquitetura de Integração
* **Componente:** `docs / ModelosDeContratos / manifestoGame.json`
* **Requisitos:** **RNF02**
* **Referência Documentação:** *Seção 7.4.2 (Design de Contratos JSON)*
* **Descrição:**  
  Formalizar a especificação do JSON Schema do manifesto do jogo (`manifestoGame.json`), detalhando tipos de métricas aceitas (numéricas, categóricas, tempo), versionamento de contrato e regras de compatibilidade.
* **Critérios de Aceite:**
  * [ ] Arquivo schema JSON válido documentado no repositório.
  * [ ] Exemplos de manifestos de jogos 2D e futuros jogos de Realidade Virtual.

---

### [CARD-DOC-05] Roteiro de Casos de Teste Manuais e Critérios de Aceite

* **Tipo:** Garantia da Qualidade (QA)
* **Componente:** `docs / CasosDeTeste`
* **Requisitos:** **Validação Clínica e Funcional**
* **Referência Documentação:** *Relatório Seção de Testes*
* **Descrição:**  
  Elaborar planilha de casos de teste funcionais cobrindo cada fluxo crítico implementado na Sprint 7 (cadastro, validação de CPF, tentativa de acesso sem vínculo, filtragem de jogos e seleção de paciente).
* **Critérios de Aceite:**
  * [ ] Passos de execução detalhados com resultado esperado vs. resultado obtido.
  * [ ] Matriz de rastreabilidade vinculando cada caso de teste ao respectivo requisito (RF/RN).

---

## 6. Cards Especiais: Refinamento Clínico (Orientações da Terapeuta)

> [!NOTE]
> Estes cards foram elaborados a partir do feedback especializado da Terapeuta e das diretrizes alinhadas pelo Marcos, trazendo melhorias de humanização, proteção de dados, acessibilidade e novas modalidades terapêuticas.

---

### [CARD-CLIN-01] Humanização de Nomenclatura: Transição de "Co-Terapeuta" para "Facilitador / Apoiador"

* **Tipo:** UX / Humanização / Refatoração
* **Componente:** `Frontend & Backend / Nomenclaturas`
* **Origem:** *Orientação da Terapeuta: "Mudança de nome Co-Terapeuta para outro nome que não destaque demais que seja um terapeuta"*
* **Descrição:**  
  Substituir termos clínicos excessivamente técnicos ou estigmatizantes (como *"Co-Terapeuta"*) na interface visível e nas mensagens do sistema por termos mais acolhedores e inclusivos, tais como **"Facilitador Terapêutico"**, **"Apoiador"** ou **"Mediador"**.
* **Impacto Técnico:**
  * Manter compatibilidade com permissões no back-end, ajustando rótulos na UI e textos de ajuda.
  * Evitar que o paciente ou familiares sintam excesso de rotulação médica no ambiente de interação.
* **Critérios de Aceite:**
  * [ ] Nenhuma ocorrência de termos que causem desconforto ou estigmatização nas telas voltadas ao paciente/família.
  * [ ] Documentação e tooltips atualizados com a nova terminologia.

---

### [CARD-CLIN-02] Perfil de Acesso Família com Controle de Tempo de Tela e Modo Livre Exclusivo

* **Tipo:** Feature / Controle Parental
* **Componente:** `Backend (Auth/Roles) & Frontend`
* **Origem:** *Orientação da Terapeuta & Marcos: "Restrição de tempo para o cliente (família) - adicionar usuário família com acesso à biblioteca somente no modo livre"*
* **Requisitos Vinculados:** **RF11 (Modo Livre)**
* **Descrição:**  
  Criar a modalidade de acesso para o perfil **Família / Cuidador**, permitindo que o paciente jogue em casa de maneira lúdica e segura sob supervisão familiar:
  1. *Acesso Exclusivo ao Modo Livre:* Membros da família acessam os jogos sem iniciar sessões clínicas formais e sem telemetria clínica persistida ou interferência no algoritmo DDA do terapeuta.
  2. *Temporizador e Trava de Sessão:* Configuração de limite máximo de tempo de tela contínuo (ex: 20 a 40 minutos), emitindo alerta suave e bloqueando o jogo após o término para prevenir sobrecarga sensorial.
* **Critérios de Aceite:**
  * [ ] Usuário com role `familia` não tem acesso a prontuários, laudos ou anotações clínicas confidenciais.
  * [ ] A biblioteca de jogos para este perfil exibe unicamente a opção "Jogar (Modo Livre)".
  * [ ] Bloqueio por tempo de tela testado e funcional.

---

### [CARD-CLIN-03] Blindagem de Segurança e Sigilo de Dados Clínicos Sensíveis (LGPD)

* **Tipo:** Segurança e Privacidade
* **Componente:** `Backend / Supabase RLS / Criptografia`
* **Origem:** *Orientação da Terapeuta: "Proteção de dados que serão alimentados pelo terapeuta"*
* **Requisitos Vinculados:** **RNF06 (LGPD / Privacidade de Saúde), RN04**
* **Descrição:**  
  Reforçar a proteção dos dados alimentados pelo terapeuta (diagnósticos, hipóteses diagnósticas, relatórios de evolução, laudos médicos anexados e gatilhos sensoriais).
* **Escopo Técnico:**
  * Aplicação rigorosa de Row Level Security (RLS) no banco de dados.
  * Mascaramento de dados pessoais em logs de auditoria e monitoramento de sistema.
  * Garantia de que dados clínicos nunca sejam expostos em endpoints públicos ou em respostas do perfil familiar.
* **Critérios de Aceite:**
  * [ ] Tentativas de consulta de laudos por usuários sem vínculo são bloqueadas e registradas em log de auditoria.
  * [ ] Políticas de RLS ativas em `dados_clinicos` e `sessao`.

---

### [CARD-CLIN-04] Diretriz Ética de Não-Competitividade nos Jogos do Catálogo

* **Tipo:** Regra de Negócio Clínica
* **Componente:** `Backend / Validação de Manifesto & Catálogo`
* **Origem:** *Orientação da Terapeuta: "Não ter jogos competitivos"*
* **Descrição:**  
  Instituir política e validação formal de que os jogos do ecossistema InTEA não devem conter mecânicas de competição punitiva, rankings públicos de desempenho ou contadores agressivos de fracasso, os quais são contraindicados para indivíduos com TEA por elevarem a ansiedade e desregulação emocional.
* **Critérios de Aceite:**
  * [ ] Campo no manifesto do jogo: `caracteristica_jogo: { competitividade: false, cooperativo: true }`.
  * [ ] Rejeição no catálogo de jogos que declarem mecânicas competitivas ou placares eliminatórios.
  * [ ] Ênfase em mecânicas adaptativas de reforço positivo.

---

### [CARD-CLIN-05] Suporte Arquitetural e Contrato para Jogos em Realidade Virtual (VR/XR)

* **Tipo:** Inovação Tecnológica / Arquitetura
* **Componente:** `Contratos JSON & Backend`
* **Origem:** *Orientação da Terapeuta & Marcos: "Usar realidade virtual (ao menos ter capacidade de integrar)"*
* **Requisitos Vinculados:** **RNF02 (Modularidade por Contrato)**
* **Descrição:**  
  Garantir que a arquitetura de contratos do InTEA (`manifestoGame.json` e pareamento remoto RF10) tenha compatibilidade nativa para registrar e orquestrar jogos executados em dispositivos de Realidade Virtual (ex: headsets Meta Quest / Pico / WebXR).
* **Escopo Técnico:**
  * Suporte ao atributo `tipo_plataforma: ["desktop", "tablet", "vr"]` no manifesto.
  * Suporte a métricas sensoriais imersivas (ex: tempo de foco visual, movimentação de cabeça, tolerância a estímulos de profundidade).
* **Critérios de Aceite:**
  * [ ] Contrato `manifestoGame.json` atualizado com exemplo de jogo VR documentado.
  * [ ] Endpoint de pareamento capaz de associar dispositivos VR via token de sessão.

---

### [CARD-CLIN-06] Jogos de Habilidades Terapêuticas e Atividades de Vida Diária (AVD)

* **Tipo:** Catálogo Clínico / Seed
* **Componente:** `Database / Seeds & Catálogo`
* **Origem:** *Orientação da Terapeuta & Marcos: "Jogos de habilidades terapeutas/vida diária que simulem a rotina, ex: 'Vá ao Dentista', 'Atacadão/Supermercado'"*
* **Requisitos Vinculados:** **RF09, RF17 (Contexto Prévio)**
* **Descrição:**  
  Incluir na especificação da biblioteca de jogos a categoria prioritária de **Jogos de Atividades da Vida Diária (AVD)**. Esses jogos preparam o indivíduo autista para situações potencialmente aversivas ou desafiadoras do mundo real através da simulação lúdica prévia.
* **Exemplos Especificados:**
  * *Jogo 1: "Visita Tranquila ao Dentista"* (dessensibilização a barulhos de motores, iluminação direta e etapas da consulta odontológica).
  * *Jogo 2: "Aventura no Supermercado / Atacadão"* (gerenciamento de estímulos visuais e sonoros intensos, seguimento de lista de compras e espera na fila).
* **Critérios de Aceite:**
  * [ ] Categoria `habilidades_vida_diaria` adicionada aos filtros da biblioteca de jogos.
  * [ ] Seed com metadados de simulação de rotinas disponível para demonstração clínica.
