# Cards de Tarefas — Sprint 11: Histórico Evolutivo e Gráficos Dinâmicos

> **Sprint:** 11  
> **Período:** 15/10/2026 a 22/10/2026  
> **Tema Central:** Histórico Evolutivo, Prontuário Longitudinal e Gráficos Dinâmicos (Engajamento Global e Séries por Jogo)  
> **Documento Mestre:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) (Tabela 1, Seção 5, Seção 7.11 e Figura 13)  
> **Diretrizes e Quality Gate:** [AGENTS.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/AGENTS.md)  
> **Hub de Tarefas Geral:** [visao_geral.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/visao_geral.md)  

---

## 1. Diretrizes Operacionais e Arquitetura do Histórico Clínico

> [!IMPORTANT]
> **Modelo Arquitetural do Histórico Clínico (Engajamento Global vs. Séries por Jogo):**  
> Para superar a inconsistência de comparar métricas heterogêneas entre diferentes jogos terapêuticos, o InTEA adota uma arquitetura em dois níveis:
> 1. **Nível 1 — Métricas Universais de Engajamento e Aderência (Transversal):** Métricas genéricas compartilhadas por todos os jogos (Taxa de Conclusão de Sessões %, tempo total de permanência jogando, assiduidade e frequência de interrupções/desistências por recusa ou desregulação sensorial do paciente).
> 2. **Nível 2 — Histórico Especializado por Jogo (Segmentado):** Consulta filtrada por `jogo_id` que recupera as sessões anteriores daquele jogo específico e traça a evolução longitudinal das métricas clínicas declaradas no manifesto do jogo (tempo de reação, acertos, frustração), sem forçar padronizações artificiais entre jogos distintos.
>
> **Modelo de Execução da Sprint 11:**  
> * **Cards Principais da Sprint (Seção 2):** Assinados formalmente por Marcos Willian (`@MarcosWillianAP1K`) e marcados com status **`In progress`** no quadro Kanban.
> * **Cards Extras de Reforço Arquitetural (Seção 3):** Mantidos como **`Não atribuído (Backlog Arquitetural)`** e marcados com status **`Ready`** no quadro Kanban para posterior divisão pela equipe.
> * **Homologação Soberana do Usuário:** Todos os critérios de aceite (`[ ]`) permanecem rigorosamente desmarcados para auditoria manual do usuário.

---

## 2. Cards Principais da Sprint 11 (Status: In progress — Marcos Willian)

---

### BD/Back: Modelagem e Índices para Histórico de Engajamento Global e Séries por Jogo (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Database/migrations/013_indices_historico_longitudinal.sql`, `Database/database.sql`, `Backend/api/paciente/models/historico.model.ts`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE FAZER PRIMEIRO (Dias 1 a 2)**. Cria os índices de alta performance no PostgreSQL e a modelagem tipada TypeScript para que os serviços de agregação de engajamento e séries especializadas consultem dados sem gargalos de I/O.
* **Requisitos:** RF15, RNF05, RN01, RN04, RN05
* **Referência Documentação:** RF15 (Prontuário Longitudinal), Seção 5.7 (DER), AGENTS.md (Seção 6.2)
* **Descrição:** Criar migração SQL idempotente `013_indices_historico_longitudinal.sql` e atualizar o schema mestre `Database/database.sql`. Adicionar índices compostos B-Tree parciais otimizados:
  1. `idx_sessao_paciente_engajamento` em `sessao(paciente_id, status_sessao, data_hora_fim DESC) WHERE paciente_id IS NOT NULL`, permitindo cômputo imediato da taxa de conclusão de sessões (finalizadas vs canceladas/interrompidas) e tempo total de engajamento;
  2. `idx_sessao_paciente_jogo_fim` em `sessao(paciente_id, jogo_id, data_hora_fim DESC) WHERE status_sessao = 'finalizada' AND paciente_id IS NOT NULL`, acelerando o filtro de histórico por jogo específico;
  3. Índice GIN `idx_relatorio_dados_ia_gin` em `relatorio_sessao USING gin (dados_ia_json)` para busca otimizada nas métricas analíticas.  
  Implementar o model `HistoricoSessaoModel` em TypeScript estrito (zero `any`), expondo os métodos:
  - `buscarMetricasEngajamentoGeral(pacienteId: string)`: total de sessões agendadas/iniciadas, finalizadas com sucesso, interrompidas/desistidas, taxa de conclusão (%) e tempo acumulado de jogo;
  - `buscarHistoricoPorJogo(pacienteId: string, jogoId: string, limit?: number)`: sessões finalizadas daquele jogo específico através de `JOIN` com `relatorio_sessao`, filtrando registros clínicos ativos (`relatorio_sessao.soft_delete = false` conforme **RN05**) e expurgando sessões em modo livre (`paciente_id IS NULL` conforme **RN01**).
* **Critérios de Aceite:**
  * [ ] Migration executada com sucesso e 100% idempotente (`CREATE INDEX IF NOT EXISTS`).
  * [ ] Criação do índice B-Tree parcial `idx_sessao_paciente_engajamento` em `sessao(paciente_id, status_sessao, data_hora_fim DESC)` com predicado `WHERE paciente_id IS NOT NULL`.
  * [ ] Criação do índice B-Tree composto `idx_sessao_paciente_jogo_fim` em `sessao(paciente_id, jogo_id, data_hora_fim DESC)` com predicado `WHERE status_sessao = 'finalizada' AND paciente_id IS NOT NULL`.
  * [ ] Criação do índice GIN `idx_relatorio_dados_ia_gin` em `relatorio_sessao USING gin (dados_ia_json)`.
  * [ ] Model `HistoricoSessaoModel` implementado em TypeScript estrito exportando métodos em camelCase (`buscarMetricasEngajamentoGeral` e `buscarHistoricoPorJogo`) sem uso de `any`.
  * [ ] Queries relacionais com JOIN garantindo exclusão estrita de partidas em modo livre (`paciente_id IS NULL` - **RN01**) e relatórios inativados (`soft_delete = true` - **RN05**).
  * [ ] Sincronização formal mantida intacta no Single Source of Truth `Database/database.sql`.

---

### Back: Endpoint de Histórico com Engajamento Universal e Séries Específicas por Jogo (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/paciente/controllers/paciente.controller.ts`, `Backend/api/paciente/services/paciente-historico.service.ts`, `Backend/api/paciente/models/paciente-historico.model.ts`, `Backend/api/paciente/routes/paciente.routes.ts`
* **Ordem de Execução / Dependência:** **FAZ DEPOIS DE (Task 1: Modelagem e Índices - Dias 2 a 3)**. Execução nos **Dias 3 a 4 (Construção do Serviço e Controller)** e **Dia 5 (Integração e Validação de Permissões)**.
* **Requisitos:** RF15, RF19, RF21, RN01, RN02, RN04, RNF02, RNF06
* **Referência Documentação:** Projeto_de_InTEA.pdf (Seção 5, RF15 — Prontuário Longitudinal; RF19 — Filtros e Paginação), docs/api-pacientes-jogos.md (Seção 2 — Módulo de Pacientes), AGENTS.md (Seção 6.1 — Back-end Quality Gate)
* **Descrição:** Implementar a rota RESTful `GET /api/paciente/:id/historico` protegida por `authMiddleware` e `verificarVisibilidadePaciente` (**RN04**). O controller atua como *thin controller*, validando parâmetros de rota e filtros via DTO tipado e delegando ao serviço `PacienteHistoricoService`. O serviço aceita query params (`jogoId`, `dataInicio`, `dataFim`, `page`, `limit` - **RF19**) e responde com uma estrutura em dois blocos:
  1. `engajamento_geral`: métricas universais válidas para todos os jogos (total de sessões realizadas, taxa de conclusão/aderência em porcentagem de 0 a 100% calculada por `(finalizadas / total_iniciadas) * 100`, contagem de sessões interrompidas/desistidas por recusa do paciente, e tempo total e médio de permanência jogando);
  2. `historico_por_jogo`: quando fornecido `jogoId`, filtra as sessões daquele jogo específico, cruza com o `manifesto_json` do jogo para extrair exclusivamente as métricas suportadas daquele jogo com seus tipos (`numerica`, `categorica`, `ordinal`, `booleana`). Caso qualquer métrica daquele jogo não possua tipo válido formalmente declarado no manifesto, a requisição é sumariamente rejeitada com HTTP **`422 Unprocessable Entity`**, vedado qualquer fallback automático (**RN02**). Quando `jogoId` for omitido, retorna a lista resumida de jogos já jogados pelo paciente (id, nome, contagem de sessões e data da última partida) para abastecer os seletores do frontend.  
  Sessões em Modo Livre são excluídas do cômputo (**RN01**). Acesso restrito a terapeutas com vínculo institucional ativo na mesma clínica extraído pelo JWT (**RF21**, **RN04**).
* **Critérios de Aceite:**
  * [ ] Retorno com status **`200 OK`** contendo o bloco `engajamento_geral` (taxa de conclusão %, tempo total, contagem de sessões finalizadas vs interrompidas) e o bloco `historico_por_jogo` (séries temporais das métricas daquele jogo ou catálogo de jogos jogados).
  * [ ] Retorno com status **`400 Bad Request`** caso o `:id` do paciente não seja um UUID válido ou haja inconsistência temporal nos filtros (`dataInicio > dataFim`, paginação inválida).
  * [ ] Retorno com status **`401 Unauthorized`** na ausência de token JWT válido no cabeçalho `Authorization`.
  * [ ] Retorno com status **`403 Forbidden`** se o terapeuta autenticado não possuir vínculo institucional ativo com o paciente na mesma clínica (**RN04**).
  * [ ] Retorno com status **`404 Not Found`** caso o paciente não seja localizado ou esteja inativo no banco de dados.
  * [ ] Retorno com status **`422 Unprocessable Entity`** caso qualquer métrica do jogo consultado não contenha `tipo_metrica` válido no manifesto do jogo (**RN02**).
  * [ ] Supressão total de partidas em Modo Livre (`paciente_id = NULL`), garantindo ausência de contaminação clínica no prontuário (**RN01**).
  * [ ] Código TypeScript estrito (zero uso de `any`), métodos em `camelCase` e 100% de aprovação na suíte de testes do Vitest (`npm test`).

---

### Front: Componentes de Engajamento Global e Renderizador de Métricas por Jogo (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:**  
  * `Frontend/src/features/paciente/components/CardsEngajamentoGeral.tsx`  
  * `Frontend/src/features/paciente/components/GraficoEvolucaoJogo.tsx`  
  * `Frontend/src/features/paciente/components/GraficoPolimorficoMetrica.tsx`  
  * `Frontend/src/features/paciente/components/GraficoLinhaTemporal.tsx`  
  * `Frontend/src/features/paciente/components/GraficoBarrasCategorico.tsx`  
  * `Frontend/src/features/paciente/components/IndicadorBooleanoMetrica.tsx`  
  * `Frontend/src/features/paciente/types/historico.types.ts`  
  * `Frontend/src/features/paciente/types/bdmock.ts`  
  * `Frontend/src/features/paciente/__test__/GraficoPolimorficoMetrica.test.tsx`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE ENTREGAR PRIMEIRO (Dias 2 a 4 — Desenvolvimento isolado de componentes atômicos)**.  
  * *Dias 2 a 3:* Criação das tipagens estritas em `historico.types.ts`, fixtures no `bdmock.ts` e subcomponentes visuais puros em SVG nativo.  
  * *Dia 4:* Composição dos cards de engajamento e container de evolução por jogo com testes unitários no Vitest.  
  * *Entrega no Dia 4/5:* Disponibilização para importação nos slots da Página de Histórico do Paciente.  
  * *Zona Proibida:* É **PROIBIDO** editar arquivos de páginas mestras (`Frontend/src/features/paciente/pages/*`) ou invocar endpoints de API diretamente a partir destes componentes.
* **Requisitos:** RF15, RNF04, RN02, RNF02, RNF07
* **Referência Documentação:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) (Tabela 1 - Sprint 11, Seção 5.1 RF15, Seção 5.2 RNF04/RNF07, Seção 7.4.2 Contrato 1 — Manifesto do Jogo e Figura 13); [AGENTS.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/AGENTS.md) (Seção 6.3).
* **Descrição:** Construir componentes visuais puros e orientados a props em SVG nativo e Tailwind CSS para as duas dimensões clínicas:
  1. `CardsEngajamentoGeral`: cards de topo exibindo as métricas universais do paciente: Taxa de Conclusão / Aderência de Sessões (% de sessões finalizadas com sucesso vs desistências/interrupções), Tempo Total e Médio de Engajamento Ativo, e Assiduidade.
  2. `GraficoEvolucaoJogo`: container acionado ao selecionar um jogo específico, orquestrando a plotagem das métricas exclusivas daquele jogo ao longo do tempo.
  3. `GraficoPolimorficoMetrica`: renderizador polimórfico especializado que recebe a série temporal e inspeciona o `tipo_metrica` declarado no manifesto do jogo selecionado:
     - `GraficoLinhaTemporal`: traçado contínuo vetorial para métricas numéricas (`tipo_metrica = "numerica"`);
     - `GraficoBarrasCategorico`: barras de distribuição de frequência para métricas categóricas ou ordinais (`tipo_metrica = "categorica"` ou `"ordinal"`);
     - `IndicadorBooleanoMetrica`: timeline discreta de ocorrências para métricas booleanas (`tipo_metrica = "booleana"`).  
  Em cumprimento estrito à regra clínica **RN02**, é **terminantemente proibido aplicar fallback automático para gráfico de barras/categórico** quando `tipo_metrica` for nulo ou omitido no manifesto. Nestes casos, renderiza Error State visual controlado informando `Inconsistência de Tipagem Clínica (RN02)`.
* **Critérios de Aceite:**
  * [ ] Renderização correta dos cards de `CardsEngajamentoGeral` exibindo taxa de conclusão (%) com badge semântico (verde para >=80%, âmbar para <80%), tempo de engajamento e contagem de sessões finalizadas vs interrompidas.
  * [ ] Renderização correta de gráficos em SVG nativo para o jogo selecionado: linhas para métricas numéricas, barras para categóricas/ordinais e timeline para booleanas.
  * [ ] **Garantia Inviolável da RN02:** Rejeição de fallback automático; quando `tipo_metrica` for omitido ou inválido, renderiza Error State controlado contendo badge de alerta clínico e texto descritivo da não conformidade do manifesto.
  * [ ] **Loading State:** Skeleton loaders estruturais com geometria idêntica aos cards e containers gráficos, assegurando zero salto visual (zero CLS).
  * [ ] **Empty State:** Visual amigável quando o paciente não possuir sessões registradas com o jogo selecionado, orientando o terapeuta a aplicar intervenções com o jogo.
  * [ ] **Ergonomia e Acessibilidade (RNF07):** Elementos interativos (tooltips e seletores) com alvos mínimos de 44x44px, tags SVG acessíveis (`<title>`, `role="img"`, `aria-label`) e suporte completo a temas claro/escuro via tokens do Tailwind CSS.
  * [ ] **Isolamento Modular e Fixtures:** Componentes 100% determinísticos e orientados a props com massas de dados de teste completas para os 4 tipos de métricas integradas em `Frontend/src/features/paciente/types/bdmock.ts`.
  * [ ] **Qualidade e Testes (Vitest):** Suíte de testes unitários em `GraficoPolimorficoMetrica.test.tsx` com 100% de aprovação (`npm test`), validando engajamento, seleção do subcomponente por `tipo_metrica` e o bloqueio de RN02.

---

### Front: Página Mestre do Histórico do Paciente com Seletor por Jogo e Timeline (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Frontend/src/features/paciente/pages/HistoricoPacientePage.tsx`, `Frontend/src/features/paciente/components/SeletorJogoHistorico.tsx`, `Frontend/src/features/paciente/components/LinhaDoTempoSessoes.tsx`, `Frontend/src/features/paciente/components/FiltrosHistoricoAvancado.tsx`, `Frontend/src/features/paciente/services/paciente.service.ts`, `Frontend/src/features/paciente/types/paciente.types.ts`, `Frontend/src/features/paciente/types/bdmock.ts`, `Frontend/src/routes/index.tsx`
* **Ordem de Execução / Dependência:** **FAZ DEPOIS DE (Task 2: Endpoint e Task 3: Componentes de Engajamento/Gráficos - Dias 4 a 5)**. Integração da página com layout e serviços reais.
* **Requisitos:** RF15, RF19, RN04, RNF07
* **Referência Documentação:** Figura 13 (Tela do Histórico do Paciente, Página 22 do PDF), RF15, RF19, AGENTS.md (Seção 6.3)
* **Descrição:** Construir a página mestre `HistoricoPacientePage` (rota `/pacientes/:id/historico`) aninhada ao `SidebarLayout` sob proteção de rota (`ProtectedRoute`), espelhando a **Figura 13** do documento mestre do projeto enriquecida com a arquitetura dual:
  1. Topo: exibe `CardsEngajamentoGeral` com o panorama universal do paciente (taxa de conclusão %, horas jogadas acumuladas, histórico de interrupções);
  2. Barra de Seleção e Filtros: implementa `SeletorJogoHistorico` (permitindo alternar entre "Visão Geral de Engajamento" e jogos específicos do catálogo já experimentados pelo paciente) combinado a `FiltrosHistoricoAvancado` (intervalo de datas de 7d, 30d, 3m e personalizado - **RF19**);
  3. Área Central: renderiza os gráficos de `GraficoEvolucaoJogo` com a evolução das métricas do jogo selecionado;
  4. Linha do Tempo Cronológica: implementa `LinhaDoTempoSessoes` exibindo a listagem cronológica de intervenções com badges de status semânticos (Verde para Concluída com sucesso; Âmbar para Interrompida/Desistida com motivo), terapeuta responsável e atalho de navegação para a Tela de Resultados (`/sessao/:id/resultado`).  
  Atualiza `paciente.service.ts` com fallback para `bdmock.ts` via `withFallback()`.
* **Critérios de Aceite:**
  * [ ] Rota `/pacientes/:id/historico` devidamente registrada em `Frontend/src/routes/index.tsx` aninhada ao `SidebarLayout` e linkada a partir da `PerfilPacientePage`.
  * [ ] Tipagens DTO de engajamento, histórico por jogo e fixtures completas adicionadas em `paciente.types.ts` e `bdmock.ts`.
  * [ ] Seletor de jogos funcional permitindo isolar a análise evolutiva para um jogo específico do paciente com atualização reativa dos gráficos.
  * [ ] Barra de filtros funcional permitindo refinar histórico por período com recálculo reativo da taxa de conclusão e engajamento (**RF19**).
  * [ ] Linha do tempo cronológica com cards de sessões anteriores detalhando intervenções, terapeuta, status de conclusão e atalho com alvo de toque mínimo de 44x44px (**RNF07**).
  * [ ] Cobertura integral dos 4 estados visuais: Skeleton Loader proporcional sem Layout Shift (CLS), Empty State amigável, Error State com botão de retry e feedback visual para erro **403 Forbidden** de vínculo institucional (**RN04**).
  * [ ] Layout responsivo sem rolagem horizontal indesejada (`overflow-x`) testado para resoluções de tablets de 10 polegadas (1024x768).

---

### Back: Suíte de Testes de Integração do Histórico (Engajamento e Séries por Jogo) (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/paciente/test/paciente_historico.test.ts`
* **Ordem de Execução / Dependência:** **Após implementação dos endpoints de Paciente e Sessão (Dia 6)**. Validação final de fechamento da sprint e garantia de qualidade da API.
* **Requisitos:** Qualidade de Software, RF15, RF19, RN01, RN02, RN04, RN05, RNF02
* **Referência Documentação:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) (RF15, RF19), [api-pacientes-jogos.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/api-pacientes-jogos.md), [AGENTS.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/AGENTS.md) (Seção 6.1)
* **Descrição:** Desenvolver suíte abrangente de testes automatizados com Vitest cobrindo a integridade dos dois níveis de histórico clínico longitudinal do paciente (`GET /api/paciente/:id/historico`):
  1. Validação matemática do cômputo de engajamento global: taxa de conclusão percentual (ex: 8 sessões finalizadas de 10 iniciadas = 80%), soma de tempo total jogado e contagem exata de desistências/interrupções (**RF15**);
  2. Validação do filtro por `jogoId`: conferência de que as métricas retornadas pertencem estritamente àquele jogo;
  3. Testes de filtros dinâmicos por intervalo de datas (`dataInicio`, `dataFim`) e paginação (**RF19**);
  4. Validação rigorosa de isolamento institucional: rejeição com **`403 Forbidden`** quando o terapeuta requisitante não possui vínculo ativo na mesma clínica (**RN04**);
  5. Validação do tratamento de paciente inexistente ou excluído retornando **`404 Not Found`**;
  6. Supressão comprovada de dados de sessões em Modo Livre: garantir que partidas com `paciente_id = NULL` jamais vazem ou afetem as taxas de engajamento do prontuário (**RN01**);
  7. Rejeição com status **`422 Unprocessable Entity`** em cenários com manifestos que contenham métricas sem tipagem estrita no jogo consultado (**RN02**);
  8. Verificação de integridade relacional e inalterabilidade de histórico clínico (**RN05**).
* **Critérios de Aceite:**
  * [ ] 100% dos testes passando no Vitest (`npm test` no `Backend/`).
  * [ ] Cobertura de todos os cenários HTTP canônicos: **`200 OK`**, **`400 Bad Request`**, **`403 Forbidden`**, **`404 Not Found`** e **`422 Unprocessable Entity`**.
  * [ ] Validação automatizada comprovando cálculo exato da taxa de conclusão e supressão de telemetria de Modo Livre (**RN01**).
  * [ ] Testes de permissão institucional comprovando bloqueio de acesso entre clínicas ou sem vínculo ativo (**RN04**).
  * [ ] Ausência de vazamento de conexões de banco de dados ou handles abertos após a execução da suíte.

---

### Docs: Especificação OpenAPI, Roteiro de Testes e Relatório Executivo da Sprint 11 (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `docs/api-pacientes-jogos.md`, `docs/roteiro-testes.md`, `docs/DocsProjeto/05-sprints-e-evolucao/01-visao-geral-sprints.md`, `docs/DocsSprints/sprints/sprint-11.md`
* **Ordem de Execução / Dependência:** **Dias 3 a 6 (Acompanhamento contínuo e consolidação na entrega final da Sprint 11)**.
* **Requisitos:** RF15, RF19, RN02, RN04, RN05, RNF02, RNF06, Governança
* **Referência Documentação:** Seção 7.11 do Projeto InTEA (Página 35), `docs/roteiro-testes.md`, `docs/api-pacientes-jogos.md`
* **Descrição:** Documentar formalmente os artefatos de engenharia da Sprint 11 contemplando o modelo em dois níveis de histórico:
  1. Atualizar `docs/api-pacientes-jogos.md` com a especificação da rota `GET /api/paciente/:id/historico`, detalhando os blocos `engajamento_geral` e `historico_por_jogo`, query params (`jogoId`, intervalo de datas) e tabela de status HTTP canônicos (**200**, **400**, **403**, **404**, **422**);
  2. Elaborar os Casos de Teste Manuais determinísticos (CT-S23 a CT-S28) em `docs/roteiro-testes.md` cobrindo cenários de visualização da taxa de conclusão de sessões, troca de jogos no seletor, validação de gráficos polimórficos e testes negativos de vínculo institucional (**RN04**) e manifesto sem tipo (**RN02**);
  3. Redigir o relatório executivo da Sprint 11 em `docs/DocsSprints/sprints/sprint-11.md` e sincronizar as matrizes de rastreabilidade em `docs/DocsProjeto/05-sprints-e-evolucao/01-visao-geral-sprints.md`.
* **Critérios de Aceite:**
  * [ ] Rota `GET /api/paciente/:id/historico` documentada na especificação OpenAPI com exemplos completos de payload para engajamento geral e séries por jogo, além do catálogo de erros HTTP canônicos (200, 400, 403, 404, 422).
  * [ ] 6 casos de teste manuais (CT-S23 a CT-S28) estruturados em `docs/roteiro-testes.md` com precondições, passos numerados e validação das regras de engajamento, RN02 e RN04.
  * [ ] Relatório `sprint-11.md` redigido cobrindo objetivos da sprint, entregas por camada e matriz de rastreabilidade.
  * [ ] Matriz em `01-visao-geral-sprints.md` e Hub de navegação com links 100% íntegros e funcionais.

---

## 3. Cards Extras — Backlog de Reforço Arquitetural (Status: Ready — Não atribuído)

> [!NOTE]
> Os cards abaixo **NÃO estão associados a nenhum membro específico** e possuem status **`Ready`** no quadro Kanban. Representam melhorias arquiteturais, de performance e ergonomia identificadas durante o planejamento da Sprint 11, ficando disponíveis para adiantamento livre ou refinamento pela equipe.

---

### BD/Back: View Materializada e Cache em Memória para Resumo de Engajamento e Desempenho por Jogo (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Database/migrations/014_view_materializada_historico.sql`, `Database/database.sql`, `Backend/core/cache/historico.cache.ts`, `Backend/api/paciente/services/paciente-historico.service.ts`, `Backend/api/paciente/test/historico_longitudinal.test.ts`
* **Ordem de Execução / Dependência:** Independente. Otimização não-bloqueante para prontuários de alta volumetria.
* **Requisitos:** RF15, RNF05, RNF06, RN01, RN04, RN05
* **Referência Documentação:** RF15 (Prontuário Longitudinal), RNF05 (SLA sub-50ms), Projeto_de_InTEA.pdf Seção 7.8
* **Descrição:** Em pacientes com dezenas de atendimentos, calcular dinamicamente a taxa de conclusão e agregar séries históricas por jogo pode sobrecarregar o banco. Este card implementa uma View Materializada no PostgreSQL (`vw_resumo_longitudinal_paciente`) agregando métricas de engajamento universal e totais por jogo com índice único por `paciente_id` para viabilizar `REFRESH CONCURRENTLY`. Sessões em Modo Livre (`paciente_id IS NULL` - RN01) e registros deletados logicamente (`soft_delete = true` - RN05) são estritamente excluídos do agregado. Como views materializadas não suportam RLS nativo no PostgreSQL, o acesso à view é restrito exclusivamente ao papel interno `service_role`, sendo exposto pelo serviço backend via camada de cache em memória (`HistoricoCache`) com invalidação assíncrona orientada a eventos pós-fechamento de sessão, garantindo checagem estrita de vínculo institucional ativo (**RN04** / 403 Forbidden).
* **Critérios de Aceite:**
  * [ ] Migração SQL idempotente criando a View Materializada com cláusula `WHERE s.paciente_id IS NOT NULL` e `soft_delete = false` (**RN01**, **RN05**).
  * [ ] Criação mandatória de `UNIQUE INDEX idx_vw_resumo_paciente_id ON public.vw_resumo_longitudinal_paciente (paciente_id)` para viabilizar execução de `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
  * [ ] Permissões de banco configuradas restringindo leitura direta da view à `service_role` (revogando `SELECT` do papel `authenticated` do Supabase para blindar **RN04**).
  * [ ] Camada de cache `HistoricoCache` implementada em TypeScript estrito com TTL de 300s e método `invalidar(pacienteId)` desacoplado de transações síncronas de fechamento de sessão.
  * [ ] Rota `GET /api/paciente/:id/historico` respondendo em tempo inferior a 50ms (sub-50ms) para prontuários com mais de 50 sessões registradas (**RNF05**).
  * [ ] Retorno com status **`200 OK`** contendo os agregados estatísticos para terapeutas com vínculo institucional ativo.
  * [ ] Retorno com status **`403 Forbidden`** quando o terapeuta autenticado não possuir vínculo ativo com o paciente na mesma clínica (**RN04**).
  * [ ] Retorno com status **`404 Not Found`** quando o `id` do paciente não existir no banco.
  * [ ] 100% dos testes unitários e de integração passando no Vitest (`npm test` no `Backend/`), incluindo validação de concorrência e idempotência.

---

### Back: Endpoint de Exportação Unificada do Prontuário Longitudinal Completo (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Backend/api/paciente/controllers/paciente.controller.ts`, `Backend/api/paciente/services/paciente-exportar-historico.service.ts`, `Backend/api/paciente/routes/paciente.routes.ts`, `Backend/api/paciente/test/paciente_exportar_historico.test.ts`
* **Ordem de Execução / Dependência:** Independente. Backlog de Reforço Arquitetural pós-Sprint 10. Assume como pré-requisitos os schemas consolidados de `paciente`, `sessao`, `relatorio_sessao` (3FN) e `anotacao_clinica`.
* **Requisitos:** RF20 (Exportação de Relatórios), RF06 (Gestão de Pacientes), RF21 (Autoria Obrigatória), RN01 (Isolamento de Modo Livre), RN04 (Vínculo Institucional), RN05 (Inalterabilidade Histórica / Soft Delete), RNF06 (Privacidade e LGPD)
* **Referência Documentação:** Projeto_de_InTEA.pdf (Seção 4 / RF20, Seção de Segurança / RNF06); AGENTS.md (Seção 2 / RN01..RN05; Seção 6.1 / Thin Controller e Semântica REST); api-pacientes-jogos.md (Módulo 2: Pacientes)
* **Descrição:** Implementar a rota `GET /api/paciente/:id/prontuario/exportar` seguindo a arquitetura em camadas (Thin Controller, Fat Service). O controller valida o UUID do parâmetro de rota, extrai o terapeuta autenticado via token JWT (`req.user.id`) e delega ao serviço especializado `PacienteExportarHistoricoService`. O serviço verifica a conformidade institucional (**RN04** — vínculo ativo e mesma clínica), compila a evolução longitudinal com o quadro de engajamento geral e o histórico de cada jogo experimentado pelo paciente (filtrando e excluindo registros com `soft_delete = true` conforme **RN05** e ignorando partidas de Modo Livre conforme **RN01**), anotações médicas autorizadas e consolidação estatística temporal. Aplica a sanitização e mascaramento de CPF da LGPD (**RNF06**) e gera o documento em PDF estruturado com cabeçalho institucional da clínica, tabelas de evolução e bloco de assinatura formal clínica (nome do profissional, conselho de classe e hash de autenticidade).
* **Critérios de Aceite:**
  * [ ] Retorno com status **`200 OK`**, cabeçalhos `Content-Type: application/pdf` e `Content-Disposition: attachment; filename="prontuario-longitudinal-[id].pdf"` contendo o documento formatado.
  * [ ] Retorno com status **`400 Bad Request`** caso o `:id` fornecido não seja um UUID válido.
  * [ ] Retorno com status **`401 Unauthorized`** se a requisição não contiver token JWT válido ou estiver expirado.
  * [ ] Retorno com status **`403 Forbidden`** se o terapeuta requisitante não possuir vínculo ativo com o paciente ou pertencer a outra clínica (**RN04**).
  * [ ] Retorno com status **`404 Not Found`** se o paciente não existir no banco de dados ou estiver inativado logicamente via soft delete (`status_ativo = false`).
  * [ ] Suporte gracioso a *Empty State*: paciente recém-cadastrado sem sessões finalizadas gera o prontuário com indicação formal de "Nenhuma intervenção clínica realizada até o momento", sem lançar erro interno `500`.
  * [ ] Conformidade estrita com LGPD (**RNF06**): mascaramento automático de CPF (`***.XXX.***-XX`) e dados cadastrais restritos ao necessário.
  * [ ] Supressão de sessões de Modo Livre (**RN01**) e descarte de anotações marcadas com soft delete (**RN05**).
  * [ ] Bloco de assinatura formal contendo identificação profissional, registro de conselho (CRP/CREFITO/CRM) e código verificador de autenticidade emitido.
  * [ ] Suíte de testes automatizados com Vitest em `Backend/api/paciente/test/paciente_exportar_historico.test.ts` cobrindo cenários 200, 400, 401, 403, 404 e empty-state rodando 100% verde (`npm test`).
  * [ ] Código com TypeScript estrito, zero uso do tipo `any` e métodos em `camelCase`.

---

### Front: Modal de Comparação Detalhada Lado a Lado de Duas Sessões de um Mesmo Jogo (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Frontend/src/features/paciente/components/ModalCompararSessoes.tsx`, `Frontend/src/features/paciente/components/TabelaComparativaMetricas.tsx`
* **Ordem de Execução / Dependência:** Independente. Recurso de ergonomia analítica no front desacoplado de APIs ativas.
* **Requisitos:** RF15 (Histórico do Paciente), RF19 (Filtros e Seleção), RNF07 (Usabilidade e Acessibilidade)
* **Referência Documentação:** RF15, RNF07, AGENTS.md Seção 6.3 (Front-end Quality Gate)
* **Descrição:** Desenvolver componentes puros e orientados a props em `features/paciente/components/` para comparação analítica lado a lado de exatamente duas sessões finalizadas **de um mesmo jogo terapêutico** (ex.: a primeira sessão de baseline e a sessão mais recente daquele jogo). O modal recebe as duas sessões (`sessaoBaseline` e `sessaoComparada`), plota seus metadados (data, duração, nível DDA) e renderiza a tabela comparativa com o delta relativo percentual de cada métrica daquele jogo. O cálculo de delta trata divisão por zero (`base === 0`) e respeita a polaridade clínica de melhora (redução de tempo de reação e frustração sinalizada em verde com badge positivo; aumento de tempo de foco em verde; elevações de estresse em vermelho/alerta). Caso o usuário selecione sessões de jogos diferentes, exibe Empty State orientador informando que a comparação direta requer partidas do mesmo jogo. Suporta Radix UI primitives com acessibilidade completa (focus trap, ARIA e tecla ESC) e área de toque mínima de 44x44px.
* **Critérios de Aceite:**
  * [ ] Botão de abertura do modal condicionado à seleção estrita de exatamente duas sessões na interface histórica do paciente (`disabled` quando seleção != 2).
  * [ ] Componentes 100% puros e desacoplados, recebendo dados e callbacks (`isOpen`, `onClose`, `sessaoA`, `sessaoB`) com tipagem TypeScript estrita (sem `any`).
  * [ ] Cálculo matemático seguro de deltas com tratamento explícito para divisões por zero ou valores ausentes.
  * [ ] Formatação visual dos deltas orientada à polaridade clínica da métrica (verde para evolução terapêutica positiva, vermelho/âmbar para regressões ou aumento de gatilhos).
  * [ ] **Loading State:** Skeleton Loaders estruturais nas linhas da tabela de métricas prevenindo salto visual (zero CLS).
  * [ ] **Incompatible State:** Feedback visual ilustrado caso as duas sessões pertençam a jogos diferentes, orientando o terapeuta a comparar partidas do mesmo jogo.
  * [ ] Acessibilidade WCAG e RNF07: Diálogo modal acessível com `role="dialog"`, `aria-modal="true"`, foco gerenciado (focus trap), fechamento por tecla ESC, clique fora e botões com área de clique mínima de 44x44px.

---

### Front: Sparklines SVG de Taxa de Conclusão e Engajamento na Listagem de Pacientes (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Frontend/src/features/paciente/components/SparklineTendencia.tsx`, `Frontend/src/features/paciente/components/CardPacienteGrid.tsx`, `Frontend/src/features/paciente/components/ListaPacientes.tsx`, `Frontend/src/features/paciente/types/paciente.types.ts`, `Frontend/src/features/paciente/types/bdmock.ts`, `Frontend/src/features/paciente/components/__tests__/SparklineTendencia.test.tsx`
* **Ordem de Execução / Dependência:** DEVE FAZER PRIMEIRO: Extensão da interface `Patient` com `historicoEngajamento?: number[]` (curva de conclusão/tempo) em `paciente.types.ts`, fixtures em `bdmock.ts` e implementação isolada de `SparklineTendencia.tsx` com testes unitários; FAZ DEPOIS: Integração visual nos slots de `CardPacienteGrid.tsx` e na coluna "Engajamento" de `ListaPacientes.tsx`.
* **Requisitos:** RF06, RF15, RNF07
* **Referência Documentação:** Projeto_de_InTEA.pdf — Seção 5, Figura 9 (Tela de Listagem de Pacientes em Grid) e Figura 14 (Tela da Lista de Pacientes em Tabela)
* **Descrição:** Construir componente vetorial puro e ultraleve em SVG (`SparklineTendencia.tsx`), sem dependências externas de bibliotecas de gráficos, para renderizar mini-curvas evolutivas da taxa de conclusão e tempo de engajamento das últimas 3 a 5 sessões nas linhas de `ListaPacientes.tsx` e nos cards de `CardPacienteGrid.tsx`. O componente normaliza coordenadas X/Y em um `viewBox` fixo (evitando Cumulative Layout Shift), exibe ponto de destaque no valor mais recente e aplica cores semânticas contextuais (melhora de aderência em verde, quedas de assiduidade em âmbar). Para pacientes com histórico insuficiente (< 2 sessões), exibe placeholder gracioso com traço estilizado.
* **Critérios de Aceite:**
  * [ ] Renderização puramente em SVG sem dependência de bibliotecas externas (zero dependência de pacotes adicionais no package.json).
  * [ ] Componente puro tipado estritamente via TypeScript (sem `any`), recebendo `data: number[]`, dimensões (`width`, `height`) e classes utilitárias via props.
  * [ ] Tratamento de Empty State: exibe indicador neutro gracioso (traço `"—"` ou linha guia atenuada) quando `data` for nulo, vazio ou contiver menos de 2 pontos históricos.
  * [ ] Prevenção de Layout Shift: dimensões geométricas estáveis através de `viewBox="0 0 60 20"` e `preserveAspectRatio="none"`.
  * [ ] Conformidade de Acessibilidade (a11y/WCAG): inclusão de `role="img"`, `<title>` e `aria-label` descritivo detalhando a tendência textual para leitores de tela.
  * [ ] Diferenciação visual acessível para além da cor (ponto âncora no último registro e contraste compatível com modo claro e escuro).
  * [ ] Integração bem-sucedida em `CardPacienteGrid.tsx` e `ListaPacientes.tsx` respeitando o design tokens do Tailwind CSS.
  * [ ] Suíte de testes unitários com Vitest (`SparklineTendencia.test.tsx`) cobrindo renderização, normalização de coordenadas, acessibilidade e fallback de dados insuficientes com 100% de sucesso.

---

### Back: Sanitização de Range Temporal e Teto de Paginação para Consultas Históricas (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Não atribuído (Backlog Arquitetural)
* **Fronteira de Arquivos:** `Backend/core/middlewares/query-range.middleware.ts`, `Backend/core/middlewares/test/query-range.middleware.test.ts`, `Backend/api/paciente/routes/paciente.routes.ts`, `Backend/api/sessao/routes/sessao.routes.ts`
* **Ordem de Execução / Dependência:** Independente (Backlog Arquitetural - Reforço de Performance e Resiliência).
* **Requisitos:** RNF03 (Segurança e Resiliência), RNF05 (Performance e Escalabilidade)
* **Referência Documentação:** Projeto_de_InTEA.pdf (Seção 4.3 - RNF03 e RNF05), architecture.md (Seção 3 - Camada de Middlewares)
* **Descrição:** Desenvolver o middleware Express `validarIntervaloHistorico` em `Backend/core/middlewares/query-range.middleware.ts` com TypeScript estrito (zero `any`) para sanear parâmetros de query de busca temporal (`dataInicio` e `dataFim`) e paginação (`page`, `limit`). O middleware protege o banco de dados Supabase contra exaustão de memória e *table scans* lentos em bases de histórico clínico e telemetria. Valida o formato ISO 8601 das datas, bloqueia intervalos invertidos (`dataInicio > dataFim`), rejeita consultas com período superior a 24 meses sem agregação e aplica teto de segurança na paginação (`limit` padrão 20, máximo 100 registros; `page` mínimo 1).
* **Critérios de Aceite:**
  * [ ] Rejeição de requisições com datas em formato inválido ou inexistente retornando status **`400 Bad Request`** com mensagem explicativa.
  * [ ] Bloqueio de consultas com intervalo temporal invertido (`dataInicio > dataFim`) retornando status **`400 Bad Request`**.
  * [ ] Bloqueio de intervalos superiores a 24 meses consecutivos retornando status **`400 Bad Request`** com instrução para refinar a busca.
  * [ ] Aplicação de *clamping* de paginação: parâmetros de busca têm teto fixado em no máximo 100 registros por requisição e padrão de 20 registros quando omitidos.
  * [ ] Implementação de tipagem TypeScript estrita sem o tipo `any` para enriquecimento do objeto `req.query`.
  * [ ] Suíte de testes unitários no Vitest em `Backend/core/middlewares/test/query-range.middleware.test.ts` cobrindo 100% dos caminhos felizes e casos de borda (datas invertidas, strings alfanuméricas, limites extremos e ausência de parâmetros), rodando 100% verde (`npm test`).
