# Hub de Cards e Tarefas — InTEA (GitHub Projects)

> **Documento Mestre do Projeto:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf)  
> **Diretrizes e Quality Gate de Tasks:** [AGENTS.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/AGENTS.md)  
> **Arquitetura do Sistema:** [architecture.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/architecture.md)  
> **Especificação da API:** [api-pacientes-jogos.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/api-pacientes-jogos.md)  

---

## 1. Visão Geral e Organização Modular

Para manter o planejamento leve, sustentável e com baixo consumo de processamento, os **Cards de Tarefas** foram segmentados em arquivos dedicados por Sprint dentro do diretório [`docs/DocsSprints/tasks/`](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/tasks/).

Cada arquivo contém o detalhamento integral dos cards (com fronteiras de arquivos, ordem sequencial anti-conflito, requisitos, descrições técnicas e critérios de aceite).

Os relatórios acadêmicos e retrospectivas detalhadas de cada Sprint residem em [`docs/DocsSprints/sprints/`](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/sprints/).

---

## 2. Matriz de Navegação das Sprints e Arquivos de Tarefas

| Sprint | Período Planejado | Tema Central do Ecossistema | Requisitos Centrais | Arquivo de Tasks Isolado | Documento Oficial | Status |
| :---: | :---: | :--- | :--- | :---: | :---: | :---: |
| **Sprint 7** | 17/09 a 24/09/2026 | Gestão de Pacientes, Catálogo de Jogos e Leitura de Manifesto | RF06, RF09, RF18, RF19, RN02, RN04, RN05 | [task_sprint_7.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/tasks/task_sprint_7.md) | [sprint-7.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/sprints/sprint-7.md) | ✅ Concluída |
| **Sprint 8** | 24/09 a 01/10/2026 | Pareamento Remoto via Session Token e Testes Prévios | RF10, RF11, RNF03, RNF04, RNF06 | [task_sprint_8.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/tasks/task_sprint_8.md) | [sprint-8.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/sprints/sprint-8.md) | ✅ Concluída |
| **Sprint 9** | 01/10 a 08/10/2026 | Gestão de Sessão Ativa, Telemetria Contínua e Cockpit | RF12, RF13, RF17, RF21, RN01, RNF05 | [task_sprint_9.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/tasks/task_sprint_9.md) | [sprint-9.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/sprints/sprint-9.md) | ✅ Concluída |
| **Sprint 10** | 08/10 a 15/10/2026 | Tela de Resultados, Relatório Analítico da IA e Exportação | RF14, RF16, RF20, RN01, RN04, RN05, RNF02 | [task_sprint_10.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/tasks/task_sprint_10.md) | [sprint-10.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/sprints/sprint-10.md) | 🚀 Em Andamento |

---

## 3. Resumo Executivo das Sprints

### 3.1. Sprint 7 — Pacientes e Biblioteca de Jogos
* **Arquivo Detalhado:** [task_sprint_7.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/tasks/task_sprint_7.md)
* **Escopo:** CRUD de pacientes com soft delete (**RN05**), associação de múltiplos terapeutas (**RF18**), validação estrita de DTOs e CPF, catálogo de jogos terapêuticos (**RF09**) com validação de tipagem de métrica sem fallback automático (**RN02**), e telas de listagem, cadastro e prontuário.
* **Documento da Sprint:** [sprint-7.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/sprints/sprint-7.md)

### 3.2. Sprint 8 — Pareamento Remoto e Testes Prévios
* **Arquivo Detalhado:** [task_sprint_8.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/tasks/task_sprint_8.md)
* **Escopo:** Fluxo completo de pareamento remoto de dispositivos externos sem login de paciente, geração de `session_token` alfanumérico efêmero (TTL de 15 minutos), handshake via WebSocket, resiliência de queda transitória de conexão e suíte de testes de regressão com 228 casos.
* **Documento da Sprint:** [sprint-8.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/sprints/sprint-8.md)

### 3.3. Sprint 9 — Gestão de Sessão Terapêutica e Telemetria em Tempo Real
* **Arquivo Detalhado:** [task_sprint_9.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/tasks/task_sprint_9.md)
* **Escopo:** Transição da máquina de estados para `em_andamento`, ingestão em lote de telemetria contínua via WebSocket, rate limiting com janela deslizante de 20 eventos/s, protocolo de reconexão de 60s (`SessaoReconnectionManager`), Cockpit clínico do terapeuta com gráficos SVG em tempo real e encerramento formal com auditoria.
* **Documento da Sprint:** [sprint-9.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/sprints/sprint-9.md)

### 3.4. Sprint 10 — Tela de Resultados e Relatórios Clínicos Analíticos
* **Arquivo Detalhado:** [task_sprint_10.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/tasks/task_sprint_10.md)
* **Escopo:** Consolidação dos dados pós-sessão, motor de agregação estatística de telemetria, síntese analítica do Agente de IA (**Contrato 4**), Tela de Resultados web (**Figura 12** do PDF), bloco interativo de anotações médicas (**RF16**), módulo de exportação e impressão clínica em PDF (**RF20**) e isolamento estrito por vínculo institucional (**RN04**).
* **Documento da Sprint:** [sprint-10.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/sprints/sprint-10.md)

---

## 4. Regras e Padrões Obrigatórios para Novas Tasks

Ao criar, planejar ou auditar qualquer card para as sprints presentes ou futuras, consulte obrigatoriamente as diretrizes em:
* [AGENTS.md — Seção 5: Padrão de Engenharia de Cards e Tasks](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/AGENTS.md) (Nomenclatura, Tipos Feature/Validação/Docs/Fix, Template canônico de 8 campos e Sequenciamento anti-conflito).
* [AGENTS.md — Seção 6: Verificação e Auditoria Técnica de Tasks (Quality Gate)](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/AGENTS.md) (Auditoria isolada por área: Back, BD, Front e Docs).
* **Cards de Correção (Fix):** Débitos técnicos identificados em auditorias de sprints passadas são formalizados na sprint atual com o prefixo `Área: (Fix) [Título] (Tipo: Fix)`.
