# Cards de Tarefas — Sprint 7 & Diretrizes Terapêuticas (InTEA)

> [!NOTE]
> **Padrão dos Cards:** `Área: [Título da Tarefa] (Tipo: [Tipo])`  
> Todas as tarefas abaixo estão estruturadas para o GitHub Projects da equipe no repositório `MarcosWillianAP1K/InTEA`.

---

## Índice Rápido

* [1. Banco de Dados e Back-end](#1-banco-de-dados-e-back-end)
* [2. Front-end](#2-front-end)
* [3. Documentação](#3-documentação)
* [4. Diretrizes Clínicas da Terapeuta](#4-diretrizes-clínicas-da-terapeuta)

---

## 1. Banco de Dados e Back-end

---

### BD: Ajuste e Migração do Schema de Pacientes (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** RF06
* **Referência Documentação:** Seção 5, Figura 19, Figura 21
* **Descrição:** Adicionar os campos necessários do formulário de cadastro (CPF, telefone, endereço completo, responsável principal, responsável extra opcional, gatilhos sensoriais e laudo) nas tabelas `paciente` e `dados_clinicos`, com script de migração SQL.
* **Critérios de Aceite:**
  * [ ] Script de migração executa sem erros mantendo a integridade dos dados existentes.
  * [ ] Campos obrigatórios e opcionais refletidos corretamente nas constraints da tabela.

---

### Back: CRUD de Pacientes com Soft Delete (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF06, RN05
* **Referência Documentação:** RF06, RN05 (Inalterabilidade do Histórico)
* **Descrição:** Criar os endpoints RESTful para manipulação de pacientes, garantindo que exclusões sejam apenas lógicas (`status_ativo = false`), sem apagar registros físicos do banco de dados.
* **Critérios de Aceite:**
  * [ ] Rotas `POST /pacientes`, `GET /pacientes`, `GET /pacientes/:id`, `PUT /pacientes/:id` e `DELETE /pacientes/:id` funcionando.
  * [ ] A exclusão inativa o paciente sem deletar o registro.
  * [ ] Pacientes inativos não aparecem na listagem padrão.

---

### Back: Validação de DTOs para Pacientes (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** RF06
* **Referência Documentação:** RF06
* **Descrição:** Validar os dados de entrada nas requisições de criação e edição de pacientes, rejeitando payloads com dados incorretos ou faltantes.
* **Critérios de Aceite:**
  * [ ] Validação de CPF, formato de CEP e datas válidas.
  * [ ] Campos obrigatórios bloqueados na ausência e suporte a responsável extra opcional.
  * [ ] Mensagens de erro claras em formato JSON com status 400 ou 422.

---

### Back: Vínculo Automático do Terapeuta no Cadastro (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF18, RF21
* **Referência Documentação:** RF18, RF21, Figura 21
* **Descrição:** Vincular automaticamente o paciente criado ao terapeuta autenticado que realizou a operação, registrando o vínculo na tabela associativa `terapeuta_paciente`.
* **Critérios de Aceite:**
  * [ ] Terapeuta autenticado é associado ao paciente no momento da criação.
  * [ ] Registro persistido na tabela `terapeuta_paciente` em transação segura.

---

### Back: Gestão de Vínculos Multi-terapeuta (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF18
* **Referência Documentação:** RF18, Figura 21
* **Descrição:** Disponibilizar rotas para adicionar ou remover outros terapeutas da mesma clínica no acompanhamento de um paciente compartilhado.
* **Critérios de Aceite:**
  * [ ] Endpoints `POST` e `DELETE` em `/pacientes/:id/terapeutas` funcionando.
  * [ ] Bloqueio de vínculos com terapeutas de clínicas diferentes.

---

### Back: Busca e Filtros de Pacientes (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF19
* **Referência Documentação:** RF19
* **Descrição:** Implementar parâmetros de busca rápida e filtros combinados na rota `GET /pacientes` com suporte a paginação.
* **Critérios de Aceite:**
  * [ ] Filtro por nome (busca parcial), faixa etária e estado clínico.
  * [ ] Retorno com controle de paginação consistente.

---

### Back: Middleware de Visibilidade por Vínculo (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** RN04
* **Referência Documentação:** RN04, RNF06 (LGPD)
* **Descrição:** Middleware de autorização para bloquear acesso ao prontuário do paciente caso o terapeuta logado não possua vínculo com ele.
* **Critérios de Aceite:**
  * [ ] Retorna status 403 (ou 404) caso o terapeuta não tenha vínculo com o paciente.
  * [ ] SuperAdmin mantém acesso para auditoria institucional.

---

### Back: Endpoints do Catálogo de Jogos (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF09
* **Referência Documentação:** RF09, Figura 10
* **Descrição:** Criar rotas para listar os jogos terapêuticos disponíveis no sistema e consultar detalhes de um jogo específico.
* **Critérios de Aceite:**
  * [ ] Rota `GET /jogos` lista os jogos com nome, versão, descrição e status de instalação.
  * [ ] Rota `GET /jogos/:id` retorna os detalhes e o `manifesto_json`.

---

### Back: Leitura e Validação do Manifesto de Jogos (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** RNF02
* **Referência Documentação:** RNF02, Seção 7.4.2
* **Descrição:** Validar a estrutura do `manifesto_json` do jogo para garantir conformidade com o contrato técnico do InTEA (`metricas_suportadas`, campos e tipos).
* **Critérios de Aceite:**
  * [ ] Validação dos campos obrigatórios do manifesto.
  * [ ] Rejeição de manifestos mal formatados com retorno de erro detalhado.

---

### Back: Validação Estrita de Tipagem de Métricas (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** RN02
* **Referência Documentação:** RN02, RNF04
* **Descrição:** Toda métrica deve ter estritamente um tipo válido declarado no manifesto. Métricas sem tipo não serão usadas nem tratadas como categóricas, sendo sumariamente rejeitadas para evitar erros em dados de saúde humana.
* **Critérios de Aceite:**
  * [ ] Sem conversão/fallback automático para categórica.
  * [ ] Métricas sem tipo são rejeitadas na validação do manifesto.
  * [ ] Telemetrias de métricas sem tipo não são gravadas no prontuário.

---

### BD: Seed com 3 Jogos de Exemplo (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF09
* **Referência Documentação:** RF09, Tabela `jogo`
* **Descrição:** Popular o banco de dados com 3 jogos terapêuticos de demonstração (*Aventura das Cores*, *Formas Calmas* e *Som dos Animais*), contendo manifestos válidos e status de instalação.
* **Critérios de Aceite:**
  * [ ] Script de seed cadastra os 3 jogos sem duplicar registros.
  * [ ] Manifestos configurados com métricas clínicas válidas.

---

### Back: Filtro por Objetivo e Paginação de Jogos (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF19
* **Referência Documentação:** RF19, Figura 10
* **Descrição:** Permitir filtrar jogos por objetivo terapêutico na rota `GET /jogos`, com suporte a paginação de resultados.
* **Critérios de Aceite:**
  * [ ] Filtro por objetivo funcional.
  * [ ] Resposta paginada para listas extensas.

---

### Back: Testes Automatizados - Pacientes, Vínculos e Jogos (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** Não é um requisito formal (Garantia de Qualidade e CI)
* **Referência Documentação:** Pipeline CI/CD
* **Descrição:** Criar testes unitários e de integração com Vitest cobrindo CRUD de pacientes, validação de DTOs, regras de vínculo e catálogo de jogos.
* **Critérios de Aceite:**
  * [ ] Testes passando com sucesso no comando `npm test`.
  * [ ] Cenários de sucesso e de erro (ex: 403 sem vínculo) cobertos.

---

## 2. Front-end

---

### Front: Estrutura Modular da Feature de Pacientes (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** Não é um requisito formal (Padrão de arquitetura de código)
* **Referência Documentação:** Figura 24
* **Descrição:** Organizar a pasta `features/pacientes/` contendo as divisões de componentes, hooks, páginas, serviços de API e gerenciamento de estado (store).
* **Critérios de Aceite:**
  * [ ] Pastas organizadas e sem dependências circulares.
  * [ ] Exportações centralizadas via `index.ts`.

---

### Front: Tela de Seleção de Pacientes (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF06, RF12
* **Referência Documentação:** Figura 9 (Tela de Listagem dos Pacientes)
* **Descrição:** Criar a interface de seleção de pacientes com visualização em cards contendo foto, nome, idade, resumo do estado clínico e o card de ação "Novo Paciente".
* **Critérios de Aceite:**
  * [ ] Grid responsivo com Tailwind CSS.
  * [ ] Clique no card seleciona o paciente; card "Novo Paciente" leva ao cadastro.

---

### Front: Lista Detalhada de Pacientes em Tabela (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF06, RF19
* **Referência Documentação:** Figura 14 (Tela da Lista de Pacientes)
* **Descrição:** Construir a visualização em tabela detalhada para gestão clínica, com barra de busca rápida, filtros e atalho para novo cadastro.
* **Critérios de Aceite:**
  * [ ] Tabela com ordenação e paginação.
  * [ ] Campo de busca com filtro em tempo real.

---

### Front: Formulário de Cadastro de Pacientes em 4 Blocos (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF06
* **Referência Documentação:** Figura 15 (Tela de Cadastro de Paciente)
* **Descrição:** Desenvolver o formulário de cadastro estruturado em 4 blocos: Identificação do Paciente, Responsável Principal, Responsável Extra (opcional) e Dados Clínicos/Gatilhos.
* **Critérios de Aceite:**
  * [ ] Máscaras para CPF, telefone e CEP.
  * [ ] Validações visuais inline com mensagens de erro.

---

### Front: Tela de Perfil e Prontuário do Paciente (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF06, RF15
* **Referência Documentação:** Figura 16 (Tela de Perfil do Paciente)
* **Descrição:** Tela consolidada de visualização do prontuário, reunindo dados pessoais, contatos dos responsáveis, laudos e tags visuais dos gatilhos sensoriais.
* **Critérios de Aceite:**
  * [ ] Visualização limpa dos dados e tags destacadas para gatilhos.
  * [ ] Atalhos para editar dados e iniciar nova sessão.

---

### Front: Integração com API de Pacientes (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** RN04
* **Referência Documentação:** RN04
* **Descrição:** Conectar as telas de pacientes com os endpoints do back-end, incluindo tratamento de permissão (403), recurso não encontrado (404) e avisos visuais.
* **Critérios de Aceite:**
  * [ ] Consumo correto das rotas da API.
  * [ ] Mensagens de feedback amigáveis na interface.

---

### Front: Componentes Compartilhados shared/components (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** Não é um requisito formal (Padronização visual e design system)
* **Referência Documentação:** Figura 24
* **Descrição:** Construir a base de componentes reutilizáveis em `shared/components/`: botão, input, card, badge de status, modal, tabela e campo de busca.
* **Critérios de Aceite:**
  * [ ] Componentes tipados em TypeScript e compatíveis com Tailwind CSS.
  * [ ] Suporte consistente aos modos claro e escuro.

---

### Front: Cliente HTTP e Interceptors (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** RF03, RNF01
* **Referência Documentação:** Seção de Arquitetura de Comunicação
* **Descrição:** Configurar o cliente HTTP central (`endpoints.ts`) com injeção automática de token JWT e redirecionamento para login em caso de sessão expirada.
* **Critérios de Aceite:**
  * [ ] Token de autorização enviado automaticamente nas requisições.
  * [ ] Tratamento global para erros 401 e de conexão.

---

### Front: Tela da Biblioteca de Jogos (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF09
* **Referência Documentação:** Figura 10 (Tela dos Jogos Disponíveis)
* **Descrição:** Criar a grade visual do catálogo de jogos, exibindo cartões com título, versão, descrição clínica e indicador de status de instalação.
* **Critérios de Aceite:**
  * [ ] Grade responsiva com cards bem estruturados.
  * [ ] Badges visuais indicando status (`Instalado`, `Em execução`, etc.).

---

### Front: Filtros Clínicos e Ações nos Jogos (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF09, RF11
* **Referência Documentação:** Figura 10, RF11 (Modo Livre)
* **Descrição:** Adicionar barra de filtro por objetivo clínico e os botões de ação "Iniciar Sessão" (fluxo clínico com paciente) e "Modo Livre" (jogo desvinculado de prontuário).
* **Critérios de Aceite:**
  * [ ] Filtro por objetivo atualiza os cards na tela.
  * [ ] Botões disparam os fluxos corretos na interface.

---

### Front: Integração de Jogos e Testes com Vitest (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** RNF02, Qualidade
* **Referência Documentação:** Contrato manifestoGame.json, Pipeline CI
* **Descrição:** Integrar a biblioteca de jogos com a API, criar testes automatizados de componentes com Vitest e garantir execução limpa no GitHub Actions.
* **Critérios de Aceite:**
  * [ ] Testes de componentes executando com sucesso no `npm test`.
  * [ ] Pipeline de CI validando tipagem e build sem falhas.

---

## 3. Documentação

---

### Docs: Seção 7.7 do Relatório Oficial (Tipo: Docs)

* **Tipo:** Docs
* **Requisitos:** Gestão de Projeto
* **Referência Documentação:** Seção 7.7 (Sprint 7)
* **Descrição:** Escrever o texto oficial da Sprint 7 para o relatório acadêmico/técnico do InTEA em LaTeX, documentando objetivos, decisões técnicas, entregas e retrospectiva.
* **Critérios de Aceite:**
  * [ ] Texto redigido nas normas do documento do projeto.
  * [ ] Rastreabilidade clara com os requisitos da sprint.

---

### Docs: Especificação da API OpenAPI e Rotas (Tipo: Docs)

* **Tipo:** Docs
* **Requisitos:** RNF02
* **Referência Documentação:** Repositório / Contratos
* **Descrição:** Documentar detalhadamente todas as rotas de pacientes e jogos, com exemplos de request body, query params, status de resposta e mensagens de erro.
* **Critérios de Aceite:**
  * [ ] Exemplos práticos para todas as rotas criadas.
  * [ ] Códigos de resposta (200, 201, 400, 403, 404, 422) especificados.

---

### Docs: Atualização dos Diagramas ER, Classes e Sequência (Tipo: Docs)

* **Tipo:** Docs
* **Requisitos:** Não é um requisito formal (Modelagem de Sistema)
* **Referência Documentação:** Seção 5, Figura 1, Figura 3, Figura 4
* **Descrição:** Atualizar os diagramas oficiais do projeto para contemplar os novos atributos de paciente, dados clínicos e os fluxos de cadastro e consulta com guard.
* **Critérios de Aceite:**
  * [ ] Diagramas atualizados e inseridos no relatório.
  * [ ] Numeração e referências cruzadas alinhadas com o documento.

---

### Docs: Versionamento do Contrato do Manifesto (Tipo: Docs)

* **Tipo:** Docs
* **Requisitos:** RNF02
* **Referência Documentação:** Seção 7.4.2 (Design de Contratos JSON)
* **Descrição:** Especificar e documentar o JSON Schema oficial do `manifestoGame.json`, detalhando versionamento e formatos de métricas permitidos.
* **Critérios de Aceite:**
  * [ ] Schema formal documentado no repositório.
  * [ ] Exemplos práticos de manifestos incluídos.

---

### Docs: Casos de Teste e Critérios de Aceite Formais (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** Não é um requisito formal (Garantia de Qualidade e Validação Clínica)
* **Referência Documentação:** Seção de Testes do Relatório
* **Descrição:** Criar planilha com roteiro de testes manuais para validação dos fluxos de pacientes e catálogo de jogos, mapeando requisitos e resultados esperados.
* **Critérios de Aceite:**
  * [ ] Casos de teste estruturados com passos e validações.
  * [ ] Mapeamento entre cada caso de teste e seu respectivo requisito.

---

## 4. Diretrizes Clínicas da Terapeuta

---

### Front: Humanização de Termos - Substituição de Co-Terapeuta (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** Não é um requisito formal (Diretriz clínica de humanização)
* **Referência Documentação:** Orientação Terapeuta
* **Descrição:** Substituir na interface e tooltips o termo clínico "Co-Terapeuta" por nomenclaturas mais neutras e acolhedoras, como "Facilitador Terapêutico" ou "Apoiador", evitando rotulação excessiva.
* **Critérios de Aceite:**
  * [ ] Rótulos e textos da interface atualizados sem termos estigmatizantes.
  * [ ] Permissões de sistema mantidas normalmente por baixo dos panos.

---

### Back/Front: Perfil Família com Limite de Tempo e Modo Livre (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF11 (Modo Livre)
* **Referência Documentação:** Orientação Terapeuta & Marcos, RF11
* **Descrição:** Criar perfil de acesso para a família que permite acessar a biblioteca de jogos unicamente em Modo Livre (sem DDA e sem prontuário clínico), com controle de limite de tempo de tela.
* **Critérios de Aceite:**
  * [ ] Perfil família não tem acesso a prontuários e laudos confidenciais.
  * [ ] Jogos executam em Modo Livre sem gravar telemetria clínica.
  * [ ] Temporizador bloqueia o jogo ao atingir o tempo estipulado.

---

### Back: Proteção e Sigilo de Dados Clínicos Sensíveis (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** RNF06 (LGPD), RN04
* **Referência Documentação:** RNF06, RN04
* **Descrição:** Garantir blindagem rígida de segurança com Row Level Security (RLS) no banco de dados para proteger dados inseridos pelo terapeuta (laudos, diagnósticos e gatilhos sensoriais).
* **Critérios de Aceite:**
  * [ ] Acesso aos dados clínicos bloqueado para perfis não autorizados e familiares.
  * [ ] Políticas de RLS ativas e testadas no banco de dados.

---

### Back: Validação Ética de Jogos Não Competitivos (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** Não é um requisito formal (Diretriz Clínica de Não-Competitividade)
* **Referência Documentação:** Orientação Terapeuta
* **Descrição:** Implementar validação no catálogo e no manifesto para barrar jogos com mecânicas competitivas punitivas ou rankings, assegurando foco exclusivo em cooperação e autorregulação.
* **Critérios de Aceite:**
  * [ ] Rejeição de jogos que declarem mecânicas competitivas eliminatórias.
  * [ ] Catálogo focado em estímulos positivos e adaptativos.

---

### Docs/Back: Suporte a Jogos em Realidade Virtual VR (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RNF02 (Modularidade por Contrato)
* **Referência Documentação:** Orientação Terapeuta & Marcos, RNF02
* **Descrição:** Adequar a arquitetura de contratos do manifesto e o fluxo de pareamento para permitir integração com jogos executados em dispositivos de Realidade Virtual (VR/XR).
* **Critérios de Aceite:**
  * [ ] Manifesto suporta especificação de plataforma VR.
  * [ ] Contrato documentado com exemplo de métricas imersivas.

---

### BD: Jogos de Atividades de Vida Diária AVD (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF09, RF17
* **Referência Documentação:** Orientação Terapeuta & Marcos, RF09
* **Descrição:** Cadastrar na biblioteca de jogos categorias voltadas a atividades práticas do cotidiano (ex: "Visita ao Dentista", "Ida ao Supermercado / Atacadão"), preparando o indivíduo para situações do mundo real.
* **Critérios de Aceite:**
  * [ ] Categoria de simulação de rotinas disponível no catálogo.
  * [ ] Jogos de exemplo com dados e objetivos clínicos cadastrados.
