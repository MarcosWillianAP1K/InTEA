# Sprint 7 Detalhada: 4 Devs + 1 Documentação

> **Período planejado:** 17/09/2026 a 24/09/2026  
> **Tema da Sprint:** Pacientes e Biblioteca de Jogos  
> **Composição da equipe:** 2 Back-end, 2 Front-end, 1 Documentação / Qualidade  

---

## 1. Visão Geral e Contexto

Com uma pessoa dedicada exclusivamente à documentação e qualidade técnica, o desenvolvimento foi redistribuído em **2 desenvolvedores back-end** e **2 desenvolvedores front-end**.

* As operações de busca, filtros avançados e modelagem de schema ficam centralizadas no back-end.
* O front-end divide o módulo de Pacientes da Biblioteca de Jogos, cabendo à frente de Jogos assumir também a base de componentes compartilhados (`shared/components`) e o pipeline de testes/CI.

### Distribuição de Papéis

| Papel | Foco Principal |
| :--- | :--- |
| **Back-end 1** | Módulo de Pacientes + Vínculo N:N + Visibilidade institucional |
| **Back-end 2** | Biblioteca de Jogos + Leitura de Manifesto + Busca/Filtros + Testes do Back |
| **Front-end 1** | Módulo de Pacientes (Seleção, Listagem, Cadastro e Perfil) |
| **Front-end 2** | Biblioteca de Jogos + Componentes Compartilhados + Testes/CI do Front |
| **Documentação** | Relatório técnico (Seção 7.7), diagramas, API docs, evidências e casos de teste |

---

## 2. Detalhamento de Tarefas por Responsável

### 2.1 Back-end: Pacientes e Vínculo

| ID | Tarefa | Detalhe Técnico | Requisito / Regra |
| :--- | :--- | :--- | :--- |
| **1.1** | Ajuste do schema | Adicionar campos do formulário (CPF, telefone, endereço, responsável, responsável extra, gatilhos, laudo) em `paciente`/`dados_clinicos`, com migração SQL. | **RF06** |
| **1.2** | CRUD de pacientes | `POST /pacientes`, `GET /pacientes`, `GET /pacientes/:id`, `PUT /pacientes/:id`, `DELETE /pacientes/:id` (soft delete com inativação). | **RF06**, **RN05** |
| **1.3** | Validação (DTOs) | Validar CPF, CEP, datas e campos obrigatórios; suporte a responsável extra opcional. | **RF06** |
| **1.4** | Vínculo automático | Ao cadastrar paciente, criar automaticamente registro na tabela associativa `terapeuta_paciente` com o terapeuta autenticado. | **RF18**, **RF21** |
| **1.5** | Gestão de vínculos | Endpoints `POST /pacientes/:id/terapeutas` e `DELETE /pacientes/:id/terapeutas` para associar ou desassociar terapeutas da mesma clínica. | **RF18** |
| **1.6** | Busca e filtros | Suporte a query params em `GET /pacientes` (`nome`, `idade`, `estado_clinico`, paginação). | **RF19** |
| **1.7** | Guard de visibilidade | Middleware de autorização que bloqueia acesso ao prontuário e dados do paciente caso o terapeuta não possua vínculo ativo (retornar 403/404). | **RN04** |

---

### 2.2 Back-end: Jogos, Busca e Testes

| ID | Tarefa | Detalhe Técnico | Requisito / Regra |
| :--- | :--- | :--- | :--- |
| **2.1** | Endpoints de jogos | `GET /jogos` (catálogo geral) e `GET /jogos/:id` (detalhes e manifesto). | **RF09** |
| **2.2** | Leitura do manifesto | Parse e validação do campo `manifesto_json` conforme contrato estabelecido (`metricas_suportadas`, `tipo_metrica`). | **RNF02** |
| **2.3** | Validação estrita de métrica (Atualização RN02) | Métrica tem que estritamente ter um tipo definido. Métricas sem tipo não serão usadas nem tratadas como categóricas, sendo rejeitadas para evitar erros de tipagem incorreta em ambiente clínico. | **RN02** |
| **2.4** | Seed de jogos | Popular banco com 3 jogos de exemplo (*Aventura das Cores*, *Formas Calmas*, *Som dos Animais*), incluindo versão, manifesto e `status_instalacao`. | **RF09** |
| **2.5** | Busca e filtros | Query param em `GET /jogos` para filtragem por `objetivo` terapêutico, com suporte a paginação. | **RF19** |
| **2.6** | Testes do back | Testes unitários e de integração cobrindo pacientes, regras de vínculo e catálogo de jogos via Vitest. | **Qualidade** |

---

### 2.3 Front-end: Pacientes

| ID | Tarefa | Detalhe Técnico | Referência na Documentação |
| :--- | :--- | :--- | :--- |
| **3.1** | Estrutura da feature | Criar estrutura modular em `features/pacientes/` contendo `components/`, `hooks/`, `pages/`, `service/` e `store/`. | **Fig. 24** |
| **3.2** | Seleção de pacientes | Tela com cards de pacientes (foto, nome, idade, estado clínico) e card de ação "Novo Paciente". | **Fig. 9** |
| **3.3** | Lista detalhada | Visualização em tabela com barra de busca rápida, filtros e atalho de ação para novo cadastro. | **Fig. 14** |
| **3.4** | Cadastro de paciente | Formulário dividido em 4 blocos (dados do paciente, responsável principal, responsável extra opcional, gatilhos/laudo), com máscaras e validação de CPF/CEP. | **Fig. 15** |
| **3.5** | Perfil do paciente | Tela consolidada de visualização do prontuário com dados sociodemográficos, responsáveis, histórico de gatilhos e laudos. | **Fig. 16** |
| **3.6** | Integração da API | Consumir os endpoints da API de pacientes (iniciar com mocks tipados) e tratar adequadamente erros de permissão e não encontrado (403/404). | **RN04** |

---

### 2.4 Front-end: Jogos, Componentes Compartilhados e Testes

| ID | Tarefa | Detalhe Técnico | Referência na Documentação |
| :--- | :--- | :--- | :--- |
| **4.1** | Componentes compartilhados | Implementar e padronizar botão, input, card, badge de status, modal, tabela e campo de busca em `shared/components/`. | **Fig. 24** |
| **4.2** | Cliente HTTP | Configurar instância centralizada do Axios/Fetch (`endpoints.ts`), interceptors de autenticação e tratamento global de erros. | `core/` |
| **4.3** | Biblioteca de Jogos | Grid de cards exibindo nome do jogo, versão, descrição clínica e badge de status de instalação. | **Fig. 10** |
| **4.4** | Filtro e ações de jogos | Barra de filtro por objetivo clínico e botões de ação "Modo Livre" e "Iniciar Sessão" (camada de UI). | **RF09** |
| **4.5** | Integração de jogos | Consumir endpoint `GET /jogos` da API de jogos (com manifesto mockado na fase inicial). | **RNF02** |
| **4.6** | Testes e CI | Testes unitários com Vitest das duas features desenvolvidas e ajuste do pipeline do GitHub Actions para validação contínua. | **Sprint 6** |

---

### 2.5 Documentação e Relatórios

| ID | Tarefa | Detalhe Técnico | Onde Entra |
| :--- | :--- | :--- | :--- |
| **5.1** | Seção 7.7 do relatório | Redigir texto oficial da Sprint 7: objetivos, decisões arquiteturais, entregas realizadas e dificuldades encontradas. | Relatório LaTeX |
| **5.2** | Documentação da API | Especificação Swagger/OpenAPI ou README completo com rotas, DTOs, payloads de exemplo e códigos de status HTTP. | Repositório |
| **5.3** | Atualização dos diagramas | Atualizar Diagrama ER e Diagrama de Classes com os novos atributos de paciente; diagramas de sequência dos fluxos de cadastro e listagem. | Seção 5 |
| **5.4** | Contratos JSON | Versionar e documentar o contrato formal do manifesto do jogo (`manifestoGame.json`). | Seção 7.4.2 |
| **5.5** | Evidências de teste | Coletar prints das telas implementadas, das tabelas no banco de dados e das requisições via Postman/Insomnia com legendas numeradas. | Relatório LaTeX |
| **5.6** | Casos de teste | Elaborar roteiro de testes manuais e critérios de aceite detalhados para cada requisito funcional e regra de negócio. | Relatório LaTeX |
| **5.7** | Gestão do quadro | Manter o quadro de tarefas (Kanban) atualizado e arquivar atas das reuniões diárias/sprint. | Repositório |
| **5.8** | Revisão final | Revisão ortográfica, conformidade da numeração de figuras, referências cruzadas e padronização das normas do documento em LaTeX. | Relatório LaTeX |

---

## 3. Cronograma da Sprint

| Período | Back-end | Front-end | Documentação |
| :--- | :--- | :--- | :--- |
| **Dia 1 (Todos)** | Definir contrato formal dos endpoints (rotas, DTOs, erros) | Alinhar contratos e interfaces TypeScript | Registrar os contratos e schemas acordados |
| **Dias 2 a 4** | Schema, migração, CRUD de pacientes, regras de vínculo e catálogo de jogos | Componentes base (`shared`), telas de pacientes e catálogo com mocks | Swagger/OpenAPI, diagramas atualizados e redação parcial da Seção 7.7 |
| **Dia 5** | Integração com front-end e ajustes finos de API | Integração com os endpoints reais da API | Captura de evidências, prints de telas e testes de rotas |
| **Dias 6 e 7** | Testes unitários, testes de integração e correções | Testes de componentes (Vitest) e correções de layout | Casos de teste formais, critérios de aceite e revisão LaTeX |

---

## 4. Matriz de Dependências

| Quem Depende | De Quem | Como Contornar / Estratégia de Mitigação |
| :--- | :--- | :--- |
| **Front: Pacientes** | Back: Pacientes e Front: Componentes | Utilizar mocks de dados tipados; equipe de componentes entrega base nos primeiros 2 dias. |
| **Front: Jogos** | Back: Jogos | Consumir manifesto e lista de jogos mockados localmente no início. |
| **Back: Jogos** | Back: Pacientes | Combinar o formato do DTO de busca e vínculo logo no Dia 1. |
| **Documentação** | Todos os desenvolvedores | Acompanhar entregas parciais e documentar conforme Pull Requests forem aprovados. |

> [!IMPORTANT]
> **Ponto de Atenção Crítico:** As frentes de Front-end compartilham a biblioteca de componentes. É indispensável que os componentes em `shared/components/` (botão, input, modal, tabela e card) sejam entregues e consolidados nos primeiros dois dias para não bloquear a construção das telas de Pacientes.
