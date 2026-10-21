# Sprint 11 Detalhada: Histórico Evolutivo e Gráficos Dinâmicos

> **Período planejado:** 15/10/2026 a 22/10/2026  
> **Tema da Sprint:** Histórico Evolutivo, Prontuário Longitudinal e Gráficos Dinâmicos (Engajamento Global e Séries por Jogo)  
> **Composição da equipe:** Marcos Willian (`@MarcosWillianAP1K`) — Execução individual centralizada  
> **Requisitos centrais do PDF:** RF15 (Histórico do Paciente), RNF04 (Visualizações por Tipo de Métrica), RF19 (Filtros Avançados), RN01, RN02, RN04, RN05, RNF02, RNF06, RNF07  
> **Referência Visual Mestre:** Figura 13 do Projeto InTEA (Tela do Histórico do Paciente, Página 22)  
> **Cards Detalhados:** [task_sprint_11.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/tasks/task_sprint_11.md)  
> **Hub Geral de Tarefas:** [visao_geral.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/visao_geral.md)  

---

## 1. Visão Geral e Contexto Clínico da Sprint 11

A **Sprint 11** estende a inteligência do InTEA para o **acompanhamento longitudinal do tratamento clínico**. Para resolver o desafio de comparar métricas heterogêneas entre diferentes jogos da biblioteca terapêutica, a Sprint 11 implementa uma arquitetura em **dois níveis complementares**:

1. **Nível 1 — Métricas Universais de Engajamento e Aderência Terapêutica (Transversal a Todos os Jogos):**
   - Válido para qualquer paciente independente dos jogos que ele jogou.
   - **Taxa de Conclusão de Sessões (%):** Razão entre sessões concluídas com sucesso vs. sessões canceladas ou interrompidas prematuramente (ex.: 8 de 10 concluídas = 80% de aderência). Métrica vital para pacientes no espectro autista com tendência a recusa, crises sensoriais ou agressividade.
   - **Tempo de Permanência Ativa (Engajamento Líquido):** Quantidade total e média de minutos/horas em interação terapêutica ativa ao longo do tempo.
   - **Assiduidade e Taxa de Modulações DDA:** Volume de intervenções do motor de inteligência artificial necessárias para regulação do paciente.

2. **Nível 2 — Histórico Especializado Segmentado por Jogo (Deep-Dive Clínico):**
   - Ao selecionar um jogo específico no histórico, o sistema consulta todas as sessões anteriores daquele jogo e plota a evolução das métricas clínicas suportadas daquele jogo (ex.: tempo de reação, acertos, frustração).
   - Não se misturam métricas incomparáveis de jogos distintos.
   - Renderizador dinâmico pautado no `tipo_metrica` do manifesto do jogo (**RNF04**), com proibição estrita de fallback automático (**RN02**).

3. **Invariantes e Regras de Negócio:**
   - **RN01 (Modo Livre sem Persistência):** Partidas em modo livre (`paciente_id = NULL`) não constam no histórico e não afetam as taxas de engajamento clínico do paciente.
   - **RN04 (Isolamento Institucional):** Acesso a prontuários e históricos condicionado a vínculo ativo (`terapeuta_paciente`) na mesma clínica (`403 Forbidden` para acessos não autorizados).
   - **RN05 (Inalterabilidade do Histórico Clínico):** Preservação absoluta do histórico via soft delete (`soft_delete = false`).

---

## 2. Estrutura de Trabalho e Responsabilidades

O desenvolvedor **Marcos Willian (`@MarcosWillianAP1K`)** conduz integralmente a entrega dos 6 cards principais (abrangendo banco de dados, API backend, interface frontend, suíte de testes e documentação técnica):

| Área | Card Principal | Status Inicial | Foco Estrutural |
| :--- | :--- | :---: | :--- |
| **BD/Back** | `Modelagem e Índices para Histórico de Engajamento Global e Séries por Jogo` | `In progress` | Índices B-Tree parciais em `sessao` (engajamento e por jogo), índice GIN em `relatorio_sessao` e model TypeScript estrito. |
| **Back** | `Endpoint de Histórico com Engajamento Universal e Séries Específicas por Jogo` | `In progress` | Rota `GET /api/paciente/:id/historico`, Thin Controller, cálculo de engajamento universal, filtro por `jogoId`, RN02 e RN04. |
| **Front** | `Componentes de Engajamento Global e Renderizador de Métricas por Jogo` | `In progress` | `CardsEngajamentoGeral`, `GraficoEvolucaoJogo` e `GraficoPolimorficoMetrica` em SVG nativo, com os 4 estados de UI. |
| **Front** | `Página Mestre do Histórico do Paciente com Seletor por Jogo e Timeline` | `In progress` | Página Mestre `HistoricoPacientePage` (Figura 13), rota `/pacientes/:id/historico`, `SeletorJogoHistorico` e `LinhaDoTempoSessoes`. |
| **Back** | `Suíte de Testes de Integração do Histórico (Engajamento e Séries por Jogo)` | `In progress` | Cobertura Vitest dos status canônicos (200, 400, 403, 404, 422), validação matemática de engajamento e regras RN01/RN02/RN04. |
| **Docs** | `Especificação OpenAPI, Roteiro de Testes e Relatório Executivo da Sprint 11` | `In progress` | Documentação OpenAPI da rota dual, casos de testes manuais CT-S23 a CT-S28 e alinhamento do repositório. |

---

## 3. Cards Extras de Reforço Arquitetural (Backlog da Equipe)

Permanecem como **`Não atribuído (Backlog Arquitetural)`** com status **`Ready`** para adiantamento ou distribuição futura pela equipe:

1. **BD/Back:** `View Materializada e Cache em Memória para Resumo de Engajamento e Desempenho por Jogo (Tipo: Feature)`
2. **Back:** `Endpoint de Exportação Unificada do Prontuário Longitudinal Completo (Tipo: Feature)`
3. **Front:** `Modal de Comparação Detalhada Lado a Lado de Duas Sessões de um Mesmo Jogo (Tipo: Feature)`
4. **Front:** `Sparklines SVG de Taxa de Conclusão e Engajamento na Listagem de Pacientes (Tipo: Feature)`
5. **Back:** `Sanitização de Range Temporal e Teto de Paginação para Consultas Históricas (Tipo: Validação)`

---

## 4. Critérios de Homologação da Sprint 11

> [!IMPORTANT]
> **Autonomia Soberana do Usuário:** Todas as caixas de verificação abaixo permanecem desmarcadas (`[ ]`) para conferência e validação manual do usuário no Git e GitHub Projects.

* [ ] Índices de banco executados sem erros e Single Source of Truth `Database/database.sql` sincronizado.
* [ ] Rota `GET /api/paciente/:id/historico` retorna o bloco de engajamento universal (taxa de conclusão % e tempo) e séries do jogo consultado com status `200 OK`.
* [ ] Tentativa de acessar histórico por terapeuta sem vínculo ativo resulta em `403 Forbidden` (**RN04**).
* [ ] Partidas em Modo Livre (`paciente_id = NULL`) não constam no prontuário histórico e não afetam taxas de engajamento (**RN01**).
* [ ] Métricas sem tipo no manifesto do jogo consultado são rejeitadas com status `422 Unprocessable Entity` sem fallback (**RN02**).
* [ ] Gráficos polimórficos renderizam adequadamente linhas para numéricas, barras para categóricas e badges para booleanas (**RNF04**).
* [ ] Página de Histórico `/pacientes/:id/historico` implementada com painel de engajamento, seletor de jogos e linha do tempo de sessões (**Figura 13**).
* [ ] 100% dos testes passando no Vitest (`npm test` no Backend e Frontend).
* [ ] Especificação OpenAPI atualizada e casos de testes CT-S23 a CT-S28 cadastrados no roteiro de testes manuais.
