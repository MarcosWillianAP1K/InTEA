# Relatório Executivo da Sprint 12: Anotações Clínicas e Contexto DDA — InTEA

> **Projeto:** InTEA — Interface do Terapeuta para Orquestração do Ecossistema de Games Terapêuticos  
> **Instituição:** Sistemas de Informação — Universidade Federal do Piauí (UFPI)  
> **Período da Sprint:** 22/10/2026 a 29/10/2026  
> **Status:** Em Andamento / Homologação da Sprint 12  
> **Requisitos Atendidos:** RF12, RF13, RF16, RF17, RF19, RF21, RN01, RN03, RN04, RN05, RNF02, RNF05, RNF07  
> **Documento Fonte:** [sprint-12.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/sprints/sprint-12.md) e [task_sprint_12.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/tasks/task_sprint_12.md)  
> **Hub de Navegação:** [Índice Geral](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/README.md)  

---

## 1. Visão Geral e Objetivos da Sprint 12

A **Sprint 12** consolida o elo entre o acompanhamento clínico qualitativo longitudinal e a calibração prévia da inteligência artificial de DDA (*Dynamic Difficulty Adjustment*). Ela atende diretamente à necessidade do terapeuta de registrar observações perenes e estruturadas (**RF16**, **RF21**) e assegura que a partida inicie adaptada às particularidades sensoriais do paciente (**RF17**, **RN03** — **Contrato 2**).

### Metas Atingidas:
1. **Autoria Indelével e Enriquecimento Profissional (RF21):** Extinção completa da exibição de UUIDs crus na interface. Consultas de anotações realizam `JOIN` com a tabela `terapeuta`, retornando o objeto sanitizado `autor: { id, nome, registro_profissional, crefito, especialidade }`.
2. **Guarda Anti-Spoofing e Segurança JWT:** O `terapeuta_id` é atrelado compulsoriamente a partir do token de autenticação JWT (`req.user.id`). Tentativas de submissão forjando a autoria de outro profissional são rejeitadas com `403 Forbidden`.
3. **Anotações em Tempo Real no Cockpit (RF13, RF16):** Criação do componente `ModalAnotacaoSessaoAtiva.tsx`, permitindo ao terapeuta registrar notas clínicas durante o atendimento ativo. As anotações persistem assincronamente no banco relacional indexadas pelo `sessao_id`, estando disponíveis de imediato no painel de resultados pós-sessão (`ResultadoSessaoPage.tsx` / `BlocoAnotacoesClinicas.tsx`).
4. **Filtros Avançados e Prontuário Longitudinal (RF19):** Suporte a filtros combinados por autor (`terapeutaId`), vínculo de sessão (`sessaoId`, `somenteSemSessao`), intervalo de datas (`dataInicio`, `dataFim`), busca textual case-insensitive (`busca`) e paginação.
5. **Injeção Parametrizada de Contexto DDA (Contrato 2):** Validação estrita do payload de pré-sessão (`nivel_estresse_inicial`, `gatilhos_sensoriais_evitar`, `objetivo_clinico`), mapeamento determinístico de estresse (escala 1 a 5 $\leftrightarrow$ `"baixo"`, `"medio"`, `"alto"`) e garantia inviolável de entrega antes do primeiro pacote de telemetria contínua (**RN03**).
6. **Mecanismo de Fallback Clínico Parametrizado (Figura 5):** Caso o terapeuta opte por parâmetros padrão homologados ou omita a customização, o sistema herda automaticamente os gatilhos cadastrados na anamnese (`dados_clinicos` / `paciente_gatilho`), define estresse `"baixo"` (`1`) e assume o objetivo do manifesto do jogo.
7. **Invariante de Modo Livre (RN01):** Partidas em `modo_livre` (`paciente_id = NULL`) têm qualquer calibração DDA e anotação em prontuário bloqueadas com status `400 Bad Request`.
8. **Inalterabilidade e Ciclo de Vida por Soft Delete (RN05):** Inativação lógica com confirmação e rota expressa de reativação (`PATCH /api/anotacao/:id/reativar`) restritas exclusivamente ao autor original ou SuperAdmin.

---

## 2. Entregas Técnicas por Camada da Arquitetura

### 2.1. Banco de Dados e Modelagem Relacional
* Migração SQL `016_indices_anotacao_e_contexto_dda.sql` executada de forma idempotente:
  * Índice parcial composto `idx_anotacao_paciente_autor_data` em `anotacao_clinica(paciente_id, terapeuta_id, created_at DESC) WHERE soft_delete = false`;
  * Índice B-Tree para ordenação rápida de sessões clínicas anteriores;
  * Sincronização rigorosa do arquivo mestre `Database/database.sql`.

### 2.2. Backend RESTful API e WebSocket
* **`GET /api/anotacao/paciente/:pacienteId`:** Histórico com filtros combinados (`terapeutaId`, `sessaoId`, `dataInicio`, `dataFim`, `busca`, `page`, `limit`) e Envelope Pattern Categorizado;
* **`POST /api/anotacao`:** Endpoint unificado com guarda anti-spoofing JWT e suporte a anotações em tempo real no Cockpit;
* **`PATCH /api/anotacao/:id/reativar`:** Restauração lógica (`soft_delete = false`) com verificação de autoria e vínculo institucional (**RN04**, **RN05**);
* **`GET /api/sessao/contexto-sugerido/:pacienteId`:** Consulta de gatilhos cadastrados e histórico da última intervenção para abastecimento do modal pré-sessão;
* **`SessaoContextoDdaService`:** Validação do Contrato 2, conversor determinístico de estresse e mecanismo de fallback clínico da Figura 5;
* **Garantia RN03:** Entrega do pacote de contexto no handshake antes do 1º pacote de telemetria contínua.

### 2.3. Frontend SPA (React 19)
* **`CardAnotacaoClinica.tsx`:** Exibição do autor com nome completo, CREFITO/CRP e especialidade (**RF21**), badge de sessão e ações restritas ao autor;
* **`FiltrosAnotacoesClinicas.tsx`:** Barra de busca textual, seletor de especialista autor, filtros de vínculo e intervalo temporal (**RF19**);
* **`GerenciadorAnotacoesProntuario.tsx`:** Composição do prontuário com os 4 estados visuais (Skeleton geométrico sem CLS, Empty State, Error com retry e Success State);
* **`FormularioContextoDDA.tsx`:** Espelho da **Figura 11**, com seletor de estresse 1 a 5, chips de gatilhos a evitar, objetivo clínico e alternador de fallback;
* **`ModalAnotacaoSessaoAtiva.tsx`:** Modal no Cockpit para redação ágil de anotações clínicas durante a sessão ativa, com supressão automática em Modo Livre (**RN01**).

---

## 3. Matriz de Casos de Teste Manuais (CT-S29 a CT-S34)

| Caso de Teste | Tipo | Requisitos Validados | Descrição do Cenário |
| :---: | :---: | :--- | :--- |
| **CT-S29** | Positivo | RF16, RF21, RN04 | Criação de nota e exibição do objeto enriquecido `autor` (nome, CREFITO, especialidade). |
| **CT-S30** | Negativo | RF21, RN04 | Bloqueio com `403 Forbidden` em tentativas de edição ou soft delete por terapeuta não autor. |
| **CT-S31** | Positivo | RF19, RN05 | Filtros combinados de busca, aplicação de soft delete e restauração via `/reativar`. |
| **CT-S32** | Positivo | RF17, RN03, Contrato 2 | Calibração personalizada pré-sessão (estresse 1..5) e entrega prévia à telemetria. |
| **CT-S33** | Positivo | RF17, Figura 5 | Aplicação do Fallback Clínico Parametrizado com herança de gatilhos da anamnese. |
| **CT-S34** | Negativo | RN01 | Rejeição com `400 Bad Request` para injeção de contexto ou anotação em Modo Livre. |

---

## 4. Critérios de Homologação da Sprint 12

> [!IMPORTANT]
> **Homologação Soberana do Usuário:** Todos os critérios permanecem desmarcados (`[ ]`) para validação manual do usuário no Git e GitHub Projects.

* [ ] Migração SQL `016_indices_anotacao_e_contexto_dda.sql` executada e `database.sql` sincronizado.
* [ ] Rota `GET /api/anotacao/paciente/:pacienteId` retorna lista paginada com objeto `autor` e filtros funcionais.
* [ ] Rota `PATCH /api/anotacao/:id/reativar` restaura anotações inativadas com permissão restrita ao autor ou SuperAdmin.
* [ ] Tentativas de alteração de anotações por terceiros rejeitadas com `403 Forbidden` (**RF21**, **RN04**).
* [ ] Serviço `SessaoContextoDdaService` valida o Contrato 2 e aplica o Fallback Clínico Parametrizado (Figura 5).
* [ ] Pacote de Contexto DDA entregue no handshake antes da aceitação do primeiro pacote de telemetria (**RN03**).
* [ ] Partidas em Modo Livre rejeitam injeção de contexto clínico e notas de prontuário com `400 Bad Request` (**RN01**).
* [ ] Componentes modulares de anotações integrados no Perfil do Paciente sem exibição de UUIDs crus.
* [ ] Modal de anotação clínica em tempo real (`ModalAnotacaoSessaoAtiva`) funcional no Cockpit de sessão ativa.
* [ ] 100% dos testes unitários e de integração passando no Vitest no Backend e Frontend.

