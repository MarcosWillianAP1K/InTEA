# Cards de Tarefas — Sprint 10: Tela de Resultados e Relatórios Clínicos Analíticos

> **Sprint:** 10  
> **Período:** 08/10/2026 a 15/10/2026  
> **Tema Central:** Tela de Resultados e Relatórios Clínicos Analíticos  
> **Documento Mestre:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf)  
> **Diretrizes e Regras:** [AGENTS.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/AGENTS.md)  
> **Hub de Tarefas Geral:** [visao_geral.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/visao_geral.md)  

---

## 1. Cards por Integrante (20 Cards Principais)

> [!IMPORTANT]
> **Protocolo Anti-Conflito da Equipe InTEA (Sprint 10):**  
> Para a Sprint 10 (08/10/2026 a 15/10/2026), mantemos a segregação estrita de responsabilidades:
> 1. **Fronteira de Arquivos Exclusiva:** Cada membro trabalha em seus módulos dedicados. É proibido alterar arquivos alheios sem alinhamento prévio.
> 2. **Ordem Sequencial Obrigatória:** Marcos entrega primeiro os endpoints e modelos da sessão/relatório; João Marcos desenvolve o motor analítico e agregação estatística; Hermeson constrói a casca da página e navegação com slots; Luma entrega os componentes visuais e módulo de impressão/exportação para encaixe no layout; Raildom audita e documenta formalmente.
> 3. **Conformidade com Invariantes Clínicos:** Cumprimento rigoroso de **RN01** (Modo Livre não gera prontuário nem persiste relatório clínico), **RN04** (Acesso a resultados e anotações restrito a terapeutas com vínculo institucional ativo — HTTP 403) e **RN05** (Inalterabilidade e soft delete em relatórios e anotações).

---

### 1.1. Back-end 1 — Marcos Willian (@MarcosWillianAP1K)

---

### BD/Back: Migração e Model de Relatório de Sessão e Anotações Clínicas (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Database/migrations/008_create_tabela_relatorio_e_anotacao.sql`, `Database/database.sql`, `Backend/api/sessao/models/relatorio.model.ts`, `Backend/api/anotacao/models/anotacao.model.ts`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE FAZER PRIMEIRO (Dias 1 a 2)**. Cria a base relacional formal e os models TypeScript para que as rotas de resultados e o motor analítico de João Marcos possam operar.
* **Requisitos:** RF14, RF16, RN05, RNF06
* **Referência Documentação:** Seção 5.7 (Figura 4), RF14, RF16, RN05, AGENTS.md (Seção 6.2)
* **Descrição:** Criar migração SQL `008_create_tabela_relatorio_e_anotacao.sql` e atualizar `database.sql` garantindo conformidade rigorosa com a 3ª Forma Normal (**3FN**): a tabela `relatorio_sessao` vincula unicamente `sessao_id UUID UNIQUE NOT NULL REFERENCES public.sessao(id) ON DELETE RESTRICT` e armazena `dados_ia_json JSONB`, parecer e `soft_delete`, **sem duplicar redundantemente `paciente_id`** (já unívoco em `sessao`, suportando **RN01** onde modo livre tem `paciente_id = NULL`). A tabela `anotacao_clinica` contém `paciente_id UUID NOT NULL REFERENCES public.paciente(id)`, `terapeuta_id UUID NOT NULL REFERENCES public.terapeuta(id)`, `sessao_id UUID REFERENCES public.sessao(id) ON DELETE SET NULL`, `conteudo TEXT NOT NULL` e `soft_delete BOOLEAN DEFAULT FALSE`. Implementar models TypeScript estritos e auditar políticas RLS para ambas as tabelas prevenindo bloqueios acidentais (`42501`).
* **Critérios de Aceite:**
  * [ ] Migration executada com sucesso e idempotente (`IF NOT EXISTS`).
  * [ ] Conformidade 3FN: `relatorio_sessao` não duplica `paciente_id`, obtendo paciente via JOIN com `sessao`.
  * [ ] Tabela `anotacao_clinica` permite registro vinculado a paciente com ou sem sessão associada.
  * [ ] Políticas RLS auditadas garantindo acesso por vínculo institucional (**RN04**) e bypass de `service_role`.
  * [ ] Models `RelatorioSessaoModel` e `AnotacaoClinicaModel` com TypeScript estrito (zero `any`).
  * [ ] Trigger `impedir_hard_delete_clinico()` ativo bloqueando `DELETE` físico (**RN05**).

---

### Back: Endpoint de Consulta Consolidada dos Resultados da Sessão (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/sessao/controllers/sessao.controller.ts`, `Backend/api/sessao/services/sessao-resultado.service.ts`, `Backend/api/sessao/routes/sessao.routes.ts`
* **Ordem de Execução / Dependência:** **Dias 2 a 3 (Estruturação e leitura de banco com mocks); Dia 4 (Integração sequencial com a síntese de IA do Card 2.2 de João Marcos)**.
* **Requisitos:** RF14, RN01, RN04, RNF02
* **Referência Documentação:** RF14 (Tela de Resultados), RN01, RN04 (Vínculo Institucional), Contrato 4
* **Descrição:** Implementar a rota `GET /api/sessao/:id/resultado`. O endpoint consolida metadados da sessão (paciente, jogo, terapeuta, data/hora, duração), dados sintetizados da IA (`dados_ia_json` conforme Contrato 4) e anotações vinculadas. Valida se o terapeuta requisitante autenticado possui vínculo ativo com o paciente na mesma clínica (**RN04**). Para sessões em Modo Livre (**RN01**), retorna metadados operacionais da partida com supressão de dados de prontuário de paciente.
* **Critérios de Aceite:**
  * [ ] Retorno com status **`200 OK`** contendo payload estruturado do resultado para sessões finalizadas.
  * [ ] Retorno com status **`400 Bad Request`** se a sessão ainda não estiver no status `finalizada` (transição inválida de FSM).
  * [ ] Retorno com status **`403 Forbidden`** se o terapeuta não possuir vínculo ativo com o paciente na clínica (**RN04**).
  * [ ] Retorno com status **`404 Not Found`** se o `id` da sessão não for localizado.
  * [ ] Tratamento de sessões em Modo Livre suprimindo dados de prontuário e retornando `paciente: null` (**RN01**).

---

### Back: Módulo de Registro e Edição de Anotações Clínicas Pós-Sessão (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/anotacao/controllers/anotacao.controller.ts`, `Backend/api/anotacao/services/anotacao.service.ts`, `Backend/api/anotacao/routes/anotacao.routes.ts`, `Backend/api/index.ts`
* **Ordem de Execução / Dependência:** **Dias 3 a 4 (Construção do módulo e rotas); Dia 5 (Disponibilização para integração do Front Card 3.3 de Hermeson)**.
* **Requisitos:** RF16, RF21, RN04, RN05
* **Referência Documentação:** RF16 (Bloco de Anotações), RF21 (Autoria Obrigatória), RN05 (Inalterabilidade)
* **Descrição:** Criar módulo RESTful dedicado para gerenciamento do prontuário de anotações clínicas: `POST /api/anotacao` (criar parecer associado ao paciente e opcionalmente à sessão recém-concluída), `GET /api/anotacao/sessao/:sessaoId` (consultar anotações da sessão), `PATCH /api/anotacao/:id` (editar conteúdo da anotação) e `DELETE /api/anotacao/:id` (inativação lógica via soft delete). A autoria de `terapeuta_id` é obrigatoriamente extraída do token JWT autenticado (`req.user.id`) (**RF21**).
* **Critérios de Aceite:**
  * [ ] Rota `POST /api/anotacao` retorna status **`201 Created`** com payload da anotação criada.
  * [ ] Rota `PATCH /api/anotacao/:id` retorna status **`200 OK`** e bloqueia edição por terapeuta que não seja o autor (**403 Forbidden**).
  * [ ] Rota `DELETE /api/anotacao/:id` aplica soft delete (`soft_delete = true`) retornando **`204 No Content`** sem exclusão física (**RN05**).
  * [ ] Autoria vinculada exclusivamente ao terapeuta autenticado via token JWT, ignorando IDs no body (**RF21**).
  * [ ] Validação de permissão institucional por clínica e vínculo ativo com o paciente (**RN04**).

---

### Back: Suíte de Testes Automatizados da Tela de Resultados e Anotações (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/sessao/test/resultado_sessao.test.ts`, `Backend/api/anotacao/test/anotacao.test.ts`
* **Ordem de Execução / Dependência:** **Após 1.1, 1.2 e 1.3 (Dia 6)**. Valida a integração de ponta a ponta dos resultados e anotações.
* **Requisitos:** Qualidade de Software, RF14, RF16, RN01, RN04, RN05
* **Referência Documentação:** Pipeline CI/CD, `roteiro-testes.md`, Vitest
* **Descrição:** Desenvolver cobertura abrangente de testes automatizados com Vitest simulando o ciclo completo de consulta da Tela de Resultados e módulo de anotações: consulta de sessão finalizada com sucesso (200), rejeição de consulta para sessões ainda em andamento (`400 Bad Request`), tentativa de consulta por terapeuta sem vínculo (`403 Forbidden`), retorno correto para sessões em Modo Livre (`RN01`), criação de anotação (`201 Created`), edição autorizada (200), bloqueio de edição alheia (403), e soft delete imutável (`RN05`).
* **Critérios de Aceite:**
  * [ ] 100% dos testes passando no Vitest (`npm test` no `Backend/`).
  * [ ] Cobertura dos status HTTP canônicos (200, 201, 204, 400, 403, 404).
  * [ ] Validação dos cenários de autorização institucional (RN04) e imutabilidade histórica (RN05).
  * [ ] Testes sem vazamentos de memória ou conexões abertas com banco.

---

### 1.2. Back-end 2 — João Marcos (@JM3L0)

---

### Back: Motor de Agregação Estatística de Telemetria da Sessão (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/api/telemetria/services/telemetria-agregacao.service.ts`, `Backend/api/telemetria/routes/telemetria.routes.ts`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE FAZER PRIMEIRO (Dias 1 a 3)**. Operação em memória/queries analíticas. Fornece os cálculos consolidados para a síntese analítica da IA (Card 2.2) e para o relatório clínico.
* **Requisitos:** RF14, RNF04, RN02
* **Referência Documentação:** Seção 7.4.2 (Contrato 4), RF14, RNF04, RN02
* **Descrição:** Construir serviço especializado para compilar e sumarizar os eventos brutos registrados na tabela `telemetria_evento` de uma sessão finalizada: cálculo de tempo médio e mediana de reação/resposta, taxa de precisão de toques (acertos vs. erros), métricas de estabilidade de atenção por janelas temporais e contagem de eventos por tipo. Respeitar rigorosamente a tipagem estrita de cada indicador do manifesto (**RN02**), sem fallback automático.
* **Critérios de Aceite:**
  * [ ] Consolidação analítica precisa a partir dos registros temporais de `telemetria_evento`.
  * [ ] Tipagem rigorosa respeitando o `tipo_metrica` declarado no manifesto do jogo ativo (**RN02**).
  * [ ] Tratamento numérico robusto contra divisão por zero para sessões com pouca ou nenhuma telemetria.
  * [ ] Função pura e desacoplada pronta para ser consumida pelo motor de IA no Dia 3.

---

### Back: Síntese Analítica do Agente de IA e Geração do Contrato 4 (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/api/sessao/services/sessao-ia-analise.service.ts`
* **Ordem de Execução / Dependência:** **Dias 3 a 4**. Consome a agregação de telemetria do Card 2.1 e gera a síntese analítica do motor contextual.  
  * *Entrega no Dia 4:* Disponibiliza a função exportada para Marcos Willian integrar no Card 1.2 (`sessao-resultado.service.ts`).
* **Requisitos:** RF14, RF17, RNF02
* **Referência Documentação:** Contrato 4 (`docs/ModelosDeContratos/relatorio.json`), Figura 3, Figura 12
* **Descrição:** Desenvolver o gerador analítico de relatórios do Agente de IA aderente ao **Contrato 4**: geração de `analises_ia[]` contextuais com base nas intervenções de DDA que ocorreram durante a partida, cálculo da `resumo.taxa_conclusao`, identificação de tendência (`estavel`, `crescente`, `decrescente`) em `metricas_agregadas[]` e estruturação pronta para persistência em `relatorio_sessao.dados_ia_json`.
* **Critérios de Aceite:**
  * [ ] Formato 100% conforme a especificação do Contrato 4 (`docs/ModelosDeContratos/relatorio.json`).
  * [ ] Geração dinâmica de pareceres analíticos coerentes com as modulações de estresse e DDA da sessão.
  * [ ] Função exportada de forma modular para integração direta no endpoint de resultado (Card 1.2).

---

### Back: Endpoint e Serviço de Exportação de Relatório Clínico Estruturado (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/api/sessao/services/sessao-exportar.service.ts`, `Backend/api/sessao/routes/sessao.routes.ts`
* **Ordem de Execução / Dependência:** **Dias 4 a 5**. Focado na exportação formal de laudo clínico sanitizado para compartilhamento externo.  
  * *Entrega no Dia 5:* Conecta com o botão/hook de exportação do Frontend (Card 4.4 de Luma Maiara).
* **Requisitos:** RF20, RNF06, RN04
* **Referência Documentação:** RF20 (Exportação de Relatórios Clínicos), RNF06 (LGPD / Privacidade), RN04
* **Descrição:** Criar endpoint `GET /api/sessao/:id/exportar` para emissão do relatório em formato estruturado (JSON sanitizado e formatado para impressão de laudo clínico institucional). Reúne dados da clínica, registro profissional do terapeuta autor, identificação do paciente, tabela consolidada de métricas, parecer analítico da IA e espaço formal para carimbo e assinatura.
* **Critérios de Aceite:**
  * [ ] Retorno com status **`200 OK`** contendo o payload estruturado de exportação médica (RF20).
  * [ ] Retorno com status **`400 Bad Request`** se a sessão não estiver com status `finalizada`.
  * [ ] Retorno com status **`403 Forbidden`** se o terapeuta não possuir vínculo ativo com o paciente na clínica (**RN04**).
  * [ ] Retorno com status **`404 Not Found`** se o identificador da sessão for inválido.
  * [ ] Omissão e sanitização de dados internos de infraestrutura de servidores e chaves privadas (**RNF06**).

---

### Back: Testes Automatizados de Agregação, Síntese IA e Exportação (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/api/telemetria/test/telemetria_agregacao.test.ts`, `Backend/api/sessao/test/sessao_ia_exportar.test.ts`
* **Ordem de Execução / Dependência:** **Após 2.1, 2.2 e 2.3 (Dia 6)**. Valida a precisão matemática dos cálculos e a conformidade do Contrato 4.
* **Requisitos:** Qualidade de Software, RNF02, RF14, RF20
* **Referência Documentação:** Pipeline CI/CD, Vitest
* **Descrição:** Criar testes no Vitest cobrindo os cálculos estatísticos do serviço de agregação de telemetria, conformidade estrita do schema do Contrato 4 com validação Zod e teste unitário dos fluxos de exportação com verificação de status HTTP (200, 400, 403, 404).
* **Critérios de Aceite:**
  * [ ] 100% dos testes passando no Vitest (`npm test` no `Backend/`).
  * [ ] Testes de cálculo de métricas agregadas passando com exatidão matemática.
  * [ ] Testes de validação de schema do Contrato 4 aprovados sem divergências de campos.
  * [ ] Teste de exportação cobrindo casos de sessão finalizada, rejeição para não finalizada (400) e sem vínculo (403).

---

### 1.3. Front-end 1 — Hermeson Alves (@Hermeson69)

---

### Front: Página Mestre da Tela de Resultados da Sessão (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/pages/ResultadoSessaoPage.tsx`, `Frontend/src/App.tsx` (ou rotas da aplicação)
* **Ordem de Execução / Dependência:** ⚠️ **INTEGRAÇÃO SEQUENCIAL (Dias 1 a 3 Layout e Casca; Dias 4/5 Importa Componentes da Luma e Serviços do Backend)**.  
  * *Dias 1 a 3:* Cria a casca da página `/sessao/:id/resultado`, cabeçalho do paciente, dados da sessão e placeholders/slots estruturais para os componentes analíticos.  
  * *Dias 4/5:* Importa os componentes analíticos entregues por Luma Maiara (`<MetricasConsolidadasCards />`, `<GraficoEvolutivoResultado />`, `<PainelInsightsIA />`) e conecta ao endpoint `GET /api/sessao/:id/resultado` de Marcos Willian.  
  * *Zona Proibida:* É **PROIBIDO** editar arquivos dentro de `Frontend/src/features/sessao/components/resultado/` designados a Luma.
* **Requisitos:** RF14, RNF07
* **Referência Documentação:** Figura 12 (Tela da emissão do relatório de 1 paciente), RF14, AGENTS.md (Seção 6.3)
* **Descrição:** Desenvolver a página principal da Tela de Resultados (`/sessao/:id/resultado`), exibida após o encerramento da sessão ou na consulta posterior via prontuário. Orquestra a busca de dados via `useParams`, gerencia os estados clínicos e distribui as informações para os componentes filhos nos slots. Implementa estritamente os **4 estados visuais de interface** da Seção 6.3 do AGENTS.md.
* **Critérios de Aceite:**
  * [ ] Layout moderno, responsivo e aderente ao protótipo de alta fidelidade (Figura 12).
  * [ ] Cabeçalho clínico com identificação do paciente, registro profissional do terapeuta, badges de status e data/duração.
  * [ ] **Loading State:** Skeleton Loaders estruturais com dimensões idênticas aos blocos finais, eliminando CLS (*Cumulative Layout Shift*).
  * [ ] **Empty State:** Visual amigável caso a sessão não possua métricas consolidadas.
  * [ ] **Error State:** Feedback claro de erro com botão "Tentar Novamente", sem exibir mensagens técnicas brutas de rede.
  * [ ] **Success State:** Renderização fluida com transições suaves e slots populados pelos componentes de Luma.

---

### Front: Redirecionamento Fluido do Cockpit para a Tela de Resultados (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/pages/CockpitSessaoPage.tsx`, `Frontend/src/features/sessao/services/sessaoService.ts`
* **Ordem de Execução / Dependência:** **Dias 2 a 3**. Ajusta o fluxo pós-encerramento da jornada do terapeuta.
* **Requisitos:** RF13, RF14, RN01
* **Referência Documentação:** RF13, RF14, RN01, Figura 3 (Diagrama de Sequência)
* **Descrição:** Modificar o fluxo de encerramento em `CockpitSessaoPage.tsx`: após confirmar o término no modal e receber o retorno de sucesso do backend (`PATCH /api/sessao/:id/finalizar`), redirecionar o navegador para `/sessao/:id/resultado` caso seja sessão clínica com paciente. Para sessões em Modo Livre (**RN01**), redirecionar para a biblioteca de jogos (`/games`) com toast notificando que a partida livre foi concluída sem persistência em prontuário.
* **Critérios de Aceite:**
  * [ ] Sessão clínica finalizada navega automaticamente para `/sessao/:id/resultado`.
  * [ ] Sessão em Modo Livre redireciona para `/games` com toast clínico explicativo (**RN01**).
  * [ ] Botão de confirmação de encerramento desabilita com spinner (`isSubmitting`) prevenindo duplo clique.
  * [ ] Limpeza (*cleanup*) dos listeners de WebSocket e timers ao desmontar o Cockpit.

---

### Front: Bloco Interativo de Anotações Clínicas e Parecer do Terapeuta (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/components/resultado/BlocoAnotacoesClinicas.tsx`
* **Ordem de Execução / Dependência:** **Dias 1 a 3 (Interface isolada com mock); Dias 4 a 5 (Integração com endpoints `POST /api/anotacao` e `PATCH /api/anotacao/:id` de Marcos Willian)**.
* **Requisitos:** RF16, RF21, RN05
* **Referência Documentação:** RF16 (Bloco de Anotações), RF21 (Autoria Obrigatória), RN05, Figura 12
* **Descrição:** Implementar componente de anotações clínicas na Tela de Resultados: exibe o texto preliminar digitado no modal de encerramento, permite ao terapeuta complementar com novas observações pós-sessão, oferece salvamento assíncrono com botão e indicador visual de estado ("Salvo", "Salvando...", "Erro") e exibe a autoria indelével do profissional (**RF21**). Previne cliques múltiplos concorrentes.
* **Critérios de Aceite:**
  * [ ] Textarea acessível com contagem de caracteres e salvamento com botão protegido contra duplo clique (`isSubmitting`).
  * [ ] Indicadores visuais dos estados de persistência ("Salvando...", "Salvo com sucesso", "Falha ao salvar").
  * [ ] Integração com `POST /api/anotacao` (para novas anotações) e `PATCH /api/anotacao/:id` (para edições).
  * [ ] Exibição visível do nome e registro do terapeuta autor (**RF21**).

---

### Front: Testes Unitários e de Renderização da Tela de Resultados (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/__test__/ResultadoSessaoPage.test.tsx`, `BlocoAnotacoesClinicas.test.tsx`
* **Ordem de Execução / Dependência:** **Após 3.1, 3.2 e 3.3 (Dia 6)**. Testa sua própria tela e componentes.
* **Requisitos:** Qualidade de Software, RF14, RF16
* **Referência Documentação:** Pipeline CI, Vitest, Testing Library
* **Descrição:** Construir testes automatizados com Vitest e Testing Library cobrindo a renderização dos 4 estados visuais (Skeleton loader, Empty, Error com retry e Success), o fluxo de redirecionamento cockpit $\rightarrow$ resultado, o salvamento do bloco de anotações com prevenção de múltiplos cliques e o tratamento de Modo Livre.
* **Critérios de Aceite:**
  * [ ] 100% dos testes passando no Vitest (`npm test` no `Frontend/`).
  * [ ] Validação dos 4 estados de interface (Skeleton, Empty, Error, Success).
  * [ ] Testes de interação do bloco de anotações e bloqueio de cliques concorrentes.
  * [ ] Sem warnings do React ou violações de acessibilidade nos testes.

---

### 1.4. Front-end 2 — Luma Maiara (@lumamaiara)

---

### Front: Cards de Métricas Consolidadas e Sumário de Desempenho (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/components/resultado/MetricasConsolidadasCards.tsx`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE ENTREGAR PRIMEIRO (Dias 1 a 3)**.  
  * Constrói os cards modulares e puros em `components/resultado/` testando isoladamente com dados mockados.  
  * Entrega no Dia 3/4 para Hermeson importar nos slots de `ResultadoSessaoPage.tsx`.  
  * *Zona Proibida:* É **PROIBIDO** editar `ResultadoSessaoPage.tsx` ou chamar APIs/rotas diretamente.
* **Requisitos:** RF14, RNF04
* **Referência Documentação:** Figura 12, RF14, AGENTS.md (Seção 6.3)
* **Descrição:** Desenvolver o grid de cards informativos pós-sessão exibindo as métricas consolidadas: Tempo Total de Atividade, Taxa de Conclusão (%), Quantidade de Intervenções DDA, Pontuação Geral e Estabilidade de Foco, com comparativos visuais e badges de status. Componente 100% puro orientado a props, com suporte a Skeleton loader geométrico e tratamento gracioso para sessões em Modo Livre (**RN01**).
* **Critérios de Aceite:**
  * [ ] Componente puro recebendo dados estruturados via props sem acoplamento com axios ou roteador.
  * [ ] Skeleton loader estrutural (cards pulsantes) prevenindo salto de layout (zero CLS).
  * [ ] Tratamento de números, porcentagens e durações formatadas com precisão clínica.
  * [ ] Empty state informativo caso algum indicador não se aplique ao jogo ativo.

---

### Front: Gráfico Vetorial de Desempenho Temporal e Tempo de Reação (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/components/resultado/GraficoEvolutivoResultado.tsx`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE ENTREGAR PRIMEIRO (Dias 2 a 3)**. Componente atômico para compor a página de resultados.
* **Requisitos:** RF14, RNF04
* **Referência Documentação:** Figura 12 (Gráfico evolutivo do tempo de resposta), RNF04
* **Descrição:** Criar componente vetorial SVG puro e responsivo que plota a evolução da sessão: curva de tempo de resposta por tentativa ao longo dos minutos e marcadores visuais discretos sinalizando os momentos exatos em que o DDA modulou a dificuldade da partida.
* **Critérios de Aceite:**
  * [ ] Gráfico vetorial responsivo com eixos X (tempo decorrido) e Y (tempo de resposta em segundos) e tooltips interativos.
  * [ ] Marcadores destacados nos instantes exatos de intervenção da modulação DDA.
  * [ ] Skeleton loader geométrico com as dimensões idênticas do gráfico durante o carregamento.
  * [ ] Empty state amigável caso a partida não possua tentativas temporais suficientes registradas.

---

### Front: Painel de Insights da IA e Recomendações Clínicas (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/components/resultado/PainelInsightsIA.tsx`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE ENTREGAR PRIMEIRO (Dia 3)**. Componente atômico de visualização da IA.
* **Requisitos:** RF14, RNF02, RN01
* **Referência Documentação:** Contrato 4 (`relatorio.json`), Figura 12
* **Descrição:** Implementar componente puro de exibição dos insights analíticos gerados pelo motor de IA aderente ao **Contrato 4**: lista de observações contextuais (`analises_ia[]`), tendências das métricas agregadas (estável, crescente, decrescente) e sugestões adaptativas para as próximas sessões. Para Modo Livre (**RN01**), exibe empty state elegante informando ausência de DDA.
* **Critérios de Aceite:**
  * [ ] Exibição visual elegante dos pareceres com ícone de inteligência e badges temáticas de tendência.
  * [ ] Alertas visuais em destaque caso a IA tenha recomendado redução de estímulos sensoriais.
  * [ ] Skeleton loader estrutural para o container de análises da IA.
  * [ ] Empty state explicativo caso o motor de IA não tenha emitido alertas ou para Modo Livre (**RN01**).

---

### Front: Módulo de Exportação e Impressão Clínica em PDF (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/components/resultado/BotaoExportarRelatorio.tsx`, `Frontend/src/features/sessao/hooks/useRelatorioExport.ts`
* **Ordem de Execução / Dependência:** **Dias 4 a 5**. Focado na exportação e impressão clínica pelo terapeuta.  
  * *Integração no Dia 5:* Conecta com o endpoint `GET /api/sessao/:id/exportar` entregue por João Marcos no Card 2.3.
* **Requisitos:** RF20, RNF06, RNF07
* **Referência Documentação:** RF20 (Exportação de Relatórios Clínicos), Figura 12
* **Descrição:** Desenvolver o botão e hook de exportação do relatório de sessão: aciona a impressão formatada do navegador (`window.print()`) ou download de laudo PDF contendo layout médico limpo, cabeçalho da clínica, dados do paciente, gráficos consolidados, parecer da IA e área para assinatura do terapeuta, ocultando barras e botões da interface.
* **Critérios de Aceite:**
  * [ ] Botão de exportação acessível com proteção imediata contra múltiplos cliques (`isExporting` / spinner).
  * [ ] Folha de estilos de impressão (`@media print`) configurada para A4 padronizada (15mm de margem) sem quebras indesejadas.
  * [ ] Omissão completa de menus, botões interativos e cabeçalhos de navegação na impressão/PDF gerado.
  * [ ] Integração fluida com o endpoint de exportação estruturado do backend (Card 2.3).

---

### 1.5. Documentação / Qualidade — Raildom Silva (@Raildom)

---

### Docs: Seção 7.10 do Relatório Oficial LaTeX — Tela de Resultados (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** Relatório oficial LaTeX (`docs/*.tex` ou pasta de relatórios acadêmicos)
* **Ordem de Execução / Dependência:** **Dias 5 a 6**. Redação acadêmica após consolidação das entregas de código.
* **Requisitos:** Padrão Acadêmico UFPI
* **Referência Documentação:** Seção 7.10 do Projeto InTEA, Tabela 1 (Cronograma)
* **Descrição:** Redigir o capítulo oficial da Sprint 10 no documento acadêmico em LaTeX: arquitetura da Tela de Resultados, fluxo de agregação analítica do Contrato 4, consumo e exibição do relatório clínico na interface web (Figura 12), garantia de autoria (RF21) e imutabilidade de prontuário (RN05).
* **Critérios de Aceite:**
  * [ ] Arquivo LaTeX compilando sem erros ou avisos de referências quebradas.
  * [ ] Inclusão e citação formal da Figura 12 (Tela da emissão do relatório de 1 paciente).
  * [ ] Rastreabilidade formal com os requisitos RF14, RF16, RF20, RN01, RN04 e RN05.

---

### Docs: Especificação OpenAPI dos Endpoints de Resultados e Anotações (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** `docs/api-pacientes-jogos.md`, Swagger UI
* **Ordem de Execução / Dependência:** **Dias 3 a 4**. Baseia-se nos contratos estabilizados por Marcos e João.
* **Requisitos:** RNF02 (Swagger/OpenAPI), RF14, RF16, RF20, RF21
* **Referência Documentação:** `docs/api-pacientes-jogos.md`, Swagger UI, AGENTS.md (Seção 6.4)
* **Descrição:** Atualizar a documentação técnica da API com as novas rotas da Sprint 10: `GET /api/sessao/:id/resultado`, `POST /api/anotacao`, `PATCH /api/anotacao/:id`, `DELETE /api/anotacao/:id`, `GET /api/sessao/:id/exportar`, schemas de request/response em JSON e mapeamento rigoroso dos códigos HTTP canônicos (**200 OK**, **201 Created**, **204 No Content**, **400 Bad Request**, **403 Forbidden**, **404 Not Found**). Garantir paridade caractere por caractere com os DTOs do backend e interfaces do frontend (zero divergência snake_case vs camelCase).
* **Critérios de Aceite:**
  * [ ] Especificação OpenAPI completa com schemas de corpo, parâmetros e respostas.
  * [ ] Documentação clara das regras de segurança **RN04** (403 Forbidden para terapeuta sem vínculo) e **RN01** (Modo Livre).
  * [ ] Catálogo de endpoints sincronizado no repositório com exemplos reais de payload.

---

### Docs: Roteiro de Testes Manuais de Resultados da Sessão (CT-S15 a CT-S22) (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** `docs/roteiro-testes.md`
* **Ordem de Execução / Dependência:** **Dias 3 a 5**. Elabora os casos de teste para homologação da equipe.
* **Requisitos:** Qualidade de Software, RF14, RF16, RF20, RN01, RN04, RN05
* **Referência Documentação:** `docs/roteiro-testes.md`
* **Descrição:** Criar os casos de teste manuais formais da Sprint 10 (CT-S15 a CT-S22) no roteiro de testes: visualização de resultados de sessão finalizada, validação de insights de IA, registro e edição de anotações clínicas, rejeição por falta de vínculo (RN04), supressão de prontuário em Modo Livre (RN01) e impressão/exportação de PDF (RF20). Casos estritamente determinísticos com precondições, passos numerados e resultados esperados exatos.
* **Critérios de Aceite:**
  * [ ] Tabela padronizada com precondições, passos de execução, dados de entrada e resultado esperado.
  * [ ] Matriz de rastreabilidade atualizada totalizando 49 casos de teste.
  * [ ] Alinhamento com a equipe para homologação formal da sprint.

---

### Docs: Gestão e Governança do Quadro Kanban da Sprint 10 (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** GitHub Projects (Board, Issues, Labels, Milestones)
* **Ordem de Execução / Dependência:** ⚠️ **PRIORIDADE MÁXIMA (Dias 1 a 2)**.  
  * Sincronizar o board imediatamente: fechar oficialmente as issues concluídas da Sprint 9 e abrir os 20 cards da Sprint 10 com labels e responsáveis.  
  * *Zona Proibida:* É **PROIBIDO** alterar qualquer código-fonte em `Backend/` ou `Frontend/`.
* **Requisitos:** Gestão de Projeto
* **Referência Documentação:** GitHub Projects, `docs/DocsSprints/sprints/sprint-10.md`
* **Descrição:** Auditar e sincronizar o GitHub Projects: mover para `CLOSED` as issues da Sprint 9 finalizadas no código, cadastrar os 20 novos cards da Sprint 10 com suas respectivas etiquetas de Área (`area:back`, `area:front`, `area:bd`, `area:docs`), Tipo (`tipo:feature`, `tipo:validacao`, `tipo:docs`), responsáveis individuais e milestone da Sprint 10, além de organizar os cards extras desacoplados no backlog do projeto.
* **Critérios de Aceite:**
  * [ ] Board Kanban 100% alinhado com o estado real do código.
  * [ ] 20 issues da Sprint 10 criadas com labels, milestones e atribuição para os 5 integrantes.
  * [ ] Backlog de tarefas extras visível e estruturado no GitHub Projects.

---

## 2. Cards Extras — Sprint 10 (Backlog de Reforço Arquitetural)

> [!NOTE]
> **Sobre os Cards Extras:**  
> Os cards abaixo **NÃO estão associados a nenhum membro específico**. Representam melhorias arquiteturais, de segurança, performance e conformidade identificadas durante a auditoria técnica do projeto, ficando disponíveis para adiantamento livre ou refinamento em sprints futuras.

---

### BD/Back: Anonimização e Mascaramento LGPD na Exportação de Relatórios Clínicos (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Backend/core/formatters/lgpd.formatter.ts`, `Backend/api/sessao/services/sessao-exportar.service.ts`
* **Ordem de Execução / Dependência:** Independente. Módulo de formatação segura de dados.
* **Requisitos:** RNF06 (LGPD / Privacidade), RF20
* **Referência Documentação:** RNF06, RF20
* **Descrição:** Implementar módulo de sanitização e mascaramento de dados pessoais sensíveis (CPF, RG, endereços e telefones dos responsáveis) gerados no DTO de exportação do relatório clínico para terceiros, preservando estritamente os dados clínicos e nome do paciente, em conformidade com as exigências da LGPD para dados médicos de menores de idade.
* **Critérios de Aceite:**
  * [ ] Nenhum documento exportado contém CPF ou dados cadastrais completos não clínicos em texto claro.
  * [ ] Função utilitária de anonimização coberta por testes unitários determinísticos.
  * [ ] Manutenção da conformidade legal do laudo médico.

---

### BD/Back: Cache Materializado de Relatórios de Sessões Finalizadas (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Backend/core/cache/relatorio.cache.ts`, `Backend/api/sessao/services/sessao-resultado.service.ts`
* **Ordem de Execução / Dependência:** Independente. Camada de aceleração de leitura.
* **Requisitos:** RNF05, RN05
* **Referência Documentação:** RN05 (Imutabilidade de Registros Clínicos), RNF05
* **Descrição:** Como sessões com status `finalizada` tornam-se imutáveis por definição clínica (**RN05**), implementar mecanismo de cache em memória ou snapshot materializado do relatório analítico compilado, eliminando consultas repetitivas de agregação sobre a tabela `telemetria_evento` ao consultar históricos de pacientes.
* **Critérios de Aceite:**
  * [ ] Primeira consulta compila e armazena o snapshot do relatório em cache/tabela.
  * [ ] Consultas subsequentes retornam em sub-20ms sem reprocessar milhares de registros de telemetria.
  * [ ] Invalidação seletiva garantida caso haja acréscimo de anotação clínica.

---

### Front: Folha de Estilos de Impressão Clínica Acessível e Otimizada para PDF (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Frontend/src/styles/print.css`, `Frontend/src/features/sessao/components/resultado/RelatorioPrintTemplate.tsx`
* **Ordem de Execução / Dependência:** Independente. Template visual dedicado para impressão.
* **Requisitos:** RF20, RNF07
* **Referência Documentação:** RF20 (Exportação de Relatórios Clínicos), Figura 12
* **Descrição:** Desenvolver folha de estilos CSS de alta fidelidade para impressão médica profissional (`@media print`): margens A4 padronizadas (15mm), tipografia clínica limpa de alto contraste, quebras de página automáticas entre gráficos e pareceres, e cabeçalho com logotipo institucional e linha de assinatura do terapeuta.
* **Critérios de Aceite:**
  * [ ] Impressão gerada sem cortes acidentais de gráficos ou tabelas entre páginas.
  * [ ] Remoção completa de cabeçalhos, menus e botões interativos da tela web na impressão.
  * [ ] Compatibilidade testada nos motores Chromium, Gecko e WebKit.

---

### BD: Trigger PostgreSQL de Bloqueio Estrito contra Alteração e Hard Delete em Relatórios (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Database/migrations/009_trigger_bloqueio_relatorio.sql`, `Database/database.sql`
* **Ordem de Execução / Dependência:** Independente. Reforço de integridade na camada de banco de dados.
* **Requisitos:** RN05, RNF06
* **Referência Documentação:** RN05 (Inalterabilidade do Histórico Clínico), Tabela `relatorio_sessao`
* **Descrição:** Criar trigger PostgreSQL a nível de banco de dados (`BEFORE UPDATE OR DELETE ON public.relatorio_sessao`) que rejeita sumariamente qualquer instrução `DELETE` física e bloqueia alterações nos campos `dados_ia_json` e `sessao_id` após a persistência inicial, permitindo apenas atualizações controladas no parecer e flags de soft delete.
* **Critérios de Aceite:**
  * [ ] Trigger impede execução de `DELETE FROM relatorio_sessao` com mensagem de erro explícita.
  * [ ] Tentativa de sobrescrever dados brutos da IA em relatório já consolidado é abortada.
  * [ ] Teste unitário de banco validando o disparo do trigger.

---

## 3. Cards de Correção — Débitos Técnicos e Auditoria de Sprints Anteriores (Tipo: Fix)

> [!IMPORTANT]
> **Sobre os Cards de Correção (Fix):**  
> Identificados durante a auditoria técnica rigorosa das Sprints 7, 8 e 9 sob as regras do [AGENTS.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/AGENTS.md).  
> Corrigem vulnerabilidades de autorização (**RF21**), violações da Terceira Forma Normal (**3FN**), fragilidades de resiliência em WebSocket/FSM e fluxos descontinuados de interface antes da entrega da Sprint 10.

---

### Back: (Fix) Extração Segura de terapeuta_id a partir do JWT em POST /api/sessao/iniciar (Tipo: Fix)

* **Tipo:** Fix
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/sessao/controllers/sessao.controller.ts`, `Backend/api/sessao/routes/sessao.routes.ts`, `Backend/api/sessao/test/ciclo_sessao_telemetria.test.ts`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE FAZER PRIMEIRO (Dias 1 a 2)**. Reforço mandatário de segurança antes de novos fluxos de sessão.
* **Requisitos:** RF21 (Autenticação do Terapeuta), RNF03 (Segurança), RN04 (Vínculo Institucional)
* **Referência Documentação:** RF21, AGENTS.md Seção 6.1 (Princípio da Responsabilidade Única da Rota)
* **Descrição:** Em `Backend/api/sessao/controllers/sessao.controller.ts` (linha 45), o endpoint `POST /api/sessao/iniciar` extrai `terapeuta_id` diretamente do corpo da requisição (`req.body.terapeuta_id`), permitindo forja de identidade do terapeuta responsável. Este card refatora a rota para extrair a identidade do profissional exclusivamente do token JWT decodificado (`(req as AuthenticatedRequest).user?.id`). Caso o corpo da requisição contenha um `terapeuta_id` divergente do token autenticado, o endpoint rejeita a operação com status HTTP 403 Forbidden.
* **Critérios de Aceite:**
  * [ ] `terapeuta_id` obtido confiavelmente a partir do payload JWT verificado (`req.user.id`).
  * [ ] Requisições sem token JWT válido bloqueadas com HTTP 401 Unauthorized.
  * [ ] Tentativa de informar `terapeuta_id` conflitante com o token autenticado resulta em HTTP 403 Forbidden.
  * [ ] Testes de integração no Vitest cobrindo cenários com token válido, ausente e divergente com 100% de aprovação.

---

### BD: (Fix) Saneamento da Tabela relatorio_sessao e Políticas RLS para Conformidade 3FN e Modo Livre (Tipo: Fix)

* **Tipo:** Fix
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Database/database.sql`, `Database/migrations/008_normalizacao_relatorio_sessao.sql`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE FAZER PRIMEIRO (Dias 1 a 2)**. Ajuste de modelagem estrutural antes de consultas analíticas.
* **Requisitos:** 3FN (Terceira Forma Normal), RN01 (Modo Livre sem Persistência), RN04 (Vínculo Institucional), RN05
* **Referência Documentação:** AGENTS.md Seção 6.2 (Regra 3FN), Figura 4 (DER), RN01
* **Descrição:** Em `Database/database.sql` (linhas 240-250), a tabela `relatorio_sessao` possui `terapeuta_id UUID NOT NULL REFERENCES terapeuta(id)` e `paciente_id UUID NOT NULL REFERENCES paciente(id)`. Como `sessao_id UUID UNIQUE NOT NULL REFERENCES sessao(id)` já é a âncora relacional única e a tabela `sessao` já contém os relacionamentos com terapeuta e paciente, a obrigatoriedade dessas FKs em `relatorio_sessao` viola a 3FN e quebra sumários de sessões em Modo Livre (**RN01**), onde `paciente_id` é `NULL`. Este card cria migração idempotente saneando as constraints e reescreve as políticas RLS para validar autorização através da tabela pai `sessao` (`EXISTS (SELECT 1 FROM public.sessao s WHERE s.id = relatorio_sessao.sessao_id AND ...)`).
* **Critérios de Aceite:**
  * [ ] Migration idempotente `008_normalizacao_relatorio_sessao.sql` saneando a tabela `relatorio_sessao`.
  * [ ] `Database/database.sql` mantido sincronizado como Single Source of Truth sem constraints que quebrem sessões sem paciente.
  * [ ] Políticas RLS de `relatorio_sessao` reescritas com subquery `EXISTS` sobre a tabela pai `sessao`.
  * [ ] Suporte formal a relatórios de sessões com `paciente_id = NULL` sem violação de integridade referencial.

---

### Back: (Fix) Idempotência e Resiliência na Rota de Pareamento Remoto POST /api/sessao/parear (Tipo: Fix)

* **Tipo:** Fix
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/api/sessao/controllers/sessao.controller.ts`, `Backend/api/sessao/services/sessao-parear.service.ts`, `Backend/api/sessao/test/pareamento_idempotente.test.ts`
* **Ordem de Execução / Dependência:** **Dias 2 a 3**. Integração com a máquina de estados (FSM) de sessão.
* **Requisitos:** RF10 (Pareamento Remoto), RNF04 (Alta Disponibilidade e Resiliência)
* **Referência Documentação:** RF10, Figura 3 (Passos 8-10), RNF04
* **Descrição:** Identificou-se que oscilações temporárias de Wi-Fi no tablet do paciente podem disparar pings duplicados de conexão em `POST /api/sessao/parear`. Quando o primeiro ping transiciona o status de `aguardando_pareamento` para `conectado`, requisições imediatas subsequentes retornam `409 Conflict`, abortando indevidamente o início do game no tablet. Este card implementa idempotência lógica no handshake de pareamento: se o `session_token` for válido e a sessão já se encontrar em `conectado` ou `em_andamento`, o serviço confirma o pareamento e devolve os metadados com status HTTP 200 OK em vez de erro de conflito.
* **Critérios de Aceite:**
  * [ ] Primeira requisição de pareamento transiciona de `aguardando_pareamento` para `conectado` retornando HTTP 200.
  * [ ] Requisições concorrentes ou repetidas com mesmo token na mesma sessão ativa retornam HTTP 200 de forma idempotente.
  * [ ] Tokens expirados (> 15 min) continuam sendo estritamente rejeitados com HTTP 410 Gone.
  * [ ] Suíte de testes de estresse com chamadas simultâneas rodando 100% verde no Vitest.

---

### Front: (Fix) Redirecionamento Pós-Finalização para Tela de Resultados Consolidados (Tipo: Fix)

* **Tipo:** Fix
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/pages/CockpitSessaoPage.tsx`, `Frontend/src/features/sessao/components/ModalFinalizarSessao.tsx`
* **Ordem de Execução / Dependência:** **FAZ DEPOIS DE (Card 1.1 da Sprint 10 - Página Mestre de Resultados)**.
* **Requisitos:** RF13 (Ciclo da Sessão), RF14 (Tela de Resultados), RF19 (Assinatura e Síntese da IA)
* **Referência Documentação:** RF14, RF19, Seção 7.10 do Projeto InTEA
* **Descrição:** Em `Frontend/src/features/sessao/pages/CockpitSessaoPage.tsx` (linha 145), após o terapeuta confirmar o encerramento da sessão clínica, o handler executa `navigate("/games")`, quebrando a continuidade do fluxo médico e impossibilitando a visualização dos resultados imediatos da sessão. Este card corrige o fluxo de transição para navegar diretamente para a Tela de Resultados Consolidados recém-criada (`/sessao/${idOuToken}/resultado`), carregando as métricas e o parecer automatizado da IA para revisão clínica.
* **Critérios de Aceite:**
  * [ ] Finalização de sessão clínica no Cockpit redireciona automaticamente para `/sessao/:id/resultado`.
  * [ ] Sessões finalizadas em Modo Livre (sem paciente) redirecionam adequadamente para o catálogo de jogos (`/games`).
  * [ ] Identificador da sessão preservado no parâmetro de rota sem perdas de estado ou erros de hidratação.
  * [ ] Notificação toast de sucesso mantida durante a transição fluida de tela.

---

### Front: (Fix) Sincronização e Resiliência Temporal do Cronômetro Clínico contra Desvio e F5 (Tipo: Fix)

* **Tipo:** Fix
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/hooks/useClinicalTimer.ts`, `Frontend/src/features/sessao/pages/CockpitSessaoPage.tsx`, `Frontend/src/features/sessao/store/sessionStore.ts`
* **Ordem de Execução / Dependência:** **Dias 2 a 3**. Hook desacoplado de temporização de alta precisão.
* **Requisitos:** RF12 (Gestão de Sessão), RNF04 (Resiliência)
* **Referência Documentação:** RF12, Diretriz de Tolerância a Falhas e Refresh F5
* **Descrição:** O cronômetro do cockpit em `CockpitSessaoPage.tsx` utiliza um `setInterval` ingênuo somando segundos em variável de estado local. Caso o navegador aplique throttling em aba em segundo plano ou ocorra um refresh acidental da página (F5), o cronômetro desvia ou é zerado para 00:00, divergindo da duração real de atendimento. Este card extrai e refatora a lógica para o hook `useClinicalTimer`, calculando o tempo decorrido com base no delta real de milissegundos (`Date.now() - timestampInicioSessao`) persistido e hidratado pelo `sessionStorage`.
* **Critérios de Aceite:**
  * [ ] Tempo decorrido calculado a partir do delta de timestamps reais (`Date.now() - timestampInicio`).
  * [ ] Recarregamento da página (F5) recupera o tempo clínico exato sem reiniciar do zero.
  * [ ] Comando de pausa congela o delta com precisão e retoma sem acúmulo de tempo ocioso.
  * [ ] Testes unitários com Vitest simulando avanço no tempo com `vi.advanceTimersByTime()` passando com 100% de sucesso.
