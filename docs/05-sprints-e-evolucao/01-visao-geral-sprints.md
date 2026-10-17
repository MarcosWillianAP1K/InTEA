# Hub e Visão Geral das Sprints (1 a 17) — InTEA

> **Projeto:** InTEA — Interface do Terapeuta para Orquestração do Ecossistema de Games Terapêuticos  
> **Instituição:** Sistemas de Informação — Universidade Federal do Piauí (UFPI)  
> **Documento Mestre:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) (Tabela 1, Página 7; Seção 7, Páginas 14 a 35)  
> **Hub de Navegação:** [Índice Geral](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/README.md)

---

## 1. Visão Geral da Linha de Evolução

O desenvolvimento do InTEA foi estruturado em **17 ciclos semanais de entrega (Sprints)**, iniciando no alinhamento metodológico e conceitual em agosto de 2026 e culminando na homologação piloto e apresentação final perante a banca examinadora em dezembro de 2026.

As entregas percorrem três grandes fases de maturidade:
1. **Fase de Definição e Fundação (Sprints 1 a 6):** Problemática clínica, requisitos formais, diagramas arquiteturais UML/ER, prototipação no Figma, infraestrutura monorepo com Docker, CI/CD e banco de dados Supabase.
2. **Fase de Implementação Central do Ecossistema (Sprints 7 a 10):** Construção dos módulos fundamentais de pacientes, jogos, pareamento remoto via PIN efêmero, streaming de telemetria contínua, cockpit de sessão ativa, consolidação em 3FN e relatórios analíticos da IA.
3. **Fase de Refinamento, Testes Clínicos e Publicação (Sprints 11 a 17):** Visualização dinâmica de gráficos por tipo de métrica, histórico evolutivo, testes fechados com terapeutas parceiros e deploy piloto em produção.

---

## 2. Matriz Consolidada das 17 Sprints do Projeto

| Sprint | Período / Data Final | Tema Central da Sprint | Requisitos Alvo | Status Atual | Documento Detalhado |
| :---: | :---: | :--- | :--- | :---: | :---: |
| **Sprint 1** | 13/08/2026 | Apresentação da Disciplina e Metodologia | Diretrizes e Escopo | ✅ Concluída | [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) |
| **Sprint 2** | 20/08/2026 | Proposta e Cronograma de Desenvolvimento | Contexto e Problema | ✅ Concluída | [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) |
| **Sprint 3** | 27/08/2026 | Engenharia de Requisitos e Modelagem UML | RF01..21, RN01..05 | ✅ Concluída | [docs/02-engenharia-requisitos/](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/02-engenharia-requisitos/) |
| **Sprint 4** | 03/09/2026 | Design de Contratos JSON e Prototipação Figma | RNF02, Contratos 1 a 4 | ✅ Concluída | [docs/04-arquitetura-e-contratos/](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/04-arquitetura-e-contratos/) |
| **Sprint 5** | 10/09/2026 | Validação Clínica e Modelagem de Banco | DER Físico, 3FN | ✅ Concluída | [docs/03-diagramas-arquiteturais/](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/03-diagramas-arquiteturais/) |
| **Sprint 6** | 17/09/2026 | Fundação do Repositório, CI/CD e Docker | RNF06, RNF07 | ✅ Concluída | [docs/06-qualidade-e-testes/](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/06-qualidade-e-testes/) |
| **Sprint 7** | 24/09/2026 | Gestão de Pacientes e Biblioteca de Jogos | RF06, RF09, RF18, RN02 | ✅ Concluída | [02-sprint-07-pacientes-jogos.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/05-sprints-e-evolucao/02-sprint-07-pacientes-jogos.md) |
| **Sprint 8** | 01/10/2026 | Pareamento Remoto via Session Token | RF10, RF11, RNF03 | ✅ Concluída | [03-sprint-08-pareamento-remoto.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/05-sprints-e-evolucao/03-sprint-08-pareamento-remoto.md) |
| **Sprint 9** | 08/10/2026 | Gestão de Sessão Ativa e Telemetria Contínua | RF12, RF13, RF17, RF21 | ✅ Concluída | [04-sprint-09-gestao-sessao-telemetria.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/05-sprints-e-evolucao/04-sprint-09-gestao-sessao-telemetria.md) |
| **Sprint 10** | 15/10/2026 | Tela de Resultados e Relatórios Analíticos | RF14, RF16, RF20, 3FN | 🚀 Em Andamento | [05-sprint-10-resultados-relatorios.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/05-sprints-e-evolucao/05-sprint-10-resultados-relatorios.md) |
| **Sprint 11** | 22/10/2026 | Histórico Evolutivo e Gráficos Dinâmicos | RF15, RNF04 | ⏳ Planejada | [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) |
| **Sprint 12** | 29/10/2026 | Bloco de Anotações Clínicas e Contexto DDA | RF16, RF17, RN03 | ⏳ Planejada | [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) |
| **Sprint 13** | 05/11/2026 | Regras Multi-terapeuta e Concorrência | RF18, RN04 | ⏳ Planejada | [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) |
| **Sprint 14** | 12/11/2026 | Polimento Técnico, UX/UI e Documentação | RNF07, Qualidade | ⏳ Planejada | [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) |
| **Sprint 15** | 19/11/2026 | Validação Clínica Fechada com Parceiros | Homologação Clínica | ⏳ Planejada | [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) |
| **Sprint 16** | 26/11/2026 | Deploy Piloto em Nuvem | RNF06, Produção | ⏳ Planejada | [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) |
| **Sprint 17** | 03/12/2026 | Defesa Pública e Apresentação Final | Encerramento | ⏳ Planejada | [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) |

---

## 3. Resumo Executivo das Entregas das Sprints 1 a 6

### Sprints 1 e 2 — Alinhamento, Escopo e Cronograma (13/08 a 20/08/2026)
* Definição da problemática central: sobrecarga cognitiva do terapeuta durante atendimentos com crianças no espectro autista.
* Delimitação do escopo estrito à interface de orquestração (InTEA), desacoplando o desenvolvimento do motor de jogos e dos algoritmos de IA em três camadas.
* Aprovação do cronograma de 17 sprints com entregas parciais semanais e critérios mensuráveis.

### Sprint 3 — Engenharia de Requisitos e Modelagem UML (27/08/2026)
* Levantamento e formalização dos 21 Requisitos Funcionais (**RF01 a RF21**), 7 Não-Funcionais (**RNF01 a RNF07**) e 5 Regras de Negócio Invioláveis (**RN01 a RN05**).
* Elaboração dos diagramas UML fundamentais: Classes, Casos de Uso, Sequência (29 passos), Entidade-Relacionamento e Atividades com DDA.

### Sprint 4 — Design de Contratos JSON e Prototipação Figma (03/09/2026)
* Formalização dos 4 contratos canônicos de integração do ecossistema: Manifesto do Jogo, Telemetria Contínua, Contexto Pré-Sessão e Relatório Analítico.
* Elaboração do protótipo navegável no Figma contendo as telas de login, cadastro, dashboard, seleção de pacientes, biblioteca de jogos e emissão de laudo (**Figuras 6 a 14**).

### Sprint 5 — Validação Clínica e Modelagem de Banco (10/09/2026)
* Refinamento das interfaces visuais com psicólogos e terapeutas parceiros.
* Modelagem do banco relacional PostgreSQL com normalização 3FN e chaves UUID.
* Telas de cadastro de paciente (**Figura 15**), prontuário (**Figura 16**) e perfil do terapeuta (**Figura 17**).

### Sprint 6 — Fundação do Repositório, CI/CD e Docker (17/09/2026)
* Estruturação do monorepo Git com branches protegidas (`main`, `develop`, `marcos-dev`).
* Configuração da esteira automatizada no GitHub Actions com typecheck estrito (`tsc`) e testes no Vitest.
* Orquestração de containers com Docker Compose e inicialização do banco Supabase.

---

## 4. Próximos Passos e Governança

Para os relatórios detalhados das sprints de implementação de software (Sprints 7 a 10) e as diretrizes de governança do Kanban, consulte os documentos dedicados deste módulo:
* [Sprint 7: Pacientes e Biblioteca de Jogos](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/05-sprints-e-evolucao/02-sprint-07-pacientes-jogos.md)
* [Sprint 8: Pareamento Remoto via Session Token](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/05-sprints-e-evolucao/03-sprint-08-pareamento-remoto.md)
* [Sprint 9: Gestão de Sessão e Telemetria em Tempo Real](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/05-sprints-e-evolucao/04-sprint-09-gestao-sessao-telemetria.md)
* [Sprint 10: Tela de Resultados e Relatórios Analíticos](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/05-sprints-e-evolucao/05-sprint-10-resultados-relatorios.md)
* [Governança Kanban, Protocolo de Cards e Checklist](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/05-sprints-e-evolucao/06-governanca-kanban-e-tasks.md)
