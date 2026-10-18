# Sprint 11 Detalhada: Auditoria, Refatoração e Alinhamento Figma do Front-End

> **Período planejado:** 15/10/2026 a 22/10/2026  
> **Tema da Sprint:** Auditoria de Código, Limpeza de Arquivos Inúteis, Refatoração de Telas Fiel ao Figma e Suporte a Mocks Controlados  
> **Composição da equipe:** 2 Back-end, 2 Front-end, 1 Documentação / Qualidade  
> **Requisitos centrais do PDF:** RF06, RF09, RF10, RF12, RF14, RF16, RF19, RN01, RN02, RN04, RN05, RNF01, RNF06  
> **Cards Detalhados:** [task_sprint_11.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/tasks/task_sprint_11.md)  
> **Hub Geral de Tarefas:** [visao_geral.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/visao_geral.md)  

---

## 1. Visão Geral e Contexto da Sprint 11

Após a estabilização da arquitetura em camadas e entrega dos fluxos clínicos fundamentais até a Sprint 10, a **Sprint 11** concentra o foco na **qualidade de código, higienização arquitetural e fidelidade visual do Front-End ao design do Figma**:

1. **Auditoria e Faxina de Código:** Identificação e expurgo de arquivos mortos, duplicados e cascas legadas geradas em refatorações passadas (ex: componentes com nomes duplicados em inglês e português, re-exports redundantes de layouts e overlays soltos).
2. **Alinhamento Estrito ao Design do Figma (Figma Inspector):** Refatoração minuciosa de cada tela existente no escopo do InTEA (`Dashboard`, `Meus Pacientes`, `Biblioteca de Jogos`, `Overlay Card Pré-Sessão` e `Relatório/Resultado da Sessão`) baseando-se na hierarquia Auto Layout, tokens visuais, dimensões, espaçamentos e componentes canônicos desenhados no Figma.
3. **Escopo Fiel ao Cronograma Vigente:** Apenas telas e recursos já presentes no código do projeto são refatorados; telas novas do Figma fora do escopo atual permanecem congeladas conforme o planejamento oficial.
4. **Governança de Dados Simulados (Mocks Resilientes):** Implementação da variável de ambiente `VITE_USE_MOCK_DATA` que permite ativar/desativar de forma global os dados estáticos de `bdmock.ts` sem alterar o código de negócio.
5. **Preservação da Integridade e Testes:** Garantia de manutenção de 100% de testes verdes no Vitest tanto no backend quanto no frontend.

---

## 2. Composição da Equipe e Responsáveis

| Papel | Integrante Responsável | GitHub | Foco Estrutural na Sprint 11 |
| :--- | :--- | :--- | :--- |
| **Back-end 1** | **Marcos Willian** | `@MarcosWillianAP1K` | Auditoria de consistência relacional, padronização de DTOs e estabilidade dos contratos REST |
| **Back-end 2** | **João Marcos** | `@JM3L0` | Resiliência dos eventos de WebSocket, contratos de telemetria e suporte ao mock global |
| **Front-end 1** | **Hermeson Alves** | `@Hermeson69` | Limpeza de arquivos mortos, refatoração das Páginas Mestre (`Dashboard`, `Pacientes`, `Modal Pré-Sessão`) |
| **Front-end 2** | **Luma Maiara** | `@lumamaiara` | Componentização atômica, cards do Figma, Bento Grid de métricas e testes de renderização |
| **Documentação / Qualidade** | **Raildom Silva** | `@Raildom` | Auditoria comparativa Figma vs Código, especificações de variáveis de ambiente, CT-S23..CT-S30 e LaTeX |

---

## 3. Protocolo Anti-Conflito e Fronteira de Arquivos

> [!IMPORTANT]
> **Regra Anti-Conflito da Equipe InTEA:**  
> 1. Cada integrante possui arquivos de domínio exclusivo. É expressamente **proibido alterar arquivos fora do seu domínio**.
> 2. Onde houver dependência funcional, a ordem cronológica fixada deve ser rigorosamente respeitada.

---

### 3.1 Back-end 1: Marcos Willian (`@MarcosWillianAP1K`)
*Foco: Consistência Relacional, Validação de DTOs e Contratos REST*
* **Domínio Exclusivo de Arquivos:**
  * `Backend/api/paciente/validators/*`
  * `Backend/api/sessao/validators/*`
  * `Backend/api/jogos/validators/*`
  * `Backend/api/*/test/*`
* **Ordem de Execução:** Dias 1 a 3 (Auditoria de DTOs); Dias 4 a 6 (Regressão e validação).

### 3.2 Back-end 2: João Marcos (`@JM3L0`)
*Foco: Eventos WebSocket, Telemetria e Mock Provider*
* **Domínio Exclusivo de Arquivos:**
  * `Backend/core/websocket/*`
  * `Backend/core/mock/*`
  * `Backend/core/test/*`
* **Ordem de Execução:** Dias 1 a 3 (Contratos WS e Mock); Dias 4 a 6 (Testes de streaming).

### 3.3 Front-end 1: Hermeson Alves (`@Hermeson69`)
*Foco: Faxina de Arquivos, Páginas Mestre e Navegação do Figma*
* **Domínio Exclusivo de Arquivos:**
  * `Frontend/src/routes/index.tsx`
  * `Frontend/src/layout/*`
  * `Frontend/src/pages/*`
  * `Frontend/src/features/painel/pages/*`
  * `Frontend/src/features/paciente/pages/*`
  * `Frontend/src/features/sessao/components/ModalPreSessao.tsx`
* **Ordem de Execução:** Dias 1 a 2 (Remoção de duplicatas); Dias 3 a 5 (Páginas mestre do Figma).

### 3.4 Front-end 2: Luma Maiara (`@lumamaiara`)
*Foco: Componentes Atômicos, Cards do Figma, Bento Grid e Testes*
* **Domínio Exclusivo de Arquivos:**
  * `Frontend/src/features/paciente/components/*`
  * `Frontend/src/features/jogos/components/*`
  * `Frontend/src/features/sessao/components/resultado/*`
  * `Frontend/src/features/*/types/*`
  * `Frontend/src/features/**/__test__/*`
* **Ordem de Execução:** Dias 1 a 3 (Componentes isolados e cards); Dias 4 a 6 (Integração e testes).

### 3.5 Documentação / Qualidade: Raildom Silva (`@Raildom`)
*Foco: Matriz de Auditoria, Casos de Teste CT-S23..CT-S30 e LaTeX*
* **Domínio Exclusivo de Arquivos:**
  * `docs/DocsSprints/tasks/task_sprint_11.md`
  * `docs/DocsSprints/sprints/sprint-11.md`
  * `docs/roteiro-testes.md`
  * `docs/DocsSprints/visao_geral.md`
  * `docs/relatorio_sprint_11.tex`
