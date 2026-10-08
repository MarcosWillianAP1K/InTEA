# Cards de Tarefas — Sprint 9: Gestão de Sessão Terapêutica e Telemetria em Tempo Real

> **Sprint:** 9  
> **Período:** 01/10/2026 a 08/10/2026  
> **Tema Central:** Gestão de Sessão Terapêutica e Telemetria em Tempo Real  
> **Documento Mestre:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf)  
> **Diretrizes e Regras:** [AGENTS.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/AGENTS.md)  
> **Hub de Tarefas Geral:** [visao_geral.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/visao_geral.md)  

---

## 1. Cards por Integrante (20 Cards Principais)

> [!IMPORTANT]
> **Protocolo Anti-Conflito da Equipe InTEA (Lição Aprendida da Sprint 8):**  
> Na Sprint 8, ocorreram conflitos graves de merge porque dois desenvolvedores do backend alteraram simultaneamente os mesmos arquivos (`sessao.routes.ts`, `sessao.controller.ts`, `sessao.model.ts`).  
> Para a Sprint 9, **a fronteira de arquivos é estritamente demarcada**:
> 1. **Fronteira de Arquivos Exclusiva:** Nenhum desenvolvedor pode alterar arquivos fora da sua lista de arquivos autorizados.
> 2. **Ordem Sequencial Obrigatória:** Onde houver dependência funcional (ex: persistência no WebSocket ou componentes no Cockpit), a pessoa indicada como **DEVE FAZER PRIMEIRO** entrega e faz PR antes da integração do segundo.
> 3. **Isolamento por Módulos:** Novos módulos devem ser criados em pastas dedicadas (`api/telemetria/`, `components/telemetria/`, `socket.limiter.ts`).

---

### 1.1. Back-end 1 — Marcos Willian (@MarcosWillianAP1K)

---

### Back: Endpoint de Encerramento e Sumarização da Sessão (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/sessao/controllers/sessao.controller.ts`, `Backend/api/sessao/routes/sessao.routes.ts`, `Backend/api/sessao/services/sessao-finalizar.service.ts`
* **Ordem de Execução / Dependência:** **Independente (Dia 4)**. Focado exclusivamente na finalização REST e sumarização analítica. Não toca em WebSocket nem em tabelas de telemetria.
* **Requisitos:** RF13, RF17, RN05
* **Referência Documentação:** Seção 7.9, RF13, RF17
* **Descrição:** Desenvolver o endpoint `POST /api/sessao/:id/finalizar` para encerramento clínico da sessão ativa. O endpoint consolida a duração total, computa sumarização inicial dos eventos de telemetria recebidos, persiste o status `finalizada` com timestamp `fim_sessao` e calcula métricas agregadas preliminares.
* **Critérios de Aceite:**
  * [ ] Transição segura de status de `conectado` para `finalizada`.
  * [ ] Bloqueio de novas mensagens de telemetria no WebSocket para sessões finalizadas.
  * [ ] Cálculo e persistência dos dados consolidados (duração, contadores e sumário).
  * [ ] Cumprimento estrito de RN05 (nenhum dado histórico é removido).

---

### BD/Back: Ingestão e Persistência de Eventos de Telemetria (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Database/migrations/003_telemetria_e_auditoria.sql`, `Backend/api/telemetria/*` (`telemetria.model.ts`, `telemetria.service.ts`, `telemetria.validator.ts`, `telemetria.dto.ts`)
* **Ordem de Execução / Dependência:** ⚠️ **DEVE FAZER PRIMEIRO (Dias 1 a 3)**. Cria a base de dados e a função `TelemetriaService.persistirLote()`. Deve commitar/abrir PR até o Dia 3 para que João Marcos possa conectar a persistência ao WebSocket no Dia 4.
* **Requisitos:** RF12, RN02, RNF05
* **Referência Documentação:** Seção 7.9, RN02, RF12
* **Descrição:** Criar tabela/model `telemetria_evento` e service para persistência em lote (batch insert) de alta performance dos dados de telemetria clínica transmitidos pelo jogo via WebSocket. A conformidade das métricas é assegurada previamente na validação do manifesto durante o catálogo do jogo.
* **Critérios de Aceite:**
  * [ ] Migration de `telemetria_evento` com índices otimizados por `sessao_id` e `timestamp`.
  * [ ] Ingestão de telemetria com alta performance e baixa latência (stream append-only).

---

### BD/Back: Trilha de Auditoria Clínica de Sessão [Extra] (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Database/migrations/007_auditoria_sessao.sql`, `Database/database.sql`, `Backend/api/auditoria/*` (`auditoria.model.ts`, `auditoria.service.ts`, `auditoria.controller.ts`, `auditoria.routes.ts`), `Backend/api/sessao/controllers/sessao.controller.ts`
* **Ordem de Execução / Dependência:** **Independente (Dia 5)**. Módulo desacoplado de auditoria imutável integrado ao ciclo de vida da sessão.
* **Requisitos:** RF13, RNF06, RN04, RN05
* **Referência Documentação:** RNF06 (LGPD / Segurança), RF13, RN05 (Imutabilidade de Registros Clínicos), RN04 (Vínculo Institucional)
* **Descrição:** Implementar infraestrutura e registro imutável de trilha de auditoria clínica para eventos do ciclo de vida da sessão e intervenções clínicas (pareamento, encerramento, cancelamento e alterações de estado), armazenando metadados de autoria (`terapeuta_id` ou dispositivo), endereço IP, user-agent e timestamps UTC para conformidade estrita com LGPD e rastreabilidade médica.
* **Critérios de Aceite:**
  * [ ] Migration DDL `007_auditoria_sessao.sql` com PK UUID, índices e trigger PostgreSQL garantindo imutabilidade absoluta (bloqueio total de UPDATE e DELETE).
  * [ ] Módulo desacoplado `Backend/api/auditoria/` com model, service, controller e documentação Swagger 3.0.
  * [ ] Instrumentação automática nos métodos de ciclo de sessão (`parear`, `finalizar`, `cancelar`) capturando IP e metadados contextuais.
  * [ ] Endpoint `GET /api/auditoria/sessao/:sessaoId` protegido por vínculo clínico ativo e instituição (RN04 / 403 Forbidden).
  * [ ] Suíte de testes unitários do módulo de auditoria rodando 100% verde no Vitest.

---

### Back: Testes Automatizados de Ciclo de Sessão e Telemetria (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/sessao/test/ciclo_sessao_telemetria.test.ts`
* **Ordem de Execução / Dependência:** **Após 1.1, 1.2 e 1.3 (Dia 6)**. Valida a integração completa de encerramento, telemetria, máquina de estados e trilha de auditoria clínica.
* **Requisitos:** Qualidade de Software, RF10, RF12, RF13, RN01, RN04, RN05
* **Referência Documentação:** Pipeline CI, `roteiro-testes.md`, `architecture.md`
* **Descrição:** Criar suíte completa de testes de integração com Vitest simulando o ciclo de vida ponta a ponta da sessão (criação -> pareamento -> ingestão de telemetria em lote -> consulta de dados -> encerramento -> geração de relatório clínico de IA), cobrindo a máquina de estados (FSM), conformidade estrita com a RN01 (Modo Livre sem persistência clínica) e isolamento por vínculo terapêutico (RN04).
* **Critérios de Aceite:**
  * [ ] Ciclo Clínico Completo: Validação ponta a ponta desde `aguardando_pareamento` até `finalizada`, garantindo persistência de telemetria, geração de logs imutáveis de auditoria e persistência de `relatorio_sessao` com dados de IA.
  * [ ] Ciclo de Modo Livre (RN01): Garantir que sessão sem paciente seja finalizada com sucesso, mas com supressão de gravação de telemetria e sem geração de relatório clínico.
  * [ ] Máquina de Estados e Guardas: Rejeição de telemetria para sessões não ativas (`409 Conflict`), bloqueio de encerramento duplo ou de sessões canceladas/não pareadas (`400 Bad Request`), e bloqueio por vínculo indevido (`403 Forbidden`).
  * [ ] Suíte rodando 100% verde no Vitest sem warnings ou vazamento de conexões.

---

### 1.2. Back-end 2 — João Marcos (@JM3L0)

---

### Back: Roteamento de Telemetria Contínua via WebSocket (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/core/websocket/sessao.gateway.ts`
* **Ordem de Execução / Dependência:** ⚠️ **FAZ DEPOIS DE MARCOS (INTEGRAÇÃO NO DIA 4)**.  
  * *Dias 1 a 3:* Trabalha no streaming WebSocket 100% em memória (recebe do tablet e envia para a sala web do terapeuta via Socket.IO com callbacks desacoplados).  
  * *Dia 4:* Após Marcos commitar a persistência, João importa `TelemetriaService.persistirLote()` e conecta ao evento.  
  * *Zona Proibida:* É **PROIBIDO** editar arquivos em `Backend/api/sessao/controllers/`, `Backend/api/telemetria/` ou migrations SQL.
* **Requisitos:** RF12, RNF04
* **Referência Documentação:** Seção 7.9, Figura 5, RF12
* **Descrição:** Desenvolver o listener Socket.IO `sessao:telemetria` que recebe streams de dados em tempo real enviados pelo jogo remoto no tablet e os roteia instantaneamente para a sala do terapeuta responsável (`sessao:{token}`).
* **Critérios de Aceite:**
  * [ ] Evento `sessao:telemetria` emitido pelo tablet entregue ao painel do terapeuta em sub-100ms.
  * [ ] Payload validado com schema leve antes de encaminhar à sala.
  * [ ] Isolamento estrito de salas por token de sessão sem vazamento entre sessões concorrentes.

---

### Back: Canal de Comandos do Terapeuta para o Jogo Remoto (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/core/websocket/sessao.gateway.ts`
* **Ordem de Execução / Dependência:** **Independente (Dias 2 a 3)**. Trabalha estritamente no canal de eventos Socket.IO para envio de comandos bidirecionais.
* **Requisitos:** RF13, RF21, RNF04
* **Referência Documentação:** RF13, RF21 (Intervenção Manual)
* **Descrição:** Implementar canal de comandos bidirecional via WebSocket (`sessao:comando`) permitindo ao terapeuta enviar ações de controle clínico para o tablet do paciente: `pausar_jogo`, `retomar_jogo`, `ajustar_dificuldade_dda` e `solicitar_encerramento`.
* **Critérios de Aceite:**
  * [ ] Eventos de comando validados e entregues imediatamente ao socket do jogo remoto.
  * [ ] Confirmação de recebimento (ack) retornada à interface web do terapeuta.
  * [ ] Rejeição de comandos se a sessão não estiver com status `conectado`.

---

### Back: Protocolo de Reconexão e Restauração de Sessão Ativa [Extra] (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/core/websocket/sessao.reconnection.ts` (novo módulo isolado)
* **Ordem de Execução / Dependência:** **Independente (Dia 5)**. Arquivo desacoplado gerenciando heartbeat e janela de tolerância de 60 segundos.
* **Requisitos:** RNF04 (Tolerância a Falhas)
* **Referência Documentação:** RNF04, Figura 3
* **Descrição:** Implementar mecanismo resiliente no Socket.IO para tratamento de desconexões transitórias do tablet (queda de Wi-Fi, oscilação de rede). O servidor mantém uma janela de graça de 60 segundos antes de considerar a sessão interrompida, sincronizando o estado e recuperando a sala quando o tablet restabelecer a conexão com o mesmo token.
* **Critérios de Aceite:**
  * [ ] Desconexão transitória emite status de advertência para a web sem derrubar a sessão imediatamente.
  * [ ] Reconexão dentro da janela de graça restaura a transmissão de telemetria sem perda de contexto.
  * [ ] Se o tempo limite expirar, sessão transiciona para estado `interrompida_por_queda`.

---

### Back: Rate Limiting e Prevenção de Flood no WebSocket [Extra] (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/core/websocket/socket.limiter.ts` (novo módulo isolado)
* **Ordem de Execução / Dependência:** **Independente (Dia 3)**. Middleware isolado acoplado no handshake e nos listeners de socket.
* **Requisitos:** RNF03, RNF04
* **Referência Documentação:** RNF03 (Segurança)
* **Descrição:** Implementar controle de taxa (throttling/rate-limiting) por conexão socket para impedir flood de pacotes de telemetria gerados por jogos mal calibrados ou instabilidade de cliente, limitando a frequência máxima de telemetria por segundo (ex: máximo de 20 eventos/segundo por cliente).
* **Critérios de Aceite:**
  * [ ] Middleware de Socket.IO descarta eventos excedentes com log de aviso.
  * [ ] Prevenção de esgotamento de memória e CPU do servidor por flooding.
  * [ ] Teste de carga simulando rajada de telemetria validando contenção estável.

---

### 1.3. Front-end 1 — Hermeson Alves (@Hermeson69)

---

### Front: Cockpit de Monitoramento da Sessão Ativa (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/pages/CockpitSessaoPage.tsx`
* **Ordem de Execução / Dependência:** ⚠️ **INTEGRAÇÃO SEQUENCIAL (Dias 1-3 Slots; Dia 4/5 Importa Luma)**.  
  * *Dias 1 a 3:* Cria a casca da página, rota `/sessao/:id/monitoramento`, cabeçalho do paciente e cronômetro com *slots/placeholders*.  
  * *Dia 4/5:* Importa os componentes prontos de telemetria entregues por Luma Maiara.  
  * *Zona Proibida:* É **PROIBIDO** editar arquivos dentro de `Frontend/src/features/sessao/components/telemetria/`.
* **Requisitos:** RF12, RF17
* **Referência Documentação:** Figura 12 (Cockpit da Sessão), RF12
* **Descrição:** Construir a interface do Cockpit Clínico (`/sessao/:id/monitoramento`) exibida para o terapeuta enquanto a sessão está em andamento. Deve conter cabeçalho com identificação do paciente, jogo em execução, cronômetro de tempo decorrido reativo e status de conexão.
* **Critérios de Aceite:**
  * [ ] Layout moderno e limpo conforme os protótipos de alta fidelidade e design system.
  * [ ] Cronômetro ativo atualizado a cada segundo com precisão.
  * [ ] Badges informativos de paciente, nível DDA atual e status do jogo.

---

### Front: Painel de Controles Clínicos do Terapeuta (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/components/ControlesClinicos.tsx`
* **Ordem de Execução / Dependência:** **Independente (Dias 2 a 3)**. Componente modular isolado na raiz de `components/`.
* **Requisitos:** RF13, RF21
* **Referência Documentação:** RF13, RF21 (Intervenção Manual)
* **Descrição:** Implementar barra de comandos interativa no Cockpit com botões para "Pausar Jogo", "Retomar Jogo", "Ajustar Dificuldade (DDA)" e "Finalizar Sessão", disparando as mensagens correspondentes via Socket.IO para o tablet do paciente com feedback visual imediato.
* **Critérios de Aceite:**
  * [ ] Botões com estados visuais reativos (carregando, desabilitado, ativo).
  * [ ] Envio dos comandos `pausar_jogo` e `retomar_jogo` via socket com toast de confirmação.
  * [ ] Controle deslizante ou seletor de dificuldade DDA manual funcional.

---

### Front: Modal de Confirmação de Finalização de Sessão (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/components/ModalFinalizarSessao.tsx`
* **Ordem de Execução / Dependência:** **Independente (Dia 3)**. Dispara a chamada `POST /api/sessao/:id/finalizar`.
* **Requisitos:** RF13, RF17
* **Referência Documentação:** RF13, RF17, Figura 12
* **Descrição:** Criar modal acessível de encerramento de sessão, exigindo confirmação explícita do terapeuta antes de fechar a sessão, exibindo um resumo rápido do tempo decorrido e campo para anotação clínica preliminar antes de navegar para a tela de resultados.
* **Critérios de Aceite:**
  * [ ] Modal impede encerramento acidental da sessão por clique involuntário.
  * [ ] Campo para anotação clínica rápida opcional do terapeuta.
  * [ ] Disparo da requisição `POST /api/sessao/:id/finalizar` com redirecionamento pós-sucesso.

---

### Front: Testes Unitários e de Renderização do Cockpit (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/__test__/CockpitSessaoPage.test.tsx`, `ControlesClinicos.test.tsx`
* **Ordem de Execução / Dependência:** **Após 3.1 e 3.2 (Dia 6)**. Testa sua própria tela e controles.
* **Requisitos:** Qualidade de Software
* **Referência Documentação:** Pipeline CI, Vitest
* **Descrição:** Desenvolver testes automatizados com Vitest e Testing Library para o Cockpit Clínico, cobrindo renderização dos cabeçalhos, disparo dos botões de controle clínico, comportamento do modal de encerramento e cronômetro.
* **Critérios de Aceite:**
  * [ ] Testes de renderização do Cockpit e dos botões de controle passando 100%.
  * [ ] Cobertura de interação do modal de encerramento testada.
  * [ ] Sem warnings de React ou acessibilidade nos testes.

---

### 1.4. Front-end 2 — Luma Maiara (@lumamaiara)

---

### Front: Componentes de Visualização de Telemetria ao Vivo (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/components/telemetria/TelemetriaCards.tsx`, `TelemetriaChart.tsx`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE ENTREGAR PRIMEIRO (Dias 1 a 3)**.  
  * Constrói os componentes de telemetria isolados em `components/telemetria/` testando com dados mockados.  
  * Entrega no Dia 3/4 para Hermeson importar na página do Cockpit.  
  * *Zona Proibida:* É **PROIBIDO** editar `CockpitSessaoPage.tsx` ou `ControlesClinicos.tsx`.
* **Requisitos:** RF12, RF17
* **Referência Documentação:** Figura 12, RF12, RF17
* **Descrição:** Desenvolver componentes visuais dinâmicos para plotagem de telemetria recebida em tempo real via WebSocket: cards de métricas (acertos, erros, tempo de reação) e gráficos simples/sparklines de evolução contínua da atenção e engajamento.
* **Critérios de Aceite:**
  * [ ] Atualização suave dos dados sem congelamento da interface (`re-render` otimizado).
  * [ ] Tratamento de métricas dinâmicas de acordo com o catálogo e manifesto do jogo ativo.
  * [ ] Empty states informativos quando nenhum dado de telemetria chegou ainda.

---

### Front: Painel de Diagnóstico do Tablet (Bateria, Latência e Sinal) (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/components/telemetria/TabletDiagnosticCard.tsx`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE ENTREGAR PRIMEIRO (Dia 3)**. Componente atômico para compor o cockpit.
* **Requisitos:** RF12, RNF04
* **Referência Documentação:** RF12, RNF04
* **Descrição:** Criar componente na barra lateral ou rodapé do Cockpit que exibe a saúde do dispositivo remoto: indicador de latência do WebSocket (ping/pong em milissegundos), status de sinal de rede e nível de bateria do tablet do paciente.
* **Critérios de Aceite:**
  * [ ] Indicador colorido de latência (verde: <100ms, amarelo: 100-300ms, vermelho: >300ms).
  * [ ] Ícone visual de bateria e sinal atualizados conforme telemetria de sistema.
  * [ ] Alerta em destaque caso a conexão com o tablet sofra interrupção temporária.

---

### Front: Persistência de Sessão e Proteção contra Refresh F5 [Extra] (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/hooks/useSessionPersistence.ts` (novo hook isolado)
* **Ordem de Execução / Dependência:** **Independente (Dia 4)**. Hook modular de hidratação via `sessionStorage` sem modificar a estrutura existente da store.
* **Requisitos:** RNF04, Usabilidade
* **Referência Documentação:** RNF04, Usabilidade
* **Descrição:** Garantir na store Zustand e no ciclo de vida do componente que se o terapeuta recarregar a página (F5) ou navegar acidentalmente no navegador, o estado da sessão ativa seja recuperado de `sessionStorage`/API e a sala do WebSocket seja reconectada sem perder a sessão.
* **Critérios de Aceite:**
  * [ ] Recarregamento com F5 no Cockpit restaura a sessão e retoma o WebSocket transparentemente.
  * [ ] Aviso nativo (`beforeunload`) se o usuário tentar sair da página com sessão em andamento.
  * [ ] Se a sessão foi finalizada em outra aba/dispositivo, redireciona adequadamente.

---

### Front: Testes de Integração de Telemetria e WebSocket (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/__test__/telemetriaComponents.test.tsx`, `useSessionPersistence.test.ts`
* **Ordem de Execução / Dependência:** **Após 4.1 e 4.2 (Dia 5)**. Valida seus próprios componentes com mocks.
* **Requisitos:** Qualidade de Software
* **Referência Documentação:** Pipeline CI, Vitest
* **Descrição:** Criar testes com Vitest simulando o fluxo de chegada de eventos `sessao:telemetria` via mock de Socket.IO, validando a atualização correta dos gráficos, contadores de telemetria e o painel de latência.
* **Critérios de Aceite:**
  * [ ] Teste unitário e de integração dos componentes de telemetria recebendo mocks de dados.
  * [ ] Verificação da persistência e restauração em `sessionStorage`.
  * [ ] Pipeline de testes 100% verde sem assincronia pendente.

---

### 1.5. Documentação / Qualidade — Raildom Silva (@Raildom)

---

### Docs: Seção 7.9 do Relatório Oficial LaTeX (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** Relatório oficial LaTeX (`docs/*.tex` ou pasta de relatórios)
* **Ordem de Execução / Dependência:** **Dias 5 a 6**. Redação acadêmica após consolidação das entregas de código.
* **Requisitos:** Padrão Acadêmico UFPI
* **Referência Documentação:** Seção 7.9 do Projeto InTEA
* **Descrição:** Escrever o capítulo oficial da Sprint 9 no documento acadêmico em LaTeX: arquitetura de telemetria em tempo real, protocolo WebSocket com Socket.IO, regras de persistência (RN01 e RN02) e retrospectiva da sprint.
* **Critérios de Aceite:**
  * [ ] Arquivo LaTeX compilando sem falhas e sem referências quebradas.
  * [ ] Documentação dos diagramas de fluxo de telemetria e comandos de sessão.
  * [ ] Rastreabilidade formal com os requisitos RF12, RF13, RF17 e RF21.

---

### Docs: Especificação OpenAPI dos Endpoints de Telemetria e Encerramento (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** `docs/api-pacientes-jogos.md`, Swagger UI
* **Ordem de Execução / Dependência:** **Dias 3 a 4**. Baseia-se nos contratos de API estabilizados por Marcos e João.
* **Requisitos:** RNF02 (Swagger/OpenAPI)
* **Referência Documentação:** `docs/api-pacientes-jogos.md`, Swagger UI
* **Descrição:** Atualizar o arquivo `docs/api-pacientes-jogos.md` e as anotações Swagger do backend com as rotas `POST /api/sessao/:id/finalizar`, contratos de payload de eventos de telemetria e códigos de status HTTP (200, 400, 403, 404, 422).
* **Critérios de Aceite:**
  * [ ] Especificação detalhada de request body, schemas de telemetria e responses.
  * [ ] Documentação explícita do erro HTTP 422 para violações da regra RN02.
  * [ ] Atualização do catálogo de rotas no repositório.

---

### Docs: Roteiro de Testes Manuais de Gestão de Sessão (CT-S07 a CT-S14) (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** `docs/roteiro-testes.md`
* **Ordem de Execução / Dependência:** **Dias 3 a 5**. Elabora os casos de teste para homologação da equipe.
* **Requisitos:** Qualidade de Software, RF12, RF13, RF17
* **Referência Documentação:** `docs/roteiro-testes.md`
* **Descrição:** Criar os casos de teste manuais formais da Sprint 9 (CT-S07 a CT-S14) no roteiro de testes: monitoramento em tempo real, envio de comandos ao tablet, interrupção de conexão, telemetria inválida (RN02), encerramento e não persistência em Modo Livre (RN01).
* **Critérios de Aceite:**
  * [ ] Tabela com precondições, passos de execução, dados de entrada e resultado esperado.
  * [ ] Cenários de teste cobrindo caminhos felizes e tratamentos de exceção.
  * [ ] Alinhamento com a equipe de desenvolvimento para homologação.

---

### Docs: Gestão do Quadro Kanban e Regularização das Sprints 7 e 8 (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** GitHub Projects (Board, Issues, Labels, Milestones)
* **Ordem de Execução / Dependência:** ⚠️ **PRIORIDADE MÁXIMA (Dias 1 a 2)**.  
  * Deve sincronizar o board imediatamente: fechar as issues prontas das sprints passadas e cadastrar os 20 cards da Sprint 9 com seus donos e regras anti-conflito.  
  * *Zona Proibida:* É **PROIBIDO** alterar qualquer código-fonte em `Backend/` ou `Frontend/`.
* **Requisitos:** Gestão de Projeto
* **Referência Documentação:** GitHub Projects, `docs/DocsSprints/sprints/sprint-9.md`
* **Descrição:** Auditar e sincronizar o GitHub Projects: fechar oficialmente as issues já concluídas no código das Sprints 7 e 8 (#17, #47, #48, #49, #50, #19, #28, #29, #55, #56, #57, #58), cadastrar os 20 novos cards da Sprint 9 com seus respectivos responsáveis e manter as colunas organizadas.
* **Critérios de Aceite:**
  * [ ] Quadro de issues do GitHub 100% alinhado com o estado real do código.
  * [ ] 20 issues da Sprint 9 criadas com labels, milestones e atribuição para os 5 integrantes.
  * [ ] Débitos documentais das sprints passadas (#32, #59, #60, #62) sinalizados para regularização.

