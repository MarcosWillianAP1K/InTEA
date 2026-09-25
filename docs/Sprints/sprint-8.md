# Sprint 8 Detalhada: Pareamento Remoto e Testes das Features Prévias

> **Período planejado:** 24/09/2026 a 01/10/2026  
> **Tema da Sprint:** Pareamento Remoto via Session Token e Testes das Features Prévias  
> **Composição da equipe:** 2 Back-end, 2 Front-end, 1 Documentação / Qualidade  
> **Requisitos centrais do PDF:** RF10 (Pareamento Remoto), RF12/RF13 (Ciclo de Sessão), Validação e Regressão de RF06/RF09  

---

## 1. Visão Geral e Contexto

A **Sprint 8** representa o marco fundamental de conexão entre o ecossistema InTEA (painel web do terapeuta) e os dispositivos externos (tablets, computadores touch ou headsets de Realidade Virtual onde os pacientes executam os jogos terapêuticos).

Conforme estabelecido no cronograma oficial e nos diagramas de sequência e atividade (Figuras 3 e 5 do Projeto InTEA):

1. O terapeuta cria uma sessão no sistema web selecionando o paciente e o jogo desejado.
2. O sistema gera um **`session_token` único e seguro** (código alfanumérico amigável / PIN de 6 caracteres ou QR Code) e aguarda conexão.
3. O jogo no dispositivo remoto envia esse token e realiza o aperto de mão (*handshake*) via HTTP/WebSocket.
4. A interface web do terapeuta detecta o pareamento em tempo real e sinaliza que a intervenção clínica pode começar.
5. Em paralelo, a equipe realiza a bateria de testes de regressão cruzada cobrindo as entregas prévias da Sprint 7 (CRUD de Pacientes, Vínculos Multiterapeuta e Catálogo de Jogos com Tipagem Estrita RN02).

### Distribuição de Papéis

| Papel | Foco Principal na Sprint 8 |
| :--- | :--- |
| **Back-end 1** | Ciclo de vida da sessão remota, geração de `session_token`, persistência e tabela `sessao` |
| **Back-end 2** | Endpoints de handshake de pareamento, WebSocket gateway e testes automatizados de sessão |
| **Front-end 1** | Modal de configuração pré-sessão, exibição do `session_token` (PIN/QR Code) e status de conexão |
| **Front-end 2** | Cliente WebSocket para atualização reativa de estado, disparo de pareamento na Biblioteca e CI |
| **Documentação / Qualidade** | Seção 7.8 do Relatório Oficial (LaTeX), casos de teste de pareamento, evidências e homologação prévia |

---

## 2. Detalhamento de Tarefas por Responsável (Sprint 8 Oficial)

### 2.1 Back-end 1: Sessão e Geração de Tokens

| ID | Card da Tarefa (GitHub Projects) | Detalhe Técnico | Requisito / Regra |
| :--- | :--- | :--- | :--- |
| **1.1** | `Back: Migration e Model da Tabela de Sessões (Tipo: Feature)` | Criar tabela `sessao` no banco com chaves estrangeiras (`paciente_id`, `terapeuta_id`, `jogo_id`), `session_token` único com índice, status do pareamento e timestamps. | **RF10**, **RF12** |
| **1.2** | `Back: Gerador de Session Token Seguro e Amigável (Tipo: Feature)` | Implementar gerador de tokens efêmeros de pareamento (PIN alfanumérico de 6 a 8 caracteres, sem ambiguidades de caracteres como `O` e `0`, `I` e `1`), com tempo de expiração configurável (ex: 15 minutos). | **RF10**, **RNF03** |
| **1.3** | `Back: Endpoint de Criação de Sessão e Emissão de Token (Tipo: Feature)` | Endpoint `POST /api/sessao/iniciar` que valida terapeuta e paciente vinculado (RN04), instancia a sessão com status `aguardando_pareamento` e devolve o `session_token`. | **RF10**, **RN04** |
| **1.4** | `Back: Validação e Revogação de Token Expirado (Tipo: Validação)` | Lógica para invalidar tokens expirados ou após finalização forçada da sessão, impedindo conexões zumbis de dispositivos externos. | **RF10**, **RNF03** |

---

### 2.2 Back-end 2: Handshake de Pareamento, WebSocket e Testes

| ID | Card da Tarefa (GitHub Projects) | Detalhe Técnico | Requisito / Regra |
| :--- | :--- | :--- | :--- |
| **2.1** | `Back: Endpoint de Handshake de Pareamento Remoto (Tipo: Feature)` | Endpoint `POST /api/sessao/parear` consumido pelo jogo externo contendo `session_token` e metadados do dispositivo, retornando confirmação de pareamento e parâmetros iniciais. | **RF10** |
| **2.2** | `Back: Gateway de WebSocket para Notificação em Tempo Real (Tipo: Feature)` | Configurar namespace/sala no Socket.IO (`/sessao/{session_token}`) notificando a interface web assim que o jogo remoto se conecta com sucesso. | **RF10**, **Fig. 3** |
| **2.3** | `Back: Heartbeat e Detecção de Queda de Conexão Remota (Tipo: Validação)` | Implementar mecanismo de ping/pong para monitorar presença do dispositivo pareado e emitir evento de reconexão ou perda de sinal. | **RF10**, **RNF04** |
| **2.4** | `Back: Testes Automatizados de Pareamento e Regressão da Sprint 7 (Tipo: Validação)` | Testes de integração cobrindo fluxo feliz de pareamento, rejeição de token inválido/expirado e garantia de não-regressão de pacientes e jogos no Vitest. | **Qualidade** |

---

### 2.3 Front-end 1: Interface de Pré-Sessão e Pareamento

| ID | Card da Tarefa (GitHub Projects) | Detalhe Técnico | Referência na Documentação |
| :--- | :--- | :--- | :--- |
| **3.1** | `Front: Modal de Configuração Pré-Sessão (Tipo: Feature)` | Interface modal acionada na biblioteca de jogos para seleção do paciente atendido e parâmetros iniciais de sessão. | **Fig. 11**, **Fig. 10** |
| **3.2** | `Front: Componente Visual de Exibição do Token de Pareamento (Tipo: Feature)` | Componente para exibição destacada do PIN de pareamento (letras/números legíveis em bloco, botão de cópia rápida e suporte a renderização de QR Code). | **Fig. 11**, **RF10** |
| **3.3** | `Front: Indicador de Status de Pareamento em Tempo Real (Tipo: Feature)` | Badge/alerta animado na tela indicando "Aguardando dispositivo...", "Pareando..." e "Dispositivo Conectado com Sucesso", habilitando botão de início do jogo. | **RF10** |
| **3.4** | `Front: Cancelamento e Timeout de Pareamento na UI (Tipo: Validação)` | Opção para cancelar a sessão pendente ou solicitar novo código caso o token expire sem conexão remota. | **RF10** |

---

### 2.4 Front-end 2: Conexão em Tempo Real e Integração

| ID | Card da Tarefa (GitHub Projects) | Detalhe Técnico | Referência na Documentação |
| :--- | :--- | :--- | :--- |
| **4.1** | `Front: Integração do Cliente WebSocket / Socket.IO (Tipo: Feature)` | Configurar hook e provider `useSessionSocket` em `core/web.socket.ts` com gerenciamento de canal e reconexão automática. | `core/web.socket.ts` |
| **4.2** | `Front: Store Reativa de Sessão e Pareamento (Tipo: Feature)` | Criar `features/sessao/store/sessionStore.ts` gerenciando o ciclo de vida do token, paciente ativo e status do pareamento. | `features/sessao/` |
| **4.3** | `Front: Integração do Fluxo "Iniciar Sessão" na Biblioteca de Jogos (Tipo: Feature)` | Conectar o card do jogo na página de biblioteca para disparar a abertura do modal de pareamento com o ID do jogo selecionado. | **Fig. 10**, **RF09** |
| **4.4** | `Front: Testes de Componentes e Validação no Vitest (Tipo: Validação)` | Escrever testes unitários para o modal de pareamento, renderização do PIN e comportamento dos estados reativos. | **Sprint 6/7** |

---

### 2.5 Documentação e Qualidade

| ID | Card da Tarefa (GitHub Projects) | Detalhe Técnico | Onde Entra |
| :--- | :--- | :--- | :--- |
| **5.1** | `Docs: Seção 7.8 do Relatório Oficial LaTeX (Tipo: Docs)` | Redigir texto formal da Sprint 8: arquitetura de pareamento, decisões sobre session tokens, protocolo de comunicação e dificuldades superadas. | Relatório LaTeX |
| **5.2** | `Docs: Especificação OpenAPI dos Endpoints de Sessão (Tipo: Docs)` | Documentar no Swagger as rotas `/api/sessao/iniciar` e `/api/sessao/parear` com DTOs, schemas de resposta e códigos de erro (400, 401, 404, 410). | Swagger UI |
| **5.3** | `Docs: Roteiro de Testes Manuais de Pareamento Remoto (Tipo: Validação)` | Elaborar casos de teste formais (CT-S01 a CT-S06) cobrindo conexão bem-sucedida, token expirado, token incorreto e desconexão abrupta. | `roteiro-testes.md` |
| **5.4** | `Docs: Coleta de Evidências e Capturas de Pareamento (Tipo: Docs)` | Coletar capturas de tela do modal de pareamento, logs do WebSocket e requisições no Postman para inclusão no relatório. | Relatório LaTeX |

---

## 3. Cronograma da Sprint 8

| Período | Back-end | Front-end | Documentação |
| :--- | :--- | :--- | :--- |
| **Dia 1 (Todos)** | Alinhamento do formato do `session_token` e protocolo de handshake | Alinhamento do fluxo visual e eventos do WebSocket | Especificação inicial do contrato de pareamento |
| **Dias 2 a 4** | Migration de `sessao`, geração de token e gateway de WebSocket | Modal pré-sessão, exibição do PIN e store reativa | Swagger de sessão e redação preliminar da Seção 7.8 |
| **Dia 5** | Teste de integração de ponta a ponta (Web ↔ API ↔ Dispositivo Simulado) | Conexão do front com eventos reais de pareamento | Captura de evidências de pareamento em tempo real |
| **Dias 6 e 7** | Testes de regressão das features da Sprint 7 e carga | Testes unitários com Vitest e refinamento de UX | Roteiro de testes de pareamento e fechamento LaTeX |

---

## 4. Matriz de Dependências

| Quem Depende | De Quem | Estratégia de Mitigação |
| :--- | :--- | :--- |
| **Front: Modal de Pareamento** | Back: Rota de Iniciar Sessão | Utilizar mock com timeout simulando geração de token no primeiro dia. |
| **Front: Status em Tempo Real** | Back: Gateway WebSocket | Simular disparo de evento socket no cliente via botão de teste manual. |
| **Jogos Externos (Tablet/VR)** | Back: Handshake de Pareamento | Disponibilizar script curl/Postman rápido de simulação de jogo pareando. |
| **Documentação** | Todos os desenvolvedores | Acompanhar logs de pull request e registrar evidências contínuas. |

---

## 5. Cards Extras (Backlog de Adiantamento — Não Atribuídos)

> [!NOTE]
> Os cards abaixo contemplam **3 grandes frentes críticas fora do cronograma linear de sprints** (Autenticação Avançada, Segurança Clínica e Auditoria/SuperAdmin).  
> **Eles não possuem responsável fixo atribuído na Sprint 8**, ficando disponíveis no quadro do GitHub para quem adiantar suas demandas principais ou para o Tech Lead puxar.

### Bloco A — Autenticação Robusta & Renovação de Sessão (RF01, RF02, RF03)

| ID | Card da Tarefa (GitHub Projects) | Detalhe Técnico | Requisito |
| :--- | :--- | :--- | :--- |
| **E1.1** | `Back: Mecanismo de Refresh Token com Rotação Automática (Tipo: Feature)` | Implementar rotação estrita de tokens JWT: a cada renovação em `/api/auth/refresh`, um novo par de access/refresh token é gerado e o anterior é revogado para evitar replay attack. | **RF03**, **RNF03** |
| **E1.2** | `Back: Gestão e Encerramento de Sessões Concorrentes (Tipo: Feature)` | Endpoint `POST /api/auth/logout-all` e controle de múltiplas sessões ativas do mesmo terapeuta, invalidando tokens anteriores ao logar em novo dispositivo se configurado. | **RF02** |
| **E1.3** | `Back: Fluxo de Recuperação de Senha com Link Mágico Expirável (Tipo: Feature)` | Endpoint e serviço de envio de e-mail seguro para redefinição de senha com token temporário de uso único (expiração de 30 minutos). | **RF01**, **RNF03** |

### Bloco B — Segurança Clínica, Proteção de Dados e LGPD (RNF03, RNF06, RN04)

| ID | Card da Tarefa (GitHub Projects) | Detalhe Técnico | Requisito |
| :--- | :--- | :--- | :--- |
| **E2.1** | `Back: Rate Limiting Contra Força Bruta em Autenticação e Pareamento (Tipo: Validação)` | Aplicar limitador de requisições (`express-rate-limit`) nas rotas sensíveis: máximo de 5 tentativas de login por minuto e limite de checagem de PIN no pareamento. | **RNF03** |
| **E2.2** | `BD/Back: Anonimização e Criptografia em Repouso de Dados Sensíveis LGPD (Tipo: Validação)` | Mascaramento de CPF nos logs da aplicação e criptografia de campos sensíveis de anamnese/laudo em repouso no banco de dados. | **RNF06** |
| **E2.3** | `Back: Middleware de Headers de Segurança HTTP e Proteção CSRF/CORS (Tipo: Validação)` | Configurar `helmet` no Express com CSP restritivo, headers `X-Frame-Options: DENY`, `Strict-Transport-Security` e validação estrita de origens no CORS. | **RNF03** |

### Bloco C — Gestão Administrativa, SuperAdmin e Auditoria (RF07, RF08)

| ID | Card da Tarefa (GitHub Projects) | Detalhe Técnico | Requisito |
| :--- | :--- | :--- | :--- |
| **E3.1** | `BD/Back: Trilha de Auditoria de Acessos ao Prontuário Médico (Tipo: Feature)` | Middleware automático que grava em tabela de log (`auditoria_acesso`) toda visualização ou edição de paciente (quem acessou, IP, data e motivo). | **RF08**, **RNF06** |
| **E3.2** | `Back: Endpoints Administrativos para Gestão Global de Clínicas e Terapeutas (Tipo: Feature)` | Rotas exclusivas de SuperAdmin (`/api/admin/terapeutas`, `/api/admin/clinicas`) para ativação, bloqueio preventivo e auditoria institucional de clínicas. | **RF07** |
| **E3.3** | `Front: Interface do Painel Administrativo de Auditoria (Tipo: Feature)` | Página restrita no frontend para visualização em tabela dos eventos de auditoria e status de conformidade da clínica. | **RF07**, **RF08** |

---

## 6. Recomendações do Tech Lead / Arquiteto Sênior

* **Formato do Session Token:** O código de pareamento deve ser curto (ex: 6 dígitos `ABC-123` ou código numérico) para permitir digitação rápida em tablets infantis sem fricção de usabilidade.
* **Segurança do Handshake:** O session token deve expirar imediatamente após ser consumido com sucesso, estabelecendo uma sessão persistente com ID interno.
* **Isolamento de Estado:** A biblioteca de componentes já consolidada na Sprint 7 deve ser reutilizada no modal de pré-sessão (`Dialog`, `Button`, `Input`, `Badge`), mantendo o design system padronizado.
* **Regressão Verde:** Não iniciar novas implementações sem garantir que a suíte de 228 testes da Sprint 7 permaneça 100% aprovada.
