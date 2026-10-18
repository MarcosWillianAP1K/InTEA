# Sprint 12 Detalhada: Auditoria Fullstack e Integração End-to-End Back-End + Front-End

> **Período planejado:** 22/10/2026 a 29/10/2026  
> **Tema da Sprint:** Auditoria Fullstack, Mapeamento Integral dos Contratos REST/WS e Integração E2E Back-End + Front-End com Consumo de APIs Reais  
> **Composição da equipe:** 2 Back-end, 2 Front-end, 1 Documentação / Qualidade  
> **Requisitos centrais do PDF:** RF06, RF09, RF10, RF11, RF12, RF14, RF16, RF19, RF20, RF21, RN01, RN02, RN03, RN04, RN05, RNF01..RNF07  
> **Cards Detalhados:** [task_sprint_12.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/tasks/task_sprint_12.md)  
> **Hub Geral de Tarefas:** [visao_geral.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/visao_geral.md)  

---

## 1. Visão Geral e Contexto da Sprint 12

A **Sprint 12** concretiza a união operacional de todo o ecossistema InTEA. Enquanto a Sprint 11 saneou a arquitetura do front-end e alinhou a camada visual ao design planejado no Figma, a Sprint 12 realiza a **integração ponta a ponta** conectando as telas refatoradas aos serviços reais do Back-End e Supabase:

1. **Auditoria Fullstack dos Módulos:** Mapeamento cruzado e verificação minuciosa entre os endpoints fornecidos pelo Express (`/api/*`) e os serviços consumidores do React (`Frontend/src/features/*/services/`).
2. **Consumo de APIs Reais com Alternância Transparente:** Capacidade plena de operar com a flag `VITE_USE_MOCK_DATA=false` consumindo dados reais do PostgreSQL e WebSocket em tempo real, mantendo os mocks de `bdmock.ts` estritamente como fallback de resiliência.
3. **Fluxos Clínicos Integrados:**
   - **Autenticação e Sessão do Terapeuta (RF21):** Login JWT e extração de identidade.
   - **Gestão de Pacientes (RF06, RN04, RN05):** Listagem, busca, cadastro e prontuário integrado via `/api/paciente`.
   - **Catálogo de Jogos Terapêuticos (RF09, RN02):** Listagem via `/api/jogos` com validação de tipagem de métricas.
   - **Ciclo da Sessão e Pareamento Remoto (RF10, RF11, RF12, RN03):** Geração de `session_token`, handshake no WebSocket `/sessao`, streaming de telemetria contínua.
   - **Relatório e Anotações Clínicas (RF14, RF16, RF20):** Agregação pós-sessão (`GET /api/sessao/:id/resultado`), persistência de anotações (`/api/anotacao`) e exportação estruturada.
4. **Garantia de Qualidade e Zero Regressão:** Validação automatizada com Vitest em ambos os repositórios (Back-end e Front-end) com 100% de testes verdes.

---

## 2. Composição da Equipe e Responsáveis

| Papel | Integrante Responsável | GitHub | Foco Estrutural na Sprint 12 |
| :--- | :--- | :--- | :--- |
| **Back-end 1** | **Marcos Willian** | `@MarcosWillianAP1K` | Endpoints REST de Pacientes, Sessões, Anotações, Auditoria e autorização institucional (RN04) |
| **Back-end 2** | **João Marcos** | `@JM3L0` | Gateway WebSocket de telemetria, streaming em tempo real, reconexão tolerante e exportação de laudos |
| **Front-end 1** | **Hermeson Alves** | `@Hermeson69` | Integração dos fluxos de navegação e páginas mestre (`Dashboard`, `Pacientes`, `Cockpit`, `Resultados`) |
| **Front-end 2** | **Luma Maiara** | `@lumamaiara` | Integração dos serviços REST nos componentes atômicos, escuta WebSocket reativa e testes E2E |
| **Documentação / Qualidade** | **Raildom Silva** | `@Raildom` | Relatório formal de auditoria fullstack, casos de teste manuais E2E, governança e fechamento |

---

## 3. Protocolo Anti-Conflito e Fronteiras de Domínio

As regras canônicas de isolamento por fronteira de arquivos e sequenciamento de dependências verticais (Banco $\rightarrow$ Backend $\rightarrow$ Frontend) permanecem estritamente ativas.
