# Cards de Tarefas — Sprint 12: Bloco de Anotações Clínicas e Injeção de Contexto Pré-Sessão DDA

> **Sprint:** 12  
> **Período:** 22/10/2026 a 29/10/2026  
> **Tema Central:** Bloco de Anotações Clínicas com Autoria e Injeção Parametrizada de Contexto Pré-Sessão DDA  
> **Documento Mestre:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) (Tabela 1, Seção 5, Seção 7.4.2 Contrato 2, Seção 7.12, Figura 5 e Figura 11)  
> **Diretrizes e Quality Gate:** [AGENTS.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/AGENTS.md) (Seção 6.8)  
> **Hub de Tarefas Geral:** [visao_geral.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/visao_geral.md)  

---

## 1. Diretrizes Operacionais e Modelo de Execução da Sprint 12

> [!IMPORTANT]
> **Modelo de Execução da Sprint 12 (Implementação Técnica Solo + Documentação Dedicada):**  
> * **Implementação Técnica (Banco, Back-end, Front-end e Validação — Seção 2.1):** Conduzida integralmente de forma solo por **Marcos Willian (`@MarcosWillianAP1K`)**, garantindo coesão ponta a ponta entre o banco relacional, a validação do **Contrato 2 (`contextoPreSessao.json`)**, a injeção prévia obrigatória de DDA (**RN03**) e o gerenciador enriquecido de anotações clínicas (**RF16**, **RF19**, **RF21**, **RN05**).
> * **Documentação, Especificação OpenAPI e Governança (Seção 2.2):** Conduzida por **Raildom Silva (`@Raildom`)**, responsável pelo capítulo acadêmico em LaTeX, atualização dos contratos em `docs/api-pacientes-jogos.md`, casos de teste manuais em `docs/roteiro-testes.md` e governança do quadro Kanban.
> * **Cards Extras de Reforço Arquitetural (Seção 3):** Mantidos como **`Não atribuído (Backlog Arquitetural)`** com status **`Ready`** no quadro Kanban.
> * **Homologação Soberana do Usuário:** Todos os critérios de aceite (`[ ]`) permanecem rigorosamente desmarcados para auditoria e validação manual do usuário.

---

## 2. Cards Principais da Sprint 12

### 2.1. Implementação Técnica (BD, Back-end, Front-end e Testes) — Marcos Willian (`@MarcosWillianAP1K`)

---

### BD/Back: Enriquecimento de Autoria, Reativação e Filtros Avançados de Anotações Clínicas (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Database/migrations/016_indices_anotacao_e_contexto_dda.sql`, `Database/database.sql`, `Backend/api/anotacao/models/anotacao.model.ts`, `Backend/api/anotacao/services/anotacao.service.ts`, `Backend/api/anotacao/controllers/anotacao-paciente.controller.ts`, `Backend/api/anotacao/controllers/anotacao-sessao.controller.ts`, `Backend/api/anotacao/routes/anotacao.routes.ts`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE FAZER PRIMEIRO (Dias 1 a 2)**. Cria os índices compostos de busca no PostgreSQL e enriquece o model/service de anotações clínicas antes da integração com os componentes visuais do prontuário.
* **Requisitos:** RF16, RF19, RF21, RN04, RN05, RNF05
* **Referência Documentação:** Projeto_de_InTEA.pdf (Tabela 1 — Sprint 12, Seção 5.1 RF16/RF19/RF21, Seção 7.12), AGENTS.md (Seção 6.8)
* **Descrição:** Criar a migração idempotente `016_indices_anotacao_e_contexto_dda.sql` e atualizar `Database/database.sql` adicionando índices compostos para listagem e filtragem rápida de anotações por paciente, terapeuta autor e intervalo temporal (`idx_anotacao_paciente_autor_data` em `anotacao_clinica(paciente_id, terapeuta_id, created_at DESC) WHERE soft_delete = false`). Evoluir `AnotacaoClinicaModel` e `AnotacaoService` para realizar `JOIN` com a tabela `terapeuta` (`id, nome, registro_profissional, crefito, especialidade`), retornando o objeto categorizado `autor` em todas as anotações e extinguindo a exibição de UUIDs crus na interface (**RF21**). Implementar suporte a filtros combinados em `GET /api/anotacao/paciente/:pacienteId` (`terapeutaId`, `sessaoId`, `somenteSemSessao`, `incluirInativos`, `dataInicio`, `dataFim`, `busca`, `page`, `limit` — **RF19**) e criar o endpoint `PATCH /api/anotacao/:id/reativar` permitindo que o terapeuta autor (ou SuperAdmin) reative uma anotação previamente inativada via soft delete (**RN05**).
* **Critérios de Aceite:**
  * [ ] Migração SQL `016_indices_anotacao_e_contexto_dda.sql` executada de forma 100% idempotente (`CREATE INDEX IF NOT EXISTS`) e sincronizada em `Database/database.sql`.
  * [ ] Retorno de `GET /api/anotacao/paciente/:pacienteId`, `GET /api/anotacao/sessao/:sessaoId` e `GET /api/anotacao/:id` com status **`200 OK`** incluindo os dados sanitizados do profissional autor (`autor: { id, nome, registro_profissional, crefito, especialidade }`).
  * [ ] Suporte aos filtros de query `terapeutaId`, `sessaoId`, `dataInicio`, `dataFim`, `busca` (case-insensitive no conteúdo), `page` e `limit` em `GET /api/anotacao/paciente/:pacienteId` (**RF19**).
  * [ ] Implementação da rota `PATCH /api/anotacao/:id/reativar` retornando **`200 OK`** com `soft_delete: false` quando acionada pelo terapeuta autor ou SuperAdmin, e **`403 Forbidden`** caso acionada por terceiro (**RF21**, **RN05**).
  * [ ] Bloqueio estrito com **`403 Forbidden`** em tentativas de criar, listar, editar ou excluir anotações de pacientes sem vínculo ativo na mesma clínica (**RN04**).
  * [ ] Código em TypeScript estrito (zero uso de `any`), métodos em `camelCase` e respostas aderentes ao Envelope Pattern Categorizado (`{ data: { anotacao | anotacoes, meta }, message }`).

---

### Back: Serviço de Validação e Injeção de Contexto Clínico Pré-Sessão DDA — Contrato 2 (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/sessao/services/sessao-contexto-dda.service.ts`, `Backend/api/sessao/dtos/sessao.dto.ts`, `Backend/api/sessao/controllers/sessao.controller.ts`, `Backend/api/sessao/routes/sessao.routes.ts`, `Backend/core/websocket/sessao.gateway.ts`
* **Ordem de Execução / Dependência:** **Dias 2 a 3 (Construção do serviço e validação do Contrato 2)**. Fornece a validação e o pré-carregamento de contexto DDA para o modal pré-sessão do Frontend.
* **Requisitos:** RF12, RF17, RF21, RN01, RN03, RN04, RNF02
* **Referência Documentação:** Projeto_de_InTEA.pdf (Seção 5.1 RF17, Seção 5.3 RN03, Seção 7.4.2 Contrato 2 — `contextoPreSessao.json`, Figura 3 e Figura 5 — Diagrama de Atividade), AGENTS.md (Seção 6.8)
* **Descrição:** Implementar o serviço `SessaoContextoDdaService` (`Backend/api/sessao/services/sessao-contexto-dda.service.ts`) para padronizar, validar e injetar o contexto clínico pré-sessão em estrita conformidade com o **Contrato 2 (`docs/ModelosDeContratos/contextoPreSessao.json`)**:
  1. Validar os parâmetros `nivel_estresse_inicial` (aceitando escala numérica `1` a `5` e mapeando deterministicamente para `"baixo"` [1-2], `"medio"` [3] e `"alto"` [4-5]), `gatilhos_sensoriais_evitar` (array de strings) e `objetivo_clinico`;
  2. Implementar o **Fallback Clínico Parametrizado** previsto na **Figura 5 (Diagrama de Atividade)**: quando o terapeuta optar por não customizar manualmente o contexto pré-sessão (`usar_fallback_padrao = true` ou omissão de parâmetros em sessão clínica), o serviço consulta automaticamente os gatilhos sensoriais registrados no prontuário do paciente (`dados_clinicos` / `paciente_gatilho`), define `nivel_estresse_inicial: "baixo"` (`1`) e assume o objetivo clínico padrão do manifesto do jogo selecionado;
  3. Garantir o cumprimento inviolável da **RN03**: em `POST /api/sessao/iniciar`, `POST /api/sessao/parear` e no evento WebSocket `entrar_sessao` (`SessaoGateway`), o pacote estruturado do Contrato 2 (`token_sessao`, `id_terapeuta`, `id_paciente`, `contexto_paciente`) é entregue ao canal do Agente de IA / dispositivo pareado **antes do processamento do primeiro evento de telemetria**;
  4. Garantir a **RN01**: em sessões de `modo_livre` (`paciente_id = NULL`), suprimir qualquer calibração DDA e rejeitar com **`400 Bad Request`** tentativas de injetar contexto clínico de paciente em partida livre;
  5. Expor o endpoint auxiliar `GET /api/sessao/contexto-sugerido/:pacienteId` (protegido por `authMiddleware` e `verificarVisibilidadePaciente`) que retorna os gatilhos sensoriais cadastrados na anamnese do paciente e o último contexto utilizado, abastecendo o pré-preenchimento do formulário no Frontend (**RF12**, **RF17**).
* **Critérios de Aceite:**
  * [ ] Validação estrita do payload de contexto pré-sessão gerando objeto 100% aderente ao **Contrato 2** (`token_sessao`, `id_terapeuta`, `id_paciente`, `contexto_paciente: { nivel_estresse_inicial, gatilhos_sensoriais_evitar, objetivo_clinico }`).
  * [ ] Retorno com status **`400 Bad Request`** caso `nivel_estresse_inicial` esteja fora do domínio permitido (`1..5` ou `"baixo" | "medio" | "alto"`) ou caso se tente injetar contexto clínico de paciente em `modo_livre` (**RN01**).
  * [ ] Aplicação automática do Fallback Clínico Parametrizado (Figura 5) quando o terapeuta selecionar os parâmetros padrão, herdando os gatilhos do cadastro do paciente.
  * [ ] Entrega comprovada do pacote de contexto DDA no handshake (`POST /api/sessao/parear` e evento `dispositivo_conectado` / `contexto_dda_inicial` no `SessaoGateway`) antes da aceitação do primeiro pacote `sessao:telemetria` (**RN03**).
  * [ ] Rota `GET /api/sessao/contexto-sugerido/:pacienteId` retornando **`200 OK`** com os gatilhos sensoriais do paciente para terapeutas vinculados e **`403 Forbidden`** para profissionais sem vínculo (**RN04**).

---

### Front: Componentes Modulares do Prontuário de Anotações e Formulário de Contexto DDA (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:**
  * `Frontend/src/features/anotacao/components/GerenciadorAnotacoesProntuario.tsx`
  * `Frontend/src/features/anotacao/components/CardAnotacaoClinica.tsx`
  * `Frontend/src/features/anotacao/components/FiltrosAnotacoesClinicas.tsx`
  * `Frontend/src/features/sessao/components/FormularioContextoDDA.tsx`
  * `Frontend/src/features/anotacao/types/anotacao.types.ts`
  * `Frontend/src/features/anotacao/types/bdmock.ts`
* **Ordem de Execução / Dependência:** **Dias 3 a 4 (Construção isolada dos componentes visuais orientados a props)**. Prepara os blocos modulares que serão encaixados na Página de Perfil do Paciente e no Modal Pré-Sessão.
* **Requisitos:** RF16, RF17, RF19, RF21, RN03, RN05, RNF07
* **Referência Documentação:** Projeto_de_InTEA.pdf (Figura 5, Figura 11 — Tela de configuração de sessão, Figura 12 e Figura 16 — Tela de Perfil do Paciente), AGENTS.md (Seção 6.3 e Seção 6.8)
* **Descrição:** Desenvolver os componentes visuais puros e determinísticos para os dois pilares da Sprint 12:
  1. **Módulo de Anotações Clínicas (`features/anotacao/components/`):**
     - `CardAnotacaoClinica.tsx`: renderiza uma anotação individual exibindo cabeçalho de autoria indelével (**RF21**: nome do terapeuta, registro profissional CREFITO/CRP e especialidade vindos de `anotacao.autor`), carimbo de data/hora, badge de vínculo com sessão (com link opcional para `/sessao/:sessaoId/resultado` quando `sessao_id` existir), modo de edição inline (`PATCH`) e botão de inativação lógica com confirmação (`DELETE` soft delete — **RN05**). Os controles de editar e inativar são exibidos/habilitados **exclusivamente quando `anotacao.terapeuta_id === usuarioLogadoId`**;
     - `FiltrosAnotacoesClinicas.tsx`: barra de busca textual por palavra-chave, seletor de filtro por especialista autor, filtro por origem (Todas / Gerais do Prontuário / Vinculadas a Sessão) e filtro por período (**RF19**);
     - `GerenciadorAnotacoesProntuario.tsx`: compõe o formulário de nova anotação (com contador de caracteres e proteção contra duplo clique `isSubmitting`), a barra de filtros e a lista paginada de `CardAnotacaoClinica`, cobrindo os 4 estados visuais (Skeleton Loader geométrico, Empty State amigável, Error State com retry e Success State).
  2. **Formulário Parametrizável de Contexto Pré-Sessão (`FormularioContextoDDA.tsx`):**
     - Componente puro espelhando a **Figura 11** e o fluxo da **Figura 5**: seletor de Nível de Estresse Inicial (1 a 5 com indicação semântica Baixo / Médio / Alto), chips interativos de Gatilhos Sensoriais a Evitar (pré-populados com os gatilhos do paciente selecionado + opção de adicionar/remover gatilhos do catálogo), seletor de Objetivo Clínico da Sessão (`Foco Atencional`, `Regulação Emocional`, `Coordenação Motora`, `Interação Social`, `Comunicação e Linguagem`) e alternador para "Usar Parâmetros Padrão Homologados (Fallback)".
* **Critérios de Aceite:**
  * [ ] `CardAnotacaoClinica` exibe nome completo, conselho de classe (CREFITO/CRP) e especialidade do terapeuta autor (**RF21**), nunca exibindo UUID truncado quando o objeto `autor` estiver presente.
  * [ ] Botões de edição inline e inativação lógica (soft delete) visíveis/ativos apenas para o terapeuta autor da nota, com trava `isSubmitting` contra cliques duplicados.
  * [ ] `FiltrosAnotacoesClinicas` permite filtrar notas por busca textual, terapeuta autor e vínculo de sessão (**RF19**).
  * [ ] `FormularioContextoDDA` permite configurar nível de estresse (1 a 5), gatilhos sensoriais a evitar e objetivo clínico, além de suportar a opção de parâmetros padrão (Fallback da Figura 5).
  * [ ] Cobertura integral dos 4 estados visuais (Skeleton Loader sem CLS, Empty State ilustrado, Error State amigável com retry e Success State) e alvos de toque mínimos de 44x44px (**RNF07**).

---

### Front: Integração do Bloco de Anotações no Perfil do Paciente e Contexto DDA no Modal Pré-Sessão (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Frontend/src/features/paciente/pages/PerfilPacientePage.tsx`, `Frontend/src/features/sessao/components/ModalPreSessao.tsx`, `Frontend/src/features/sessao/services/sessaoService.ts`, `Frontend/src/features/sessao/store/sessionStore.ts`, `Frontend/src/features/anotacao/services/anotacao.service.ts`, `Frontend/src/core/api/endpoints.ts`
* **Ordem de Execução / Dependência:** **FAZ DEPOIS DE (Cards 1, 2 e 3 — Dias 4 a 5)**. Conecta as páginas mestras e modais aos novos componentes e endpoints REST.
* **Requisitos:** RF12, RF16, RF17, RF19, RF21, RN01, RN03, RN04, RN05
* **Referência Documentação:** Projeto_de_InTEA.pdf (Figura 11 e Figura 16, Seção 7.12), AGENTS.md (Seção 6.3 e Seção 6.8)
* **Descrição:** Integrar os componentes desenvolvidos na jornada clínica do terapeuta:
  1. Em `PerfilPacientePage.tsx`: substituir a seção estática de notas pelo `<GerenciadorAnotacoesProntuario />` conectado ao `anotacaoService` (`listarPorPaciente`, `criar`, `atualizar`, `inativar`), permitindo ao terapeuta criar, filtrar por autor/período, editar suas próprias notas e inativar registros com atualização reativa imediata;
  2. Em `ModalPreSessao.tsx` e `sessionStore.ts`: integrar o `<FormularioContextoDDA />`. Ao selecionar um paciente no modal, buscar automaticamente seus gatilhos sensoriais cadastrados (`GET /api/sessao/contexto-sugerido/:pacienteId` com fallback para os gatilhos do paciente na store/mock) para pré-selecionar os gatilhos a evitar (**RF12**, **RF17**). Ao confirmar o início da intervenção, enviar o payload estruturado do **Contrato 2** (`nivel_estresse_inicial`, `gatilhos_sensoriais_evitar`, `objetivo_clinico`) para `POST /api/sessao/iniciar`, garantindo que o contexto DDA seja persistido e transmitido ao Agente de IA antes do início da telemetria (**RN03**). Quando em `modo_livre` (**RN01**), ocultar a seção de Contexto DDA do paciente.
* **Critérios de Aceite:**
  * [ ] `PerfilPacientePage.tsx` renderiza `<GerenciadorAnotacoesProntuario />` com criação, edição, exclusão lógica (soft delete) e filtros funcionais integrados ao `anotacaoService`.
  * [ ] `ModalPreSessao.tsx` carrega automaticamente os gatilhos sensoriais do paciente selecionado e envia `objetivo_clinico`, `nivel_estresse_inicial` e `gatilhos_sensoriais_evitar` no formato do Contrato 2 ao iniciar a sessão (**RF17**, **RN03**).
  * [ ] Supressão automática do formulário de contexto DDA de paciente quando a partida for iniciada em `modo_livre` (**RN01**).
  * [ ] Preservação de estado e limpeza adequada (`cleanup`) de listeners e requests assíncronos ao fechar o modal ou desmontar a página.

---

### Front: Modal de Anotação Clínica em Tempo Real no Cockpit de Sessão Ativa (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/components/ModalAnotacaoSessaoAtiva.tsx`, `Frontend/src/features/sessao/pages/CockpitSessaoPage.tsx`, `Frontend/src/features/sessao/components/CardSessaoAtiva.tsx`, `Frontend/src/features/anotacao/services/anotacao.service.ts`
* **Ordem de Execução / Dependência:** **FAZ DEPOIS DE (Cards 1 e 3 de Anotações — Dias 4 a 5)**. Utiliza os contratos e componentes do módulo de anotações integrando diretamente ao Cockpit de sessão em andamento.
* **Requisitos:** RF12, RF13, RF16, RF21, RN01, RN04, RN05, RNF05, RNF07
* **Referência Documentação:** Projeto_de_InTEA.pdf (Seção 5.1 RF13/RF16, Seção 7.9 Cockpit do Terapeuta), AGENTS.md (Seção 6.3 e Seção 6.8)
* **Descrição:** Implementar o componente `ModalAnotacaoSessaoAtiva.tsx` e integrá-lo ao Cockpit de Sessão Ativa (`CockpitSessaoPage.tsx` e `CardSessaoAtiva.tsx`), sanando a lacuna ergonômica em que o terapeuta só conseguia registrar notas clínicas após a finalização da sessão na Tela de Resultados:
  1. No painel de controle do terapeuta do Cockpit (`CockpitSessaoPage.tsx`) e no card da sessão ativa (`CardSessaoAtiva.tsx`), disponibilizar o botão de ação rápida "Anotações Clínicas" / "Anotar na Sessão" com ícone intuitivo e alvo de toque ergonômico ($\ge 44\times 44\text{px}$ — **RNF07**);
  2. Ao clicar, abrir o modal/painel lateral `ModalAnotacaoSessaoAtiva.tsx` focado na sessão corrente, contextualizado automaticamente com `sessao_id` e `paciente_id`;
  3. Carregar reativamente o histórico cronológico de anotações já tomadas pelo profissional ao longo daquela intervenção via `GET /api/anotacao/sessao/:sessaoId` (**RF16**);
  4. Disponibilizar formulário de redação rápida de nova anotação clínica com contador de caracteres em tempo real, validação de preenchimento mínimo e persistência temporária de rascunho em memória local (`sessionStorage`) para proteção contra recarregamento acidental de página;
  5. Submissão direta e assíncrona (`POST /api/anotacao` enviando `conteudo`, `sessao_id` e `paciente_id` com autoria indelével extraída do token JWT — **RF16**, **RF21**), persistindo a observação imediatamente no banco relacional sem necessidade de aguardar o término da partida ou a geração do relatório de IA. Todas as anotações registradas durante a sessão ativa são automaticamente indexadas pelo `sessao_id`, de modo que, ao final da intervenção, são imediatamente carregadas e exibidas no Bloco de Anotações da Tela de Resultados (`ResultadoSessaoPage.tsx` / `BlocoAnotacoesClinicas.tsx` — Sprint 10), onde o terapeuta pode revisá-las e complementá-las com o parecer final pós-sessão sem duplicidade;
  6. Gerenciamento estrito de estados visuais na interface: indicador de carregamento das notas anteriores, trava de segurança no botão de submissão contra múltiplos envios concorrentes (`isSubmitting`), toast/feedback visual sutil e não intrusivo de sucesso (para não desviar a atenção do monitoramento da telemetria em tempo real — **RNF05**), e tratamento de falhas com opção de repetição (retry);
  7. Invariante de Modo Livre (**RN01**): quando a sessão ativa for do tipo `modo_livre` (`paciente_id = NULL`), o botão de anotações deve ser desabilitado ou ocultado visualmente com tooltip explicativo indicando que partidas livres não persistem registros no prontuário;
  8. Verificação de Vínculo e Permissão (**RN04**): garantir que apenas o terapeuta com vínculo ativo e sessão em andamento consiga enviar anotações, tratando de forma resiliente respostas `403 Forbidden` ou `401 Unauthorized` sem interromper o streaming de telemetria.
* **Critérios de Aceite:**
  * [ ] Botão acessível de anotações clínicas presente no Cockpit de sessão ativa (`CockpitSessaoPage.tsx` / `CardSessaoAtiva.tsx`) abrindo o modal `ModalAnotacaoSessaoAtiva.tsx` com alvo de toque $\ge 44\times 44\text{px}$ (**RNF07**).
  * [ ] Carregamento automático e exibição da lista cronológica de anotações da sessão corrente via `GET /api/anotacao/sessao/:sessaoId` (**RF16**).
  * [ ] Redação de nova anotação clínica com submissão imediata via `POST /api/anotacao` (`201 Created`), associando indelével e automaticamente o `sessao_id`, `paciente_id` e o `terapeuta_id` do usuário logado (**RF21**).
  * [ ] Preservação de rascunho em edição durante a sessão contra recarregamentos acidentais ou minimizações do modal.
  * [ ] Trava visual e lógica contra múltiplos envios concorrentes (`isSubmitting`) e feedback de sucesso sutil sem bloquear a visualização dos gráficos de telemetria em tempo real (**RNF05**).
  * [ ] Ocultação/desativação do botão de anotações quando a sessão em andamento for em Modo Livre (`modo_livre = true` / `paciente_id = NULL`), em estrita conformidade com a **RN01**.
  * [ ] Continuidade com a Tela de Resultados: anotações salvas em tempo real durante a sessão ativa são consultáveis e complementáveis no pós-sessão via Bloco de Anotações (`BlocoAnotacoesClinicas.tsx` — Sprint 10).
  * [ ] Tratamento adequado de erros de rede ou autorização (`403 Forbidden` / `401 Unauthorized`), exibindo mensagem amigável sem quebrar o monitoramento contínuo da sessão (**RN04**).

---

### Back/Front: Suíte de Testes Automatizados de Anotações Clínicas e Contexto Pré-Sessão DDA (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/anotacao/test/anotacao_contexto_sprint12.test.ts`, `Backend/api/sessao/test/contexto_dda_rn03.test.ts`, `Frontend/src/features/anotacao/__test__/GerenciadorAnotacoesProntuario.test.tsx`, `Frontend/src/features/sessao/__test__/ModalPreSessao.test.tsx`, `Frontend/src/features/sessao/__test__/ModalAnotacaoSessaoAtiva.test.tsx`
* **Ordem de Execução / Dependência:** **Dia 6 (Fechamento e Garantia de Qualidade da Sprint 12)**.
* **Requisitos:** Qualidade de Software, RF12, RF13, RF16, RF17, RF19, RF21, RN01, RN03, RN04, RN05
* **Referência Documentação:** Projeto_de_InTEA.pdf (Seção 7.12), `docs/roteiro-testes.md`, AGENTS.md (Seção 6.8)
* **Descrição:** Implementar suítes de testes automatizados no Vitest (Backend e Frontend) validando de ponta a ponta as entregas da Sprint 12:
  1. **Backend (`anotacao_contexto_sprint12.test.ts`):** criação de anotação com autoria extraída do JWT (`201 Created` — **RF21**), retorno do objeto `autor` enriquecido na listagem (`200 OK`), filtragem por `terapeutaId`, `busca` e intervalo de datas (**RF19**), bloqueio de edição/exclusão por terapeuta que não seja o autor (`403 Forbidden`), soft delete (`200 OK` com `soft_delete: true` — **RN05**) e reativação (`PATCH /api/anotacao/:id/reativar`);
  2. **Backend (`contexto_dda_rn03.test.ts`):** validação do Contrato 2 no `SessaoContextoDdaService`, aplicação do fallback clínico padrão (Figura 5), entrega do contexto DDA no pareamento antes do primeiro evento de telemetria (**RN03**), rejeição de estresse inválido (`400 Bad Request`) e bloqueio de contexto clínico em Modo Livre (**RN01**);
  3. **Frontend (`GerenciadorAnotacoesProntuario.test.tsx`, `ModalPreSessao.test.tsx` e `ModalAnotacaoSessaoAtiva.test.tsx`):** renderização dos 4 estados visuais, exibição do nome e conselho do autor, ocultação de botões de edição para notas de outros terapeutas, pré-carregamento de gatilhos do paciente no modal pré-sessão, submissão de anotações em tempo real no Cockpit e validação da ocultação em Modo Livre (**RN01**).
* **Critérios de Aceite:**
  * [ ] 100% dos testes unitários e de integração passando no Backend (`npm test` em `Backend/`).
  * [ ] 100% dos testes de componentes e páginas passando no Frontend (`npm test` em `Frontend/`).
  * [ ] Cobertura comprovada dos invariantes clínicos **RN01**, **RN03**, **RN04**, **RN05** e **RF21**.
  * [ ] Zero uso de `any` e zero erros de compilação TypeScript (`tsc --noEmit`).

---

### 2.2. Documentação, Especificação e Governança — Raildom Silva (`@Raildom`)

---

### Docs: Governança do Quadro Kanban no GitHub Projects — Fechamento Sprint 11 e Abertura Sprint 12 (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** Quadro GitHub Projects do InTEA, `docs/DocsSprints/visao_geral.md`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE FAZER PRIMEIRO (Dias 1 a 2)**. Sincroniza o quadro Kanban para refletir o encerramento da Sprint 11 e o início da Sprint 12.
* **Requisitos:** Governança de Engenharia de Software, Rastreabilidade 1:1
* **Referência Documentação:** AGENTS.md (Seção 5.5 — Regra 4 e Seção 6.4 — Item 5), `docs/DocsProjeto/05-sprints-e-evolucao/06-governanca-kanban-e-tasks.md`
* **Descrição:** Realizar a governança semanal do quadro Kanban no GitHub Projects: verificar e mover para `Done` / `CLOSED` os cards concluídos da Sprint 11 após validação dos Pull Requests, cadastrar formalmente os cards da Sprint 12 mantendo correspondência 1:1 com `docs/DocsSprints/tasks/task_sprint_12.md`, atribuir os responsáveis (`@MarcosWillianAP1K` nos cards técnicos e `@Raildom` nos cards de documentação), configurar o Milestone da Sprint 12 (prazo `29/10/2026`) e aplicar as labels padronizadas (`area:back`, `area:front`, `area:bd`, `area:docs`, `tipo:feature`, `tipo:validacao`, `tipo:docs`).
* **Critérios de Aceite:**
  * [ ] Todos os cards principais da Sprint 11 devidamente fechados (`Done`) no GitHub Projects.
  * [ ] Todos os cards da Sprint 12 cadastrados no GitHub Projects com título canônico, descrição completa dos 8 campos, labels de área/tipo e Milestone `Sprint 12`.
  * [ ] Cards Extras da Sprint 12 cadastrados na coluna `Ready` sem responsável atribuído (`Backlog Arquitetural`).
  * [ ] Matriz de navegação em `docs/DocsSprints/visao_geral.md` sincronizada com os links para `task_sprint_12.md` e `sprint-12.md`.

---

### Docs: Especificação OpenAPI de Anotações Enriquecidas e Contrato 2 de Contexto Pré-Sessão (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** `docs/api-pacientes-jogos.md`, `docs/DocsProjeto/04-arquitetura-e-contratos/02-especificacao-api-restful.md`, `docs/DocsProjeto/04-arquitetura-e-contratos/03-contratos-json-ecossistema.md`
* **Ordem de Execução / Dependência:** **Dias 3 a 4 (Em paralelo com o desenvolvimento dos endpoints dos Cards 1 e 2)**.
* **Requisitos:** RF16, RF17, RF19, RF21, RN03, RN05, RNF02
* **Referência Documentação:** Projeto_de_InTEA.pdf (Seção 7.4.2 — Contrato 2, Seção 7.12), AGENTS.md (Seção 6.4 — Item 1 e 2)
* **Descrição:** Atualizar a documentação técnica da API RESTful e dos Contratos JSON do ecossistema para refletir com fidelidade caractere por caractere as entregas da Sprint 12:
  1. Em `docs/api-pacientes-jogos.md` e `02-especificacao-api-restful.md`: documentar os query params de filtragem avançada de `GET /api/anotacao/paciente/:pacienteId` (`terapeutaId`, `sessaoId`, `dataInicio`, `dataFim`, `busca`, `page`, `limit`), o objeto enriquecido `autor` no payload de resposta das anotações, a nova rota `PATCH /api/anotacao/:id/reativar` e a rota `GET /api/sessao/contexto-sugerido/:pacienteId`;
  2. Em `03-contratos-json-ecossistema.md`: detalhar o fluxo de validação do **Contrato 2 (`contextoPreSessao.json`)**, a tabela de mapeamento entre a escala de estresse (`1..5` $\leftrightarrow$ `"baixo" | "medio" | "alto"`), o mecanismo de Fallback Clínico Parametrizado (Figura 5) e a garantia da invariante **RN03**.
* **Critérios de Aceite:**
  * [ ] Paridade 100% exata (zero divergência de chaves `snake_case`) entre os exemplos JSON documentados em `docs/api-pacientes-jogos.md` e os DTOs reais do Backend/Frontend.
  * [ ] Documentação completa dos códigos HTTP canônicos (`200`, `201`, `400`, `401`, `403`, `404`) para as rotas de anotação e contexto pré-sessão.
  * [ ] Explicação formal do Contrato 2 e da regra **RN03** atualizada em `03-contratos-json-ecossistema.md`.

---

### Docs: Casos de Teste Manuais de Anotações Clínicas e Contexto DDA (CT-S29 a CT-S34) (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** `docs/roteiro-testes.md`, `docs/DocsProjeto/06-qualidade-e-testes/02-roteiro-testes-manuais.md`
* **Ordem de Execução / Dependência:** **Dias 4 a 5**. Elaboração dos roteiros de teste determinísticos para homologação da Sprint 12.
* **Requisitos:** RF16, RF17, RF19, RF21, RN01, RN03, RN04, RN05
* **Referência Documentação:** AGENTS.md (Seção 6.4 — Item 3), `docs/roteiro-testes.md`
* **Descrição:** Elaborar 6 novos Casos de Teste Manuais determinísticos e autossuficientes (**`CT-S29` a `CT-S34`**) em `docs/roteiro-testes.md` e sincronizar em `02-roteiro-testes-manuais.md`:
  - **`CT-S29` (Positivo — RF16 / RF21):** Registro de anotação clínica no prontuário do paciente e verificação da exibição do nome e conselho profissional do terapeuta autor;
  - **`CT-S30` (Negativo — RF21 / RN04):** Tentativa de edição (`PATCH /api/anotacao/:id`) e exclusão (`DELETE /api/anotacao/:id`) de anotação por outro terapeuta que não é o autor, validando rejeição com **`403 Forbidden`**;
  - **`CT-S31` (Positivo — RF19 / RN05):** Filtragem combinada de anotações por período/autor, exclusão lógica (soft delete) e reativação via `PATCH /api/anotacao/:id/reativar`;
  - **`CT-S32` (Positivo — RF17 / RN03 / Contrato 2):** Configuração personalizada do Contexto Pré-Sessão (nível de estresse, gatilhos sensoriais pré-carregados e objetivo clínico) e verificação da entrega do pacote antes do 1º evento de telemetria;
  - **`CT-S33` (Positivo — RF17 / Figura 5):** Início de sessão utilizando o Fallback Clínico Parametrizado (parâmetros padrão homologados);
  - **`CT-S34` (Negativo — RN01):** Tentativa de injetar contexto clínico de paciente ou registrar anotação clínica em sessão de Modo Livre (`modo_livre`), validando bloqueio **`400 Bad Request`**.
* **Critérios de Aceite:**
  * [ ] 6 casos de teste (`CT-S29` a `CT-S34`) redigidos com Precondição explícita, Rota/Método, Payload JSON completo (sem reticências `...`), Passos Numerados e Resultado Esperado mensurável.
  * [ ] Cobertura equilibrada entre cenários positivos (caminho feliz) e negativos (regras de segurança e invariantes clínicos).
  * [ ] Sincronização completa entre `docs/roteiro-testes.md` e `docs/DocsProjeto/06-qualidade-e-testes/02-roteiro-testes-manuais.md`.

---

### Docs: Seção 7.12 do Relatório Oficial LaTeX e Relatório Executivo da Sprint 12 (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** `docs/DocsSprints/sprints/sprint-12.md`, `docs/DocsProjeto/05-sprints-e-evolucao/01-visao-geral-sprints.md`, Relatório oficial LaTeX (`docs/*.tex`)
* **Ordem de Execução / Dependência:** **Dia 6 (Consolidação final após conclusão dos testes automatizados)**.
* **Requisitos:** Padrão Acadêmico UFPI, RF16, RF17, RF19, RF21, RN03, RN05
* **Referência Documentação:** Projeto_de_InTEA.pdf (Seção 7.12, Página 35; Figura 5, Figura 11 e Figura 16), AGENTS.md (Seção 6.4 — Item 4)
* **Descrição:** Redigir o documento executivo da Sprint 12 em `docs/DocsSprints/sprints/sprint-12.md` e expandir a **Seção 7.12 (Sprint 12 - Anotações e Contexto - 29/10/2026)** no relatório acadêmico oficial em LaTeX, detalhando: a arquitetura do bloco de anotações clínicas com autoria indelével (**RF16**, **RF21**) e inativação lógica (**RN05**), o fluxo de configuração e injeção prévia do Contexto DDA segundo o **Contrato 2** (**RF17**, **RN03**), o mecanismo de fallback clínico parametrizado da **Figura 5** e a matriz de rastreabilidade da sprint.
* **Critérios de Aceite:**
  * [ ] Relatório `docs/DocsSprints/sprints/sprint-12.md` criado com visão executiva, detalhamento técnico por camada, evidências de testes e matriz de rastreabilidade.
  * [ ] Seção 7.12 expandida no documento LaTeX compilando limpa sem erros ou referências quebradas (`[?]` ou `??`).
  * [ ] Atualização do status da Sprint 12 na tabela evolutiva de `docs/DocsProjeto/05-sprints-e-evolucao/01-visao-geral-sprints.md`.

---

## 3. Cards Extras — Backlog de Reforço Arquitetural (Status: Ready — Não atribuído)

> [!NOTE]
> Os cards abaixo **NÃO estão associados a nenhum membro específico** (`Responsável: Não atribuído (Backlog Arquitetural)`) e possuem status **`Ready`** no quadro Kanban, podendo ser assumidos livremente como adiantamento técnico ou alocados na Sprint 14 (Polimento Técnico).

---

### Front: Auto-Save Local de Rascunho (Draft Persistence) no Editor de Anotações Clínicas (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Frontend/src/features/anotacao/hooks/useAnotacaoDraft.ts`, `Frontend/src/features/anotacao/components/GerenciadorAnotacoesProntuario.tsx`, `Frontend/src/features/anotacao/__test__/useAnotacaoDraft.test.ts`
* **Ordem de Execução / Dependência:** Independente (Reforço de Ergonomia Clínica no Frontend).
* **Requisitos:** RF16, RNF07
* **Referência Documentação:** Projeto_de_InTEA.pdf (Seção 2 — Redução da Sobrecarga Cognitiva do Terapeuta), AGENTS.md (Seção 6.3 — Item 4)
* **Descrição:** Criar o custom hook `useAnotacaoDraft(pacienteId, sessaoId)` com debounce de 500ms para salvar automaticamente no `sessionStorage` o rascunho textual da anotação clínica enquanto o terapeuta digita. Caso o navegador sofra recarregamento acidental (F5) ou troca momentânea de aba antes do clique em "Salvar", o texto em edição é restaurado automaticamente com badge informativo `"Rascunho restaurado"`, sendo limpo imediatamente após a confirmação de persistência na API (`201 Created`).
* **Critérios de Aceite:**
  * [ ] Hook `useAnotacaoDraft` implementado em TypeScript estrito (sem `any`) com limpeza (`cleanup`) de timers de debounce no `useEffect`.
  * [ ] Restauração automática do texto não salvo ao reabrir o prontuário do mesmo `pacienteId` / `sessaoId`.
  * [ ] Expurgo imediato da chave no `sessionStorage` após o salvamento com sucesso na API ou clique em "Descartar rascunho".
  * [ ] Suíte de testes unitários em `useAnotacaoDraft.test.ts` aprovada com 100% de cobertura no Vitest.

---

### Back: Sugestão Inteligente de Contexto DDA Pré-Sessão Baseada no Último Relatório da IA (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Backend/api/sessao/services/sessao-contexto-dda.service.ts`, `Backend/api/sessao/test/contexto_sugerido_ia.test.ts`
* **Ordem de Execução / Dependência:** Independente (Evolução Analítica de Calibração Pré-Sessão).
* **Requisitos:** RF14, RF17, RN03, RNF02
* **Referência Documentação:** Projeto_de_InTEA.pdf (Figura 3, Contrato 2 e Contrato 4)
* **Descrição:** Evoluir o endpoint `GET /api/sessao/contexto-sugerido/:pacienteId` para consultar não apenas os gatilhos estáticos da anamnese (`dados_clinicos`), mas também o último relatório analítico consolidado (`relatorio_sessao.dados_ia_json` — Contrato 4) do paciente. Caso a última sessão tenha registrado alta intervenção de DDA ou recomendação de redução de estímulos sonoros/visuais, o endpoint retorna uma sugestão pré-calibrada de `nivel_estresse_inicial` e `gatilhos_sensoriais_evitar` com justificativa clínica para aprovação em 1 clique pelo terapeuta.
* **Critérios de Aceite:**
  * [ ] Consulta otimizada ao último `relatorio_sessao` ativo (`soft_delete = false`) do paciente vinculada a `GET /api/sessao/contexto-sugerido/:pacienteId`.
  * [ ] Retorno do bloco `sugestao_ia: { nivel_estresse_sugerido, gatilhos_recomendados, justificativa_baseada_ultima_sessao }` dentro do Envelope Pattern Categorizado.
  * [ ] Tratamento seguro de *Empty State* quando o paciente ainda não possuir sessões anteriores finalizadas.
  * [ ] Testes automatizados no Vitest (`contexto_sugerido_ia.test.ts`) rodando 100% verdes.
