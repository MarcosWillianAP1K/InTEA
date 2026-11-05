# Relatório Executivo da Sprint 13: Regras Multi-terapeuta, Concorrência e Cobertura de Testes — InTEA

> **Projeto:** InTEA — Interface do Terapeuta para Orquestração do Ecossistema de Games Terapêuticos  
> **Instituição:** Sistemas de Informação — Universidade Federal do Piauí (UFPI)  
> **Período da Sprint:** 29/10/2026 a 05/11/2026  
> **Status:** Concluída / Homologação da Sprint 13  
> **Requisitos Atendidos:** RF08, RF13, RF18, RF21, RN01, RN04, RN05, RNF01, RNF05, RNF07  
> **Documento Fonte:** [sprint-13.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/sprints/sprint-13.md) e [task_sprint_13.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/tasks/task_sprint_13.md)  
> **Hub de Navegação:** [Índice Geral](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/README.md)  

---

## 1. Visão Geral e Objetivos da Sprint 13

A **Sprint 13** fecha o ciclo clínico multidisciplinar do InTEA, viabilizando o acompanhamento longitudinal compartilhado do mesmo paciente por múltiplos especialistas de saúde (Terapia Ocupacional, Psicologia ABA e Fonoaudiologia) vinculados à mesma instituição clínica (**RF18**, **RN04**).

### Metas Atingidas:
1. **Leitura Compartilhada de Prontuário e Histórico (RF18, RN04):** Terapeutas ativos da mesma clínica vinculados em `terapeuta_paciente` visualizam todo o prontuário, anotações de evolução e histórico completo de sessões passadas (inclusive aquelas conduzidas por outros colegas da equipe). Na rota `GET /api/sessao?pacienteId=:id`, a restrição por `terapeuta_id = req.user.id` é suprimida para especialistas com vínculo ativo.
2. **Escrita Isolada por Autoria e Anti-Spoofing (RF21):** Assimetria rigorosa entre leitura e escrita. Especialistas co-vinculados não possuem permissão para editar (`PATCH`) ou inativar (`DELETE`) anotações clínicas de outros colegas, nem finalizar (`PATCH /api/sessao/:id/finalizar`) ou cancelar (`DELETE /api/sessao/:id/cancelar`) atendimentos conduzidos por outros terapeutas (`403 Forbidden`).
3. **Prevenção de Paciente Órfão (RF18):** Bloqueio atômico com status **`409 Conflict`** ao tentar remover o único profissional de saúde ativo associado ao paciente (`DELETE /api/paciente/:id/terapeutas/:terapeutaId`), garantindo a continuidade e a responsabilidade técnica do prontuário.
4. **Trava de Sessão Clínica Simultânea (RF13 / Concorrência):** Proibição de dois atendimentos clínicos concorrentes em paralelo para o mesmo paciente. O endpoint `POST /api/sessao/iniciar` rejeita tentativas concorrentes com status **`409 Conflict`** e código `SESSAO_CLINICA_SIMULTANEA_CONFLITO`.
5. **Modo Observador em Tempo Real no WebSocket (RNF01, RF21):** Colegas de equipe que acessam uma intervenção ativa no Cockpit conectam-se ao Socket.IO com `role: 'observador_equipe'`. O observador recebe o streaming passivo de telemetria contínua (`sessao:telemetria` < 100ms), enquanto o gateway bloqueia com código `PERMISSAO_NEGADA` qualquer envio de comandos clínicos (`sessao:comando`).
6. **Auditoria Institucional de Vínculos (RF08, RNF05):** Rastreabilidade imutável de todas as inclusões e exclusões de especialistas da equipe em `public.auditoria_vinculo_acesso` e rota de consulta `GET /api/auditoria` com filtros por `pacienteId` e `tipoAcao`, com isolamento obrigatório por `clinica_id` (**RN04**).
7. **Padronização Visual da Nomenclatura Clínica (Seção 7.7 do PDF):** Banimento definitivo do termo "Co-Terapeuta" da interface, adotando-se sempre **"Equipe Multidisciplinar"** e **"Especialistas Vinculados"**.

---

## 2. Entregas Técnicas por Camada da Arquitetura

### 2.1. Banco de Dados e Modelagem Relacional
* Migração SQL `015_vinculo_multiterapeuta_e_auditoria_acesso.sql` executada com idempotência:
  * Enriquecimento da tabela `public.terapeuta_paciente` com `papel_equipe` e `vinculado_por`;
  * Índice reverso composto `idx_terapeuta_paciente_paciente_id` acelerando listagens de equipe;
  * Criação da tabela imutável `public.auditoria_vinculo_acesso` para governança clínica;
  * Sincronização rigorosa do Single Source of Truth `Database/database.sql`.

### 2.2. Backend RESTful API e WebSocket
* **`GET /api/paciente/:id/terapeutas`:** Retorna a lista completa e sanitizada dos especialistas vinculados com dados de conselho (CREFITO/CRP), especialidade e data de ingresso na equipe (**RF18**);
* **`POST /api/paciente/:id/terapeutas`:** Vínculo de profissional da mesma clínica (`201 Created`), com rejeição `403 Forbidden` para clínicas distintas (**RN04**) e `409 Conflict` para duplicidade;
* **`DELETE /api/paciente/:id/terapeutas/:terapeutaId`:** Desvinculação protegida com **`409 Conflict`** caso o terapeuta seja o único profissional ativo associado ao paciente;
* **`GET /api/sessao`:** Listagem paginada com visibilidade compartilhada quando `pacienteId` for informado;
* **`SessaoConcorrenciaService`:** Detecção de sessões ativas concorrentes com emissão de `409 Conflict` em `POST /api/sessao/iniciar` e guarda de autor do condutor em mutações (`403 Forbidden`);
* **`SessaoGateway`:** Papel `role: 'observador_equipe'` no Socket.IO com telemetria passiva e bloqueio de comandos clínicos;
* **`GET /api/auditoria`:** Consulta institucional com filtros por `pacienteId` e `tipoAcao` (**RF08**), respeitando isolamento multitenant (**RN04**).

### 2.3. Frontend SPA (React 19)
* **`PainelEquipeMultidisciplinar.tsx`:** Cartões dos especialistas com avatar, especialidade e conselho, badge `"Você (Logado)"`, desativação da remoção quando `especialistas.length <= 1`, alvos $\ge 44\times 44\text{px}$ (**RNF07**) e 4 estados de UI (Skeleton, Empty, Error com retry e Success);
* **`ModalVincularEspecialista.tsx`:** Modal acessível com focus trap, busca instantânea e trava contra múltiplos envios (`isSubmitting`);
* **`BadgeAutoriaMultidisciplinar.tsx`:** Distinção semântica entre `"Sua Autoria • Editável"` e `"Equipe • Somente Leitura"`;
* **`CockpitSessaoPage.tsx`:** Banner superior *"Modo Acompanhamento da Equipe — Sessão conduzida por [Nome]"*, conexão WS como `observador_equipe` e controles de intervenção desabilitados;
* **`PerfilPacientePage.tsx` e `HistoricoPacientePage.tsx`:** Integração completa da gestão de equipe multidisciplinar e badges de autoria na linha do tempo longitudinal.

---

## 3. Matriz de Rastreabilidade da Sprint 13

| Requisito / Regra | Camada | Artefato de Código | Comportamento Clínico Garantido |
| :--- | :---: | :--- | :--- |
| **RF08** (Auditoria Institucional) | Back/BD | `015_vinculo_multiterapeuta...sql`, `AuditoriaController` | Rastreabilidade imutável de todas as inclusões e exclusões de especialistas na equipe. |
| **RF13** (Cockpit e Comandos) | Back/Front | `SessaoConcorrenciaService`, `SessaoGateway`, `CockpitSessaoPage.tsx` | Trava de concorrência simultânea (`409`) e Modo Observador somente-leitura no WebSocket. |
| **RF18** (Vínculo Multi-terapeuta) | BD/Back/Front | `terapeuta_paciente`, `PacienteService`, `PainelEquipeMultidisciplinar.tsx` | Acompanhamento compartilhado do paciente por múltiplos especialistas da mesma clínica. |
| **RF21** (Autoria Indelével) | Back/Front | `sessao.controller.ts`, `visibilidade.middleware.ts`, `BadgeAutoriaMultidisciplinar.tsx` | Escrita e comandos isolados por autoria; proibição de mutação de sessões e notas de colegas. |
| **RN01** (Isolamento Modo Livre) | Back | `sessao-listar.service.ts`, `sessao-concorrencia.service.ts` | Sessões livres não admitem equipe multidisciplinar e não bloqueiam concorrência. |
| **RN04** (Vínculo e Mesma Clínica) | Back/BD | `visibilidade.middleware.ts`, `PacienteService.vincularTerapeuta` | Bloqueio imediato com `403 Forbidden` para profissionais de instituições clínicas diferentes. |
| **RN05** (Inalterabilidade / Soft Delete) | Back/BD | `PacienteService.desvincularTerapeuta`, `auditoria.model.ts` | Bloqueio `409 Conflict` contra paciente órfão e imutabilidade dos registros de auditoria. |
| **RNF01** (Baixa Latência WebSocket) | Back | `sessao.gateway.ts` | Streaming contínuo de telemetria para observadores sem aumento de jitter na sala. |
| **RNF05** (Tempo Real e Auditoria) | Back | `auditoria.controller.ts`, `PacienteController` | Persistência de auditoria assíncrona não bloqueante sem degradação das rotas clínicas. |
| **RNF07** (Ergonomia e Acessibilidade) | Front | `PainelEquipeMultidisciplinar.tsx`, `ModalVincularEspecialista.tsx` | Alvos de toque $\ge 44\times 44\text{px}$, suporte a tablets de 10", skeleton geométrico e zero CLS. |

---

## 4. Casos de Teste Manuais Cadastrados (CT-S35 a CT-S40)

* **`CT-S35` (Positivo — RF18/RN04):** Vinculação de especialista da mesma clínica ao paciente (`201 Created`) e visualização compartilhada de todo o histórico de sessões e anotações (`200 OK`);
* **`CT-S36` (Negativo — RN04):** Rejeição de vínculo de especialista com clínica divergente com status **`403 Forbidden`**;
* **`CT-S37` (Negativo — RF18):** Bloqueio de remoção do único especialista ativo do paciente com status **`409 Conflict`** (prevenção de órfão);
* **`CT-S38` (Negativo — RF21):** Rejeição de alteração e exclusão de anotação clínica alheia com status **`403 Forbidden`**;
* **`CT-S39` (Negativo — RF13):** Bloqueio de início de sessão concorrente para paciente em atendimento ativo com status **`409 Conflict`**;
* **`CT-S40` (Positivo — RF08/RNF05):** Auditoria forense imutável com registro de autor, paciente, endereço IP e carimbo temporal UTC (**`200 OK`**).

---

## 5. Critérios de Homologação da Sprint 13

> [!IMPORTANT]
> **Homologação Soberana do Usuário:** Todas as caixas de verificação abaixo permanecem estritamente desmarcadas (`[ ]`) para conferência e validação manual do usuário no Git e GitHub Projects.

* [ ] Migração SQL `015_vinculo_multiterapeuta_e_auditoria_acesso.sql` executada com sucesso e `Database/database.sql` sincronizado.
* [ ] Rota `GET /api/sessao?pacienteId=:id` retorna todas as sessões clínicas do paciente conduzidas por qualquer especialista vinculado na equipe (**RF18**).
* [ ] Tentativa de vincular terapeuta pertencente a outra clínica rejeitada com **`403 Forbidden`** (**RN04**).
* [ ] Tentativa de desvincular o único especialista ativo vinculado ao paciente bloqueada com **`409 Conflict`** (prevenção de paciente órfão — **RF18**).
* [ ] Tentativa de iniciar sessão clínica para paciente já em atendimento ativo bloqueada com **`409 Conflict`** (**RF13** / Concorrência).
* [ ] Tentativa de finalizar ou cancelar sessão ativa por especialista co-vinculado que não seja o condutor rejeitada com **`403 Forbidden`** (**RF21**).
* [ ] Gateway WebSocket Socket.IO aceita papel `role: 'observador_equipe'`, transmitindo telemetria e rejeitando comandos clínicos de intervenção (**RF21**, **RNF01**).
* [ ] Trilha de auditoria institucional (`GET /api/auditoria`) registra imutavelmente operações de vínculo/desvínculo com filtros por `pacienteId` e `tipoAcao` (**RF08**).
* [ ] Componentes `<PainelEquipeMultidisciplinar />`, `<ModalVincularEspecialista />` e `<BadgeAutoriaMultidisciplinar />` funcionais na UI sem uso do termo "Co-Terapeuta" (Seção 7.7 do PDF).
* [ ] 100% dos testes unitários e de integração passando no Vitest (`npm test` no Backend e Frontend).
* [ ] Especificação OpenAPI e Contratos RESTful atualizados em conformidade 1:1.
* [ ] Casos de teste manuais `CT-S35` a `CT-S40` cadastrados e sincronizados no roteiro de testes.
* [ ] Seção 7.13 do relatório acadêmico em LaTeX compilando sem avisos ou referências quebradas.

