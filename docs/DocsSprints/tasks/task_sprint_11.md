# Cards de Tarefas — Sprint 11: Auditoria, Refatoração e Alinhamento Figma do Front-End

> **Sprint:** 11  
> **Período:** 15/10/2026 a 22/10/2026  
> **Tema Central:** Auditoria de Código, Limpeza de Arquivos Inúteis, Refatoração de Telas Fiel ao Figma e Suporte a Mocks Controlados  
> **Documento Mestre:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf)  
> **Diretrizes e Regras:** [AGENTS.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/AGENTS.md)  
> **Hub de Tarefas Geral:** [visao_geral.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/visao_geral.md)  

---

## 1. Cards por Integrante (20 Cards Principais)

---

### 1.1. Back-end 1 — Marcos Willian (@MarcosWillianAP1K)

---

### BD/Back: Auditoria de Consistência de Dados e Suporte a Contratos de Interface (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/paciente/models/paciente.model.ts`, `Backend/api/sessao/models/sessao.model.ts`, `Backend/api/jogos/models/jogo.model.ts`
* **Ordem de Execução / Dependência:** **Dias 1 a 2**. Valida a aderência dos modelos de dados com os contratos de exibição do Front-End e Figma.
* **Requisitos:** RF06, RF09, RF14, RN04, RN05
* **Referência Documentação:** Seção 5 (Modelagem Relacional), AGENTS.md Seção 6.2
* **Descrição:** Realizar auditoria rigorosa dos models de Paciente, Sessão e Jogos para assegurar que todos os campos consumidos pelas interfaces do Figma (como avatar, status, diagnóstico, tempo de reação, precisão e intervenções DDA) são providos sem discrepâncias ou conversões implícitas.
* **Critérios de Aceite:**
  * [ ] Todos os campos exigidos pelas telas do Figma mapeados explicitamente nos models.
  * [ ] Tipagem estrita TypeScript (sem uso de `any`).
  * [ ] Conformidade integral com soft delete em pacientes e sessões (**RN05**).

---

### Back: Padronização de DTOs e Sanitização de Respostas para o Front-End (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/paciente/validators/paciente.validator.ts`, `Backend/api/sessao/validators/sessao.validator.ts`
* **Ordem de Execução / Dependência:** **Dias 2 a 3**.
* **Requisitos:** RF06, RF21, RNF06
* **Referência Documentação:** RF21, RNF06 (Segurança e LGPD), AGENTS.md Seção 6.1
* **Descrição:** Ajustar e padronizar esquemas Zod de entrada e sanitização de saída nas APIs de Paciente e Sessão, prevenindo vazamento de campos técnicos internos ou dados sensíveis que o Front-End não deve receber.
* **Critérios de Aceite:**
  * [ ] Schemas de validação Zod cobrindo 100% dos campos de entrada.
  * [ ] Respostas sanitizadas sem expor hashes de senhas ou chaves internas.
  * [ ] Testes automatizados cobrindo payloads inválidos com resposta 400.

---

### Back: Normalização de Endpoints e Tratamento Semântico de Erros REST (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/paciente/controllers/paciente.controller.ts`, `Backend/api/sessao/controllers/sessao.controller.ts`
* **Ordem de Execução / Dependência:** **Dias 3 a 4**.
* **Requisitos:** RN02, RN04, RNF01
* **Referência Documentação:** AGENTS.md Seção 6.1 (Tabela Canônica de Códigos HTTP)
* **Descrição:** Auditar os controllers de Paciente e Sessão para garantir que todas as respostas sigam a semântica HTTP canônica do projeto: 200 para sucesso de consulta, 201 para criação, 400 para erros de sintaxe, 403 para quebra de vínculo clínico (**RN04**), 404 para entidades não encontradas e 422 para violações semânticas de métricas (**RN02**).
* **Critérios de Aceite:**
  * [ ] Eliminação de respostas 500 para regras de negócio tratadas.
  * [ ] Conformidade estrita com a tabela de status HTTP do InTEA.
  * [ ] Retorno com mensagem padronizada em formato JSON estruturado.

---

### Back: Testes de Regressão da API e Compatibilidade de Contratos (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/paciente/test/paciente.service.test.ts`, `Backend/api/sessao/test/sessao.test.ts`
* **Ordem de Execução / Dependência:** **Dias 5 a 6**.
* **Requisitos:** RF06, RF14, RN04, RN05
* **Referência Documentação:** Matriz de Rastreabilidade, AGENTS.md Seção 3
* **Descrição:** Executar e expandir as suítes de testes automatizados com Vitest no backend, assegurando que as rotas continuam respondendo com 100% de sucesso aos contratos esperados pelas páginas web.
* **Critérios de Aceite:**
  * [ ] 100% dos testes da suíte de backend passando com sucesso no Vitest.
  * [ ] Cenários de teste para acesso não-autorizado (403) e soft delete (RN05) validados.
  * [ ] Zero quebras de contrato REST.

---

### 1.2. Back-end 2 — João Marcos (@JM3L0)

---

### Back: Auditoria de Eventos WebSocket e Alinhamento de Payloads de Telemetria (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/core/websocket/sessao.gateway.ts`, `Backend/core/websocket/telemetria.events.ts`
* **Ordem de Execução / Dependência:** **Dias 1 a 2**.
* **Requisitos:** RF12, RF13, RNF03, RNF05
* **Referência Documentação:** Contrato 2 (WebSocket Telemetria), Seção 4.3 do PDF
* **Descrição:** Revisar a estrutura de eventos emitidos e recebidos no WebSocket (`telemetria_lote`, `alerta_clinico`, `intervencao_dda`), garantindo compatibilidade com os hooks de escuta do Front-End (`useLiveTelemetry`).
* **Critérios de Aceite:**
  * [ ] Payload de eventos WebSocket alinhado com a tipagem estrita do frontend.
  * [ ] Rate limiter ativo prevenindo saturação de banda (20 eventos/s).
  * [ ] Tratamento adequado de desconexões e reconexão tolerante (janela de 60s).

---

### Back: Adaptadores de Streaming e Resiliência de Conexão para o Cockpit (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/core/websocket/sessao.reconnection.ts`, `Backend/core/websocket/socket.limiter.ts`
* **Ordem de Execução / Dependência:** **Dias 2 a 3**.
* **Requisitos:** RF12, RNF04, RNF05
* **Referência Documentação:** RF12, RNF04 (Resiliência)
* **Descrição:** Implementar buffer circular em memória para armazenar os últimos 30 pontos de telemetria durante desconexões transitórias do frontend, despachando o histórico recente assim que o cliente reconectar.
* **Critérios de Aceite:**
  * [ ] Histórico recente repassado na reconexão sem perda de pontos clínicos.
  * [ ] Memória do buffer liberada ao finalizar ou cancelar a sessão.
  * [ ] Zero degradação de performance no servidor sob stream contínuo.

---

### Back: Mock Provider e Suporte à Chave de Alternância VITE_USE_MOCK_DATA (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/core/mock/mock.provider.ts`, `Frontend/src/core/api/http-client.ts`
* **Ordem de Execução / Dependência:** **Dias 3 a 4**.
* **Requisitos:** RNF01, RNF07
* **Referência Documentação:** AGENTS.md Seção 3 e 4
* **Descrição:** Estabelecer a infraestrutura e alinhamento para que a flag `VITE_USE_MOCK_DATA` no frontend consiga alternar de forma transparente entre simulação estática (bdmock) e backend real, mantendo dados coerentes entre as camadas.
* **Critérios de Aceite:**
  * [ ] Contratos de mock espelhados com a estrutura real das entidades de banco.
  * [ ] Suporte a toggle dinâmico via variável de ambiente sem recompilação de código.
  * [ ] Documentação clara do funcionamento da flag no ambiente de desenvolvimento.

---

### Back: Validação de Contrato do Motor de IA com o Painel de Insights (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/api/sessao/services/sessao_ia_analise.service.ts`, `Backend/api/sessao/test/sessao_ia_analise.test.ts`
* **Ordem de Execução / Dependência:** **Dias 5 a 6**.
* **Requisitos:** RF14, RF17, Contrato 4
* **Referência Documentação:** Contrato 4 (Síntese da IA), Seção 4.5 do PDF
* **Descrição:** Verificar se o payload da síntese analítica do Agente de IA (`RelatorioIAContrato`) atende integralmente ao que o componente visual `PainelInsightsIA` consome no frontend.
* **Critérios de Aceite:**
  * [ ] Diagnóstico comportamental, modulações DDA e recomendações com tipagem 100% idêntica no front e back.
  * [ ] Casos de teste automatizados cobrindo síntese gerada e casos sem dados.
  * [ ] Validação de status: somente sessões `finalizada` retornam síntese analítica.

---

### 1.3. Front-end 1 — Hermeson Alves (@Hermeson69)

---

### Front: Faxina Arquitetural e Remoção de Arquivos Duplicados/Inúteis do Front (Tipo: Fix)

* **Tipo:** Fix
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/paciente/components/*`, `Frontend/src/features/painel/components/*`, `Frontend/src/overlays/*`, `Frontend/src/pages/*`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE FAZER PRIMEIRO (Dias 1 a 2)**. Limpa a base antes das refatorações de telas.
* **Requisitos:** RNF01, RNF07
* **Referência Documentação:** AGENTS.md Seção 3
* **Descrição:** Expurgo formal de arquivos mortos, duplicados e cascas legadas geradas em refatorações passadas: remover componentes duplicados com nomes em inglês (`patientCreateContent.tsx`, `patientFormDialog.tsx`, `patientsContent.tsx`, `patientsList.tsx`, `patients.store.ts`), componentes duplicados da barra lateral em `features/painel/components/` que duplicam `layout/components/`, e centralizar rotas em `Frontend/src/pages/` e `features/*/pages/`.
* **Critérios de Aceite:**
  * [ ] Arquivos redundantes e mortos completamente removidos do repositório.
  * [ ] Imports em todos os componentes e páginas atualizados sem quebras.
  * [ ] Build do Vite e suíte Vitest continuando 100% funcionais após a faxina.

---

### Front: Refatoração da Página Mestre Dashboard Fiel ao Figma (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/pages/PainelPage.tsx`, `Frontend/src/features/painel/pages/dashboardPage.tsx`
* **Ordem de Execução / Dependência:** **Dias 2 a 4 (Faz após a faxina do Card 1.3.1)**.
* **Requisitos:** RF19, RNF01
* **Referência Documentação:** Figma Frame `Dashboard - InTEA` (id: `57:190`)
* **Descrição:** Refatorar a página mestre do Dashboard para reproduzir com fidelidade a estrutura do Figma: TopAppBar com saudação, sino de notificações e avatar do terapeuta; banner `Sessao paciente sumario` destacando o paciente recente com botão "Ver Perfil"; bloco de `Sessões` com cards de atividades recentes, timers e status; e tabela resumida de `Meus Pacientes` com botão "+ Nova Sessão". Conectar com `dashboard.service.ts` e dados controlados por `VITE_USE_MOCK_DATA`.
* **Critérios de Aceite:**
  * [ ] Layout fiel ao Figma Auto Layout com espaçamentos, paddings e cores do Design System.
  * [ ] Exibição integrada de dados via `dashboard.service.ts` respeitando `VITE_USE_MOCK_DATA`.
  * [ ] Botão "+ Nova Sessão" aciona a abertura do `ModalPreSessao`.

---

### Front: Refatoração da Página Mestre de Pacientes e Gestão de Fluxo (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/pages/PacientesPage.tsx`, `Frontend/src/features/paciente/components/ConteudoPacientes.tsx`
* **Ordem de Execução / Dependência:** **Dias 3 a 5**.
* **Requisitos:** RF06, RF18, RN05
* **Referência Documentação:** Figma Frames `Meus Pacientes - InTEA` (id: `67:1404`), `Lista Pacientes- InTEA` (id: `94:1176`)
* **Descrição:** Refatorar a página de gestão de pacientes para alinhar com o design do Figma: cabeçalho estilizado com barra de busca e filtros rápidos, transição fluida entre visão de lista e formulário de cadastro, e feedback visual imediato ao cadastrar ou selecionar pacientes.
* **Critérios de Aceite:**
  * [ ] Casca da página alinhada ao Frame `Meus Pacientes - InTEA` do Figma.
  * [ ] Barra de busca funcional filtrando pacientes por nome e diagnóstico.
  * [ ] Alternância entre lista e formulário de cadastro preservando o estado no store.

---

### Front: Refatoração do Modal de Pré-Sessão Overlay Card Fiel ao Figma (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/components/ModalPreSessao.tsx`
* **Ordem de Execução / Dependência:** **Dias 4 a 6**.
* **Requisitos:** RF10, RF11, RN03, RNF03
* **Referência Documentação:** Figma Frame `Overlay Card sessao` (id: `87:708`)
* **Descrição:** Refatorar o modal de pré-sessão e pareamento remoto conforme as especificações exatas do Figma: Cabeçalho com título e botão fechar; Seção A: Contexto DDA (seleção de paciente, jogo, nível de estresse inicial e gatilhos a evitar); Seção B: Pareamento Remoto com código de pareamento de 6 dígitos formatado (`849-291`) e instruções; e Rodapé com botões "Cancelar" e "Confirmar e Iniciar Intervenção".
* **Critérios de Aceite:**
  * [ ] Dimensões e hierarquia visual fiéis ao Frame `87:708` do Figma (502px de largura).
  * [ ] Código de pareamento formatado no padrão `XXX-XXX`.
  * [ ] Botão de confirmação valida se paciente e jogo foram definidos antes de transicionar.

---

### 1.4. Front-end 2 — Luma Maiara (@lumamaiara)

---

### Front: Componentização Atômica dos Cards de Pacientes e Botão Adicionar do Figma (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/paciente/components/ListaPacientes.tsx`, `Frontend/src/features/paciente/components/ConteudoCriarPaciente.tsx`
* **Ordem de Execução / Dependência:** **Dias 1 a 3**.
* **Requisitos:** RF06, RN05, RNF01
* **Referência Documentação:** Figma Components `Card paciente` (id: `67:1592`), `Card add paciente` (id: `67:1617`)
* **Descrição:** Construir os componentes atômicos fiéis aos componentes oficiais do Figma: `Card paciente` (com avatar, badge de status, diagnóstico, última sessão e ações de iniciar sessão e ver perfil) e `Card add paciente` (card pontilhado com ícone e texto "+ Adicionar Paciente").
* **Critérios de Aceite:**
  * [ ] Componente `Card paciente` com layout Flexbox, sombras e bordas exatas do Figma.
  * [ ] Componente `Card add paciente` clicável disparando o modo de cadastro.
  * [ ] Suporte a visualização em grade responsiva (Grid) e tabela.

---

### Front: Refatoração do Layout da Biblioteca de Jogos e Game Rows (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/jogos/components/JogoCard.tsx`, `Frontend/src/features/jogos/components/JogosFiltros.tsx`, `Frontend/src/features/jogos/pages/BibliotecaJogosPage.tsx`
* **Ordem de Execução / Dependência:** **Dias 2 a 4**.
* **Requisitos:** RF09, RN01, RN02
* **Referência Documentação:** Figma Frame `Biblioteca de jogos - InTEA` (id: `65:971`), Component `Game Row` (id: `67:1251`)
* **Descrição:** Refatorar a visualização dos jogos terapêuticos adaptando para o formato `Game Row` do Figma: capa/ícone, título, objetivo terapêutico, versão, métricas de telemetria suportadas, botão "Iniciar Sessão" (abre modal pré-sessão) e botão secundário "Modo Livre" (**RN01**).
* **Critérios de Aceite:**
  * [ ] Layout no padrão `Game Row` com Auto Layout horizontal e espaçamento uniforme.
  * [ ] Pílulas de filtro por objetivo terapêutico estilizadas conforme o Figma (`Button filtro`).
  * [ ] Distinção clara entre início de sessão clínica e Modo Livre (sem persistência).

---

### Front: Alinhamento Visual do Relatório de Sessão e Metrics Bento do Figma (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/components/resultado/MetricasConsolidadasCards.tsx`, `Frontend/src/features/sessao/pages/ResultadoSessaoPage.tsx`
* **Ordem de Execução / Dependência:** **Dias 3 a 5**.
* **Requisitos:** RF14, RF16, RF20
* **Referência Documentação:** Figma Frame `Relatorio- InTEA` (id: `83:804`)
* **Descrição:** Ajustar os cards de métricas consolidadas pós-sessão para o formato `Metrics Bento` do Figma (Atenção, Precisão, Tempo de Reação e Intervenções DDA), alinhando cores, ícones, tipografia e disposição espacial ao lado do `PainelInsightsIA` e gráfico evolutivo.
* **Critérios de Aceite:**
  * [ ] Grid Bento de 4 métricas fiéis ao Frame `83:804` do Figma.
  * [ ] Tipografia de valores em destaque com cores temáticas do sistema.
  * [ ] Renderização correta tanto com dados simulados (`bdmock`) quanto dados reais da API.

---

### Front: Suíte de Testes Visuais e Unitários dos Componentes Refatorados (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/paciente/__test__/*`, `Frontend/src/features/jogos/__test__/*`, `Frontend/src/features/sessao/__test__/*`
* **Ordem de Execução / Dependência:** **Dias 5 a 6**.
* **Requisitos:** RNF01, RNF07
* **Referência Documentação:** AGENTS.md Seção 3
* **Descrição:** Atualizar e validar a suíte de testes unitários do Vitest no frontend para garantir que todos os componentes e páginas refatorados renderizam corretamente, respondem a interações do usuário e passam sem nenhum erro.
* **Critérios de Aceite:**
  * [ ] 100% dos testes de componentes e páginas passando com sucesso (`npm test`).
  * [ ] Zero avisos de propriedades ausentes ou erros de tipagem TypeScript.
  * [ ] Testes cobrindo os modos mock e real.

---

### 1.5. Documentação / Qualidade — Raildom Silva (@Raildom)

---

### Docs: Matriz de Auditoria Comparativa Front-End vs Figma e Mapeamento de Gaps (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** `docs/auditoria_frontend_figma.md`
* **Ordem de Execução / Dependência:** **Dias 1 a 2**.
* **Requisitos:** RNF01, RNF07
* **Referência Documentação:** Figma Inspector, Projeto_de_InTEA.pdf
* **Descrição:** Produzir documento formal de auditoria mapeando cada tela do Figma com os arquivos correspondentes no código, apontando os gaps visuais identificados, arquivos a serem removidos e as decisões de fidelidade visual adotadas.
* **Critérios de Aceite:**
  * [ ] Mapeamento completo de nós e frames do Figma vs código React.
  * [ ] Tabela comparativa de elementos de design (Auto Layout, cores, tipografia).
  * [ ] Lista exata de arquivos obsoletos identificados para remoção.

---

### Docs: Especificação Técnica da Variável de Mock e Catálogo de Componentes (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** `docs/guia_mock_e_componentes.md`
* **Ordem de Execução / Dependência:** **Dias 2 a 3**.
* **Requisitos:** RNF01, RNF07
* **Referência Documentação:** AGENTS.md Seção 3 e 4
* **Descrição:** Documentar a mecânica de operação da variável `VITE_USE_MOCK_DATA`, descrevendo como ativar e desativar os dados simulados, o comportamento de fallback e os componentes refatorados.
* **Critérios de Aceite:**
  * [ ] Documentação clara do arquivo `.env` e `.env.example`.
  * [ ] Guia de boas práticas para criação e uso de fixtures em `bdmock.ts`.
  * [ ] Diagrama de fluxo do fallback resiliente.

---

### Docs: Elaboração de Roteiro de Testes Manuais de Interface CT-S23 a CT-S30 (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** `docs/roteiro-testes.md`
* **Ordem de Execução / Dependência:** **Dias 4 a 5**.
* **Requisitos:** RF06, RF09, RF10, RF14, RF19
* **Referência Documentação:** Casos de Teste CT-S01 a CT-S22, Projeto_de_InTEA.pdf
* **Descrição:** Elaborar os casos de testes manuais de aceitação para homologação das telas refatoradas: CT-S23 (Dashboard e métricas do terapeuta), CT-S24 (Grid e busca de pacientes), CT-S25 (Cadastro de paciente), CT-S26 (Catálogo e Game Rows de jogos), CT-S27 (Modal pré-sessão e pareamento), CT-S28 (Cockpit e telemetria ao vivo), CT-S29 (Tela de resultados e Bento Grid), CT-S30 (Alternância de Mocks via .env).
* **Critérios de Aceite:**
  * [ ] Casos de teste CT-S23 a CT-S30 com passos detalhados, dados de entrada e resultados esperados.
  * [ ] Critérios rastreados com os requisitos funcionais correspondentes.
  * [ ] Formatação padronizada em Markdown.

---

### Docs: Relatório da Sprint 11 em LaTeX e Governança do Kanban (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** `docs/relatorio_sprint_11.tex`, `docs/DocsSprints/visao_geral.md`
* **Ordem de Execução / Dependência:** **Dias 5 a 6**.
* **Requisitos:** RNF07
* **Referência Documentação:** Projeto_de_InTEA.pdf, AGENTS.md Seção 5
* **Descrição:** Redigir o capítulo formal da Sprint 11 no relatório acadêmico em LaTeX (`relatorio_sprint_11.tex`), registrando a retrospectiva, decisões de design, métricas de código limpo e atualização do Hub Kanban em `visao_geral.md`.
* **Critérios de Aceite:**
  * [ ] Capítulo LaTeX compilando sem erros estruturais.
  * [ ] Atualização do status da Sprint 11 no Hub geral (`visao_geral.md`).
  * [ ] Fechamento dos cards com critérios sempre desmarcados (`[ ]`) para validação do usuário.
