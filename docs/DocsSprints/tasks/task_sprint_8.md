# Cards de Tarefas — Sprint 8: Pareamento Remoto e Testes Prévios

> **Sprint:** 8  
> **Período:** 24/09/2026 a 01/10/2026  
> **Tema Central:** Pareamento Remoto e Testes Prévios  
> **Documento Mestre:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf)  
> **Diretrizes e Regras:** [AGENTS.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/AGENTS.md)  
> **Hub de Tarefas Geral:** [visao_geral.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/visao_geral.md)  

---

## 1. Cards Principais da Sprint 8

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

### Back: Gerador de Session Token Seguro e Amigável (Tipo: Feature)

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

### Back: Endpoint de Handshake de Pareamento Remoto (Tipo: Feature)

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

## 2. Cards Extras (Autenticação, Segurança e Auditoria — Não Atribuídos)

> [!NOTE]
> Estes cards representam **3 grandes frentes fundamentais fora do cronograma linear de sprints** (Autenticação Avançada, Blindagem de Segurança e Auditoria/SuperAdmin).  
> **Não possuem responsável atribuído na Sprint 8** e servem como backlog estratégico de reforço arquitetural para os membros que concluírem suas tarefas antecipadamente.
> *Nota de Auditoria:* A auditoria de sessões clínicas foi adiantada e entregue na Sprint 9 (Card 1.3 - `007_auditoria_sessao.sql`). A auditoria de acesso direto a prontuário médico (`auditoria_acesso`) permanece neste backlog extra.

---

### Back: Mecanismo de Refresh Token com Rotação Automática (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Backend/core/auth/auth.service.ts`, `Backend/core/auth/auth.controller.ts`, `Backend/core/auth/auth.routes.ts`, `Backend/core/auth/token.service.ts`
* **Ordem de Execução / Dependência:** Independente (Backlog Arquitetural).
* **Requisitos:** RF03, RNF03
* **Referência Documentação:** RF03 (Controle de Acesso via Refresh Token), RNF03
* **Descrição:** Implementar renovação contínua de sessão JWT com rotação estrita de tokens: a cada chamada a `POST /api/auth/refresh`, um novo refresh token é emitido e o anterior é imediatamente invalidado, detectando tentativas de reutilização maliciosa e revogando a árvore da sessão.
* **Critérios de Aceite:**
  * [ ] Rota `POST /api/auth/refresh` valida o refresh token e emite novo par (access e refresh token) com status HTTP 200.
  * [ ] Reutilização de um refresh token já consumido revoga toda a árvore de sessões por segurança retornando HTTP 401.
  * [ ] Interceptor no frontend atualiza silenciosamente o token sem interrupção para o terapeuta.

---

### Back: Gestão e Encerramento de Sessões Concorrentes (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Database/migrations/010_sessoes_ativas.sql`, `Backend/core/auth/sessoes-ativas.service.ts`, `Backend/core/auth/auth.controller.ts`
* **Ordem de Execução / Dependência:** Independente (Backlog Arquitetural).
* **Requisitos:** RF02
* **Referência Documentação:** RF02 (Gerenciamento de Sessões Ativas)
* **Descrição:** Criar endpoints e estrutura para controle de dispositivos logados pelo terapeuta, permitindo listar sessões ativas com IP/User-Agent e revogar remotamente acessos suspeitos (`POST /api/auth/logout-all`).
* **Critérios de Aceite:**
  * [ ] Rota `GET /api/auth/sessoes` lista conexões ativas do terapeuta logado com status HTTP 200.
  * [ ] Rota `POST /api/auth/logout-all` desconecta todas as outras sessões ativas com sucesso retornando HTTP 200 ou 204.
  * [ ] Tokens de sessões revogadas são rejeitados imediatamente no middleware de autenticação (HTTP 401).

---

### Back: Fluxo de Recuperação de Senha com Link Mágico Expirável (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Backend/core/auth/recuperacao.service.ts`, `Backend/core/auth/auth.controller.ts`, `Backend/core/mail/mailer.service.ts`
* **Ordem de Execução / Dependência:** Independente (Backlog Arquitetural).
* **Requisitos:** RF01, RNF03
* **Referência Documentação:** RF01, RNF03
* **Descrição:** Disponibilizar fluxo seguro de recuperação de credenciais via e-mail contendo token assinado de uso único com expiração de 30 minutos, impedindo enumeração de usuários na resposta da API.
* **Critérios de Aceite:**
  * [ ] Endpoint `POST /api/auth/recuperar-senha` sempre retorna status 200 genérico para evitar vazamento de existência de e-mail.
  * [ ] Endpoint `POST /api/auth/redefinir-senha` valida token efêmero e aplica nova senha criptografada.
  * [ ] Token de recuperação torna-se inválido imediatamente após o primeiro uso ou após 30 minutos (HTTP 410 Gone).

---

### Back: Rate Limiting Contra Força Bruta em Autenticação e Pareamento (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Backend/core/middlewares/rate-limit.middleware.ts`, `Backend/core/auth/auth.routes.ts`, `Backend/api/sessao/routes/sessao.routes.ts`
* **Ordem de Execução / Dependência:** Independente (Backlog Arquitetural).
* **Requisitos:** RNF03 (Segurança)
* **Referência Documentação:** RNF03
* **Descrição:** Aplicar limitação de taxa de requisições (`express-rate-limit`) nas rotas REST de login e pareamento de sessão, bloqueando ataques de força bruta direcionados a senhas de terapeutas e adivinhação de PINs de jogos.
* **Critérios de Aceite:**
  * [ ] Limite de no máximo 5 tentativas de login por IP a cada 15 minutos (retorno HTTP 429 Too Many Requests).
  * [ ] Limite de checagem de PIN no endpoint de pareamento `/api/sessao/parear` contra enumeração exaustiva.
  * [ ] Resposta com header `Retry-After` informando tempo restante de bloqueio em conformidade com padrões de segurança.

---

### BD/Back: Anonimização e Criptografia em Repouso de Dados Sensíveis LGPD (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Backend/core/security/crypto.service.ts`, `Backend/api/pacientes/services/paciente.service.ts`, `Database/migrations/011_criptografia_prontuario.sql`
* **Ordem de Execução / Dependência:** Independente (Backlog Arquitetural).
* **Requisitos:** RNF06 (LGPD), RN04
* **Referência Documentação:** RNF06, RN04
* **Descrição:** Implementar rotinas de anonimização de identificadores em logs da aplicação e criptografia simétrica (AES-256-GCM) em repouso para campos altamente sensíveis de prontuário, laudos médicos e histórico de gatilhos.
* **Critérios de Aceite:**
  * [ ] Logs da aplicação nunca imprimem CPF, telefone ou nome completo em texto claro.
  * [ ] Campos sensíveis armazenados cifrados no banco e decifrados apenas na camada de serviço autorizada.
  * [ ] Conformidade comprovada com diretrizes da LGPD para proteção de dados clínicos de pessoas atípicas.

---

### Back: Middleware de Headers de Segurança HTTP e Proteção CSRF/CORS (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Backend/core/middlewares/security-headers.middleware.ts`, `Backend/index.ts`
* **Ordem de Execução / Dependência:** Independente (Backlog Arquitetural).
* **Requisitos:** RNF03
* **Referência Documentação:** RNF03
* **Descrição:** Configurar proteção avançada de rede no backend utilizando `helmet` (HSTS, Content Security Policy restritiva, bloqueio de clickjacking via `X-Frame-Options: DENY`) e validação estrita de origens confiáveis no CORS.
* **Critérios de Aceite:**
  * [ ] Headers de proteção presentes em 100% das respostas HTTP da API.
  * [ ] Requisições com origens não autorizadas no CORS são bloqueadas com erro seguro de rede.
  * [ ] Bloqueio de injeção em iframes externos para proteção de telas clínicas.

---

### BD/Back: Trilha de Auditoria de Acessos ao Prontuário Médico (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Database/migrations/012_auditoria_prontuario.sql`, `Backend/api/pacientes/middlewares/auditoria-prontuario.middleware.ts`, `Backend/api/auditoria/auditoria-prontuario.service.ts`
* **Ordem de Execução / Dependência:** Independente (Backlog Arquitetural).
* **Requisitos:** RF08, RNF06
* **Referência Documentação:** RF08 (Auditoria de Vínculos e Acessos), RNF06
* **Descrição:** Implementar middleware de auditoria que registra na tabela `auditoria_acesso_prontuario` todo evento de visualização (`GET`), alteração (`PUT`/`PATCH`) ou exclusão lógica (`DELETE`) de dados de pacientes, armazenando `terapeuta_id`, `paciente_id`, `ip`, `user_agent` e timestamp imutável.
* **Critérios de Aceite:**
  * [ ] Registro automático em tabela de auditoria a cada consulta a `/api/paciente/:id`.
  * [ ] Imutabilidade dos registros de log garantida por trigger PostgreSQL (bloqueio total de UPDATE e DELETE).
  * [ ] Suporte a consultas de auditoria por período e por terapeuta com status HTTP 200.

---

### Back: Endpoints Administrativos para Gestão Global de Clínicas e Terapeutas (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Backend/api/admin/controllers/admin.controller.ts`, `Backend/api/admin/services/admin.service.ts`, `Backend/api/admin/routes/admin.routes.ts`
* **Ordem de Execução / Dependência:** Independente (Backlog Arquitetural).
* **Requisitos:** RF07, RF08
* **Referência Documentação:** RF07 (Gestão SuperAdmin), RF08
* **Descrição:** Criar rotas restritas ao papel `is_super_admin` (`/api/admin/clinicas`, `/api/admin/terapeutas`) para gerenciamento institucional de clínicas parceiras, ativação/desativação de contas de profissionais e consulta global de logs de auditoria.
* **Critérios de Aceite:**
  * [ ] Middleware `superAdminMiddleware` bloqueia qualquer terapeuta sem privilégios de SuperAdmin com status HTTP 403 Forbidden.
  * [ ] Rotas de listagem, ativação e desativação institucional de clínicas e terapeutas funcionando com status HTTP 200/204.
  * [ ] Consulta de logs de auditoria consolidada por instituição.

---

### Front: Interface do Painel Administrativo de Auditoria (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Frontend/src/features/admin/pages/AuditoriaAdminPage.tsx`, `Frontend/src/features/admin/components/TabelaAuditoria.tsx`, `Frontend/src/routes/admin.routes.tsx`
* **Ordem de Execução / Dependência:** FAZ DEPOIS DE (Endpoints Administrativos do Back-end).
* **Requisitos:** RF07, RF08
* **Referência Documentação:** RF07, RF08
* **Descrição:** Desenvolver página restrita no frontend (`/admin/auditoria`) com tabela interativa contendo filtros por data, terapeuta e tipo de ação clínica, permitindo aos administradores da clínica fiscalizar a conformidade e os acessos aos prontuários.
* **Critérios de Aceite:**
  * [ ] Rota protegida por guard de rota que restringe acesso apenas a usuários com flag SuperAdmin.
  * [ ] Tabela com busca, paginação e filtros de eventos de auditoria.
  * [ ] Botão de exportação dos logs em formato estruturado (CSV/JSON) para relatórios institucionais.

