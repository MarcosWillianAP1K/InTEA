# Cards de Tarefas — InTEA (GitHub Projects)

> [!NOTE]
> **Padrão dos Cards:** `Área: [Título da Tarefa] (Tipo: [Tipo])`  
> Todas as tarefas abaixo estão estruturadas para o GitHub Projects da equipe no repositório `MarcosWillianAP1K/InTEA`.

---

## Índice Rápido

* [1. Banco de Dados e Back-end (Sprint 7)](#1-banco-de-dados-e-back-end)
* [2. Front-end (Sprint 7)](#2-front-end)
* [3. Documentação (Sprint 7)](#3-documentação)
* [4. Diretrizes Clínicas da Terapeuta](#4-diretrizes-clínicas-da-terapeuta)
* [5. Sprint 8 — Pareamento Remoto e Testes Prévios](#5-sprint-8--pareamento-remoto-e-testes-prévios)
* [6. Cards Extras — Adiantamento (Autenticação, Segurança e Auditoria)](#6-cards-extras--adiantamento-autenticação-segurança-e-auditoria)

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

### Front: Integração da API de Jogos (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** RNF02
* **Referência Documentação:** Contrato manifestoGame.json, RNF02
* **Descrição:** Integrar a biblioteca de jogos com o endpoint `GET /jogos` da API, tratando estados de loading, erro e exibição de dados com manifesto.
* **Critérios de Aceite:**
  * [ ] Consumo funcional do endpoint de jogos com fallback para mocks se offline.
  * [ ] Dados do manifesto e métricas refletidos corretamente na interface.

---

### Front: Testes Automatizados com Vitest e Pipeline CI (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** Não é um requisito formal (Garantia de Qualidade e CI)
* **Referência Documentação:** Pipeline CI/CD, Sprint 6
* **Descrição:** Criar testes automatizados unitários e de componentes com Vitest para as features de Pacientes e Jogos, garantindo execução limpa no GitHub Actions.
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

### Docs: Coleta de Evidências de Teste e Telas (Tipo: Docs)

* **Tipo:** Docs
* **Requisitos:** Gestão de Qualidade / Relatório
* **Referência Documentação:** Seção 7.7 do Relatório LaTeX
* **Descrição:** Coletar e catalogar prints em alta resolução das telas implementadas (seleção, lista, cadastro, perfil e catálogo de jogos), tabelas do banco e chamadas de API via Postman/Insomnia com legendas numeradas.
* **Critérios de Aceite:**
  * [ ] Prints organizados na pasta `docs/figuras/` ou correspondente.
  * [ ] Legendas e referências numeradas em conformidade com o relatório.

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

### Docs: Gestão do Quadro Kanban e Atas (Tipo: Docs)

* **Tipo:** Docs
* **Requisitos:** Metodologia de Desenvolvimento
* **Referência Documentação:** Gestão de Projeto
* **Descrição:** Manter o quadro do GitHub Projects atualizado com status em tempo real das tarefas, registrar atas das reuniões diárias e retrospectiva da sprint.
* **Critérios de Aceite:**
  * [ ] Quadro de tarefas 100% sincronizado com as entregas da equipe.
  * [ ] Atas e notas arquivadas no repositório.

---

### Docs: Revisão Ortográfica e Normas ABNT/LaTeX (Tipo: Docs)

* **Tipo:** Docs
* **Requisitos:** Padrão Acadêmico UFPI
* **Referência Documentação:** Relatório Oficial
* **Descrição:** Realizar varredura ortográfica e gramatical, verificar numeração de seções e figuras, alinhar citações bibliográficas e compilar o PDF final sem warnings no LaTeX.
* **Critérios de Aceite:**
  * [ ] Documento PDF compila sem erros ou advertências graves.
  * [ ] Conformidade com a estrutura estabelecida pelo orientador.

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

---

## 5. Sprint 8 — Pareamento Remoto e Testes Prévios

---

### Back: Migration e Model da Tabela de Sessões (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF10, RF12
* **Referência Documentação:** Figura 4 (DER), RF10, RF12
* **Descrição:** Criar tabela `sessao` no PostgreSQL/Supabase com chaves estrangeiras (`paciente_id`, `terapeuta_id`, `jogo_id`), coluna `session_token` única com índice B-Tree, status do pareamento (`aguardando_pareamento`, `conectado`, `finalizada`, `expirada`), timestamps de início/fim e metadados JSON (`contexto_dda_json`).
* **Critérios de Aceite:**
  * [ ] Migration SQL cria tabela `sessao` com todas as constraints, chaves estrangeiras e índices.
  * [ ] Model `SessaoModel` implementado com tipagem TypeScript estrita e métodos de CRUD básico.
  * [ ] Campo `session_token` indexado para busca rápida com garantia de unicidade.

---

### Back: Gerador de Session Token Seguro (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF10, RNF03
* **Referência Documentação:** RF10, RNF03 (Segurança)
* **Descrição:** Implementar serviço utilitário para geração de códigos de pareamento efêmeros de 6 a 8 caracteres alfanuméricos em caixa alta, excluindo caracteres visualmente ambíguos (ex: `0`, `O`, `1`, `I`), com TTL de 15 minutos e suporte a expiração programada.
* **Critérios de Aceite:**
  * [ ] Tokens gerados sem caracteres ambíguos facilitando digitação em telas de toque.
  * [ ] Entropia criptográfica adequada via `crypto.randomBytes`.
  * [ ] Validador verifica se o token está no formato correto e dentro do prazo de validade.

---

### Back: Endpoint de Criação de Sessão e Emissão de Token (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF10, RF12, RN04
* **Referência Documentação:** RF10, RF12, RN04, Figura 3
* **Descrição:** Desenvolver rota `POST /api/sessao/iniciar` protegida por JWT que valida se o terapeuta possui vínculo ativo com o paciente (RN04), instancia a sessão com status `aguardando_pareamento` e retorna o identificador da sessão e o `session_token`.
* **Critérios de Aceite:**
  * [ ] Rota bloqueia requisições sem JWT ou de terapeutas sem vínculo com o paciente (retorno 401/403).
  * [ ] Sessão persistida no banco com status `aguardando_pareamento` e timestamps.
  * [ ] Retorno com `session_id`, `session_token`, dados do paciente e tempo de expiração.

---

### Back: Validação e Revogação de Token Expirado (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** RF10, RNF03
* **Referência Documentação:** RF10, RNF03
* **Descrição:** Criar rotina e regras de negócio para invalidar automaticamente tokens após timeout de 15 minutos ou quando o terapeuta cancelar voluntariamente a sessão pendente, prevenindo conexões indevidas de jogos remotos.
* **Critérios de Aceite:**
  * [ ] Tentativas de pareamento com token expirado retornam HTTP 410 Gone ou 400 Bad Request com mensagem clara.
  * [ ] Rota `DELETE /api/sessao/:id/cancelar` permite cancelamento antecipado pelo terapeuta.

---

### Back: Endpoint de Handshake (acordo) de Pareamento Remoto (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF10
* **Referência Documentação:** RF10, Figura 3 (Passos 8-10)
* **Descrição:** Implementar rota pública/controlada `POST /api/sessao/parear` consumida pelo jogo externo no tablet/computador do paciente. Recebe o `session_token`, valida a existência da sessão, atualiza o status para `conectado` e retorna os parâmetros essenciais para o jogo.
* **Critérios de Aceite:**
  * [ ] Endpoint valida o token e associa o dispositivo à sessão.
  * [ ] Transição atômica de status de `aguardando_pareamento` para `conectado`.
  * [ ] Retorno com configurações do jogo, ID da sessão e canal de comunicação WebSocket.

---

### Back: Gateway de WebSocket para Notificação em Tempo Real (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF10, RNF04
* **Referência Documentação:** RF10, Figura 3, Figura 5
* **Descrição:** Configurar gateway WebSocket (Socket.IO) com salas dinâmicas baseadas no `session_token`. Notifica instantaneamente a aplicação web do terapeuta quando o dispositivo do paciente concluir o handshake.
* **Critérios de Aceite:**
  * [ ] Socket.IO configurado com autenticação e salas por sessão (`sessao:{token}`).
  * [ ] Evento `dispositivo_conectado` emitido imediatamente para o painel web após pareamento.
  * [ ] Logs estruturados de conexão e desconexão de clientes.

---

### Back: Heartbeat e Detecção de Queda de Conexão Remota (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** RF10, RNF04
* **Referência Documentação:** RF10, RNF04 (Confiabilidade)
* **Descrição:** Implementar mecanismo de heartbeat (ping/pong) periódico para detectar interrupções de rede no dispositivo remoto e alertar a interface web sobre perda de conexão ou reconexão do paciente.
* **Critérios de Aceite:**
  * [ ] Queda de conexão detectada em no máximo 10 segundos de inatividade do ping.
  * [ ] Evento `dispositivo_desconectado` transmitido para a interface do terapeuta.
  * [ ] Suporte a reconexão automática sem perda da sessão em andamento.

---

### Back: Testes Automatizados de Pareamento e Regressão da Sprint 7 (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** Qualidade de Software, RF10, RF06, RF09
* **Referência Documentação:** Seção 7.8, `roteiro-testes.md`
* **Descrição:** Desenvolver suíte de testes de integração com Vitest cobrindo todo o fluxo de pareamento (geração, handshake, expiração e cancelamento), e rodar a bateria completa de regressão para assegurar integridade dos 228 testes prévios.
* **Critérios de Aceite:**
  * [ ] Testes de integração de sessão e pareamento cobrindo cenários positivos e negativos.
  * [ ] Testes de não-regressão de pacientes, vínculos e jogos executando 100% verdes.

---

### Front: Modal de Configuração Pré-Sessão (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF10, RF12, RF17
* **Referência Documentação:** Figura 11, Figura 10, RF10
* **Descrição:** Desenvolver modal no frontend acionado ao clicar em "Iniciar Sessão" na biblioteca de jogos. Permite escolher o paciente vinculado, visualizar instruções e disparar a requisição de início de sessão.
* **Critérios de Aceite:**
  * [ ] Modal composável utilizando componentes primitivos `Dialog`, `Select` e `Button`.
  * [ ] Listagem de pacientes ativos vinculados ao terapeuta para seleção.
  * [ ] Validação impede prosseguir sem selecionar um paciente.

---

### Front: Componente Visual de Exibição do Token de Pareamento (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF10
* **Referência Documentação:** Figura 11, RF10
* **Descrição:** Desenvolver componente visual com destaque tipográfico para o PIN de pareamento (letras/números em blocos individuais), botão com feedback de cópia ("Copiar Código") e renderização de QR Code para leitura rápida pela câmera do tablet.
* **Critérios de Aceite:**
  * [ ] PIN renderizado de forma clara, legível e responsiva.
  * [ ] Botão de cópia para a área de transferência com notificação toast (Sonner).
  * [ ] Suporte visual a QR Code para escaneamento direto.

---

### Front: Indicador de Status de Pareamento em Tempo Real (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF10
* **Referência Documentação:** RF10, Figura 11
* **Descrição:** Criar elemento visual reativo de status dentro do modal: badge animado indicando "Aguardando conexão do dispositivo...", transição para "Dispositivo Conectado com Sucesso" (verde com ícone de confirmação) e liberação do botão "Iniciar Intervenção".
* **Critérios de Aceite:**
  * [ ] Estado visual muda instantaneamente na recepção do evento WebSocket sem recarregar a página.
  * [ ] Animações suaves de transição de estado com Tailwind CSS.

---

### Front: Cancelamento e Timeout de Pareamento na UI (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** RF10
* **Referência Documentação:** RF10
* **Descrição:** Implementar cronômetro regressivo de validade do token (15 minutos) e botão "Cancelar Sessão", permitindo ao terapeuta fechar o modal ou regenerar um novo código caso o tempo expire.
* **Critérios de Aceite:**
  * [ ] Contador regressivo exibido em tela de forma discreta.
  * [ ] Mensagem de expiração com opção "Gerar Novo Código" ao zerar o tempo.
  * [ ] Botão de cancelamento envia requisição de cancelamento e reseta a store.

---

### Front: Integração do Cliente WebSocket / Socket.IO (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF10, RNF04
* **Referência Documentação:** `core/web.socket.ts`, RF10
* **Descrição:** Configurar cliente Socket.IO em `core/web.socket.ts` com conexão gerenciada por canal, reconexão com backoff exponencial e listeners tipados para eventos de pareamento.
* **Critérios de Aceite:**
  * [ ] Conexão Socket.IO reutilizável em toda a aplicação.
  * [ ] Handlers tipados para os eventos `dispositivo_conectado`, `dispositivo_desconectado` e `erro_sessao`.

---

### Front: Store Reativa de Sessão e Pareamento (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF10, RF12
* **Referência Documentação:** Arquitetura Zustand
* **Descrição:** Criar store Zustand (`features/sessao/store/sessionStore.ts`) para gerenciar o estado global da sessão atual (jogo selecionado, paciente selecionado, token gerado, status do pareamento e conexão de socket).
* **Critérios de Aceite:**
  * [ ] Store tipada sem `any` com actions de início, sucesso de pareamento, desconexão e reset.
  * [ ] Estado compartilhado perfeitamente entre o modal e a navegação.

---

### Front: Integração do Fluxo "Iniciar Sessão" na Biblioteca de Jogos (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF09, RF10
* **Referência Documentação:** Figura 10, RF09
* **Descrição:** Conectar o botão "Iniciar Sessão" dos cards da página `BibliotecaJogosPage.tsx` para disparar a abertura do fluxo de pré-sessão e pareamento com o jogo pré-selecionado.
* **Critérios de Aceite:**
  * [ ] Clique no botão abre o modal com o ID e título do jogo devidamente preenchidos.
  * [ ] Fluxo não interfere na execução independente do "Modo Livre" (RF11).

---

### Front: Testes de Componentes e Validação no Vitest (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** Qualidade de Software, Sprint 6/7
* **Referência Documentação:** Pipeline CI
* **Descrição:** Escrever testes unitários e de renderização para o modal de pré-sessão, componente de exibição do PIN e transições de estado na store do Zustand via Vitest e Testing Library.
* **Critérios de Aceite:**
  * [ ] Testes de renderização dos componentes de pareamento aprovados.
  * [ ] Validação de transições de estado reativas da store.

---

### Docs: Seção 7.8 do Relatório Oficial LaTeX (Tipo: Docs)

* **Tipo:** Docs
* **Requisitos:** Padrão Acadêmico UFPI
* **Referência Documentação:** Seção 7.8 do Projeto InTEA
* **Descrição:** Redigir o capítulo oficial da Sprint 8 no relatório acadêmico LaTeX: objetivos alcançados, desenho do protocolo de pareamento remoto, diagrama de sequência da sessão e análise das decisões técnicas.
* **Critérios de Aceite:**
  * [ ] Texto compilável em LaTeX sem advertências de formatação.
  * [ ] Inclusão do diagrama de sequência atualizado e referências às figuras do projeto.

---

### Docs: Especificação OpenAPI dos Endpoints de Sessão (Tipo: Docs)

* **Tipo:** Docs
* **Requisitos:** RNF02 (OpenAPI / Swagger)
* **Referência Documentação:** Swagger UI, `docs/api-pacientes-jogos.md`
* **Descrição:** Documentar formalmente os endpoints `/api/sessao/iniciar` e `/api/sessao/parear` com JSDoc e Swagger, incluindo esquemas de request, response de sucesso e respostas de erro (400, 401, 403, 404, 410).
* **Critérios de Aceite:**
  * [ ] Rotas visíveis e testáveis interativamente no Swagger UI (`/api/docs`).
  * [ ] Schemas e exemplos de payload aderentes ao padrão OpenAPI 3.0.

---

### Docs: Roteiro de Testes Manuais de Pareamento Remoto (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** RF10, RNF04
* **Referência Documentação:** `docs/roteiro-testes.md`
* **Descrição:** Adicionar ao roteiro formal de testes manuais os casos de teste específicos da Sprint 8 (CT-S01 a CT-S06), especificando precondições, passos no Postman/Interface e resultados esperados.
* **Critérios de Aceite:**
  * [ ] Casos de teste estruturados cobrindo conexão normal, PIN incorreto, token expirado e queda de conexão.
  * [ ] Rastreabilidade clara com os requisitos RF10 e RNF04.

---

### Docs: Coleta de Evidências e Capturas de Pareamento (Tipo: Docs)

* **Tipo:** Docs
* **Requisitos:** Metodologia de Desenvolvimento
* **Referência Documentação:** Relatório Oficial
* **Descrição:** Capturar prints da interface web exibindo o token de pareamento, simulação de conexão do jogo remoto e tráfego de mensagens no WebSocket para compor as figuras do relatório técnico.
* **Critérios de Aceite:**
  * [ ] Imagens em alta resolução coletadas com legendas técnicas e numeradas.

---

## 6. Cards Extras — Adiantamento (Autenticação, Segurança e Auditoria)

> [!NOTE]
> Estes cards representam **3 grandes frentes fundamentais fora do cronograma linear de sprints** (Autenticação Avançada, Blindagem de Segurança e Auditoria/SuperAdmin).  
> **Não possuem responsável atribuído na Sprint 8** e servem como backlog estratégico para os membros que concluírem suas tarefas antecipadamente.

---

### Back: Mecanismo de Refresh Token com Rotação Automática (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF03, RNF03
* **Referência Documentação:** RF03 (Controle de Acesso via Refresh Token), RNF03
* **Descrição:** Implementar renovação contínua de sessão JWT com rotação estrita de tokens: a cada chamada a `/api/auth/refresh`, um novo refresh token é emitido e o anterior é imediatamente invalidado, detectando tentativas de reutilização maliciosa.
* **Critérios de Aceite:**
  * [ ] Rota `POST /api/auth/refresh` valida o refresh token e emite novo par (access e refresh token).
  * [ ] Reutilização de um refresh token já consumido revoga toda a árvore de sessões por segurança.
  * [ ] Interceptor no frontend atualiza silenciosamente o token sem interrupção para o terapeuta.

---

### Back: Gestão e Encerramento de Sessões Concorrentes (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF02
* **Referência Documentação:** RF02 (Gerenciamento de Sessões Ativas)
* **Descrição:** Criar endpoints e tabelas para controle de dispositivos logados pelo terapeuta, permitindo listar sessões ativas com IP/User-Agent e revogar remotamente acessos suspeitos (`POST /api/auth/logout-all`).
* **Critérios de Aceite:**
  * [ ] Rota `GET /api/auth/sessoes` lista conexões ativas do terapeuta logado.
  * [ ] Rota `POST /api/auth/logout-all` desconecta todas as outras sessões ativas com sucesso.
  * [ ] Tokens de sessões revogadas são rejeitados imediatamente no middleware de autenticação.

---

### Back: Fluxo de Recuperação de Senha com Link Mágico Expirável (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF01, RNF03
* **Referência Documentação:** RF01, RNF03
* **Descrição:** Disponibilizar fluxo seguro de recuperação de credenciais via e-mail contendo token assinado de uso único com expiração de 30 minutos, impedindo enumeração de usuários na resposta da API.
* **Critérios de Aceite:**
  * [ ] Endpoint `POST /api/auth/recuperar-senha` sempre retorna status 200 genérico para evitar vazamento de existência de e-mail.
  * [ ] Endpoint `POST /api/auth/redefinir-senha` valida token efêmero e aplica nova senha criptografada.
  * [ ] Token de recuperação torna-se inválido imediatamente após o primeiro uso.

---

### Back: Rate Limiting Contra Força Bruta em Autenticação e Pareamento (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** RNF03 (Segurança)
* **Referência Documentação:** RNF03
* **Descrição:** Aplicar limitação de taxa de requisições (`express-rate-limit`) nas rotas de login e pareamento de sessão, bloqueando ataques de força bruta direcionados a senhas de terapeutas e adivinhação de PINs de jogos.
* **Critérios de Aceite:**
  * [ ] Limite de no máximo 5 tentativas de login por IP a cada 15 minutos (retorno 429 Too Many Requests).
  * [ ] Limite de checagem de PIN no endpoint de pareamento `/api/sessao/parear` contra enumeração.
  * [ ] Resposta com header `Retry-After` informando tempo de espera para desbloqueio.

---

### BD/Back: Anonimização e Criptografia em Repouso de Dados Sensíveis LGPD (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** RNF06 (LGPD), RN04
* **Referência Documentação:** RNF06, RN04
* **Descrição:** Implementar anonimização de identificadores em logs da aplicação e rotinas de criptografia simétrica (AES-256) em repouso para campos altamente sensíveis de prontuário, laudos médicos e histórico de gatilhos.
* **Critérios de Aceite:**
  * [ ] Logs da aplicação nunca imprimem CPF, telefone ou nome completo em texto claro.
  * [ ] Campos sensíveis armazenados cifrados no banco e decifrados apenas na camada de serviço autorizada.
  * [ ] Conformidade comprovada com diretrizes da LGPD para dados de menores de idade e pessoas atípicas.

---

### Back: Middleware de Headers de Segurança HTTP e Proteção CSRF/CORS (Tipo: Validação)

* **Tipo:** Validação
* **Requisitos:** RNF03
* **Referência Documentação:** RNF03
* **Descrição:** Configurar proteção avançada de rede no backend utilizando `helmet` (HSTS, Content Security Policy restritiva, bloqueio de clickjacking via `X-Frame-Options: DENY`) e validação estrita de origens confiáveis no CORS.
* **Critérios de Aceite:**
  * [ ] Headers de proteção presentes em 100% das respostas HTTP da API.
  * [ ] Requisições com origens não autorizadas no CORS são bloqueadas com erro de rede seguro.
  * [ ] Bloqueio de injeção em iframes externos para proteção de telas clínicas.

---

### BD/Back: Trilha de Auditoria de Acessos ao Prontuário Médico (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF08, RNF06
* **Referência Documentação:** RF08 (Auditoria de Vínculos e Acessos), RNF06
* **Descrição:** Implementar middleware de auditoria que registra na tabela `auditoria_acesso` todo evento de visualização (`GET`), alteração (`PUT`/`PATCH`) ou exclusão lógica (`DELETE`) de prontuários, armazenando `terapeuta_id`, `paciente_id`, `ip`, `user_agent` e timestamp.
* **Critérios de Aceite:**
  * [ ] Registro automático em tabela de auditoria a cada consulta a `/api/paciente/:id`.
  * [ ] Imutabilidade dos registros de log (sem permissão de alteração ou deleção na tabela de auditoria).
  * [ ] Suporte a consultas de auditoria por período e por terapeuta.

---

### Back: Endpoints Administrativos para Gestão Global de Clínicas e Terapeutas (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF07, RF08
* **Referência Documentação:** RF07 (Gestão SuperAdmin), RF08
* **Descrição:** Criar rotas restritas ao papel `is_super_admin` (`/api/admin/clinicas`, `/api/admin/terapeutas`) para gerenciamento institucional de clínicas parceiras, ativação/desativação de contas de profissionais e consulta global de logs de auditoria.
* **Critérios de Aceite:**
  * [ ] Middleware `superAdminMiddleware` bloqueia qualquer terapeuta sem privilégios de SuperAdmin (status 403).
  * [ ] Rotas de listagem, ativação e desativação institucional de clínicas e terapeutas funcionando.
  * [ ] Consulta de logs de auditoria consolidada por instituição.

---

### Front: Interface do Painel Administrativo de Auditoria (Tipo: Feature)

* **Tipo:** Feature
* **Requisitos:** RF07, RF08
* **Referência Documentação:** RF07, RF08
* **Descrição:** Desenvolver página restrita no frontend (`/admin/auditoria`) com tabela interativa contendo filtros por data, terapeuta e tipo de ação clínica, permitindo aos administradores da clínica fiscalizar a conformidade e os acessos aos prontuários.
* **Critérios de Aceite:**
  * [ ] Rota protegida por guard de rota que restringe acesso apenas a usuários SuperAdmin.
  * [ ] Tabela com busca, paginação e filtros de eventos de auditoria.
  * [ ] Botão de exportação dos logs em formato estruturado (CSV/JSON) para relatórios institucionais.
