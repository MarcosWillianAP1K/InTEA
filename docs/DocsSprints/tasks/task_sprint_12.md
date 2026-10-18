# Cards de Tarefas — Sprint 12: Auditoria Fullstack e Integração End-to-End

> **Sprint:** 12  
> **Período:** 22/10/2026 a 29/10/2026  
> **Tema Central:** Auditoria Fullstack, Mapeamento Integral dos Contratos REST/WS e Integração E2E Back-End + Front-End com Consumo de APIs Reais  
> **Documento Mestre:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf)  
> **Diretrizes e Regras:** [AGENTS.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/AGENTS.md)  
> **Hub de Tarefas Geral:** [visao_geral.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/visao_geral.md)  

---

## 1. Cards por Integrante (20 Cards Principais)

---

### 1.1. Back-end 1 — Marcos Willian (@MarcosWillianAP1K)

---

### Back: Endpoint Unificado de Agregação de Métricas do Dashboard (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/dashboard/controllers/dashboard.controller.ts`, `Backend/api/dashboard/routes/dashboard.routes.ts`, `Backend/api/index.ts`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE FAZER PRIMEIRO (Dias 1 a 2)**. Disponibiliza a rota de métricas do painel para consumo imediato do front.
* **Requisitos:** RF19, RN04, RNF01
* **Referência Documentação:** RF19 (Painel do Terapeuta), AGENTS.md Seção 6.1
* **Descrição:** Criar módulo isolado de rotas `/api/dashboard/metricas` que agrega em uma única chamada de alta performance: total de sessões realizadas no mês, pacientes ativos vinculados à clínica (**RN04**), catálogo de jogos integrados e alertas clínicos recentes.
* **Critérios de Aceite:**
  * [ ] Resposta **`200 OK`** com payload compatível com `DashboardMetricas`.
  * [ ] Filtragem estrita por `clinica_id` do terapeuta autenticado via token JWT.
  * [ ] Rota documentada no Swagger (`/api/docs`).

---

### Back: Integração e Validação do Fluxo CRUD Real de Pacientes (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/paciente/controllers/paciente.controller.ts`, `Backend/api/paciente/services/paciente.service.ts`
* **Ordem de Execução / Dependência:** **Dias 2 a 3**.
* **Requisitos:** RF06, RF18, RN04, RN05
* **Referência Documentação:** RF06, RN05 (Inalterabilidade e Soft Delete)
* **Descrição:** Validar o ciclo completo de persistência de pacientes disparado a partir da interface React: criação (`POST /api/paciente`), atualização, reativação (`PATCH /:id/reativar`) e exclusão lógica (`DELETE /:id/hard` bloqueado por trigger / soft delete).
* **Critérios de Aceite:**
  * [ ] Criação de paciente persiste no banco Supabase e retorna **`201 Created`**.
  * [ ] Listagem de pacientes retorna apenas registros com `status_ativo = true` para terapeutas comuns.
  * [ ] Tentativa de exclusão física rejeitada em conformidade com **RN05**.

---

### Back: Suporte à Persistência Real de Anotações Clínicas Pós-Sessão (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/anotacao/controllers/anotacao.controller.ts`, `Backend/api/anotacao/services/anotacao.service.ts`
* **Ordem de Execução / Dependência:** **Dias 3 a 4**.
* **Requisitos:** RF16, RF21, RN04, RN05
* **Referência Documentação:** RF16 (Bloco de Anotações), RF21 (Autoria Indelével)
* **Descrição:** Garantir que o endpoint `POST /api/anotacao` persista considerações clínicas associando o `terapeuta_id` extraído do JWT (`req.user.id`), com vínculo à sessão e ao paciente correspondente.
* **Critérios de Aceite:**
  * [ ] Anotação persistida com status **`201 Created`**.
  * [ ] Autoria obrigatória: `terapeuta_id` obtido do token e nunca do corpo da requisição (**RF21**).
  * [ ] Validação de vínculo institucional (**RN04**).

---

### Back: Suíte de Testes de Integração REST e Verificação de Contratos (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/*/test/*.test.ts`
* **Ordem de Execução / Dependência:** **Dias 5 a 6**.
* **Requisitos:** RNF01, RNF07
* **Referência Documentação:** AGENTS.md Seção 3
* **Descrição:** Executar suíte completa de testes no Vitest do backend para certificar que nenhum contrato foi quebrado após a integração fullstack.
* **Critérios de Aceite:**
  * [ ] 100% dos testes do backend passando com sucesso (`npm test`).
  * [ ] Zero vulnerabilidades ou vazamentos de credenciais.
  * [ ] Todos os endpoints retornando status HTTP canônicos do InTEA.

---

### 1.2. Back-end 2 — João Marcos (@JM3L0)

---

### Back: Handshake e Sincronização em Tempo Real no Namespace /sessao (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/core/websocket/sessao.gateway.ts`, `Backend/core/websocket/sessao.manager.ts`
* **Ordem de Execução / Dependência:** **Dias 1 a 3**.
* **Requisitos:** RF10, RF11, RF12, RNF03
* **Referência Documentação:** Contrato 2 (WebSocket Telemetria), Seção 4.3 do PDF
* **Descrição:** Habilitar handshake em tempo real no Socket.IO conectando o Cockpit do terapeuta (`useLiveTelemetry`) e o tablet do paciente através do `session_token` ativo, emitindo confirmação de conexão e eventos de início de partida.
* **Critérios de Aceite:**
  * [ ] Notificação instantânea de dispositivo conectado para a interface web.
  * [ ] Transição automática do status da sessão para `em_andamento` no banco.
  * [ ] Suporte a múltiplos observadores simultâneos autorizados.

---

### Back: Transmissão Contínua de Telemetria e Ingestão de Lotes (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/api/telemetria/services/telemetria.service.ts`, `Backend/core/websocket/telemetria.events.ts`
* **Ordem de Execução / Dependência:** **Dias 2 a 4**.
* **Requisitos:** RF12, RF13, RN01, RNF05
* **Referência Documentação:** RF13, RN01 (Modo Livre sem Prontuário)
* **Descrição:** Garantir o streaming e persistência assíncrona dos lotes de telemetria emitidos pelo game terapêutico, repassando os dados em tempo real para os gráficos SVG do Cockpit clínico.
* **Critérios de Aceite:**
  * [ ] Ingestão com taxa de amostragem de até 20 eventos/s sem travamento.
  * [ ] Persistência em tabela de telemetria para sessões clínicas e descarte para modo livre (**RN01**).
  * [ ] Latência fim-a-fim inferior a 100ms.

---

### Back: Integração do Endpoint de Síntese do Agente de IA com a Tela de Resultados (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/api/sessao/services/sessao_ia_analise.service.ts`, `Backend/api/sessao/routes/sessao.routes.ts`
* **Ordem de Execução / Dependência:** **Dias 3 a 5**.
* **Requisitos:** RF14, RF17, Contrato 4
* **Referência Documentação:** Contrato 4 (Síntese Analítica da IA)
* **Descrição:** Integrar a chamada `GET /api/sessao/:id/resultado` conectando a síntese de IA gerada na finalização da sessão ao consumo da Tela de Resultados no frontend.
* **Critérios de Aceite:**
  * [ ] Síntese analítica retornada com precisão no schema do Contrato 4.
  * [ ] Retorno de HTTP 400 se a sessão ainda não estiver no status `finalizada`.
  * [ ] Resposta em tempo inferior a 500ms para consultas já consolidadas.

---

### Back: Testes de Carga e Concorrência de Conexões WebSocket (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/core/test/websocket_concorrencia.test.ts`
* **Ordem de Execução / Dependência:** **Dias 5 a 6**.
* **Requisitos:** RNF03, RNF05
* **Referência Documentação:** RNF03 (Desempenho), RNF05 (Confiabilidade)
* **Descrição:** Testar múltiplos sockets simultâneos conectando e desconectando com simulação de perda de pacotes para comprovar a resiliência do ecossistema.
* **Critérios de Aceite:**
  * [ ] Zero deadlocks sob carga concorrente.
  * [ ] Protocolo de reconexão de 60s validado.
  * [ ] Liberação adequada de recursos após término de sessões.

---

### 1.3. Front-end 1 — Hermeson Alves (@Hermeson69)

---

### Front: Integração da Autenticação Real e Contexto do Terapeuta (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/autenticacao/services/auth.service.ts`, `Frontend/src/layout/SidebarLayout.tsx`
* **Ordem de Execução / Dependência:** **Dias 1 a 2**.
* **Requisitos:** RF21, RNF06
* **Referência Documentação:** RF21, AGENTS.md Seção 6.1
* **Descrição:** Conectar o login e recuperação de sessão ao endpoint real `/api/auth/login`, armazenando o token JWT de forma segura e preenchendo automaticamente o nome, CRM/registro e foto do terapeuta logado na TopAppBar e SidebarLayout.
* **Critérios de Aceite:**
  * [ ] Autenticação bem-sucedida armazena token e popula store de autenticação.
  * [ ] Redirecionamento automático para login em caso de expiração (HTTP 401).
  * [ ] Saudação personalizada com o nome real do terapeuta no cabeçalho.

---

### Front: Conexão Real dos Serviços do Dashboard com a API Backend (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/painel/services/dashboard.service.ts`, `Frontend/src/pages/PainelPage.tsx`
* **Ordem de Execução / Dependência:** **Dias 2 a 3 (Faz após Card 1.1.1 de Marcos)**.
* **Requisitos:** RF19, RNF01
* **Referência Documentação:** RF19, Figma Dashboard (57:190)
* **Descrição:** Configurar `dashboard.service.ts` para consumir a API real `/api/dashboard/metricas` quando `VITE_USE_MOCK_DATA=false`, exibindo contadores reais de sessões, pacientes ativos e alertas.
* **Critérios de Aceite:**
  * [ ] Quando `VITE_USE_MOCK_DATA=false`, dados reais do banco são exibidos.
  * [ ] Quando `VITE_USE_MOCK_DATA=true`, dados mock de `bdmock.ts` são mantidos.
  * [ ] Transição sem flicker visual com skeletons durante o carregamento.

---

### Front: Integração do Módulo de Pacientes com os Endpoints REST Reais (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/paciente/services/paciente.service.ts`, `Frontend/src/pages/PacientesPage.tsx`
* **Ordem de Execução / Dependência:** **Dias 3 a 4**.
* **Requisitos:** RF06, RN04, RN05
* **Referência Documentação:** RF06, RN04, RN05
* **Descrição:** Conectar a listagem, cadastro e busca de pacientes aos endpoints `/api/paciente`, suportando paginação, filtros e tratamento de erros (ex: duplicidade de CPF ou falta de vínculo).
* **Critérios de Aceite:**
  * [ ] Pacientes cadastrados no front são salvos no banco PostgreSQL Supabase.
  * [ ] Listagem sincronizada com os dados reais da clínica.
  * [ ] Mensagens amigáveis de erro (toast) em caso de falha de conexão.

---

### Front: Conexão da Tela de Resultados ao Endpoint Consolidado e Exportação (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/services/sessao.service.ts`, `Frontend/src/pages/ResultadoSessaoPage.tsx`
* **Ordem de Execução / Dependência:** **Dias 4 a 5**.
* **Requisitos:** RF14, RF16, RF20, RN01, RN04
* **Referência Documentação:** RF14, RF20, Contrato 4
* **Descrição:** Integrar a página de resultados para buscar dados consolidados em `/api/sessao/:id/resultado` e despachar novas anotações para `/api/anotacao`, mantendo suporte a exportação de laudo em PDF.
* **Critérios de Aceite:**
  * [ ] Dados reais de métricas e IA exibidos para sessões finalizadas reais.
  * [ ] Anotações salvas e associadas ao prontuário do paciente com autoria.
  * [ ] Comportamento de Modo Livre suprimindo dados de prontuário (**RN01**).

---

### 1.4. Front-end 2 — Luma Maiara (@lumamaiara)

---

### Front: Integração do Catálogo de Jogos com Validação de Tipagem (RN02) (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/jogos/services/jogos.service.ts`, `Frontend/src/pages/BibliotecaJogosPage.tsx`
* **Ordem de Execução / Dependência:** **Dias 1 a 3**.
* **Requisitos:** RF09, RN01, RN02
* **Referência Documentação:** RF09, RN02 (Tipagem Estrita sem Fallback)
* **Descrição:** Conectar a página de jogos ao endpoint `/api/jogos`, validando que cada jogo exibe apenas métricas com tipo explícito no manifesto do jogo.
* **Critérios de Aceite:**
  * [ ] Catálogo carregado a partir do banco de dados quando mock estiver desativado.
  * [ ] Botão "Modo Livre" aciona partida com `paciente_id = null` (**RN01**).
  * [ ] Botão "Iniciar Sessão" abre modal de pré-sessão associado ao jogo.

---

### Front: Integração Reativa de Telemetria no Cockpit via Socket.IO (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/hooks/useLiveTelemetry.ts`, `Frontend/src/features/sessao/pages/CockpitSessaoPage.tsx`
* **Ordem de Execução / Dependência:** **Dias 2 a 4**.
* **Requisitos:** RF12, RF13, RNF05
* **Referência Documentação:** RF12, RF13 (Cockpit Clínico)
* **Descrição:** Ligar o hook `useLiveTelemetry` ao servidor WebSocket em `VITE_WS_URL/sessao`, atualizando os cartões de telemetria, diagnóstico de bateria/latência do tablet e sparklines em tempo real.
* **Critérios de Aceite:**
  * [ ] Conexão estabelecida com sucesso com o servidor Socket.IO.
  * [ ] Gráficos atualizam a cada pacote de telemetria recebido.
  * [ ] Indicador visual de status de conexão (Conectado / Desconectado).

---

### Front: Alternância Dinâmica de Mocks e Resiliência de Falhas (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/core/api/http-client.ts`, `Frontend/src/shared/utils/request.ts`
* **Ordem de Execução / Dependência:** **Dias 3 a 5**.
* **Requisitos:** RNF01, RNF04
* **Referência Documentação:** AGENTS.md Seção 3 e 4
* **Descrição:** Garantir que todos os serviços consumam a chave `VITE_USE_MOCK_DATA`: se a API estiver fora do ar no modo real, registrar log de aviso e acionar fallback gracioso sem quebrar a tela do usuário.
* **Critérios de Aceite:**
  * [ ] Zero telas brancas ou erros não tratados na interface.
  * [ ] Fallback transparente para `bdmock.ts` quando a API real estiver indisponível.
  * [ ] Log claro no console indicando a fonte dos dados (API real vs mock).

---

### Front: Suíte de Testes End-to-End e Não-Regressão da Integração (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/**/__test__/*.test.ts`, `Frontend/src/**/__test__/*.test.tsx`
* **Ordem de Execução / Dependência:** **Dias 5 a 6**.
* **Requisitos:** RNF01, RNF07
* **Referência Documentação:** AGENTS.md Seção 3
* **Descrição:** Executar a bateria de testes automatizados do Vitest garantindo 100% de aprovação após a unificação da camada de serviços e hooks.
* **Critérios de Aceite:**
  * [ ] 100% dos testes passando no Vitest do frontend.
  * [ ] Zero quebras em testes de componentes ou serviços.
  * [ ] Validação estrita de tipos TypeScript (zero `any`).

---

### 1.5. Documentação / Qualidade — Raildom Silva (@Raildom)

---

### Docs: Relatório de Auditoria Fullstack e Matriz de Integração de Endpoints (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** `docs/auditoria_fullstack_integracao.md`
* **Ordem de Execução / Dependência:** **Dias 1 a 2**.
* **Requisitos:** RNF07
* **Referência Documentação:** docs/api-pacientes-jogos.md, docs/architecture.md
* **Descrição:** Mapear a matriz completa de rotas da API REST e eventos WebSocket, relacionando cada rota do Backend com o serviço, hook e página correspondente no Frontend.
* **Critérios de Aceite:**
  * [ ] Matriz exata com status HTTP, parâmetros e payloads de todos os endpoints.
  * [ ] Rastreamento de requisitos (RF, RN, RNF) para cada rota.
  * [ ] Tabela de compatibilidade de contratos entre Back e Front.

---

### Docs: Atualização da Especificação OpenAPI/Swagger (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** `docs/api-pacientes-jogos.md`, `Backend/src/server.ts`
* **Ordem de Execução / Dependência:** **Dias 2 a 3**.
* **Requisitos:** RNF07
* **Referência Documentação:** OpenAPI 3.0, Swagger UI
* **Descrição:** Atualizar a documentação interativa da API no Swagger UI (`/api/docs`) e o documento mestre markdown com as rotas de resultados, anotações e telemetria.
* **Critérios de Aceite:**
  * [ ] Swagger acessível e sem erros de sintaxe em `/api/docs`.
  * [ ] Exemplos de request e response atualizados para todos os endpoints.
  * [ ] Documentação de autenticação Bearer JWT no Swagger.

---

### Docs: Casos de Testes Manuais Integrados E2E CT-S31 a CT-S38 (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** `docs/roteiro-testes.md`
* **Ordem de Execução / Dependência:** **Dias 4 a 5**.
* **Requisitos:** RF06, RF10, RF12, RF14, RF16, RF20, RN01..RN05
* **Referência Documentação:** Casos de Teste do InTEA
* **Descrição:** Elaborar os 8 casos de teste manuais de integração de ponta a ponta: login, criação de paciente no banco, seleção de jogo, geração de token de pareamento, streaming de telemetria, encerramento de sessão, consulta de resultados consolidados e exportação de relatório.
* **Critérios de Aceite:**
  * [ ] Roteiro detalhado com pré-condições, passos de execução e resultados esperados.
  * [ ] Cobertura de cenários de sucesso e caminhos de exceção (ex: 403 por vínculo).
  * [ ] Critérios desmarcados (`[ ]`) para validação pelo usuário.

---

### Docs: Relatório de Fechamento da Sprint 12 em LaTeX e Governança (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** `docs/relatorio_sprint_12.tex`, `docs/DocsSprints/visao_geral.md`
* **Ordem de Execução / Dependência:** **Dias 5 a 6**.
* **Requisitos:** RNF07
* **Referência Documentação:** Projeto_de_InTEA.pdf, AGENTS.md Seção 5
* **Descrição:** Redigir o capítulo de integração fullstack do InTEA no relatório acadêmico LaTeX e atualizar o status de todas as sprints no Hub Geral de Tarefas.
* **Critérios de Aceite:**
  * [ ] Capítulo LaTeX estruturado com retrospectiva da integração.
  * [ ] Matriz de navegação em `visao_geral.md` atualizada.
  * [ ] Conformidade integral com as regras de pareamento e qualidade.
