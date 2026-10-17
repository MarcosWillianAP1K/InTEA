# Relatório Executivo da Sprint 7: Pacientes e Biblioteca de Jogos — InTEA

> **Projeto:** InTEA — Interface do Terapeuta para Orquestração do Ecossistema de Games Terapêuticos  
> **Período da Sprint:** 17/09/2026 a 24/09/2026  
> **Status:** ✅ Concluída e Homologada  
> **Requisitos Atendidos:** RF06, RF09, RF18, RF19, RN02, RN04, RN05  
> **Documento Fonte:** [sprint-7.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/sprints/sprint-7.md) e [task_sprint_7.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/tasks/task_sprint_7.md)  
> **Hub de Navegação:** [Índice Geral](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/README.md)

---

## 1. Visão Geral e Objetivos da Sprint 7

A Sprint 7 inaugurou a fase de desenvolvimento de funcionalidades centrais do InTEA, entregando a infraestrutura de dados e telas necessária para a gestão clínica de pacientes no espectro autista e o catálogo de jogos terapêuticos homologados.

### Metas Atingidas:
1. **CRUD Completo de Pacientes com Soft Delete:** Criação, leitura, atualização e inativação lógica de pacientes, preservando o histórico clínico (**RN05**).
2. **Auto-vínculo e Equipe Multidisciplinar:** Vinculação automática do terapeuta criador na tabela `terapeuta_paciente` e endpoints para inclusão/remoção de coterapeutas da mesma clínica (**RF18**).
3. **Catálogo de Jogos e Leitura de Manifesto:** Implementação da biblioteca de jogos com leitura do `manifesto_json` (**Contrato 1**) e validação de `tipo_metrica` sem fallback (**RN02**).
4. **Seed de Jogos de Demonstração:** Carga inicial com 3 jogos terapêuticos representativos (*Aventura das Cores*, *Formas Calmas* e *Som dos Animais*).

---

## 2. Entregas Técnicas por Camada

### 2.1. Banco de Dados (`Database/migrations/001_pacientes.sql`)
* Estruturação das tabelas `paciente`, `dados_clinicos`, `responsavel`, `paciente_responsavel`, `jogo` e da tabela associativa `terapeuta_paciente`.
* Chaves primárias e estrangeiras em UUID com constraints de integridade referencial.
* Trigger de bloqueio de exclusão física para cumprimento incondicional de **RN05**.

### 2.2. Backend RESTful API
* **Módulo Paciente (`Backend/api/paciente/`):**
  * `POST /api/paciente`: Cadastra paciente com validação de CPF e auto-vínculo do autor.
  * `GET /api/paciente`: Lista pacientes vinculados ao terapeuta na instituição.
  * `GET /api/paciente/:id`: Retorna dados completos com checagem de vínculo (**RN04**).
  * `PUT /api/paciente/:id`: Atualização de informações cadastrais.
  * `DELETE /api/paciente/:id`: Inativação lógica (`status_ativo = false`).
  * `GET /api/paciente/:id/terapeutas`: Equipe multidisciplinar vinculada.
  * `POST /api/paciente/:id/terapeutas` e `DELETE /:id/terapeutas/:terapeutaId`: Gestão de vínculos.
* **Módulo Jogos (`Backend/api/jogos/`):**
  * `GET /api/jogos`: Catálogo com filtros de status e objetivo clínico.
  * `GET /api/jogos/:id`: Detalhes e manifesto técnico com tipos de métricas.

### 2.3. Frontend SPA (React 19)
* Desenvolvimento das telas mestre e componentes atômicos:
  * Lista e cards de seleção de pacientes com busca textual por nome e CPF.
  * Formulário de cadastro em 4 blocos (dados pessoais, responsáveis, dados clínicos e gatilhos).
  * Prontuário visual do paciente com anamnese integrada.
  * Catálogo em grade da biblioteca de jogos com badges de instalação e objetivos.

---

## 3. Evidências Visuais e Telas da Sprint 7

* `[Imagem 9: Tela de Seleção de Pacientes]` — Interface de cartões para escolha rápida do paciente na recepção clínica.
* `[Imagem 10: Tela da Biblioteca de Jogos]` — Catálogo de atividades terapêuticas categorizadas por objetivo sensorial e cognitivo.
* `[Imagem 14: Tela de Lista Detalhada de Pacientes]` — Tabela clínica avançada com busca textual, paginação e ações.
* `[Imagem 15: Tela de Cadastro de Paciente]` — Formulário estruturado para registro sociodemográfico e dados clínicos essenciais (**RF06**).
* `[Imagem 16: Tela de Perfil e Prontuário do Paciente]` — Visão unificada da ficha do paciente, equipe multidisciplinar e gatilhos cadastrados.

---

## 4. Critérios de Aceite da Sprint 7

> [!IMPORTANT]
> **Homologação Manual do Usuário:** Os critérios permanecem obrigatoriamente desmarcados (`[ ]`).

* [ ] Cadastro de paciente rejeita CPFs inválidos ou duplicados na mesma instituição.
* [ ] Terapeuta criador é automaticamente associado ao paciente na tabela `terapeuta_paciente`.
* [ ] Exclusão de paciente aplica soft delete (`status_ativo = false`), sendo barrada tentativa de hard delete.
* [ ] Acesso ao prontuário por terapeuta de outra clínica retorna `403 Forbidden` (**RN04**).
* [ ] Manifesto de jogo sem `tipo_metrica` em qualquer métrica suportada é rejeitado com `422 Unprocessable` (**RN02**).
* [ ] Seed `01_seed_jogos.sql` executa de forma idempotente carregando os 3 jogos de teste.
