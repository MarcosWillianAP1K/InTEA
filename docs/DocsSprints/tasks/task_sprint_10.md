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
* **Requisitos:** RF14, RF16, RN05
* **Referência Documentação:** Seção 5.7 (Figura 4), RF14, RF16, RN05
* **Descrição:** Criar migração SQL `008_create_tabela_relatorio_e_anotacao.sql` e atualizar `database.sql` garantindo PKs e FKs em UUID, vínculo 1:1 único entre `relatorio_sessao` e `sessao`, coluna `dados_ia_json` para o Contrato 4, tabela `anotacao_clinica` com autoria e soft delete (`soft_delete BOOLEAN DEFAULT FALSE`), e triggers PostgreSQL bloqueando exclusão física acidental.
* **Critérios de Aceite:**
  * [ ] Migration executada com sucesso e idempotente (`IF NOT EXISTS`).
  * [ ] Relacionamentos FK com `sessao(id)`, `paciente(id)` e `terapeuta(id)` validados.
  * [ ] Model `RelatorioSessaoModel` e `AnotacaoClinicaModel` com TypeScript estrito (zero `any`).
  * [ ] Preservação de RN05 (nenhum registro clínico pode sofrer hard delete).

---

### Back: Endpoint de Consulta Consolidada dos Resultados da Sessão (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/sessao/controllers/sessao.controller.ts`, `Backend/api/sessao/services/sessao-resultado.service.ts`, `Backend/api/sessao/routes/sessao.routes.ts`
* **Ordem de Execução / Dependência:** **Dias 2 a 4**. Conecta o modelo de relatório e serviço de sessão para expor a rota consumida pelo Front-end.
* **Requisitos:** RF14, RN01, RN04
* **Referência Documentação:** RF14 (Tela de Resultados), RN01, RN04 (Vínculo Institucional)
* **Descrição:** Implementar a rota `GET /api/sessao/:id/resultado` (ou consulta por token). O endpoint consolida metadados da sessão (paciente, jogo, terapeuta, data/hora, duração), dados sintetizados da IA (`dados_ia_json` conforme Contrato 4) e histórico de anotações vinculadas. Valida se o terapeuta requisitante possui vínculo ativo com o paciente na clínica (RN04 / 403 Forbidden). Para Modo Livre (RN01), retorna metadados operacionais sem vínculo a prontuário de paciente.
* **Critérios de Aceite:**
  * [ ] Retorno com status 200 contendo payload estruturado do resultado para sessões finalizadas.
  * [ ] Retorno com status 400 se a sessão ainda não estiver no status `finalizada`.
  * [ ] Bloqueio estrito com status 403 Forbidden se o terapeuta não possuir vínculo ativo com o paciente (RN04).
  * [ ] Tratamento de sessões em Modo Livre suprimindo dados de prontuário (RN01).

---

### Back: Módulo de Registro e Edição de Anotações Clínicas Pós-Sessão (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/anotacao/controllers/anotacao.controller.ts`, `Backend/api/anotacao/services/anotacao.service.ts`, `Backend/api/anotacao/routes/anotacao.routes.ts`, `Backend/api/index.ts`
* **Ordem de Execução / Dependência:** **Dias 3 a 5**. Módulo desacoplado de anotações médicas do prontuário.
* **Requisitos:** RF16, RF21, RN04, RN05
* **Referência Documentação:** RF16 (Bloco de Anotações), RF21 (Autoria Obrigatória), RN05
* **Descrição:** Criar módulo RESTful dedicado para gerenciamento do prontuário de anotações clínicas: `POST /api/anotacao` (criar parecer associado ao paciente e opcionalmente à sessão recém-concluída), `GET /api/anotacao/sessao/:sessaoId` (consultar anotações da sessão) e `PATCH /api/anotacao/:id` (editar conteúdo da anotação). A autoria de `terapeuta_id` é obrigatória a partir do token JWT autenticado (RF21).
* **Critérios de Aceite:**
  * [ ] Endpoints `POST`, `GET` e `PATCH` funcionando e registrados em `apiRouter`.
  * [ ] Autoria vinculada automaticamente ao terapeuta autenticado via token JWT (RF21).
  * [ ] Bloqueio de exclusão física (deleção apenas lógica via `soft_delete = true` - RN05).
  * [ ] Validação de permissão institucional por clínica e vínculo com o paciente (RN04).

---

### Back: Suíte de Testes Automatizados da Tela de Resultados e Anotações (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Marcos Willian (`@MarcosWillianAP1K`)
* **Fronteira de Arquivos:** `Backend/api/sessao/test/resultado_sessao.test.ts`, `Backend/api/anotacao/test/anotacao.test.ts`
* **Ordem de Execução / Dependência:** **Após 1.1, 1.2 e 1.3 (Dia 6)**. Valida a integração de ponta a ponta dos resultados e anotações.
* **Requisitos:** Qualidade de Software, RF14, RF16, RN01, RN04, RN05
* **Referência Documentação:** Pipeline CI/CD, `roteiro-testes.md`
* **Descrição:** Desenvolver cobertura abrangente de testes automatizados com Vitest simulando o ciclo completo de consulta da Tela de Resultados: consulta de sessão finalizada com sucesso, rejeição de consulta para sessões ainda em andamento (`400 Bad Request`), tentativa de consulta por terapeuta sem vínculo (`403 Forbidden`), retorno correto para sessões em Modo Livre (`RN01`), e CRUD com soft delete de anotações clínicas (`RN05`).
* **Critérios de Aceite:**
  * [ ] 100% dos testes passando no Vitest (`npm test` no `Backend/`).
  * [ ] Validação dos cenários de autorização (RN04) e imutabilidade histórica (RN05).
  * [ ] Testes sem vazamentos de memória ou conexões abertas com banco.

---

### 1.2. Back-end 2 — João Marcos (@JM3L0)

---

### Back: Motor de Agregação Estatística de Telemetria da Sessão (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/api/telemetria/services/telemetria-agregacao.service.ts`, `Backend/api/telemetria/routes/telemetria.routes.ts`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE FAZER PRIMEIRO (Dias 1 a 3)**. Fornece os cálculos consolidados para a síntese analítica da IA e para o relatório.
* **Requisitos:** RF14, RNF04, RN02
* **Referência Documentação:** Seção 7.4.2 (Contrato 4), RF14, RNF04
* **Descrição:** Construir serviço especializado para compilar e sumarizar os eventos brutos registrados na tabela `telemetria_evento` de uma sessão finalizada: cálculo de tempo médio e mediana de reação/resposta, taxa de precisão de toques (acertos vs. erros), métricas de estabilidade de atenção por janelas temporais e contagem de eventos por tipo.
* **Critérios de Aceite:**
  * [ ] Consolidação precisa dos eventos a partir dos registros da tabela `telemetria_evento`.
  * [ ] Tipagem rigorosa respeitando o `tipo_metrica` de cada indicador declarado no manifesto do jogo (RN02).
  * [ ] Retorno de estrutura consistente mesmo em sessões com pouca telemetria gerada (sem quebra por divisão por zero).

---

### Back: Síntese Analítica do Agente de IA e Geração do Contrato 4 (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/api/sessao/services/sessao-ia-analise.service.ts`
* **Ordem de Execução / Dependência:** **Dias 3 a 4**. Conecta os dados agregados da telemetria à geração dos insights do motor de inteligência contextual.
* **Requisitos:** RF14, RF17, RNF02
* **Referência Documentação:** Contrato 4 (`docs/ModelosDeContratos/relatorio.json`), Figura 3, Figura 12
* **Descrição:** Desenvolver o gerador analítico de relatórios do Agente de IA aderente ao **Contrato 4**: geração de `analises_ia[]` contextuais com base nas intervenções de DDA que ocorreram durante a partida, cálculo da `resumo.taxa_conclusao`, identificação de tendência (`estavel`, `crescente`, `decrescente`) em `metricas_agregadas[]` e estruturação pronta para persistência em `relatorio_sessao.dados_ia_json`.
* **Critérios de Aceite:**
  * [ ] Formato 100% conforme a especificação do Contrato 4 (`docs/ModelosDeContratos/relatorio.json`).
  * [ ] Geração dinâmica de pareceres analíticos coerentes com as modulações de estresse e DDA da sessão.
  * [ ] Função exportada de forma modular para integração direta no encerramento e consulta da sessão.

---

### Back: Endpoint e Serviço de Exportação de Relatório Clínico Estruturado (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/api/sessao/services/sessao-exportar.service.ts`, `Backend/api/sessao/routes/sessao.routes.ts`
* **Ordem de Execução / Dependência:** **Dias 4 a 5**. Focado na exportação formal de laudo e dados para compartilhamento externo.
* **Requisitos:** RF20, RNF06
* **Referência Documentação:** RF20 (Exportação de Relatórios Clínicos), RNF06 (LGPD)
* **Descrição:** Criar endpoint `GET /api/sessao/:id/relatorio/exportar` para emissão do relatório em formato estruturado (JSON sanitizado ou payload para renderização de PDF clínico com cabeçalho institucional). Reúne dados da clínica, registro profissional do terapeuta, identificação do paciente, tabela consolidada de métricas, parecer da IA e espaço para carimbo/assinatura.
* **Critérios de Aceite:**
  * [ ] Rota retorna estrutura padronizada para geração e impressão de documento oficial clínico (RF20).
  * [ ] Omissão de dados sensíveis internos da infraestrutura de servidores (RNF06).
  * [ ] Validação de permissão de acesso e vínculo institucional com o paciente (RN04).

---

### Back: Testes Automatizados de Agregação, Síntese IA e Exportação (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** João Marcos (`@JM3L0`)
* **Fronteira de Arquivos:** `Backend/api/telemetria/test/telemetria_agregacao.test.ts`, `Backend/api/sessao/test/sessao_ia_exportar.test.ts`
* **Ordem de Execução / Dependência:** **Após 2.1, 2.2 e 2.3 (Dia 6)**. Valida a precisão dos cálculos e a conformidade do Contrato 4.
* **Requisitos:** Qualidade de Software, RNF02, RF14, RF20
* **Referência Documentação:** Pipeline CI/CD, Vitest
* **Descrição:** Criar testes no Vitest cobrindo os cálculos estatísticos do serviço de agregação de telemetria, conformidade estrita do schema do Contrato 4 com Zod/validadores e teste unitário do endpoint de exportação de relatório clínico.
* **Critérios de Aceite:**
  * [ ] Testes de cálculo de métricas agregadas passando com exatidão matemática.
  * [ ] Testes de validação de schema do Contrato 4 aprovados sem divergências de campos.
  * [ ] Teste de exportação cobrindo casos de sessão finalizada e rejeição para sessão inexistente.

---

### 1.3. Front-end 1 — Hermeson Alves (@Hermeson69)

---

### Front: Página Mestre da Tela de Resultados da Sessão (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/pages/ResultadoSessaoPage.tsx`, `Frontend/src/App.tsx` (ou rotas da aplicação)
* **Ordem de Execução / Dependência:** ⚠️ **INTEGRAÇÃO SEQUENCIAL (Dias 1 a 3 Layout e Casca; Dias 4/5 Importa Componentes da Luma)**.  
  * *Dias 1 a 3:* Cria a casca da página `/sessao/:id/resultado`, cabeçalho do paciente, dados da sessão e placeholders/slots para os gráficos e métricas.  
  * *Dias 4/5:* Importa os componentes analíticos entregues por Luma Maiara (`<MetricasConsolidadasCards />`, `<GraficoEvolutivoResultado />`, `<PainelInsightsIA />`).  
  * *Zona Proibida:* É **PROIBIDO** editar arquivos dentro de `Frontend/src/features/sessao/components/resultado/` designados a Luma.
* **Requisitos:** RF14, RNF07
* **Referência Documentação:** Figura 12 (Tela da emissão do relatório de 1 paciente), RF14
* **Descrição:** Desenvolver a página principal da Tela de Resultados (`/sessao/:id/resultado`), exibida após o encerramento da sessão ou na consulta posterior via prontuário. Contém cabeçalho com identificação do paciente, terapeuta responsável, jogo executado, data e duração total, além da disposição harmoniosa dos blocos clínicos.
* **Critérios de Aceite:**
  * [ ] Layout moderno, responsivo e aderente ao protótipo de alta fidelidade (Figura 12).
  * [ ] Cabeçalho clínico com nome do paciente, registro profissional do terapeuta, badges de status e data/duração.
  * [ ] Estrutura modular limpa permitindo integração imediata dos blocos visuais de telemetria e IA.

---

### Front: Redirecionamento Fluido do Cockpit para a Tela de Resultados (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/pages/CockpitSessaoPage.tsx`, `Frontend/src/features/sessao/services/sessaoService.ts`
* **Ordem de Execução / Dependência:** **Dias 2 a 3**. Ajusta o fluxo pós-encerramento da jornada do terapeuta.
* **Requisitos:** RF13, RF14
* **Referência Documentação:** RF13, RF14, Figura 3 (Diagrama de Sequência)
* **Descrição:** Modificar o fluxo de finalização no `CockpitSessaoPage.tsx`: após confirmar o encerramento no modal e receber o retorno de sucesso do backend, redirecionar o navegador para `/sessao/:id/resultado` em vez de retornar para a lista de jogos (`/games`), mantendo a continuidade do atendimento clínico.
* **Critérios de Aceite:**
  * [ ] Ao confirmar encerramento com sucesso, navega para `/sessao/:id/resultado`.
  * [ ] Feedback em toast informando que a sessão foi consolidada e o relatório está pronto.
  * [ ] Para sessões em Modo Livre (RN01), redireciona para a biblioteca de jogos com notificação adequada.

---

### Front: Bloco Interativo de Anotações Clínicas e Parecer do Terapeuta (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/components/resultado/BlocoAnotacoesClinicas.tsx`
* **Ordem de Execução / Dependência:** **Independente (Dias 3 a 4)**. Componente desacoplado na pasta de resultados.
* **Requisitos:** RF16, RF21, RN05
* **Referência Documentação:** RF16 (Bloco de Anotações), RF21, Figura 12
* **Descrição:** Implementar componente de anotações clínicas na Tela de Resultados: exibe o texto preliminar digitado no modal de encerramento, permite ao terapeuta complementar com novas observações pós-sessão, oferece salvamento assíncrono com botão e indicador visual de estado ("Salvo", "Salvando...", "Erro") e registra o nome do profissional autor.
* **Critérios de Aceite:**
  * [ ] Campo de texto rico ou textarea acessível com contagem de caracteres e salvamento automático/manual.
  * [ ] Integração com endpoint `PATCH /api/anotacao/:id` ou serviço de anotações.
  * [ ] Exibição da identificação e autoria do terapeuta responsável (RF21).

---

### Front: Testes Unitários e de Renderização da Tela de Resultados (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Hermeson Alves (`@Hermeson69`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/__test__/ResultadoSessaoPage.test.tsx`, `BlocoAnotacoesClinicas.test.tsx`
* **Ordem de Execução / Dependência:** **Após 3.1, 3.2 e 3.3 (Dia 6)**. Testa sua própria tela e componentes.
* **Requisitos:** Qualidade de Software, RF14, RF16
* **Referência Documentação:** Pipeline CI, Vitest, Testing Library
* **Descrição:** Construir testes automatizados com Vitest e Testing Library cobrindo a renderização do cabeçalho da Tela de Resultados, o fluxo de transição entre o Cockpit e a Tela de Resultados, o preenchimento e salvamento do bloco de anotações clínicas e o tratamento de estados de carregamento (skeletons).
* **Critérios de Aceite:**
  * [ ] Testes de renderização da página de resultados passando 100% no Vitest.
  * [ ] Testes de interação e salvamento do bloco de anotações aprovados.
  * [ ] Sem warnings do React ou falhas de acessibilidade nos testes.

---

### 1.4. Front-end 2 — Luma Maiara (@lumamaiara)

---

### Front: Cards de Métricas Consolidadas e Sumário de Desempenho (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/components/resultado/MetricasConsolidadasCards.tsx`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE ENTREGAR PRIMEIRO (Dias 1 a 3)**.  
  * Constrói os cards modulares em `components/resultado/` testando com mocks de dados.  
  * Entrega no Dia 3/4 para Hermeson importar em `ResultadoSessaoPage.tsx`.  
  * *Zona Proibida:* É **PROIBIDO** editar `ResultadoSessaoPage.tsx` ou `BlocoAnotacoesClinicas.tsx`.
* **Requisitos:** RF14, RNF04
* **Referência Documentação:** Figura 12, RF14
* **Descrição:** Desenvolver o grid de cards informativos pós-sessão exibindo as métricas consolidadas: Tempo Total de Atividade, Taxa de Conclusão (%), Quantidade de Intervenções DDA, Pontuação Geral e Estabilidade de Foco, com comparativos visuais e badges de status.
* **Critérios de Aceite:**
  * [ ] Layout em cards responsivos com ícones semânticos da biblioteca Lucide React.
  * [ ] Tratamento de números, porcentagens e durações formatadas com precisão.
  * [ ] Empty state informativo caso algum indicador não se aplique ao jogo ativo.

---

### Front: Gráfico Vetorial de Desempenho Temporal e Tempo de Reação (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/components/resultado/GraficoEvolutivoResultado.tsx`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE ENTREGAR PRIMEIRO (Dias 2 a 3)**. Componente atômico para compor a página de resultados.
* **Requisitos:** RF14, RNF04
* **Referência Documentação:** Figura 12 (Gráfico evolutivo do tempo de resposta), RNF04
* **Descrição:** Criar componente vetorial SVG leve (ou com Recharts/biblioteca existente) que plota o gráfico evolutivo da sessão: evolução do tempo de resposta por tentativa ao longo dos minutos e marcadores visuais discretos sinalizando quando o DDA modulou a dificuldade da partida.
* **Critérios de Aceite:**
  * [ ] Gráfico vetorial responsivo com animação suave e eixos X (tempo decorrido) e Y (tempo de resposta em segundos).
  * [ ] Marcadores destacados nos pontos onde ocorreram intervenções DDA.
  * [ ] Tooltip interativo ao passar o mouse sobre os pontos do gráfico.

---

### Front: Painel de Insights da IA e Recomendações Clínicas (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/components/resultado/PainelInsightsIA.tsx`
* **Ordem de Execução / Dependência:** ⚠️ **DEVE ENTREGAR PRIMEIRO (Dia 3)**. Componente atômico de visualização da IA.
* **Requisitos:** RF14, RNF02
* **Referência Documentação:** Contrato 4 (`relatorio.json`), Figura 12
* **Descrição:** Implementar componente de exibição dos insights analíticos gerados pelo motor de IA: lista de observações contextuais (`analises_ia[]`), tendências das métricas agregadas (ex.: nível de frustração com valor dominante "baixo" e tendência "estável") e sugestões adaptativas para as próximas sessões.
* **Critérios de Aceite:**
  * [ ] Exibição visual elegante dos insights da IA com ícone de inteligência e cores temáticas.
  * [ ] Badges de tendências de métricas (estável, crescente, decrescente) com cores intuitivas.
  * [ ] Alertas visuais destacados caso a IA tenha recomendado redução de estímulos sensoriais.

---

### Front: Módulo de Exportação e Impressão Clínica em PDF (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Luma Maiara (`@lumamaiara`)
* **Fronteira de Arquivos:** `Frontend/src/features/sessao/components/resultado/BotaoExportarRelatorio.tsx`, `Frontend/src/features/sessao/hooks/useRelatorioExport.ts`
* **Ordem de Execução / Dependência:** **Dias 4 a 5**. Focado na exportação e impressão clínica pelo terapeuta.
* **Requisitos:** RF20, RNF06, RNF07
* **Referência Documentação:** RF20 (Exportação de Relatórios Clínicos), Figura 12
* **Descrição:** Desenvolver o botão e hook de exportação do relatório de sessão: aciona a impressão formatada do navegador (`window.print()`) ou download de PDF contendo layout médico limpo, cabeçalho da clínica, dados do paciente, gráficos consolidados, parecer da IA e área para assinatura do terapeuta, ocultando barras de navegação da interface.
* **Critérios de Aceite:**
  * [ ] Botão de exportação acessível na barra de ações da Tela de Resultados.
  * [ ] Folha de estilos de impressão (`@media print`) configurada para formatação A4 sem quebras inadequadas de página.
  * [ ] Ocultação de elementos interativos e botões na visualização de impressão/PDF.

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
* **Requisitos:** RNF02 (Swagger/OpenAPI)
* **Referência Documentação:** `docs/api-pacientes-jogos.md`, Swagger UI
* **Descrição:** Atualizar a documentação técnica da API com as novas rotas da Sprint 10: `GET /api/sessao/:id/resultado`, `POST /api/anotacao`, `PATCH /api/anotacao/:id`, `GET /api/sessao/:id/relatorio/exportar`, schemas de request/response em JSON e mapeamento rigoroso de códigos HTTP (200, 400, 403, 404, 422).
* **Critérios de Aceite:**
  * [ ] Especificação OpenAPI completa com schemas de corpo e respostas.
  * [ ] Documentação clara das regras de segurança RN04 (403 Forbidden) e RN01 (Modo Livre).
  * [ ] Catálogo de endpoints sincronizado no repositório.

---

### Docs: Roteiro de Testes Manuais de Resultados da Sessão (CT-S15 a CT-S22) (Tipo: Validação)

* **Tipo:** Validação
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** `docs/roteiro-testes.md`
* **Ordem de Execução / Dependência:** **Dias 3 a 5**. Elabora os casos de teste para homologação da equipe.
* **Requisitos:** Qualidade de Software, RF14, RF16, RF20, RN01, RN04, RN05
* **Referência Documentação:** `docs/roteiro-testes.md`
* **Descrição:** Criar os casos de teste manuais formais da Sprint 10 (CT-S15 a CT-S22) no roteiro de testes: visualização de resultados de sessão finalizada, validação de insights de IA, registro e edição de anotações clínicas, rejeição por falta de vínculo (RN04), supressão de prontuário em Modo Livre (RN01) e impressão/exportação de PDF (RF20).
* **Critérios de Aceite:**
  * [ ] Tabela padronizada com precondições, passos de execução, dados de entrada e resultado esperado.
  * [ ] Matriz de rastreabilidade atualizada totalizando 49 casos de teste.
  * [ ] Alinhamento com a equipe para homologação formal da sprint.

---

### Docs: Gestão do Quadro Kanban e Regularização da Sprint 9 (Tipo: Docs)

* **Tipo:** Docs
* **Responsável:** Raildom Silva (`@Raildom`)
* **Fronteira de Arquivos:** GitHub Projects (Board, Issues, Labels, Milestones)
* **Ordem de Execução / Dependência:** ⚠️ **PRIORIDADE MÁXIMA (Dias 1 a 2)**.  
  * Sincronizar o board imediatamente: fechar oficialmente as issues concluídas da Sprint 9 e abrir os 20 cards da Sprint 10 com labels e responsáveis.  
  * *Zona Proibida:* É **PROIBIDO** alterar qualquer código-fonte em `Backend/` ou `Frontend/`.
* **Requisitos:** Gestão de Projeto
* **Referência Documentação:** GitHub Projects, `docs/DocsSprints/sprints/sprint-10.md`
* **Descrição:** Auditar e sincronizar o GitHub Projects: mover para `CLOSED` as issues da Sprint 9 finalizadas no código, cadastrar os 20 novos cards da Sprint 10 com suas respectivas etiquetas e responsáveis e organizar os cards extras desacoplados no backlog do projeto.
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
